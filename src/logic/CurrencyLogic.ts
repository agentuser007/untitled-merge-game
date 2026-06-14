// ============================================================
// CurrencyLogic.ts — Pure Currency Business Logic
// ============================================================

import type { LogicEvent } from './BoardLogic';

export interface CurrencyChangedEvent {
  gold: number;
  diamonds: number;
}

export interface CurrencyFlashEvent {
  type: 'gold' | 'diamonds';
  effect: 'add' | 'spend';
}

export interface CurrencyInsufficientEvent {
  type: 'gold' | 'diamonds';
  current: number;
  needed: number;
}

export interface CurrencyGoldEarnedEvent {
  amount: number;
}

export class CurrencyLogic {
  gold: number;
  diamonds: number;

  constructor(initialGold: number = 0, initialDiamonds: number = 0) {
    this.gold = initialGold;
    this.diamonds = initialDiamonds;
  }

  addGold(amount: number): LogicEvent[] {
    this.gold += amount;
    return [
      { type: 'currency:changed', payload: { gold: this.gold, diamonds: this.diamonds } },
      { type: 'currency:flash', payload: { type: 'gold', effect: 'add' } },
      { type: 'currency:goldEarned', payload: { amount } },
    ];
  }

  setGold(value: number): LogicEvent[] {
    this.gold = value;
    return [
      { type: 'currency:changed', payload: { gold: this.gold, diamonds: this.diamonds } },
    ];
  }

  spendGold(amount: number): { success: boolean; events: LogicEvent[] } {
    if (this.gold < amount) {
      return { success: false, events: [{ type: 'currency:insufficient', payload: { type: 'gold', current: this.gold, needed: amount } }] };
    }
    this.gold -= amount;
    return {
      success: true,
      events: [
        { type: 'currency:changed', payload: { gold: this.gold, diamonds: this.diamonds } },
        { type: 'currency:flash', payload: { type: 'gold', effect: 'spend' } },
      ],
    };
  }

  canAffordGold(amount: number): boolean {
    return this.gold >= amount;
  }

  addDiamonds(amount: number): LogicEvent[] {
    this.diamonds += amount;
    return [
      { type: 'currency:changed', payload: { gold: this.gold, diamonds: this.diamonds } },
      { type: 'currency:flash', payload: { type: 'diamonds', effect: 'add' } },
    ];
  }

  spendDiamonds(amount: number): { success: boolean; events: LogicEvent[] } {
    if (this.diamonds < amount) {
      return { success: false, events: [{ type: 'currency:insufficient', payload: { type: 'diamonds', current: this.diamonds, needed: amount } }] };
    }
    this.diamonds -= amount;
    return {
      success: true,
      events: [
        { type: 'currency:changed', payload: { gold: this.gold, diamonds: this.diamonds } },
        { type: 'currency:flash', payload: { type: 'diamonds', effect: 'spend' } },
      ],
    };
  }

  canAffordDiamonds(amount: number): boolean {
    return this.diamonds >= amount;
  }
}
