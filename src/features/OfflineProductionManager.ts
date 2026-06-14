// ============================================================
// OfflineProductionManager.ts — Offline Production Strategy Manager
// ============================================================
// Singleton manager that selects the appropriate IOfflineProduction
// implementation based on the offlineProductionEnabled feature flag.
// ============================================================

import { devConfig } from '../core/DevConfig';
import { IOfflineProduction, OfflineProductionResult, OfflineEnergyResult, OfflineProductionContext, OfflineEnergyContext } from './IOfflineProduction';
import { DisabledOfflineProduction } from './DisabledOfflineProduction';
import { DefaultOfflineProduction } from './DefaultOfflineProduction';

const disabledImpl = new DisabledOfflineProduction();
const defaultImpl = new DefaultOfflineProduction();

/**
 * Get the current IOfflineProduction implementation based on feature flag.
 */
function getImplementation(): IOfflineProduction {
    return devConfig.offlineProductionEnabled ? defaultImpl : disabledImpl;
}

/**
 * OfflineProductionManager — facade for offline production operations.
 * Delegates to the appropriate IOfflineProduction implementation
 * based on the `devConfig.offlineProductionEnabled` flag.
 *
 * When `offlineProductionEnabled` is false (default), all offline
 * production and energy recovery are disabled (no-op).
 */
export const OfflineProductionManager = {
    /**
     * Calculate and apply offline generator production.
     * When disabled, returns { itemCount: 0 } immediately.
     */
    calculateProduction(savedTimestamp: number, context: OfflineProductionContext): OfflineProductionResult {
        return getImplementation().calculateProduction(savedTimestamp, context);
    },

    /**
     * Calculate offline energy recovery.
     * When disabled, returns { energyRecovered: 0, newCurrent: current } immediately.
     */
    calculateEnergyRecovery(savedTimestamp: number, context: OfflineEnergyContext): OfflineEnergyResult {
        return getImplementation().calculateEnergyRecovery(savedTimestamp, context);
    },

    /**
     * Check if offline production is currently enabled.
     */
    get isEnabled(): boolean {
        return devConfig.offlineProductionEnabled;
    },
};
