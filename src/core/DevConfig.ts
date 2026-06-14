// ============================================================
// DevConfig.ts — Reactive Dev Mode Configuration Singleton
// ============================================================
// Central reactive state for developer mode flags.
// Imported by stores and DevPanel.vue — NOT a Pinia store
// so it won't appear in save/serialize data.
// ============================================================

import { reactive, readonly } from 'vue';

export interface DevConfigState {
    /** Master switch — is dev mode active at all? */
    enabled: boolean;
    /** When true, spendGold() always succeeds without deducting */
    unlimitedGold: boolean;
    /** When true, spendDiamonds() always succeeds without deducting */
    unlimitedDiamonds: boolean;
    /** When true, spend() on energy always succeeds without deducting */
    unlimitedEnergy: boolean;
    /** When true, energy auto-regenerates instantly to max */
    instantEnergyRegen: boolean;
    /** Whether the dev panel should persist across page loads */
    persistPanel: boolean;
    /** When true, offline production (generator items + energy recovery) is enabled */
    offlineProductionEnabled: boolean;
}

const state: DevConfigState = reactive({
    enabled: false,
    unlimitedGold: false,
    unlimitedDiamonds: false,
    unlimitedEnergy: false,
    instantEnergyRegen: false,
    persistPanel: false,
    offlineProductionEnabled: true,
});

/** Read-only view of dev config for external consumers */
export const devConfig = readonly(state);

/** Toggle a boolean dev flag */
export function setDevFlag<K extends keyof DevConfigState>(
    key: K,
    value: DevConfigState[K]
): void {
    state[key] = value;
}

/** Initialize dev mode from URL params / localStorage */
export function initDevMode(): void {
    const isDev =
        typeof window !== 'undefined' &&
        (new URLSearchParams(window.location.search).has('dev') ||
            localStorage.getItem('dev_mode') === '1');

    if (isDev) {
        state.enabled = true;
        // SAFE-CAST: Vue内部属性，仅启动检查用
        (window as any).__DEV__ = true;

        // Restore persisted panel preference
        if (localStorage.getItem('dev_persist_panel') === '1') {
            state.persistPanel = true;
        }

        console.log(
            '%c[DevMode] Enabled — press the ⚙ button (top-right) to open the dev panel',
            'color: #4A90D9; font-weight: bold; font-size: 14px;'
        );
    }
}

/** Persist or clear the panel preference */
export function togglePersistPanel(on: boolean): void {
    state.persistPanel = on;
    if (on) {
        localStorage.setItem('dev_persist_panel', '1');
    } else {
        localStorage.removeItem('dev_persist_panel');
    }
}
