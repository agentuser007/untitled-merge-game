// ============================================================
// ShopService.ts — Pure shop purchase effect logic (Service layer)
// ============================================================
// Handles: shop:itemPurchased
// No Vue dependency. All functions are pure — deps injected as plain objects.
// ============================================================

import type { ResolveResult } from './ServiceResultTypes';
import { emptyResult } from './ServiceResultTypes';

// --- Deps types ---

export interface ShopItemData {
    id?: string;
    cost?: number;
    effect?: string;
    value?: {
        energy?: number;
        energyPerItem?: number;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface ShopDeps {
    items: Record<string, { type?: string; level?: number; [key: string]: unknown }> | null;
    findEmptyCell: () => number;
    cells: unknown[];
    getCell: (index: number) => string | null;
}

// --- resolveShopItemPurchased ---

export interface ShopItemPurchasedData {
    item: ShopItemData;
    [key: string]: unknown;
}

export function resolveShopItemPurchased(
    data: ShopItemPurchasedData | null | undefined,
    deps: ShopDeps,
): ResolveResult {
    if (!data || !data.item) return emptyResult();

    const { effect, value } = data.item;
    const result: ResolveResult = { applyTo: { save: { saveAll: true } } };

    switch (effect) {
        case 'add_energy_item':
            if (value?.energy) {
                result.applyTo.energy = { add: value.energy };
            }
            break;

        case 'add_joker': {
            const emptyIdx = deps.findEmptyCell();
            if (emptyIdx !== -1) {
                const jokerId = deps.items
                    ? Object.keys(deps.items).find(id => deps.items![id]?.type === 'JOKER')
                    : null;
                if (jokerId) {
                    result.applyTo.board = { placeItems: [{ cellIndex: emptyIdx, itemId: jokerId }] };
                }
            }
            break;
        }

        case 'add_scissor': {
            if (!value?.itemId) {
                throw new Error('[ShopService] add_scissor: value.itemId is required but missing');
            }
            result.applyTo.inventory = { addItems: [{ itemId: value.itemId as string, count: 1, meta: { effect, value } }] };
            break;
        }

        case 'clear_lv1': {
            const items = deps.items;
            if (!items) break;
            const clearCells: number[] = [];
            for (let i = 0; i < deps.cells.length; i++) {
                const cellId = deps.getCell(i);
                if (cellId && items[cellId] && items[cellId].level === 1 && items[cellId].type !== 'GENERATOR') {
                    clearCells.push(i);
                }
            }
            if (clearCells.length > 0) {
                if (value?.energyPerItem === undefined) {
                    throw new Error('[ShopService] clear_lv1: value.energyPerItem is required but missing');
                }
                const energyPerItem = value.energyPerItem;
                result.applyTo.board = { clearCells };
                result.applyTo.energy = { add: clearCells.length * energyPerItem };
            }
            break;
        }

        default:
            throw new Error(`[ShopService] Unknown shop effect: ${effect}`);
    }

    return result;
}

export const ShopService = {
    resolveShopItemPurchased,
};
