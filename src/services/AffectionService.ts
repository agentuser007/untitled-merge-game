// ============================================================
// AffectionService.ts — Pure affection gain calculation (Service layer)
// ============================================================
// Handles: bossfsm:stateChanged (boss defeat), affection:vnCompleted
// No Vue dependency. All functions are pure — deps injected as plain objects.
// ============================================================

import type { ResolveResult } from './ServiceResultTypes';
import { emptyResult } from './ServiceResultTypes';
import type { AffectionShopItem } from '@/types/game';

// --- Deps types ---

export interface AffectionConfig {
    bossToCharacter?: Record<string, string>;
    sources?: {
        bossDefeat?: { base: number; perLoop: number };
        vnStorySSR?: number;
        vnStorySR?: number;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface BossDefeatDeps {
    affectionConfig?: AffectionConfig;
    bossLevelIdx: number;
    loopIndex: number;
}

export interface VnCompletedDeps {
    affectionConfig?: AffectionConfig;
}

// --- resolveBossDefeat ---

export function resolveBossDefeat(deps: BossDefeatDeps): ResolveResult {
    const bossToChar = deps.affectionConfig?.bossToCharacter || {};
    const characterId = bossToChar[String(deps.bossLevelIdx)];
    if (!characterId) return emptyResult();

    const sources = deps.affectionConfig?.sources?.bossDefeat || { base: 15, perLoop: 3 };
    const amount = sources.base + sources.perLoop * (deps.loopIndex - 1);

    return {
        applyTo: {
            affection: {
                addAffections: [{ characterId, amount, source: 'bossDefeat' }],
            },
        },
    };
}

// --- resolveVnCompleted ---

export interface VnCompletedData {
    maleLeadId?: string;
    isSSR?: boolean;
    [key: string]: unknown;
}

export function resolveVnCompleted(
    data: VnCompletedData | null | undefined,
    deps: VnCompletedDeps,
): ResolveResult {
    if (!data || !data.maleLeadId) return emptyResult();

    const characterId = data.maleLeadId;

    const sources = deps.affectionConfig?.sources || {};
    const amount = data.isSSR
        ? (sources.vnStorySSR || 50)
        : (sources.vnStorySR || 20);

    return {
        applyTo: {
            affection: {
                addAffections: [{ characterId, amount, source: 'vnStory' }],
            },
        },
    };
}

export interface ShopItemEffectDeps {
    energyMax: number;
    energyCurrent: number;
}

export function resolveShopItemEffect(item: AffectionShopItem, deps: ShopItemEffectDeps): ResolveResult {
    const effect = item?.effect as Record<string, unknown> | undefined;
    if (!effect) return emptyResult();

    const effectType = effect.type as string | undefined;
    switch (effectType) {
        case 'energy': {
            return { applyTo: { energy: { add: effect.value as number } } };
        }
        case 'energy_full': {
            return { applyTo: { energy: { add: deps.energyMax - deps.energyCurrent } } };
        }
        case 'daily_order_refresh': {
            return { applyTo: { dailyOrders: { rollNewOrders: true } } };
        }
        default: {
            return {
                applyTo: {},
                events: [{ name: 'affection:shopEffect', data: { item, effect } }],
            };
        }
    }
}

export const AffectionService = {
    resolveBossDefeat,
    resolveVnCompleted,
    resolveShopItemEffect,
};
