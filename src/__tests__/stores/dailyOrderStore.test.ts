import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDailyOrderStore } from '../../stores/dailyOrderStore'
import { useConfigStore } from '../../stores/configStore'
import { createGameSettingsConfig } from '../helpers/configFactory'

describe('dailyOrderStore — rollNewOrders delegates to BoardService', () => {
  let store: ReturnType<typeof useDailyOrderStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    const configStore = useConfigStore()
    configStore.dailyOrderPool = [
      { id: '1', name: 'Order 1', required: [], goldReward: 10, minLoop: 1, dialogue: '' },
      { id: '2', name: 'Order 2', required: [], goldReward: 20, minLoop: 1, dialogue: '' },
      { id: '3', name: 'Order 3', required: [], goldReward: 30, minLoop: 1, dialogue: '' },
      { id: '4', name: 'Order 4', required: [], goldReward: 40, minLoop: 1, dialogue: '' },
      { id: '5', name: 'Order 5', required: [], goldReward: 50, minLoop: 1, dialogue: '' },
    ]
    configStore.gameConfig = createGameSettingsConfig()
    configStore.dailyOrderConfig = { MAX_ACTIVE: 3, REFRESH_COST: 0 }
    store = useDailyOrderStore()
  })

  it('H3: rollNewOrders uses Fisher-Yates shuffle (not biased sort)', () => {
    store.lastRollDate = ''
    store.loopIndex = 1
    store.rollNewOrders()
    expect(store.activeOrders.length).toBe(3)
    expect(store.activeOrders.every(o => !o.fulfilled)).toBe(true)
  })

  it('rollNewOrders respects minLoop filter', () => {
    const configStore = useConfigStore()
    configStore.dailyOrderPool = [
      { id: '1', name: 'Easy', required: [], goldReward: 10, fulfilled: false, minLoop: 1, dialogue: '' },
      { id: '2', name: 'Hard', required: [], goldReward: 100, fulfilled: false, minLoop: 5, dialogue: '' },
    ]
    store.loopIndex = 1
    store.lastRollDate = ''
    store.rollNewOrders()
    expect(store.activeOrders.every(o => o.name !== 'Hard')).toBe(true)
  })

  it('fulfillOrder marks order as fulfilled', () => {
    store.lastRollDate = ''
    store.rollNewOrders()
    const result = store.fulfillOrder(0)
    expect(result).toBe(true)
    expect(store.activeOrders[0].fulfilled).toBe(true)
    expect(store.completedCount).toBe(1)
  })

  it('fulfillOrder fails for already fulfilled', () => {
    store.lastRollDate = ''
    store.rollNewOrders()
    store.fulfillOrder(0)
    const result = store.fulfillOrder(0)
    expect(result).toBe(false)
  })

  it('checkOrder verifies item availability', () => {
    store.activeOrders = [
      { id: '1', name: 'Test', required: [{ itemId: 'item_a', count: 2 }], goldReward: 10, fulfilled: false, minLoop: 1, dialogue: '' }
    ]
    expect(store.checkOrder(0, { item_a: 1 })).toBe(false)
    expect(store.checkOrder(0, { item_a: 2 })).toBe(true)
  })

  it('completedOrders and pendingOrders computed work', () => {
    store.activeOrders = [
      { id: '1', name: 'A', required: [], goldReward: 10, fulfilled: true, minLoop: 1, dialogue: '' },
      { id: '2', name: 'B', required: [], goldReward: 20, fulfilled: false, minLoop: 1, dialogue: '' },
    ]
    expect(store.completedOrders.length).toBe(1)
    expect(store.pendingOrders.length).toBe(1)
  })

  it('does not re-roll if already rolled today', () => {
    store.lastRollDate = ''
    store.rollNewOrders()
    const firstOrders = [...store.activeOrders]
    store.rollNewOrders()
    expect(store.activeOrders).toEqual(firstOrders)
  })
})
