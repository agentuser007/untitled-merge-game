// ============================================================
// affectionStore.ts — Affection & Affection Coins Store
// ============================================================
// Manages relationship levels, affection coins, and shop purchases.
// Belongs to META save (permanent across loops).
// ============================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { globalBus } from '../core/EventBus';
import { useConfigStore } from './configStore';
import { useEnergyStore } from './energyStore';
import { AffectionService } from '../services/AffectionService';
import type { ResolveResult } from '../services/ServiceResultTypes';
import type { AffectionLevelDef, TouchZone, AffectionShopItem } from '@/types/game';

export interface ShopPurchaseRecord {
    totalPurchased: number;
    lastPurchaseDate: string;
}

export const useAffectionStore = defineStore('affection', () => {
    const affection = ref<Record<string, number>>({});
    const affectionCoins = ref(0);
    const shopPurchaseHistory = ref<Record<string, ShopPurchaseRecord>>({});
    const giftHistory = ref<Record<string, Record<string, number>>>({});
    const lastTouchTime = ref<Record<string, Record<string, number>>>({});
    const _selectedCharacterId = ref<string>('morven');

    function _todayStr(): string {
        return new Date().toISOString().slice(0, 10);
    }

    function _resetDailyIfNeeded(record: ShopPurchaseRecord): ShopPurchaseRecord {
        const today = _todayStr();
        if (record.lastPurchaseDate !== today) {
            return { totalPurchased: 0, lastPurchaseDate: today };
        }
        return record;
    }

    function _getLevelFromPoints(points: number): number {
        const configStore = useConfigStore();
        const levels = configStore.affectionConfig?.levels || [];
        for (let i = levels.length - 1; i >= 0; i--) {
            if (points >= levels[i].minPoints) return levels[i].level;
        }
        return 0;
    }

    function getPoints(characterId: string): number {
        return affection.value[characterId] || 0;
    }

    function getLevel(characterId: string): number {
        return _getLevelFromPoints(getPoints(characterId));
    }

    function getLevelName(characterId: string): string {
        const level = getLevel(characterId);
        const configStore = useConfigStore();
        const levels = configStore.affectionConfig?.levels || [];
        const entry = levels.find((l: AffectionLevelDef) => l.level === level);
        return entry?.name || `Lv.${level}`;
    }

    function getLevelProgress(characterId: string): number {
        const points = getPoints(characterId);
        const level = getLevel(characterId);
        const configStore = useConfigStore();
        const levels = configStore.affectionConfig?.levels || [];
        const current = levels.find((l: AffectionLevelDef) => l.level === level);
        if (!current || current.maxPoints === undefined) return 0;
        if (level === 5) return 1;
        const minP = current.minPoints;
        const maxP = current.maxPoints;
        return Math.min(1, (points - minP) / (maxP - minP + 1));
    }

    function getUnlockedZones(characterId: string): string[] {
        const configStore = useConfigStore();
        const zones = configStore.touchInteractions?.zones || [];
        const level = getLevel(characterId);
        return zones.filter((z: TouchZone) => z.unlockLevel <= level).map((z: TouchZone) => z.id);
    }

    function getMaxLevel(): number {
        let max = 0;
        for (const charId of Object.keys(affection.value)) {
            const lv = getLevel(charId);
            if (lv > max) max = lv;
        }
        return max;
    }

    function getUnlockedShopItems(): AffectionShopItem[] {
        const configStore = useConfigStore();
        const items = configStore.affectionShop?.items || [];
        const maxLevel = getMaxLevel();
        return items.filter((item: AffectionShopItem) => item.unlockLevel <= maxLevel);
    }

    function canAffordCoins(amount: number): boolean {
        return affectionCoins.value >= amount;
    }

    function getDailyPurchasesLeft(itemId: string, dailyLimit: number | null): number {
        if (dailyLimit === null || dailyLimit === undefined) return Infinity;
        const record = shopPurchaseHistory.value[itemId];
        if (!record) return dailyLimit;
        const reset = _resetDailyIfNeeded(record);
        return Math.max(0, dailyLimit - reset.totalPurchased);
    }

    function addAffection(characterId: string, amount: number, source: string): void {
        const oldPoints = affection.value[characterId] || 0;
        const oldLevel = _getLevelFromPoints(oldPoints);
        affection.value[characterId] = oldPoints + amount;

        const newLevel = _getLevelFromPoints(affection.value[characterId]);

        earnCoins(amount, source);

        globalBus.emit('affection:changed', { characterId, delta: amount, source });

        if (newLevel > oldLevel) {
            globalBus.emit('affection:levelUp', { characterId, newLevel, oldLevel });
            const configStore = useConfigStore();
            const bonuses = configStore.affectionConfig?.affectionCoins?.levelUpBonuses || {};
            const bonus = bonuses[String(newLevel)] || 0;
            if (bonus > 0) {
                earnCoins(bonus, 'levelUp');
            }
        }
    }

    function earnCoins(amount: number, source: string): void {
        affectionCoins.value += amount;
        globalBus.emit('affection:coinsEarned', { amount, source });
    }

    function spendCoins(amount: number): boolean {
        if (affectionCoins.value < amount) return false;
        affectionCoins.value -= amount;
        return true;
    }

    function purchaseShopItem(itemId: string): { success: boolean; resolveResult: ResolveResult } {
        const configStore = useConfigStore();
        const items = configStore.affectionShop?.items || [];
        const item = items.find((i: AffectionShopItem) => i.id === itemId);
        if (!item) return { success: false, resolveResult: { applyTo: {} } };

        const maxLevel = getMaxLevel();
        if (item.unlockLevel > maxLevel) return { success: false, resolveResult: { applyTo: {} } };

        if (!canAffordCoins(item.price)) return { success: false, resolveResult: { applyTo: {} } };

        if (item.dailyLimit !== null && item.dailyLimit !== undefined) {
            const left = getDailyPurchasesLeft(itemId, item.dailyLimit);
            if (left <= 0) return { success: false, resolveResult: { applyTo: {} } };

            const record = shopPurchaseHistory.value[itemId];
            const total = record?.totalPurchased || 0;
            if (total >= item.dailyLimit) return { success: false, resolveResult: { applyTo: {} } };
        }

        if (!spendCoins(item.price)) return { success: false, resolveResult: { applyTo: {} } };

        const today = _todayStr();
        if (!shopPurchaseHistory.value[itemId]) {
            shopPurchaseHistory.value[itemId] = { totalPurchased: 0, lastPurchaseDate: today };
        }
        const record = _resetDailyIfNeeded(shopPurchaseHistory.value[itemId]);
        record.totalPurchased += 1;
        record.lastPurchaseDate = today;
        shopPurchaseHistory.value[itemId] = record;

        const { resolveResult } = applyShopItemEffect(item);

        if ((item?.effect?.type as string) === 'affection' && item.characterId) {
            addAffection(item.characterId, item.effect.value as number, 'gift');
        }

        return { success: true, resolveResult };
    }

    function applyShopItemEffect(item: AffectionShopItem): { resolveResult: ResolveResult; affectionSelfCall?: boolean } {
        const energyStore = useEnergyStore();
        const result = AffectionService.resolveShopItemEffect(item, {
            energyMax: energyStore.max,
            energyCurrent: energyStore.current,
        });

        return { resolveResult: result, affectionSelfCall: (item?.effect?.type as string) === 'affection' && !!item.characterId };
    }

    function giftItem(characterId: string, giftId: string): boolean {
        const configStore = useConfigStore();
        const items = configStore.affectionShop?.items || [];
        const gift = items.find((i: AffectionShopItem) => i.id === giftId);
        if (!gift) return false;

        const effect = gift.effect as Record<string, unknown>;
        if (!effect || effect.type !== 'affection') return false;

        let value = effect.value as number;
        if (gift.giftPreference === 'loved' && gift.characterId === characterId) {
            value = Math.floor(value * 1.5);
        } else if (gift.giftPreference === 'liked') {
            value = Math.floor(value * 1.2);
        }

        addAffection(characterId, value, 'gift');

        if (!giftHistory.value[characterId]) {
            giftHistory.value[characterId] = {};
        }
        giftHistory.value[characterId][giftId] = (giftHistory.value[characterId][giftId] || 0) + 1;

        globalBus.emit('affection:giftGiven', {
            characterId,
            giftId,
            affectionGained: value
        });

        return true;
    }

    function recordTouch(characterId: string, zoneId: string): void {
        if (!lastTouchTime.value[characterId]) {
            lastTouchTime.value[characterId] = {};
        }
        lastTouchTime.value[characterId][zoneId] = Date.now();
    }

    function resetDailyPurchases(): void {
        const today = _todayStr();
        for (const itemId of Object.keys(shopPurchaseHistory.value)) {
            if (shopPurchaseHistory.value[itemId].lastPurchaseDate !== today) {
                shopPurchaseHistory.value[itemId] = {
                    totalPurchased: 0,
                    lastPurchaseDate: today
                };
            }
        }
    }

    function serialize() {
        return {
            affection: { ...affection.value },
            affectionCoins: affectionCoins.value,
            shopPurchaseHistory: { ...shopPurchaseHistory.value },
            giftHistory: { ...giftHistory.value },
            lastTouchTime: { ...lastTouchTime.value }
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as { affection?: Record<string, number>; affectionCoins?: number; shopPurchaseHistory?: Record<string, ShopPurchaseRecord>; giftHistory?: Record<string, Record<string, number>>; lastTouchTime?: Record<string, Record<string, number>> };
        affection.value = d.affection || {};
        affectionCoins.value = d.affectionCoins ?? 0;
        shopPurchaseHistory.value = d.shopPurchaseHistory || {};
        giftHistory.value = d.giftHistory || {};
        lastTouchTime.value = d.lastTouchTime || {};
    }

    return {
        affection,
        affectionCoins,
        shopPurchaseHistory,
        giftHistory,
        lastTouchTime,
        _selectedCharacterId,

        getPoints,
        getLevel,
        getLevelName,
        getLevelProgress,
        getUnlockedZones,
        getMaxLevel,
        getUnlockedShopItems,
        canAffordCoins,
        getDailyPurchasesLeft,

        addAffection,
        earnCoins,
        spendCoins,
        purchaseShopItem,
        applyShopItemEffect,
        giftItem,
        recordTouch,
        resetDailyPurchases,

        serialize,
        deserialize
    };
});