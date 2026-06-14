// ============================================================
// GachaLogic.ts — Pure Gacha Business Logic + State Machine
// (Pity system removed — pure random rolls)
// ============================================================

import { StateMachine } from '../core/StateMachine';
import type { LogicEvent } from './BoardLogic';
import type { GachaPoolItemValue } from '../types/game';

export interface GachaItem {
  id: string;
  rarity: 'R' | 'SR' | 'SSR';
  subCategory?: string;
  weight: number;
  icon: string;
  name: string;
  itemId?: string;
  effect: string;
  value: GachaPoolItemValue;
}

export interface GachaRarityConfig {
  probability: number;
  color: string;
  glow: string;
}

export interface GachaCostConfig {
  singleCost: number;
  tenCost: number;
}

export interface GachaSubWeights {
  [rarity: string]: {
    [subCategory: string]: number;
  };
}

export interface GachaConfig {
  rarityConfig: {
    [key: string]: GachaRarityConfig;
  };
  gachaCost: GachaCostConfig;
  subWeights: GachaSubWeights;
  gachaPoolV2: GachaItem[];
}

export interface GachaPulledEvent {
  results: GachaItem[];
}

export interface GachaRandomDeps {
  random: () => number;
}

export interface GachaSnapshot {
  ssrOwned: Record<string, boolean>;
}

export interface CurrencyLike {
  canAffordDiamonds: (cost: number) => boolean;
}

export class GachaLogic {
  ssrOwned: { [key: string]: boolean };
  fsm: StateMachine;

  constructor() {
    this.ssrOwned = {};
    this.fsm = new StateMachine({
      name: 'GachaFSM',
      initial: 'IDLE',
      states: {
        IDLE: { on: { PULL: 'ROLLING' } },
        ROLLING: { on: { DONE: 'RESULT' } },
        RESULT: { on: { ACK: 'IDLE' } }
      }
    });
  }

  rollOne(gachaConfig: GachaConfig, deps: GachaRandomDeps, maxRarity?: 'R' | 'SR' | 'SSR'): GachaItem | null {
    const roll = deps.random();
    const rarityConfig = gachaConfig.rarityConfig;
    const ssrThreshold = rarityConfig?.SSR?.probability ?? 0;
    const srThreshold = ssrThreshold + (rarityConfig?.SR?.probability ?? 0);
    let rarity: 'R' | 'SR' | 'SSR' = roll < ssrThreshold ? 'SSR' : roll < srThreshold ? 'SR' : 'R';
    if (maxRarity && rarity === 'SSR' && maxRarity === 'SR') {
      rarity = 'SR';
    }
    let pool = gachaConfig.gachaPoolV2.filter(i => i.rarity === rarity);
    if ((rarity === 'R' || rarity === 'SR') && gachaConfig.subWeights[rarity]) {
      const sw = gachaConfig.subWeights[rarity];
      const subRoll = deps.random();
      let subCat: string | null = null, cum = 0;
      for (const [cat, w] of Object.entries(sw)) {
        cum += w;
        if (subRoll < cum) { subCat = cat; break; }
      }
      if (subCat) {
        const subPool = pool.filter(i => i.subCategory === subCat);
        if (subPool.length > 0) pool = subPool;
      }
    }
    const result = this.weightedPick(pool, deps);
    if (!result && pool.length === 0) {
      const fullPool = gachaConfig.gachaPoolV2.filter(i => i.rarity === rarity);
      return this.weightedPick(fullPool, deps);
    }
    return result;
  }

  pullSingle(gachaConfig: GachaConfig, deps: GachaRandomDeps, maxRarity?: 'R' | 'SR' | 'SSR'): { result: GachaItem | null; events: LogicEvent[] } {
    if (!this.fsm.can('PULL')) return { result: null, events: [] };
    this.fsm.send('PULL');
    const result = this.rollOne(gachaConfig, deps, maxRarity);
    if (!result) {
      this.fsm.reset('IDLE');
      return { result: null, events: [] };
    }
    this.fsm.send('DONE');
    return { result, events: [{ type: 'gacha:pulled', payload: { results: [result] } }] };
  }

  pullTen(gachaConfig: GachaConfig, tenPullCount: number, deps: GachaRandomDeps): { results: GachaItem[] | null; events: LogicEvent[] } {
    if (!this.fsm.can('PULL')) return { results: null, events: [] };
    this.fsm.send('PULL');
    const results: GachaItem[] = [];
    let hasSrPlus = false;
    for (let i = 0; i < tenPullCount; i++) {
      const r = this.rollOne(gachaConfig, deps);
      if (r) {
        results.push(r);
        if (r.rarity === 'SR' || r.rarity === 'SSR') hasSrPlus = true;
      }
    }
    if (!hasSrPlus && results.length > 0) {
      const srPool = gachaConfig.gachaPoolV2.filter(i => i.rarity === 'SR');
      if (srPool.length > 0) results[results.length - 1] = this.weightedPick(srPool, deps)!;
    }
    this.fsm.send('DONE');
    const events = results.length > 0 ? [{ type: 'gacha:pulled' as const, payload: { results } }] : [];
    return { results, events };
  }

  acknowledge(): void {
    if (this.fsm.can('ACK')) this.fsm.send('ACK');
  }

  weightedPick(pool: GachaItem[], deps: GachaRandomDeps): GachaItem | null {
    if (!pool || pool.length === 0) return null;
    const total = pool.reduce((s, i) => s + i.weight, 0);
    if (total <= 0) return pool[0];
    let r = deps.random() * total;
    for (const item of pool) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return pool[0];
  }

  canAffordSingle(currency: CurrencyLike, gachaConfig: GachaConfig): boolean {
    return currency.canAffordDiamonds(gachaConfig.gachaCost.singleCost);
  }

  canAffordTen(currency: CurrencyLike, gachaConfig: GachaConfig): boolean {
    return currency.canAffordDiamonds(gachaConfig.gachaCost.tenCost);
  }

  markSSROwned(ssrId: string): boolean {
    const isFirst = !this.ssrOwned[ssrId];
    this.ssrOwned[ssrId] = true;
    return isFirst;
  }

  isSSRFirst(ssrId: string): boolean {
    return !this.ssrOwned[ssrId];
  }

  serialize(): GachaSnapshot {
    return { ssrOwned: { ...this.ssrOwned } };
  }

  deserialize(data: GachaSnapshot | null): void {
    if (!data) return;
    this.ssrOwned = data.ssrOwned || {};
    // Old save data with pity counters is safely ignored
  }
}