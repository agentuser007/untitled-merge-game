import type { ResolveResult } from './ServiceResultTypes';

export interface HeroineServiceDeps {
    upgradeList: Array<{
        id: string;
        levels: Array<{ cost: number; value: number }>;
    }>;
    currentLevel: (upgradeId: string) => number;
    canAffordDiamonds: (cost: number) => boolean;
}

export interface PurchaseUpgradeResult {
    success: boolean;
    resolveResult: ResolveResult;
    newLevel?: number;
    value?: number;
}

export const HeroineService = {
    resolvePurchaseUpgrade(upgradeId: string, deps: HeroineServiceDeps): PurchaseUpgradeResult {
        const upg = deps.upgradeList.find(u => u.id === upgradeId);
        if (!upg) return { success: false, resolveResult: { applyTo: {} } };

        const currentLevel = deps.currentLevel(upgradeId);
        if (currentLevel >= upg.levels.length - 1) return { success: false, resolveResult: { applyTo: {} } };

        const nextLevel = upg.levels[currentLevel + 1];
        if (!deps.canAffordDiamonds(nextLevel.cost)) return { success: false, resolveResult: { applyTo: {} } };

        const newLevel = currentLevel + 1;
        return {
            success: true,
            resolveResult: {
                applyTo: {
                    currency: { spendDiamonds: nextLevel.cost },
                },
                events: [{
                    name: 'heroine:upgradePurchased',
                    data: { upgradeId, level: newLevel, value: nextLevel.value },
                }],
            },
            newLevel,
            value: nextLevel.value,
        };
    },
};
