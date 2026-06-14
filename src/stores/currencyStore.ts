// ============================================================
// currencyStore.ts — Currency Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { CurrencyLogic } from '../logic/CurrencyLogic';
import { devConfig } from '../core/DevConfig';

function emitEvents(events: { type: string; payload?: unknown }[]): void {
    globalBus.emitLogicEvents(events);
}

export const useCurrencyStore = defineStore('currency', () => {
    // --- State ---
    const gold = ref(0);
    const diamonds = ref(0);

    // --- Logic instance ---
    const logic = new CurrencyLogic();

    // Initialize state from logic
    gold.value = logic.gold;
    diamonds.value = logic.diamonds;

    // --- Computed ---
    const totalBalance = computed(() => gold.value + diamonds.value);

    // --- Actions ---
    function addGold(amount: number): void {
        const events = logic.addGold(amount);
        gold.value = logic.gold;
        emitEvents(events);
    }

    function setGold(value: number): void {
        const events = logic.setGold(value);
        gold.value = logic.gold;
        emitEvents(events);
    }

    function spendGold(amount: number): boolean {
        if (devConfig.enabled && devConfig.unlimitedGold) return true;
        const { success, events } = logic.spendGold(amount);
        gold.value = logic.gold;
        emitEvents(events);
        return success;
    }

    function canAffordGold(amount: number): boolean {
        if (devConfig.enabled && devConfig.unlimitedGold) return true;
        return logic.canAffordGold(amount);
    }

    function addDiamonds(amount: number): void {
        const events = logic.addDiamonds(amount);
        diamonds.value = logic.diamonds;
        emitEvents(events);
    }

    function spendDiamonds(amount: number): boolean {
        if (devConfig.enabled && devConfig.unlimitedDiamonds) return true;
        const { success, events } = logic.spendDiamonds(amount);
        diamonds.value = logic.diamonds;
        emitEvents(events);
        return success;
    }

    function canAffordDiamonds(amount: number): boolean {
        if (devConfig.enabled && devConfig.unlimitedDiamonds) return true;
        return logic.canAffordDiamonds(amount);
    }

    // Static helper method for formatting gold
    function formatGold(amount: number): string {
        if (amount >= 1000000) {
            return (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toString();
    }

    // --- Serialization ---
    function serialize() {
        return {
            gold: gold.value,
            diamonds: diamonds.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { gold?: number; diamonds?: number };
        
        logic.gold = d.gold ?? logic.gold;
        logic.diamonds = d.diamonds ?? logic.diamonds;
        
        gold.value = logic.gold;
        diamonds.value = logic.diamonds;
    }

    return {
        // State
        gold,
        diamonds,
        
        // Computed
        totalBalance,
        
        // Actions
        addGold,
        setGold,
        spendGold,
        canAffordGold,
        addDiamonds,
        spendDiamonds,
        canAffordDiamonds,
        formatGold,
        
        // Serialization
        serialize,
        deserialize
    };
});
