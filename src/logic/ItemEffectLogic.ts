// ============================================================
// ItemEffectLogic.ts — Pure Effect Calculation Rules
// ============================================================
// Categorizes gacha item effects, resolves surprise boxes to
// concrete item IDs, and computes effect results as pure data.
// No store dependencies. No side effects.
// ============================================================

import type { ChainId, GachaPoolItemValue } from '../types/game';

// ---- Effect category type ----

export type EffectCategory = 'instant' | 'consumable' | 'board_tool';

// ---- Deps interfaces for pure calculations ----

export interface FragmentDeps {
    defaultCount: number;
    defaultGenLevel: number;
    random: () => number;
}

export interface EnergyItemDeps {
    defaultRecover: number;
}

export interface DoubleGenDeps {
    defaultTurns: number;
}

export interface LuckyCoinDeps {
    defaultCount: number;
    goldChance: number;
    goldAmount: number;
    diamondAmount: number;
    random: () => number;
}

export interface ResolveItemIdDeps {
    random: () => number;
}

// ---- Effect categorization sets ----

const INSTANT_EFFECTS: Set<string> = new Set([
    'add_diamond',
    'add_gold',
    'add_fragment',
    'spawn_board_item',
    'place_generator',
]);

const CONSUMABLE_EFFECTS: Set<string> = new Set([
    'add_energy_item',
    'double_gen',
    'reroll',
    'lucky_coin',
    'clear_lv1',
    'space_clean',
    'gen_refresh',
    'upgrade_item',
    'ssr_generator',
]);

const BOARD_TOOL_EFFECTS: Set<string> = new Set([
    'add_joker',
    'add_scissor',
]);

// ============================================================
// ItemEffectLogic — pure functions, no instance state
// ============================================================

export const ItemEffectLogic = {
    // ---- Categorization ----

    getEffectCategory(effect: string): EffectCategory {
        if (INSTANT_EFFECTS.has(effect)) return 'instant';
        if (CONSUMABLE_EFFECTS.has(effect)) return 'consumable';
        if (BOARD_TOOL_EFFECTS.has(effect)) return 'board_tool';
        return 'consumable';
    },

    isInstantEffect(effect: string): boolean {
        return this.getEffectCategory(effect) === 'instant';
    },

    // ---- Item ID resolution ----

    /**
     * Resolves a gacha pool entry to a concrete item ID.
     * Uses deps.random for random chain/level resolution.
     * Returns null if the resolved ID does not exist in items.
     */
    resolveItemId(
        effect: string,
        value: GachaPoolItemValue,
        chains: ChainId[],
        chainItemPrefix: Record<string, string>,
        items: Record<string, any>,
        deps: ResolveItemIdDeps,
    ): string | null {
        let resolvedChain: string | undefined;

        if (effect === 'place_generator' || effect === 'ssr_generator') {
            resolvedChain = value.genChain;
        } else {
            resolvedChain = value.chain;
            if (resolvedChain === 'random') {
                if (chains.length === 0) return null;
                const idx = Math.floor(deps.random() * chains.length);
                resolvedChain = chains[idx];
            }
        }

        if (!resolvedChain) return null;

        let resolvedLevel: number;
        if (typeof value.level === 'string' && value.level.startsWith('random_')) {
            const parts = value.level.split('_');
            const min = parseInt(parts[1]);
            const max = parseInt(parts[2]);
            resolvedLevel = min + Math.floor(deps.random() * (max - min + 1));
        } else {
            resolvedLevel = typeof value.level === 'number' ? value.level : parseInt(String(value.level));
        }

        if (isNaN(resolvedLevel)) return null;

        const prefix = chainItemPrefix[resolvedChain];
        if (!prefix) {
            const candidateId = `${resolvedChain}_${resolvedLevel}`;
            if (items[candidateId]) return candidateId;
            return null;
        }

        const candidateId = `${prefix}_${resolvedLevel}`;
        if (items[candidateId]) return candidateId;

        return null;
    },

    // ---- Pure effect calculations ----
    // Each returns a data object describing what the effect does.
    // null means the effect cannot be applied; caller should omit
    // the corresponding applyTo field entirely.

    /**
     * Calculates diamond amount for add_diamond effect.
     */
    calculateAddDiamond(value: GachaPoolItemValue): { addDiamonds: number } {
        return { addDiamonds: value?.amount || 0 };
    },

    /**
     * Calculates gold amount for add_gold effect.
     */
    calculateAddGold(value: GachaPoolItemValue): { addGold: number } {
        return { addGold: value?.amount || 0 };
    },

    /**
     * Calculates fragment addition for add_fragment effect.
     * @returns null when no chains configured; caller should omit applyTo.fragment entirely.
     */
    calculateAddFragment(
        value: GachaPoolItemValue,
        chains: ChainId[],
        deps: FragmentDeps,
    ): { addFragments: Array<{ fragmentId: string; count: number }> } | null {
        const count = value?.count || deps.defaultCount;
        if (chains.length === 0) return null;
        const rng = deps.random;
        const randomChain = chains[Math.floor(rng() * chains.length)];
        const genLevel = value?.genLevel || deps.defaultGenLevel;
        const fragmentId = `frag_${randomChain}_${genLevel}`;
        return { addFragments: [{ fragmentId, count }] };
    },

    /**
     * Calculates energy recovery for add_energy_item effect.
     */
    calculateAddEnergy(
        value: GachaPoolItemValue | undefined,
        itemId: string,
        items: Record<string, any>,
        deps: EnergyItemDeps,
    ): { add: number } {
        const energyAmount = value?.energy || items[itemId]?.energyRecover || deps.defaultRecover;
        return { add: energyAmount };
    },

    /**
     * Calculates double-gen turns for double_gen effect.
     */
    calculateDoubleGenTurns(value: GachaPoolItemValue | undefined, deps: DoubleGenDeps): { activateDoubleGenTurns: number } {
        return { activateDoubleGenTurns: value?.turns || deps.defaultTurns };
    },

    /**
     * Calculates lucky coin rewards. Uses injected random for purity.
     */
    calculateLuckyCoin(
        value: GachaPoolItemValue | undefined,
        deps: LuckyCoinDeps,
    ): { addGold: number; addDiamonds: number } {
        const count = value?.count || deps.defaultCount;
        const rng = deps.random;
        const goldChance = deps.goldChance;
        const goldAmount = deps.goldAmount;
        const diamondAmount = deps.diamondAmount;
        let goldWon = 0;
        let diamondWon = 0;
        for (let i = 0; i < count; i++) {
            if (rng() < goldChance) {
                goldWon += goldAmount;
            } else {
                diamondWon += diamondAmount;
            }
        }
        return { addGold: goldWon, addDiamonds: diamondWon };
    },

    /**
     * Calculates energy reward from clearing items.
     */
    calculateClearReward(clearedCount: number, energyPerItem: number): { add: number } {
        return { add: clearedCount * energyPerItem };
    },

    /**
     * Computes which board cells to clear for clear_lv1 / space_clean.
     * Returns indices of clearable cells (non-generator items at given levels).
     */
    findClearableCells(
        levels: number[],
        findAllItemsByLevel: (level: number) => number[],
        getCell: (index: number) => string | null,
        items: Record<string, any>,
    ): number[] {
        const clearable: number[] = [];
        for (const level of levels) {
            const indices = findAllItemsByLevel(level);
            for (const idx of indices) {
                const cellId = getCell(idx);
                if (cellId && items[cellId] && items[cellId].type !== 'GENERATOR') {
                    clearable.push(idx);
                }
            }
        }
        return clearable;
    },
};
