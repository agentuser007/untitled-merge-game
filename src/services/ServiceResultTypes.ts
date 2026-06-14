// ============================================================
// ServiceResultTypes.ts — Shared return types for Service layer
// ============================================================
// Every resolve function returns a ResolveResult with applyTo,
// events, and optional ui instructions. No Vue dependency.
// ============================================================

import type { InventoryItemMeta, Rarity, LoopStatus, DailyOrderState } from '../types/game';

export type ToastType = 'info' | 'sr' | 'ssr' | 'error';

export interface ResolveResult {
    applyTo: {
        currency?: { addGold?: number; addDiamonds?: number; spendDiamonds?: number };
        energy?: { add?: number; spend?: number; setMax?: number; setRegenInterval?: number };
        board?: {
            placeItems?: Array<{ cellIndex: number; itemId: string }>;
            clearCells?: number[];
            scissorActive?: boolean;
            activateDoubleGenTurns?: number;
            resetGenerators?: boolean;
            upgradeActive?: boolean;
        };
        inventory?: { addItems?: Array<{ itemId: string; count: number; meta?: InventoryItemMeta }> };
        fragment?: { addFragments?: Array<{ fragmentId: string; count: number }> };
        cgAlbum?: { unlockCGs?: Array<{ cgId: string; storyIndex: number }> };
        achievement?: {
            incrementStats?: Array<{ key: string; amount: number }>;
            checkAll?: boolean;
            resetLoopAchievements?: boolean;
        };
        affection?: {
            addAffections?: Array<{ characterId: string; amount: number; source: string }>;
            recordTouch?: { characterId: string; zoneId: string };
        };
        gacha?: { singlePull?: { rarity: Rarity } };
        loop?: {
            syncLoopStatus?: LoopStatus;
            incrementLoopIndex?: { addLoopTokens?: number };
        };
        collection?: { resetLoopDiscoveries?: boolean };
        dailyOrders?: {
            rollNewOrders?: boolean;
            setFrozenOrders?: DailyOrderState[] | null;
        };
        save?: { saveAll?: boolean; saveMeta?: boolean };
    };
    events?: Array<{ name: string; data: unknown }>;
    ui?: {
        toasts?: Array<{
            messageKey: string;
            messageParams?: Record<string, unknown>;
            fallback: string;
            type: ToastType;
        }>;
        closeSheets?: string[];
    };
}

export function emptyResult(): ResolveResult {
    return { applyTo: {} };
}

// ============================================================
// mergeResolveResult — merges source into target ResolveResult
// ============================================================
// Explicit per-field merge (not generic deep merge).
// - Numeric additive fields (addGold, addDiamonds, etc.): sum, || undefined when 0
// - energy.spend: 0 has semantic meaning, use explicit presence check
// - setMax / setRegenInterval: last-writer-wins (source overrides target)
// - Array fields: concat
// - Boolean fields: OR
// - events / ui.toasts / ui.closeSheets: concat
// ============================================================

function sumOrUndef(a: number | undefined, b: number | undefined): number | undefined {
    const s = (a ?? 0) + (b ?? 0);
    return s || undefined;
}

function sumPreserveZero(a: number | undefined, b: number | undefined): number | undefined {
    if (a === undefined && b === undefined) return undefined;
    return (a ?? 0) + (b ?? 0);
}

function mergeArr<T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined {
    const merged = [...(a ?? []), ...(b ?? [])];
    return merged.length ? merged : undefined;
}

export function mergeResolveResult(target: ResolveResult, source: ResolveResult): void {
    const sa = source.applyTo;
    const ta = target.applyTo;

    if (sa.currency) {
        ta.currency = {
            addGold: sumOrUndef(ta.currency?.addGold, sa.currency.addGold),
            addDiamonds: sumOrUndef(ta.currency?.addDiamonds, sa.currency.addDiamonds),
            spendDiamonds: sumOrUndef(ta.currency?.spendDiamonds, sa.currency.spendDiamonds),
        };
    }

    if (sa.energy) {
        ta.energy = {
            add: sumOrUndef(ta.energy?.add, sa.energy.add),
            spend: sumPreserveZero(ta.energy?.spend, sa.energy.spend),
            setMax: sa.energy.setMax ?? ta.energy?.setMax,
            setRegenInterval: sa.energy.setRegenInterval ?? ta.energy?.setRegenInterval,
        };
    }

    if (sa.board) {
        ta.board = {
            placeItems: mergeArr(ta.board?.placeItems, sa.board.placeItems),
            clearCells: mergeArr(ta.board?.clearCells, sa.board.clearCells),
            scissorActive: ta.board?.scissorActive || sa.board.scissorActive || undefined,
            activateDoubleGenTurns: sumOrUndef(ta.board?.activateDoubleGenTurns, sa.board.activateDoubleGenTurns),
            resetGenerators: ta.board?.resetGenerators || sa.board.resetGenerators || undefined,
            upgradeActive: ta.board?.upgradeActive || sa.board.upgradeActive || undefined,
        };
    }

    if (sa.inventory?.addItems) {
        ta.inventory = { addItems: [...(ta.inventory?.addItems ?? []), ...sa.inventory.addItems] };
    }

    if (sa.fragment?.addFragments) {
        ta.fragment = { addFragments: [...(ta.fragment?.addFragments ?? []), ...sa.fragment.addFragments] };
    }

    if (sa.cgAlbum?.unlockCGs) {
        ta.cgAlbum = { unlockCGs: [...(ta.cgAlbum?.unlockCGs ?? []), ...sa.cgAlbum.unlockCGs] };
    }

    if (sa.achievement) {
        ta.achievement = {
            incrementStats: mergeArr(ta.achievement?.incrementStats, sa.achievement.incrementStats),
            checkAll: ta.achievement?.checkAll || sa.achievement.checkAll || undefined,
            resetLoopAchievements: ta.achievement?.resetLoopAchievements || sa.achievement.resetLoopAchievements || undefined,
        };
    }

    if (sa.affection) {
        ta.affection = {
            addAffections: mergeArr(ta.affection?.addAffections, sa.affection.addAffections),
            recordTouch: sa.affection.recordTouch ?? ta.affection?.recordTouch,
        };
    }

    if (sa.gacha) {
        ta.gacha = sa.gacha;
    }

    if (sa.loop) {
        ta.loop = sa.loop;
    }

    if (sa.collection) {
        ta.collection = sa.collection;
    }

    if (sa.dailyOrders) {
        ta.dailyOrders = sa.dailyOrders;
    }

    if (sa.save) {
        ta.save = {
            saveAll: ta.save?.saveAll || sa.save.saveAll || undefined,
            saveMeta: ta.save?.saveMeta || sa.save.saveMeta || undefined,
        };
    }

    if (source.events) {
        target.events = [...(target.events ?? []), ...source.events];
    }

    if (source.ui?.toasts) {
        target.ui = { ...target.ui, toasts: [...(target.ui?.toasts ?? []), ...source.ui.toasts] };
    }

    if (source.ui?.closeSheets) {
        target.ui = { ...target.ui, closeSheets: [...(target.ui?.closeSheets ?? []), ...source.ui.closeSheets] };
    }
}
