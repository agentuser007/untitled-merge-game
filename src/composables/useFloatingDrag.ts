import { ref, computed, onMounted, type ComputedRef } from 'vue'

interface UseFloatingDragOptions {
  storageKey: string
  initialX: number
  initialY: number
  threshold?: number
}

interface UseFloatingDragReturn {
  x: ReturnType<typeof ref<number>>
  y: ReturnType<typeof ref<number>>
  isDragging: ReturnType<typeof ref<boolean>>
  style: ComputedRef<string>
  onPointerDown: (e: PointerEvent) => void
}

export function useFloatingDrag(options: UseFloatingDragOptions): UseFloatingDragReturn {
  const { storageKey, initialX, initialY, threshold = 5 } = options

  const savedPos = (() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed
        }
      }
    } catch {}
    return null
  })()

  const x = ref(savedPos?.x ?? initialX)
  const y = ref(savedPos?.y ?? initialY)
  const isDragging = ref(false)

  let startX = 0
  let startY = 0
  let startPosX = 0
  let startPosY = 0
  let hasMoved = false

  const style = computed(() => {
    return `transform: translate(${x.value}px, ${y.value}px)`
  })

  function clampPosition(posX: number, posY: number, elWidth: number, elHeight: number) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const minX = -elWidth * 0.5
    const maxX = vw - elWidth * 0.5
    const minY = 0
    const maxY = vh - elHeight * 0.5
    return {
      x: Math.min(Math.max(posX, minX), maxX),
      y: Math.min(Math.max(posY, minY), maxY),
    }
  }

  function savePosition() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ x: x.value, y: y.value }))
    } catch {}
  }

  function handlePointerMove(e: PointerEvent) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!hasMoved && Math.sqrt(dx * dx + dy * dy) > threshold) {
      hasMoved = true
      isDragging.value = true
    }

    if (hasMoved) {
      e.preventDefault()
      const el = (e.target as HTMLElement)?.closest?.('.floating-drag-root') as HTMLElement | null
      const rect = el?.getBoundingClientRect()
      const elW = rect?.width ?? 100
      const elH = rect?.height ?? 40
      const newPos = clampPosition(startPosX + dx, startPosY + dy, elW, elH)
      x.value = newPos.x
      y.value = newPos.y
    }
  }

  function handlePointerUp() {
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)

    if (hasMoved) {
      savePosition()
    }

    isDragging.value = false
    hasMoved = false
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    startX = e.clientX
    startY = e.clientY
    startPosX = x.value
    startPosY = y.value
    hasMoved = false

    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    document.addEventListener('pointerup', handlePointerUp)
  }

  onMounted(() => {
    const clamped = clampPosition(x.value, y.value, 100, 40)
    if (clamped.x !== x.value || clamped.y !== y.value) {
      x.value = clamped.x
      y.value = clamped.y
    }
  })

  return { x, y, isDragging, style, onPointerDown }
}
