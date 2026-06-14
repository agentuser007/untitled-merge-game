import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHeroineStore } from '../../stores/heroineStore'
import { useConfigStore } from '../../stores/configStore'
import { useCurrencyStore } from '../../stores/currencyStore'
import {
    createGameSettingsConfig,
    createGachaCostConfig,
    createGachaRarityConfig,
    createHeroineUpgrade,
} from '../helpers/configFactory'

describe('heroineStore — H7: affordability check + spend before upgrade', () => {
  let store: ReturnType<typeof useHeroineStore>
  let currencyStore: ReturnType<typeof useCurrencyStore>

  const mockUpgrades = [
    createHeroineUpgrade({
      id: 'energy_cap',
      name: 'Energy Cap',
      description: 'Increase energy cap',
      icon: '⚡',
      levels: [
        { cost: 50, value: 10, label: 'Lv1' },
        { cost: 100, value: 20, label: 'Lv2' },
        { cost: 200, value: 30, label: 'Lv3' },
      ],
    }),
    createHeroineUpgrade({
      id: 'daily_bonus',
      name: 'Daily Bonus',
      description: 'Increase daily gold',
      icon: '💰',
      levels: [
        { cost: 30, value: 1.5, label: 'Lv1' },
      ],
    }),
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.heroineUpgrades = mockUpgrades
    configStore.gameConfig = createGameSettingsConfig()
    configStore.gachaRarityConfig = createGachaRarityConfig()
    configStore.gachaCost = createGachaCostConfig()
    configStore.gachaSubWeights = {}
    configStore.gachaPoolV2 = []
    configStore.gachaPool = []
    
    currencyStore = useCurrencyStore()
    store = useHeroineStore()
  })

  it('H7: purchaseUpgrade fails when not enough diamonds', () => {
    currencyStore.addDiamonds(10)
    const { success, resolveResult } = store.purchaseUpgrade('energy_cap')
    expect(success).toBe(false)
    expect(resolveResult).toBeDefined()
    expect(store.getCurrentLevel('energy_cap')).toBe(-1)
  })

  it('H7: purchaseUpgrade succeeds and spends diamonds', () => {
    currencyStore.addDiamonds(100)
    const { success, resolveResult } = store.purchaseUpgrade('energy_cap')
    expect(success).toBe(true)
    expect(store.getCurrentLevel('energy_cap')).toBe(0)
    if (resolveResult.applyTo.currency?.spendDiamonds) {
      currencyStore.spendDiamonds(resolveResult.applyTo.currency.spendDiamonds)
    }
    expect(currencyStore.diamonds).toBe(50)
  })

  it('H7: purchaseUpgrade levels up incrementally', () => {
    currencyStore.addDiamonds(350)
    let r = store.purchaseUpgrade('energy_cap')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.getCurrentLevel('energy_cap')).toBe(0)
    r = store.purchaseUpgrade('energy_cap')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.getCurrentLevel('energy_cap')).toBe(1)
    r = store.purchaseUpgrade('energy_cap')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.getCurrentLevel('energy_cap')).toBe(2)
    expect(currencyStore.diamonds).toBe(0)
  })

  it('purchaseUpgrade fails when maxed', () => {
    currencyStore.addDiamonds(500)
    let r = store.purchaseUpgrade('daily_bonus')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.getCurrentLevel('daily_bonus')).toBe(0)
    const result = store.purchaseUpgrade('daily_bonus')
    expect(result.success).toBe(false)
  })

  it('purchaseUpgrade fails for unknown upgrade', () => {
    currencyStore.addDiamonds(1000)
    const result = store.purchaseUpgrade('nonexistent')
    expect(result.success).toBe(false)
  })

  it('getEffectValue returns null for unpurchased', () => {
    expect(store.getEffectValue('energy_cap')).toBeNull()
  })

  it('getEffectValue returns value for purchased upgrade', () => {
    currencyStore.addDiamonds(100)
    const r = store.purchaseUpgrade('energy_cap')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.getEffectValue('energy_cap')).toBe(10)
  })

  it('getNextCost returns correct cost', () => {
    expect(store.getNextCost('energy_cap')).toBe(50)
    currencyStore.addDiamonds(50)
    const r = store.purchaseUpgrade('energy_cap')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.getNextCost('energy_cap')).toBe(100)
  })

  it('isMaxed works', () => {
    currencyStore.addDiamonds(500)
    const r = store.purchaseUpgrade('daily_bonus')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.isMaxed('daily_bonus')).toBe(true)
  })

  it('maxedUpgrades computed works', () => {
    currencyStore.addDiamonds(500)
    const r = store.purchaseUpgrade('daily_bonus')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.maxedUpgrades).toContain('daily_bonus')
  })

  it('purchasedUpgrades computed works', () => {
    expect(store.purchasedUpgrades.length).toBe(0)
    currencyStore.addDiamonds(50)
    const r = store.purchaseUpgrade('energy_cap')
    if (r.resolveResult.applyTo.currency?.spendDiamonds) currencyStore.spendDiamonds(r.resolveResult.applyTo.currency.spendDiamonds)
    expect(store.purchasedUpgrades.length).toBe(1)
  })
})
