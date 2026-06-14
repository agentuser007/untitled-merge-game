// ============================================================
// ItemEffectService.ts — Effect Resolution via ResolveResult
// ============================================================
// Orchestrates item effect resolution, returning declarative
// ResolveResult instead of mutating stores directly.
// Delegates pure calculations to ItemEffectLogic.
// ============================================================

import { ItemEffectLogic } from '../logic/ItemEffectLogic';
import type { ChainId, GachaPoolItemValue } from '../types/game';
import { emptyResult, type ResolveResult } from './ServiceResultTypes';

// ---- Deps interfaces ----

export interface InstantEffectDeps {
    findEmptyCell: () => number;
    chains: ChainId[];
    chainItemPrefix: Record<string, string>;
    items: Record<string, any>;
    fragment: { defaultCount: number; defaultGenLevel: number; random: () => number };
    resolveItemId: { random: () => number };
}

export interface ConsumableEffectDeps {
    findEmptyCell: () => number;
    findAllItemsByLevel: (level: number) => number[];
    getCell: (index: number) => string | null;
    rerollItems: (count: number, items: Record<string, any>) => number;
    items: Record<string, any>;
    energyItem: { defaultRecover: number };
    doubleGen: { defaultTurns: number };
    luckyCoin: { defaultCount: number; goldChance: number; goldAmount: number; diamondAmount: number; random: () => number };
    clearLv1: { targetLevels: number[]; energyPerItem: number };
    spaceClean: { targetLevels: number[]; energyPerItem: number };
    reroll: { defaultCount: number };
}

// ============================================================
// ItemEffectService — namespace object + pure functions
// ============================================================

export const ItemEffectService = {
    resolveInstantEffect(
        effect: string,
        value: GachaPoolItemValue,
        deps: InstantEffectDeps,
    ): ResolveResult {
        switch (effect) {
            case 'add_diamond': {
                const result = emptyResult();
                const calc = ItemEffectLogic.calculateAddDiamond(value);
                if (calc.addDiamonds) result.applyTo.currency = { addDiamonds: calc.addDiamonds };
                result.ui = { toasts: [{ messageKey: '', fallback: `💎 +${calc.addDiamonds} 钻石`, type: 'info' }] };
                return result;
            }

            case 'add_gold': {
                const result = emptyResult();
                const calc = ItemEffectLogic.calculateAddGold(value);
                if (calc.addGold) result.applyTo.currency = { addGold: calc.addGold };
                result.ui = { toasts: [{ messageKey: '', fallback: `💰 +${calc.addGold} 金币`, type: 'info' }] };
                return result;
            }

            case 'add_fragment': {
                const result = emptyResult();
                const calc = ItemEffectLogic.calculateAddFragment(value, deps.chains, deps.fragment);
                if (!calc) {
                    result.ui = { toasts: [{ messageKey: '', fallback: 'No chains configured', type: 'error' }] };
                    return result;
                }
                result.applyTo.fragment = calc;
                result.ui = { toasts: [{ messageKey: '', fallback: `📦 +${calc.addFragments[0].count} 碎片`, type: 'info' }] };
                return result;
            }

            case 'spawn_board_item': {
                const result = emptyResult();
                const resolvedId = ItemEffectLogic.resolveItemId(
                    effect, value, deps.chains, deps.chainItemPrefix, deps.items, deps.resolveItemId,
                );
                if (!resolvedId) {
                    result.ui = { toasts: [{ messageKey: '', fallback: 'Failed to resolve item', type: 'error' }] };
                    return result;
                }
                const emptyIdx = deps.findEmptyCell();
                if (emptyIdx === -1) {
                    result.applyTo.inventory = { addItems: [{ itemId: resolvedId, count: 1 }] };
                    result.ui = { toasts: [{ messageKey: '', fallback: '棋盘已满，物品已存入背包', type: 'info' }] };
                } else {
                    result.applyTo.board = { placeItems: [{ cellIndex: emptyIdx, itemId: resolvedId }] };
                    result.ui = { toasts: [{ messageKey: '', fallback: '物品已放置到棋盘', type: 'info' }] };
                }
                return result;
            }

            case 'place_generator': {
                const result = emptyResult();
                const genItemId = value?.genChain ? `${value.genChain}_${value.level}` : null;
                if (!genItemId) {
                    result.ui = { toasts: [{ messageKey: '', fallback: '效果配置错误', type: 'error' }] };
                    return result;
                }
                const emptyIdx = deps.findEmptyCell();
                if (emptyIdx === -1) {
                    result.applyTo.inventory = { addItems: [{ itemId: genItemId, count: 1 }] };
                    result.ui = { toasts: [{ messageKey: '', fallback: '棋盘已满，生成器已存入背包', type: 'info' }] };
                } else {
                    result.applyTo.board = { placeItems: [{ cellIndex: emptyIdx, itemId: genItemId }] };
                    result.ui = { toasts: [{ messageKey: '', fallback: '生成器已放置到棋盘', type: 'info' }] };
                }
                return result;
            }

            case 'ssr_generator': {
                const result = emptyResult();
                const genItemId = value?.genChain ? `${value.genChain}_${value.level}` : null;
                if (!genItemId) {
                    result.ui = { toasts: [{ messageKey: '', fallback: '效果配置错误', type: 'error' }] };
                    return result;
                }
                const emptyIdx = deps.findEmptyCell();
                if (emptyIdx === -1) {
                    result.applyTo.inventory = { addItems: [{ itemId: genItemId, count: 1 }] };
                } else {
                    result.applyTo.board = { placeItems: [{ cellIndex: emptyIdx, itemId: genItemId }] };
                }
                if (value?.cgId) {
                    result.applyTo.cgAlbum = { unlockCGs: [{ cgId: value.cgId, storyIndex: 0 }] };
                }
                result.ui = { toasts: [{ messageKey: '', fallback: '✨ SSR生成器已放置！', type: 'info' }] };
                return result;
            }

            default:
                return {
                    applyTo: {},
                    ui: { toasts: [{ messageKey: '', fallback: `Unknown instant effect: ${effect}`, type: 'error' }] },
                };
        }
    },

    resolveConsumableEffect(
        effect: string,
        itemId: string,
        value: GachaPoolItemValue | undefined,
        deps: ConsumableEffectDeps,
    ): ResolveResult {
        switch (effect) {
            case 'add_energy_item': {
                const result = emptyResult();
                const calc = ItemEffectLogic.calculateAddEnergy(value, itemId, deps.items, deps.energyItem);
                if (calc.add) result.applyTo.energy = { add: calc.add };
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: `⚡ +${calc.add} 体力`, type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            case 'double_gen': {
                const result = emptyResult();
                const calc = ItemEffectLogic.calculateDoubleGenTurns(value, deps.doubleGen);
                result.applyTo.board = { activateDoubleGenTurns: calc.activateDoubleGenTurns };
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: `⚡ 生成器双倍产出 ${calc.activateDoubleGenTurns} 回合`, type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            case 'reroll': {
                // reroll logic is in BoardService.resolveReroll (pure function with deps.random).
                // Store's rerollItems() delegates to Service and applies mutations.
                const result = emptyResult();
                const count = value?.count || deps.reroll.defaultCount;
                const rerolled = deps.rerollItems(count, deps.items);
                result.applyTo.save = { saveAll: true };
                if (rerolled === 0) {
                    result.applyTo.inventory = { addItems: [{ itemId, count: 1 }] };
                    result.ui = { toasts: [{ messageKey: '', fallback: '没有可置换的物品', type: 'info' }], closeSheets: ['inventory-sheet'] };
                } else {
                    result.ui = { toasts: [{ messageKey: '', fallback: `🔄 置换了 ${rerolled} 个物品`, type: 'info' }], closeSheets: ['inventory-sheet'] };
                }
                return result;
            }

            case 'lucky_coin': {
                const result = emptyResult();
                const calc = ItemEffectLogic.calculateLuckyCoin(value, deps.luckyCoin);
                result.applyTo.currency = { addGold: calc.addGold || undefined, addDiamonds: calc.addDiamonds || undefined };
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: `🍀 幸运七号：💰${calc.addGold} 💎${calc.addDiamonds}`, type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            case 'clear_lv1': {
                const result = emptyResult();
                if (!deps.items) return { applyTo: {}, ui: { toasts: [{ messageKey: '', fallback: '效果配置错误', type: 'error' }] } };
                const targetLevels = deps.clearLv1.targetLevels;
                const energyPerItem = deps.clearLv1.energyPerItem;
                const clearable = ItemEffectLogic.findClearableCells(targetLevels, deps.findAllItemsByLevel, deps.getCell, deps.items);
                if (clearable.length === 0) {
                    result.applyTo.inventory = { addItems: [{ itemId, count: 1 }] };
                    result.applyTo.save = { saveAll: true };
                    result.ui = { toasts: [{ messageKey: '', fallback: '没有Lv.1物品需要清理', type: 'info' }], closeSheets: ['inventory-sheet'] };
                    return result;
                }
                const reward = ItemEffectLogic.calculateClearReward(clearable.length, energyPerItem);
                result.applyTo.board = { clearCells: clearable };
                result.applyTo.energy = { add: reward.add };
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: `清理了 ${clearable.length} 个Lv.1物品`, type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            case 'space_clean': {
                const result = emptyResult();
                if (!deps.items) return { applyTo: {}, ui: { toasts: [{ messageKey: '', fallback: '效果配置错误', type: 'error' }] } };
                const targetLevels = deps.spaceClean.targetLevels;
                const energyPerItem = deps.spaceClean.energyPerItem;
                const clearable = ItemEffectLogic.findClearableCells(targetLevels, deps.findAllItemsByLevel, deps.getCell, deps.items);
                if (clearable.length === 0) {
                    result.applyTo.inventory = { addItems: [{ itemId, count: 1 }] };
                    result.applyTo.save = { saveAll: true };
                    result.ui = { toasts: [{ messageKey: '', fallback: '没有低级物品需要清理', type: 'info' }], closeSheets: ['inventory-sheet'] };
                    return result;
                }
                const reward = ItemEffectLogic.calculateClearReward(clearable.length, energyPerItem);
                result.applyTo.board = { clearCells: clearable };
                result.applyTo.energy = { add: reward.add };
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: `清理了 ${clearable.length} 个低级物品`, type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            case 'gen_refresh': {
                const result = emptyResult();
                result.applyTo.board = { resetGenerators: true };
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: '已重置所有生成器冷却', type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            case 'upgrade_item': {
                const result = emptyResult();
                result.applyTo.board = { upgradeActive: true };
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: '⬆️ 点击棋盘上的物品使其升级', type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            case 'ssr_generator': {
                const result = emptyResult();
                const genItemId = value?.genChain ? `${value.genChain}_${value.level}` : itemId;
                const emptyIdx = deps.findEmptyCell();
                if (emptyIdx === -1) {
                    result.applyTo.inventory = { addItems: [{ itemId, count: 1 }] };
                    result.applyTo.save = { saveAll: true };
                    result.ui = { toasts: [{ messageKey: '', fallback: '棋盘已满，无法放置生成器', type: 'error' }], closeSheets: ['inventory-sheet'] };
                    return result;
                }
                result.applyTo.board = { placeItems: [{ cellIndex: emptyIdx, itemId: genItemId }] };
                if (value?.cgId) {
                    result.applyTo.cgAlbum = { unlockCGs: [{ cgId: value.cgId, storyIndex: 0 }] };
                }
                result.applyTo.save = { saveAll: true };
                result.ui = { toasts: [{ messageKey: '', fallback: '✨ SSR生成器已放置！', type: 'info' }], closeSheets: ['inventory-sheet'] };
                return result;
            }

            default:
                return {
                    applyTo: {},
                    ui: { toasts: [{ messageKey: '', fallback: `Unknown consumable effect: ${effect}`, type: 'error' }] },
                };
        }
    },
};
