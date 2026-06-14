<!-- ============================================================
     BaseBottomSheet.vue — Shared base component for all sheets
     ============================================================ -->
<template>
  <Transition name="sheet-backdrop">
    <div
      v-if="modelValue"
      class="bottom-sheet-backdrop"
      :class="{ 'layout-bottom': layout === 'bottom' }"
      @click="close"
    />
  </Transition>
  <Transition name="sheet-slide">
    <div
      v-if="modelValue"
      :id="sheetId"
      class="bottom-sheet"
      :class="{ 'layout-bottom': layout === 'bottom', 'theme-warm': theme === 'warm' }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="sheet-header-new">
        <button class="sheet-back-btn sheet-close" @click="close">↩</button>
        <div class="sheet-title-pill">
          <span v-if="icon" class="sheet-title-icon">{{ icon }}</span>
          <span class="sheet-title-text">{{ title }}</span>
        </div>
        <button class="sheet-help-btn" @click="emit('help')">?</button>
      </div>
      <div v-if="subtitle" class="sheet-sub">{{ subtitle }}</div>
      <div class="sheet-body">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { watch, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    sheetId: string
    title: string
    icon: string
    subtitle?: string
    layout?: 'center' | 'bottom'
    theme?: 'default' | 'warm'
  }>(),
  {
    layout: 'center',
    theme: 'default'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean],
  'help': []
}>()

// --- Close ---
function close() {
  emit('update:modelValue', false)
}

// --- Swipe-to-close ---
const touchStartY = ref(0)

function onTouchStart(e: TouchEvent) {
  touchStartY.value = e.touches[0].clientY
}

function onTouchMove(e: TouchEvent) {
  const deltaY = e.touches[0].clientY - touchStartY.value;
  if (deltaY > 0) {
    const sheetBody = (e.currentTarget as HTMLElement)?.querySelector('.sheet-body');
    if (!sheetBody || sheetBody.scrollTop <= 0) {
      e.preventDefault();
    }
  }
}

function onTouchEnd(e: TouchEvent) {
  const deltaY = e.changedTouches[0].clientY - touchStartY.value
  if (deltaY > 100) {
    close()
  }
}

// --- Body scroll lock ---
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* ---- Bottom Sheet Backdrop ---- */
.bottom-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(90, 62, 43, 0.45);
  z-index: var(--z-sheet);
  opacity: 1;
  pointer-events: auto;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* ---- Bottom Sheet ---- */
.bottom-sheet {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - 32px);
  max-width: 370px;
  height: 82%;
  max-height: 720px;
  background: #FFF5EE;
  z-index: var(--z-sheet);
  border-radius: 24px;
  border: 3.5px solid var(--warm-border, #CDA080);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

/* ---- New Premium Header ---- */
.sheet-header-new {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px 8px;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
}

.sheet-back-btn,
.sheet-help-btn {
  width: 32px;
  height: 32px;
  background: #fff;
  border: 2px solid var(--warm-border, #CDA080);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  color: var(--warm-border, #CDA080);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition: transform 0.15s ease;
  padding: 0;
  line-height: 1;
}

.sheet-back-btn:active,
.sheet-help-btn:active {
  transform: scale(0.9);
}

.sheet-title-pill {
  background: #FFF;
  border: 3px solid var(--warm-border, #CDA080);
  border-radius: 99px;
  padding: 6px 36px;
  font-size: 15px;
  font-weight: 900;
  color: var(--warm-border, #CDA080);
  box-shadow: 0 4px 8px rgba(181, 147, 116, 0.15);
  text-align: center;
  line-height: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sheet-title-icon {
  font-size: 15px;
  line-height: 1;
}

/* ---- Subtitle ---- */
.sheet-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
  font-weight: 500;
  padding: 2px 16px 6px;
  flex-shrink: 0;
  text-align: center;
}

/* ---- Sheet Body ---- */
.sheet-body {
  padding: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ---- Vue Transitions ---- */
.sheet-backdrop-enter-active,
.sheet-backdrop-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-backdrop-enter-from,
.sheet-backdrop-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -42%) scale(0.93);
}

.sheet-slide-enter-to,
.sheet-slide-leave-from {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

/* ---- Bottom Layout Styles ---- */
.bottom-sheet-backdrop.layout-bottom {
  background: rgba(90, 62, 43, 0.15);
  pointer-events: none;
}

.bottom-sheet.layout-bottom {
  top: auto;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 0);
  width: 100cqw;
  max-width: 100%;
  height: 48%;
  max-height: 420px;
  border-radius: 24px 24px 0 0;
  border-bottom: none;
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.2);
}

.sheet-slide-enter-from.layout-bottom,
.sheet-slide-leave-to.layout-bottom {
  opacity: 0;
  transform: translate(-50%, 100%);
}

.sheet-slide-enter-to.layout-bottom,
.sheet-slide-leave-from.layout-bottom {
  opacity: 1;
  transform: translate(-50%, 0);
}

/* ---- Warm Theme (Achievement Sheet) ---- */
.bottom-sheet.theme-warm {
  background: var(--ach-bg-panel, #ffdfc8);
  border: 3px solid white;
  border-radius: 12px;
  box-shadow: var(--shadow-panel);
}

.theme-warm .sheet-back-btn,
.theme-warm .sheet-help-btn {
  background: var(--off-white, #FAF5F8);
  border: none;
  border-radius: 32px;
  box-shadow: var(--shadow-neu-up), var(--shadow-neu-down);
  color: var(--ach-text-dark, #695e59);
}

.theme-warm .sheet-title-pill {
  background: #F5F5FA;
  border: none;
  border-radius: 13px;
  box-shadow: 0px 4px 2px rgba(0,0,0,0.25);
  color: var(--caramel, #DDAA8B);
  font-weight: 600;
}

.theme-warm .sheet-title-text {
  font-family: 'Jiangcheng Yuanti', sans-serif;
  font-weight: 600;
}
</style>

