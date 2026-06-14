// ============================================================
// InventoryService.ts — Pure inventory item use logic (Service layer)
// ============================================================
// Handles: inventory:itemUsed
// Delegates to 5 sub-functions by item type:
//   resolveJokerUse, resolveScissorUse, resolveConsumableUse,
//   resolveLegacyPotionUse, resolveStandardPlacement
// No Vue dependency. All functions are pure — deps injected as plain objects.
// ============================================================

import type { ResolveResult } from './ServiceResultTypes';
import { emptyResult, mergeResolveResult } from './ServiceResultTypes';
import { ItemEffectService, type ConsumableEffectDeps } from './ItemEffectService';
import type { GachaPoolItemValue } from '../types/game';

function isGachaPoolItemValue(v: unknown): v is GachaPoolItemValue {
    // NOTE: GachaPoolItemValue所有字段均optional，最小合法值为{}
    // 此guard仅防御null/原始类型/数组，不校验字段结构
    // 6/74实际数据为空{}（add_joker/add_scissor/clear_lv1/gen_refresh/space_clean/upgrade_item）
    return v === undefined || (typeof v === 'object' && v !== null && !Array.isArray(v));
}

// --- Shared dep types ---

export interface InventoryItemConfig {
    type?: string;
    level?: number;
    name?: string;
    energyRecover?: number;
    nextId?: string | null;
    [key: string]: unknown;
}

export interface InventoryDeps {
    items: Record<string, InventoryItemConfig>;
    findEmptyCell: () => number;
    getEffectCategory: (effect: string) => string;
    effectDeps: ConsumableEffectDeps;
    energyItem: { defaultRecover: number };
}

// --- resolveJokerUse ---

export function resolveJokerUse(itemId: string, deps: InventoryDeps): ResolveResult {
    const emptyIdx = deps.findEmptyCell();
    if (emptyIdx !== -1) {
        return {
            applyTo: {
                board: { placeItems: [{ cellIndex: emptyIdx, itemId }] },
                save: { saveAll: true },
            },
            ui: { closeSheets: ['inventory-sheet'] },
        };
    }
    return {
        applyTo: {
            inventory: { addItems: [{ itemId, count: 1 }] },
            save: { saveAll: true },
        },
        ui: {
            toasts: [{
                messageKey: 'inventory.boardFullUse',
                fallback: '❌ 棋盘已满，无法放置！',
                type: 'error',
            }],
            closeSheets: ['inventory-sheet'],
        },
    };
}

// --- resolveScissorUse ---

export function resolveScissorUse(): ResolveResult {
    return {
        applyTo: {
            board: { scissorActive: true },
            save: { saveAll: true },
        },
        ui: {
            toasts: [{
                messageKey: 'inventory.scissorHint',
                fallback: '✂️ 点击棋盘上的物品进行拆分！',
                type: 'info',
            }],
            closeSheets: ['inventory-sheet'],
        },
    };
}

// --- resolveConsumableUse ---

export function resolveConsumableUse(
    effect: string,
    itemId: string,
    value: GachaPoolItemValue | undefined,
    deps: InventoryDeps,
): ResolveResult {
    if (!isGachaPoolItemValue(value)) {
        return {
            applyTo: {},
            ui: { toasts: [{ messageKey: 'inventory.invalidValue', fallback: '道具效果数据异常', type: 'error' }] },
        };
    }
    return ItemEffectService.resolveConsumableEffect(effect, itemId, value, deps.effectDeps);
}

// --- resolveLegacyPotionUse ---

export function resolveLegacyPotionUse(itemId: string, configItem: InventoryItemConfig, deps: InventoryDeps): ResolveResult {
    const energyRecover = configItem.energyRecover || deps.energyItem.defaultRecover;
    return {
        applyTo: {
            energy: { add: energyRecover },
            save: { saveAll: true },
        },
        ui: {
            toasts: [{
                messageKey: 'inventory.energyRecovered',
                messageParams: { count: energyRecover },
                fallback: `恢复了 ${energyRecover} 体力`,
                type: 'info',
            }],
            closeSheets: ['inventory-sheet'],
        },
    };
}

// --- resolveStandardPlacement ---

export function resolveStandardPlacement(
    itemId: string,
    configItem: InventoryItemConfig | undefined,
    deps: InventoryDeps,
): ResolveResult {
    const emptyIdx = deps.findEmptyCell();
    const name = configItem?.name || itemId;

    if (emptyIdx !== -1) {
        return {
            applyTo: {
                board: { placeItems: [{ cellIndex: emptyIdx, itemId }] },
                save: { saveAll: true },
            },
            ui: {
                toasts: [{
                    messageKey: 'inventory.usedItem',
                    messageParams: { name },
                    fallback: `使用了 ${name}`,
                    type: 'info',
                }],
                closeSheets: ['inventory-sheet'],
            },
        };
    }

    return {
        applyTo: {
            inventory: { addItems: [{ itemId, count: 1 }] },
            save: { saveAll: true },
        },
        ui: {
            toasts: [{
                messageKey: 'inventory.boardFullUse',
                fallback: '❌ 棋盘已满，无法放置！',
                type: 'error',
            }],
            closeSheets: ['inventory-sheet'],
        },
    };
}

// --- resolveItemUsed (public dispatcher) ---

export interface ItemUsedData {
    itemId: string;
    effect?: string;
    value?: GachaPoolItemValue;
    [key: string]: unknown;
}

export function resolveItemUsed(
    data: ItemUsedData | null | undefined,
    deps: InventoryDeps,
): ResolveResult {
    if (!data || !data.itemId) return emptyResult();

    const { itemId, effect, value } = data;

    if (effect === 'add_joker' || itemId === 'joker') {
        return resolveJokerUse(itemId, deps);
    }

    if (effect === 'add_scissor') {
        return resolveScissorUse();
    }

    if (effect && deps.getEffectCategory(effect) === 'consumable') {
        return resolveConsumableUse(effect, itemId, value, deps);
    }

    const configItem = deps.items[itemId];

    if (configItem && configItem.type === 'ENERGY_POTION') {
        return resolveLegacyPotionUse(itemId, configItem, deps);
    }

    return resolveStandardPlacement(itemId, configItem, deps);
}

export const InventoryService = {
    resolveItemUsed,
    resolveJokerUse,
    resolveScissorUse,
    resolveConsumableUse,
    resolveLegacyPotionUse,
    resolveStandardPlacement,
};
