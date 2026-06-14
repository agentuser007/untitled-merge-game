// ============================================================
// gachaStore.ts — Gacha Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { GachaLogic, GachaItem as LogicGachaItem, GachaConfig } from '../logic/GachaLogic';
import { ItemEffectLogic } from '../logic/ItemEffectLogic';
import { useConfigStore } from './configStore';
import { useBoardStore } from './boardStore';
import { useCurrencyStore } from './currencyStore';
import { GachaService } from '../services/GachaService';
import type { InstantEffectDeps } from '../services/ItemEffectService';
import type { ResolveResult } from '../services/ServiceResultTypes';

export type GachaItem = LogicGachaItem;

export interface GachaPullResult {
    pullResult: GachaItem | null;
    resolveResult: ResolveResult;
}

export interface GachaTenPullResult {
    pullResults: GachaItem[] | null;
    resolveResult: ResolveResult;
}

export const useGachaStore = defineStore('gacha', () => {
    // --- State ---
    const ssrOwned = ref<Record<string, boolean>>({}); // ssr_id -> owned status
    const results = ref<GachaItem[]>([]);
    const freePullsLeft = ref(0);
    const lastFreePullDate = ref('');

    // --- Logic instance ---
    const logic = new GachaLogic();

    // NOTE: useConfigStore() is called at the top level of this defineStore setup.
    // This creates an init order dependency — Pinia must be installed before this store is first accessed.
    // In practice this is safe because stores are first accessed after app.mount(), but restructuring
    // to use a lazy getter would remove this dependency if needed.
    const configStore = useConfigStore();

    // Initialize state from logic
    ssrOwned.value = { ...logic.ssrOwned };
    checkDailyReset();

    // --- Effect context builder (lazy store instantiation) ---
    function buildEffectDeps(): InstantEffectDeps {
        const boardStore = useBoardStore();
        return {
            findEmptyCell: () => boardStore.findEmptyCell(),
            chains: configStore.chains,
            chainItemPrefix: configStore.chainItemPrefix,
            items: configStore.items,
            fragment: { ...configStore.itemEffects.fragment, random: Math.random },
            resolveItemId: { random: Math.random },
        };
    }

    // --- Computed ---
    const ownedSSRCount = computed(() => {
        return Object.values(ssrOwned.value).filter(owned => owned).length;
    });
    
    const totalSSRCount = computed(() => {
        const ssrItems = configStore.gachaPool.filter(item => item.rarity === 'SSR');
        return ssrItems.length;
    });
    
    const ssrCollectionRate = computed(() => {
        return totalSSRCount.value > 0
            ? Math.round((ownedSSRCount.value / totalSSRCount.value) * 100)
            : 0;
    });
    
    const hasResults = computed(() => results.value.length > 0);

    function checkDailyReset() {
        const today = new Date().toISOString().split('T')[0];
        if (lastFreePullDate.value !== today) {
            freePullsLeft.value = Math.max(freePullsLeft.value, 1);
            lastFreePullDate.value = today;
        }
    }

    const canFreePull = computed(() => {
        return freePullsLeft.value > 0;
    });

    // --- Actions ---
    function singlePull(maxRarity?: 'R' | 'SR' | 'SSR'): GachaPullResult {
        const currencyStore = useCurrencyStore();
        const { pullResult, resolveResult, ssrFirst } = GachaService.resolveSinglePull({
            gachaCost: configStore.gachaCost,
            gachaRarityConfig: configStore.gachaRarityConfig,
            gachaSubWeights: configStore.gachaSubWeights,
            gachaPoolV2: configStore.gachaPoolV2 || configStore.gachaPool,
            gachaPool: configStore.gachaPool,
            canAffordDiamonds: (cost) => currencyStore.canAffordDiamonds(cost),
            diamonds: currencyStore.diamonds,
            ssrOwned: { ...ssrOwned.value },
            logic,
            effectDeps: buildEffectDeps(),
            tenPullCount: configStore.gachaConfig.tenPullCount,
            random: { random: Math.random },
        }, maxRarity);

        if (pullResult) {
            results.value = [pullResult];

            if (ssrFirst) {
                ssrOwned.value[ssrFirst.item.id] = true;
            }
        }

        return { pullResult, resolveResult };
    }

    function tenPull(): GachaTenPullResult {
        const currencyStore = useCurrencyStore();
        const { pullResults, resolveResult, newSSRs } = GachaService.resolveTenPull({
            gachaCost: configStore.gachaCost,
            gachaRarityConfig: configStore.gachaRarityConfig,
            gachaSubWeights: configStore.gachaSubWeights,
            gachaPoolV2: configStore.gachaPoolV2 || configStore.gachaPool,
            gachaPool: configStore.gachaPool,
            canAffordDiamonds: (cost) => currencyStore.canAffordDiamonds(cost),
            diamonds: currencyStore.diamonds,
            ssrOwned: { ...ssrOwned.value },
            logic,
            effectDeps: buildEffectDeps(),
            tenPullCount: configStore.gachaConfig.tenPullCount,
            random: { random: Math.random },
        });

        if (pullResults) {
            results.value = pullResults;

            for (const ssr of newSSRs) {
                ssrOwned.value[ssr.id] = true;
            }
        }

        return { pullResults, resolveResult };
    }

    function freePull(): GachaPullResult {
        if (!canFreePull.value) return { pullResult: null, resolveResult: { applyTo: {} } };
        
        freePullsLeft.value--;
        lastFreePullDate.value = new Date().toISOString().split('T')[0];
        
        return singlePull('SR');
    }

    function resetResults() {
        results.value = [];
        logic.acknowledge();
    }

    function isSSRFirst(ssrId: string): boolean {
        return !ssrOwned.value[ssrId];
    }

    function markSSROwned(ssrId: string): boolean {
        const isFirst = !ssrOwned.value[ssrId];
        ssrOwned.value[ssrId] = true;
        return isFirst;
    }

    function getOwnedSSRIds(): string[] {
        return Object.entries(ssrOwned.value)
            .filter(([_, owned]) => owned)
            .map(([id, _]) => id);
    }

    function canAffordSingle(currency: { diamonds: number }): boolean {
        return currency.diamonds >= (configStore.gachaCost.singleCost || 0);
    }

    function canAffordTen(currency: { diamonds: number }): boolean {
        return currency.diamonds >= (configStore.gachaCost.tenCost || 0);
    }

    // --- Serialization ---
    function serialize() {
        return {
            ssrOwned: { ...ssrOwned.value },
            freePullsLeft: freePullsLeft.value,
            lastFreePullDate: lastFreePullDate.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { ssrOwned?: Record<string, boolean>; freePullsLeft?: number; lastFreePullDate?: string };
        
        ssrOwned.value = d.ssrOwned || {};
        freePullsLeft.value = d.freePullsLeft || 0;
        lastFreePullDate.value = d.lastFreePullDate || '';
        
        // Sync to logic
        logic.ssrOwned = { ...ssrOwned.value };
        
        checkDailyReset();
    }

    return {
        // State
        ssrOwned,
        results,
        freePullsLeft,
        lastFreePullDate,
        
        // Computed
        ownedSSRCount,
        totalSSRCount,
        ssrCollectionRate,
        hasResults,
        
        // Actions
        singlePull,
        tenPull,
        freePull,
        resetResults,
        isSSRFirst,
        markSSROwned,
        getOwnedSSRIds,
        canAffordSingle,
        canAffordTen,
        canFreePull,
        
        // Serialization
        serialize,
        deserialize
    };
});