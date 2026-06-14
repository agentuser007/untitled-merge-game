import { GachaLogic, type GachaItem, type GachaConfig, type GachaRandomDeps } from '../logic/GachaLogic';
import { ItemEffectLogic } from '../logic/ItemEffectLogic';
import { ItemEffectService, type InstantEffectDeps } from './ItemEffectService';
import { emptyResult, mergeResolveResult, type ResolveResult } from './ServiceResultTypes';
import type { InventoryItemMeta } from '../types/game';

export interface GachaServiceDeps {
    gachaCost: { singleCost: number; tenCost: number };
    gachaRarityConfig: GachaConfig['rarityConfig'];
    gachaSubWeights: GachaConfig['subWeights'];
    gachaPoolV2: GachaItem[];
    gachaPool: GachaItem[];
    canAffordDiamonds: (cost: number) => boolean;
    diamonds: number;
    ssrOwned: Record<string, boolean>;
    logic: GachaLogic;
    effectDeps: InstantEffectDeps;
    tenPullCount: number;
    random: GachaRandomDeps;
}

export interface SinglePullResult {
    pullResult: GachaItem | null;
    resolveResult: ResolveResult;
    ssrFirst?: { item: GachaItem; isFirst: boolean };
}

export interface TenPullResult {
    pullResults: GachaItem[] | null;
    resolveResult: ResolveResult;
    newSSRs: GachaItem[];
}

function buildGachaConfig(deps: GachaServiceDeps): GachaConfig {
    return {
        rarityConfig: deps.gachaRarityConfig,
        gachaCost: { singleCost: deps.gachaCost.singleCost || 0, tenCost: deps.gachaCost.tenCost || 0 },
        subWeights: deps.gachaSubWeights,
        gachaPoolV2: deps.gachaPoolV2 || deps.gachaPool,
    };
}

export const GachaService = {
    resolveSinglePull(deps: GachaServiceDeps, maxRarity?: 'R' | 'SR' | 'SSR'): SinglePullResult {
        const result: ResolveResult = { applyTo: {} };

        if (deps.logic.fsm.can('ACK')) deps.logic.acknowledge();

        if (!maxRarity) {
            const cost = deps.gachaCost.singleCost || 0;
            if (!deps.canAffordDiamonds(cost)) {
                return { pullResult: null, resolveResult: result };
            }
            result.applyTo.currency = { spendDiamonds: cost };
        }

        const gachaConfig = buildGachaConfig(deps);
        const { result: pullResult, events: logicEvents } = deps.logic.pullSingle(gachaConfig, deps.random, maxRarity);

        if (pullResult) {
            const effect = pullResult.effect;
            const value = pullResult.value;

            if (effect && ItemEffectLogic.isInstantEffect(effect)) {
                const effectResult = ItemEffectService.resolveInstantEffect(effect, value, deps.effectDeps);
                mergeResolveResult(result, effectResult);
            } else {
                const itemId = pullResult.itemId || pullResult.id;
                result.applyTo.inventory = { addItems: [{ itemId, count: 1, meta: { effect, value } }] };
            }

            let ssrFirst: SinglePullResult['ssrFirst'];
            if (pullResult.rarity === 'SSR') {
                const isFirst = !deps.ssrOwned[pullResult.id];
                ssrFirst = { item: pullResult, isFirst };
                result.events = result.events || [];
                result.events.push({ name: 'gacha:ssrObtained', data: { item: pullResult, isFirst } });
            }

            if (logicEvents.length > 0) {
                result.events = result.events || [];
                for (const e of logicEvents) result.events.push({ name: e.type, data: e.payload });
            }

            return { pullResult, resolveResult: result, ssrFirst };
        }

        return { pullResult: null, resolveResult: result };
    },

    resolveTenPull(deps: GachaServiceDeps): TenPullResult {
        const result: ResolveResult = { applyTo: {} };

        if (deps.logic.fsm.can('ACK')) deps.logic.acknowledge();

        const cost = deps.gachaCost.tenCost || 0;
        if (!deps.canAffordDiamonds(cost)) {
            return { pullResults: null, resolveResult: result, newSSRs: [] };
        }
        result.applyTo.currency = { spendDiamonds: cost };

        const gachaConfig = buildGachaConfig(deps);
        const { results: pullResults, events: logicEvents } = deps.logic.pullTen(gachaConfig, deps.tenPullCount, deps.random);

        if (pullResults) {
            const inventoryItems: Array<{ itemId: string; count: number; meta?: InventoryItemMeta }> = [];
            const events: Array<{ name: string; data: unknown }> = [];

            for (const item of pullResults) {
                const effect = item.effect;
                const value = item.value;

                if (effect && ItemEffectLogic.isInstantEffect(effect)) {
                    const effectResult = ItemEffectService.resolveInstantEffect(effect, value, deps.effectDeps);
                    mergeResolveResult(result, effectResult);
                } else {
                    inventoryItems.push({ itemId: item.itemId || item.id, count: 1, meta: { effect: item.effect, value: item.value } });
                }
            }

            if (inventoryItems.length > 0) {
                result.applyTo.inventory = { addItems: inventoryItems };
            }

            const newSSRs: GachaItem[] = [];
            for (const item of pullResults) {
                if (item.rarity === 'SSR') {
                    const isFirst = !deps.ssrOwned[item.id];
                    if (isFirst) newSSRs.push(item);
                }
            }

            if (newSSRs.length > 0) {
                events.push({ name: 'gacha:newSSRsObtained', data: { items: newSSRs } });
            }

            for (const e of logicEvents) events.push({ name: e.type, data: e.payload });
            if (events.length > 0) result.events = events;

            return { pullResults, resolveResult: result, newSSRs };
        }

        return { pullResults: null, resolveResult: result, newSSRs: [] };
    },
};
