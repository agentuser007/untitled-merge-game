import type { ResolveResult } from './ServiceResultTypes';
import type { TouchResponse } from '@/types/game';

export interface TouchInteractionServiceDeps {
    canTouch: (characterId: string, zoneId: string) => boolean;
    getTouchResponse: (characterId: string, zoneId: string) => TouchResponse | null;
}

export interface TouchResult {
    dialogue?: string;
    affection: number;
    animation?: string;
    zoneId: string;
}

export interface PerformTouchResult {
    touchResult: TouchResult | null;
    resolveResult: ResolveResult;
}

export const TouchInteractionService = {
    resolvePerformTouch(characterId: string, zoneId: string, deps: TouchInteractionServiceDeps): PerformTouchResult {
        if (!deps.canTouch(characterId, zoneId)) {
            return { touchResult: null, resolveResult: { applyTo: {} } };
        }

        const response = deps.getTouchResponse(characterId, zoneId);
        if (!response) {
            return { touchResult: null, resolveResult: { applyTo: {} } };
        }

        const result: ResolveResult = {
            applyTo: {
                affection: { recordTouch: { characterId, zoneId } },
            },
        };

        if (response.affection > 0) {
            result.applyTo.affection!.addAffections = [{ characterId, amount: response.affection, source: 'touch' }];
        }

        result.events = [{ name: 'affection:touchPerformed', data: { characterId, zoneId, affectionGained: response.affection } }];

        return {
            touchResult: {
                dialogue: response.dialogue,
                affection: response.affection,
                animation: response.animation,
                zoneId: response.zoneId,
            },
            resolveResult: result,
        };
    },
};
