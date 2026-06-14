import type { ResolveResult } from './ServiceResultTypes';

export interface LoopServiceDeps {
    loopIndex: number;
    getNewDiscoveriesCountThisLoop: () => number;
    getUnlockedCountThisLoop: () => number;
    getLoopTokenReward: (loopIndex: number) => number;
    achievementTokenBonus: number;
}

function calculateLoopRewards(loopIndexParam: number, summary: { newDiscoveries: number; achievementsUnlocked: number }, getLoopTokenReward: (idx: number) => number, achievementTokenBonus: number) {
    const baseReward = getLoopTokenReward(loopIndexParam);
    let bonusTokens = 0;
    if (summary.newDiscoveries) bonusTokens += summary.newDiscoveries;
    if (summary.achievementsUnlocked) bonusTokens += summary.achievementsUnlocked * achievementTokenBonus;
    return baseReward + bonusTokens;
}

export const LoopService = {
    resolveCompleteLoop(deps: LoopServiceDeps): ResolveResult {
        const addLoopTokens = calculateLoopRewards(
            deps.loopIndex,
            {
                newDiscoveries: deps.getNewDiscoveriesCountThisLoop(),
                achievementsUnlocked: deps.getUnlockedCountThisLoop(),
            },
            deps.getLoopTokenReward,
            deps.achievementTokenBonus,
        );

        return {
            applyTo: {
                loop: { incrementLoopIndex: { addLoopTokens } },
                collection: { resetLoopDiscoveries: true },
                achievement: { resetLoopAchievements: true },
            },
        };
    },
};
