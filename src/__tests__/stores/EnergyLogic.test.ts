import { describe, it, expect, beforeEach } from 'vitest'
import { EnergyLogic } from '../../logic/EnergyLogic'

describe('EnergyLogic', () => {
  let logic: EnergyLogic

  beforeEach(() => {
    logic = new EnergyLogic({
      ENERGY_REGEN_CAP: 100,
      MAX_ENERGY: 100,
      ENERGY_REGEN_INTERVAL: 3000,
      ENERGY_REGEN_AMOUNT: 1,
      ENERGY_COST_PER_SPAWN: 5
    })
  })

  it('starts at full energy', () => {
    expect(logic.current).toBe(100)
    expect(logic.fsm.is('FULL')).toBe(true)
  })

  it('spend reduces energy and returns success + events', () => {
    const { success, events } = logic.spend(10)
    expect(success).toBe(true)
    expect(logic.current).toBe(90)
    expect(events.some(e => e.type === 'energy:changed')).toBe(true)
  })

  it('spend fails when insufficient', () => {
    logic.current = 3
    const { success } = logic.spend(5)
    expect(success).toBe(false)
    expect(logic.current).toBe(3)
  })

  it('recover increases energy and returns events', () => {
    logic.current = 50
    const events = logic.recover(30)
    expect(logic.current).toBe(80)
    expect(events.some(e => e.type === 'energy:changed')).toBe(true)
  })

  it('recover can exceed regenCap', () => {
    logic.recover(20)
    expect(logic.current).toBe(120)
  })

  it('setMax changes max and regenCap and returns events', () => {
    const events = logic.setMax(150)
    expect(logic.max).toBe(150)
    expect(logic.regenCap).toBe(150)
    expect(events.some(e => e.type === 'energy:changed')).toBe(true)
  })

  it('setMax does NOT cap current energy', () => {
    logic.recover(20)
    expect(logic.current).toBe(120)
    logic.setMax(80)
    expect(logic.current).toBe(120)
  })

  it('setRegenCap changes regenCap only and returns events', () => {
    const events = logic.setRegenCap(50)
    expect(logic.regenCap).toBe(50)
    expect(logic.max).toBe(100)
    expect(events.some(e => e.type === 'energy:changed')).toBe(true)
  })

  it('shouldRegen returns true when current < regenCap', () => {
    logic.spend(1)
    expect(logic.shouldRegen()).toBe(true)
  })

  it('shouldRegen returns false when current >= regenCap', () => {
    expect(logic.shouldRegen()).toBe(false)
  })

  it('tick increments energy when below regenCap', () => {
    logic.spend(10)
    const result = logic.tick()
    expect(result.changed).toBe(true)
    expect(result.newCurrent).toBe(91)
    expect(result.previousCurrent).toBe(90)
    expect(result.events.some(e => e.type === 'energy:changed')).toBe(true)
  })

  it('tick caps at regenCap', () => {
    logic.spend(1)
    const result = logic.tick()
    expect(result.newCurrent).toBe(100)
    expect(logic.fsm.is('FULL')).toBe(true)
  })

  it('tick returns changed=false when at regenCap', () => {
    const result = logic.tick()
    expect(result.changed).toBe(false)
    expect(result.newCurrent).toBe(100)
    expect(result.events).toHaveLength(0)
  })

  it('FSM transitions FULL -> REGENNING on spend', () => {
    logic.spend(1)
    expect(logic.fsm.is('REGENNING')).toBe(true)
  })

  it('FSM transitions REGENNING -> FULL on fill', () => {
    logic.spend(1)
    logic.recover(1)
    expect(logic.fsm.is('FULL')).toBe(true)
  })

  it('FSM transitions to EMPTY when current hits 0 from REGENNING', () => {
    logic.spend(1)
    expect(logic.fsm.is('REGENNING')).toBe(true)
    logic.current = 0
    logic._updateFSM()
    expect(logic.fsm.is('EMPTY')).toBe(true)
  })

  it('FSM transitions EMPTY -> REGENNING on recover', () => {
    logic.spend(1)
    logic.current = 0
    logic._updateFSM()
    expect(logic.fsm.is('EMPTY')).toBe(true)
    logic.recover(10)
    expect(logic.fsm.is('REGENNING')).toBe(true)
  })

  it('spend returns energy:changed event with correct payload', () => {
    const { events } = logic.spend(10)
    const changedEvent = events.find(e => e.type === 'energy:changed')
    expect(changedEvent).toBeDefined()
    expect(changedEvent!.payload).toMatchObject({ current: 90, max: 100 })
  })

  it('canSpend returns true when energy is sufficient', () => {
    expect(logic.canSpend(5)).toBe(true)
    expect(logic.canSpend(100)).toBe(true)
  })

  it('canSpend returns false when energy is insufficient', () => {
    logic.current = 3
    expect(logic.canSpend(5)).toBe(false)
  })

  it('canSpend defaults to 1', () => {
    logic.current = 1
    expect(logic.canSpend()).toBe(true)
    logic.current = 0
    expect(logic.canSpend()).toBe(false)
  })

  it('constructor throws if ENERGY_REGEN_INTERVAL is 0', () => {
    expect(() => new EnergyLogic({
      ENERGY_REGEN_CAP: 100, MAX_ENERGY: 100, ENERGY_REGEN_INTERVAL: 0, ENERGY_REGEN_AMOUNT: 1, ENERGY_COST_PER_SPAWN: 5
    })).toThrow()
  })

  it('constructor throws if ENERGY_REGEN_AMOUNT is 0', () => {
    expect(() => new EnergyLogic({
      ENERGY_REGEN_CAP: 100, MAX_ENERGY: 100, ENERGY_REGEN_INTERVAL: 3000, ENERGY_REGEN_AMOUNT: 0, ENERGY_COST_PER_SPAWN: 5
    })).toThrow()
  })
})
