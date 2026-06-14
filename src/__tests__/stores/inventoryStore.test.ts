import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '../../stores/inventoryStore'

describe('inventoryStore — unlimited capacity model', () => {
  let store: ReturnType<typeof useInventoryStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useInventoryStore()
  })

  it('starts empty', () => {
    expect(store.totalItems).toBe(0)
    expect(store.isEmpty).toBe(true)
    expect(store.isFull).toBe(false)
  })

  it('totalItems counts occupied slots (unique item IDs), not total count', () => {
    store.addItem('item_a', 3)
    expect(store.totalItems).toBe(1)
    store.addItem('item_b', 5)
    expect(store.totalItems).toBe(2)
  })

  it('addItem for existing item ID does not increase slot count', () => {
    store.addItem('item_a', 2)
    expect(store.totalItems).toBe(1)
    store.addItem('item_a', 3)
    expect(store.totalItems).toBe(1)
    expect(store.getCount('item_a')).toBe(5)
  })

  it('isFull is always false (unlimited capacity)', () => {
    for (let i = 0; i < 100; i++) {
      store.addItem(`item_${i}`, 1)
    }
    expect(store.isFull).toBe(false)
    expect(store.totalItems).toBe(100)
  })

  it('addItem always succeeds (unlimited capacity)', () => {
    for (let i = 0; i < 100; i++) {
      store.addItem(`item_${i}`, 1)
    }
    const result = store.addItem('new_item', 1)
    expect(result).toBe(true)
  })

  it('addItem succeeds for existing item regardless of how many items exist', () => {
    for (let i = 0; i < 100; i++) {
      store.addItem(`item_${i}`, 1)
    }
    const result = store.addItem('item_0', 5)
    expect(result).toBe(true)
    expect(store.getCount('item_0')).toBe(6)
  })

  it('removeItem decreases count', () => {
    store.addItem('item_a', 3)
    store.removeItem('item_a', 1)
    expect(store.getCount('item_a')).toBe(2)
    expect(store.totalItems).toBe(1)
  })

  it('removeItem to 0 removes slot', () => {
    store.addItem('item_a', 2)
    store.removeItem('item_a', 2)
    expect(store.getCount('item_a')).toBe(0)
    expect(store.totalItems).toBe(0)
    expect(store.isEmpty).toBe(true)
  })

  it('availableSlots is always Infinity (unlimited capacity)', () => {
    store.addItem('item_a', 1)
    store.addItem('item_b', 1)
    expect(store.availableSlots).toBe(Infinity)
  })

  it('expandSlots is a no-op (unlimited capacity)', () => {
    const before = store.maxSlots
    store.expandSlots(5)
    expect(store.maxSlots).toBe(before)
  })

  it('hasItem works', () => {
    store.addItem('item_a', 1)
    expect(store.hasItem('item_a')).toBe(true)
    expect(store.hasItem('item_b')).toBe(false)
  })

  it('getItemIds returns occupied IDs', () => {
    store.addItem('a', 1)
    store.addItem('b', 2)
    expect(store.getItemIds()).toEqual(['a', 'b'])
  })

  it('clear empties all slots', () => {
    store.addItem('a', 1)
    store.addItem('b', 2)
    store.clear()
    expect(store.isEmpty).toBe(true)
    expect(store.totalItems).toBe(0)
  })

  it('serialize/deserialize round-trip', () => {
    store.addItem('a', 3)
    store.addItem('b', 1)
    const data = store.serialize()
    store.clear()
    store.deserialize(data)
    expect(store.getCount('a')).toBe(3)
    expect(store.getCount('b')).toBe(1)
    expect(store.totalItems).toBe(2)
  })

  it('deserialize handles null maxSlots (serialized Infinity) as Infinity', () => {
    store.addItem('a', 1)
    const data = store.serialize()
    // JSON.stringify turns Infinity into null
    ;(data as any).maxSlots = null
    store.clear()
    store.deserialize(data)
    expect(store.maxSlots).toBe(Infinity)
  })
})
