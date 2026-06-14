// ============================================================
// inventoryStore.ts — Inventory Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import type { InventoryItemMeta, InventoryItem as GameInventoryItem } from '../types/game';

export type InventoryItem = GameInventoryItem;

export const useInventoryStore = defineStore('inventory', () => {
    // --- State ---
    const slots = ref<Record<string, number>>({}); // item_id -> count
    const maxSlots = ref<number>(Infinity); // Unlimited capacity
    const itemMetadata = ref<Record<string, InventoryItemMeta>>({}); // item_id -> effect metadata

    // --- Computed ---
    const totalItems = computed(() => {
        return Object.keys(slots.value).filter(id => slots.value[id] > 0).length;
    });
    
    const uniqueItems = computed(() => {
        return Object.keys(slots.value).filter(id => slots.value[id] > 0);
    });
    
    const isFull = computed(() => false);
    
    const availableSlots = computed((): number => Infinity);
    
    const isEmpty = computed(() => {
        return totalItems.value === 0;
    });

    // --- Actions ---
    function addItem(item: InventoryItem | string, count: number = 1, meta?: InventoryItemMeta): boolean {
        const itemId = typeof item === 'string' ? item : item.id;
        
        slots.value[itemId] = (slots.value[itemId] || 0) + count;

        // Store metadata if provided (only when count goes from 0 to positive)
        if (meta && slots.value[itemId] === count) {
            itemMetadata.value[itemId] = meta;
        }
        
        // Emit event for UI updates
        globalBus.emit('inventory:itemAdded', {
            itemId,
            count,
            total: slots.value[itemId]
        });
        
        return true;
    }

    function removeItem(itemId: string, count: number = 1): boolean {
        if (!slots.value[itemId] || slots.value[itemId] < count) {
            return false;
        }
        
        slots.value[itemId] -= count;
        if (slots.value[itemId] <= 0) {
            delete slots.value[itemId];
            // Clean up metadata when count reaches 0
            delete itemMetadata.value[itemId];
        }
        
        // Emit event for UI updates
        globalBus.emit('inventory:itemRemoved', {
            itemId,
            count,
            remaining: slots.value[itemId] || 0
        });
        
        return true;
    }

    function useItem(itemId: string, targetCellIndex: number | null = null): boolean {
        if (!hasItem(itemId)) {
            return false;
        }

        // Capture metadata before removal
        const meta = itemMetadata.value[itemId];
        
        // Remove one item
        removeItem(itemId, 1);
        
        // Emit event for item usage — include effect metadata
        globalBus.emit('inventory:itemUsed', {
            itemId,
            targetCellIndex,
            effect: meta?.effect,
            value: meta?.value,
        });
        
        return true;
    }

    function hasItem(itemId: string): boolean {
        return !!slots.value[itemId] && slots.value[itemId] > 0;
    }

    function getCount(itemId: string): number {
        return slots.value[itemId] || 0;
    }

    function getItemMeta(itemId: string): InventoryItemMeta | undefined {
        return itemMetadata.value[itemId];
    }

    function clear() {
        slots.value = {};
        itemMetadata.value = {};
        
        // Emit event for UI updates
        globalBus.emit('inventory:cleared');
    }

    function expandSlots(_additionalSlots: number): boolean {
        // No-op: capacity is unlimited
        return true;
    }

    function getItemIds(): string[] {
        return Object.keys(slots.value).filter(id => slots.value[id] > 0);
    }

    function getItems(): Array<{ id: string; count: number }> {
        return Object.entries(slots.value)
            .filter(([_, count]) => count > 0)
            .map(([id, count]) => ({ id, count }));
    }

    // --- Serialization ---
    function serialize() {
        return {
            slots: { ...slots.value },
            maxSlots: maxSlots.value,
            itemMetadata: { ...itemMetadata.value }
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { slots?: Record<string, number>; maxSlots?: number; itemMetadata?: Record<string, InventoryItemMeta> };
        
        slots.value = d.slots || {};
        maxSlots.value = d.maxSlots != null ? d.maxSlots : Infinity;
        itemMetadata.value = d.itemMetadata || {};

        // Migration: convert old "energy_potion" to "energy_potion_20"
        if (slots.value['energy_potion']) {
            const count = slots.value['energy_potion'];
            delete slots.value['energy_potion'];
            slots.value['energy_potion_20'] =
                (slots.value['energy_potion_20'] || 0) + count;
            delete itemMetadata.value['energy_potion'];
            itemMetadata.value['energy_potion_20'] = {
                effect: 'add_energy_item',
                value: { energy: 20 },
            };
        }
    }

    return {
        // State
        slots,
        maxSlots,
        itemMetadata,
        
        // Computed
        totalItems,
        uniqueItems,
        isFull,
        availableSlots,
        isEmpty,
        
        // Actions
        addItem,
        removeItem,
        useItem,
        hasItem,
        getCount,
        getItemMeta,
        clear,
        expandSlots,
        getItemIds,
        getItems,
        
        // Serialization
        serialize,
        deserialize
    };
});