// ============================================================
// IOfflineProduction.ts — Offline Production Interface
// ============================================================
// Pluggable strategy interface for offline production features.
// Two implementations: DisabledOfflineProduction (no-op) and
// DefaultOfflineProduction (original logic).
// ============================================================

import { ItemData as BoardItemData, GeneratorConfig } from '../logic/BoardLogic';

/** Context needed for offline generator production calculation */
export interface OfflineProductionContext {
    /** Generator states from boardStore */
    generatorStates: Record<string, any>;
    /** Board cells array */
    cells: (string | null)[];
    /** Board column count */
    cols: number;
    /** Board row count */
    rows: number;
    /** Converted item data lookup */
    items: Record<string, BoardItemData>;
    /** Generator config lookup */
    generators: Record<string, GeneratorConfig>;
    /** Callback to add an item to inventory */
    addItem: (itemId: string, count: number) => void;
}

/** Context needed for offline energy recovery calculation */
export interface OfflineEnergyContext {
    /** Current energy value (from save) */
    current: number;
    /** Maximum energy cap for natural regen */
    regenCap: number;
    /** Regeneration interval in ms */
    regenInterval: number;
    /** Energy recovered per tick */
    regenAmount: number;
}

/** Result of offline generator production calculation */
export interface OfflineProductionResult {
    /** Total number of items produced and added to inventory */
    itemCount: number;
}

/** Result of offline energy recovery calculation */
export interface OfflineEnergyResult {
    /** Amount of energy recovered */
    energyRecovered: number;
    /** New energy value after recovery (capped at regenCap) */
    newCurrent: number;
}

/**
 * Offline production interface — pluggable strategy.
 *
 * Implementations:
 * - `DisabledOfflineProduction` — all methods return zero values (feature disabled)
 * - `DefaultOfflineProduction` — original offline production logic
 */
export interface IOfflineProduction {
    /**
     * Calculate and apply offline generator production.
     * Items are added directly to inventory via context.addItem if applicable.
     *
     * @param savedTimestamp - Unix timestamp (ms) when the game was last saved
     * @param context - Board and inventory data needed for calculation
     * @returns Result indicating how many items were produced
     */
    calculateProduction(savedTimestamp: number, context: OfflineProductionContext): OfflineProductionResult;

    /**
     * Calculate offline energy recovery.
     * Pure calculation — does NOT mutate any state.
     *
     * @param savedTimestamp - Unix timestamp (ms) when the game was last saved
     * @param context - Energy data needed for calculation
     * @returns Result indicating recovered amount and new current value
     */
    calculateEnergyRecovery(savedTimestamp: number, context: OfflineEnergyContext): OfflineEnergyResult;
}
