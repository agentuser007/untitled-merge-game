// ============================================================
// DisabledOfflineProduction.ts — No-op Offline Production
// ============================================================
// Implementation of IOfflineProduction that does nothing.
// Used when the offline production feature is disabled.
// ============================================================

import { IOfflineProduction, OfflineProductionResult, OfflineEnergyResult, OfflineProductionContext, OfflineEnergyContext } from './IOfflineProduction';

/**
 * Disabled (no-op) implementation of offline production.
 * All methods return zero values without performing any calculations.
 */
export class DisabledOfflineProduction implements IOfflineProduction {
    calculateProduction(_savedTimestamp: number, _context: OfflineProductionContext): OfflineProductionResult {
        return { itemCount: 0 };
    }

    calculateEnergyRecovery(_savedTimestamp: number, context: OfflineEnergyContext): OfflineEnergyResult {
        return { energyRecovered: 0, newCurrent: context.current };
    }
}
