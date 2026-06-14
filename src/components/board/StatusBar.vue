<template>
  <div id="status-bar">
    <div class="status-left">
      <div class="star-rating-circle">
        <span class="star-icon">⭐</span>
      </div>
      <div class="rating-gold-pill">
        <span class="gold-text">{{ goldDisplay }}</span>
      </div>
      <div class="loop-index-pill">
        <span class="loop-text">x{{ loopStore.loopIndex }}</span>
      </div>
    </div>

    <div class="status-center">
      <div class="energy-container">
        <div class="energy-pill">
          <span class="energy-icon">⚡</span>
          <span class="energy-value">{{ energyStore.current }}</span>
          <button class="add-btn" @click="shopSheet.open()">+</button>
        </div>
        <div v-if="formattedEnergyCountdown" class="energy-countdown">
          {{ formattedEnergyCountdown }}
        </div>
      </div>

      <div class="diamond-pill">
        <span class="diamond-icon">💎</span>
        <span class="diamond-value">{{ diamondDisplay }}</span>
        <button class="add-btn" @click="shopSheet.open()">+</button>
      </div>
    </div>

    <div class="status-right">
      <button class="shop-circle-btn" @click="$emit('open-map')">
        <span class="shop-btn-icon">🗺️</span>
      </button>
      <div class="rank-container">
        <span class="rank-label">Rank</span>
        <div class="rank-circle">
          <span class="rank-number">{{ levelText }}</span>
        </div>
      </div>
    </div>

    <!-- Floating buff pills -->
    <div class="buff-row">
      <div
        v-if="dailyBuffStore.isPending"
        class="buff-pill buff-pending"
        @click.stop="openPopover('pending')"
      >
        <span class="buff-icon">{{ dailyBuffStore.pendingBuff?.icon }}</span>
      </div>
      <div
        v-for="buff in dailyBuffStore.activeBuffs"
        :key="buff.id"
        class="buff-pill buff-active"
        @click.stop="openPopover(buff.id)"
      >
        <span class="buff-icon">{{ buff.icon }}</span>
        <span class="buff-timer">{{ formatRemaining(buff) }}</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="popoverBuff" class="buff-popover-overlay" @click="closePopover" />
      <Transition name="popover">
        <div v-if="popoverBuff" class="buff-popover" @click.stop>
          <div class="popover-icon">{{ popoverBuff.icon }}</div>
          <div class="popover-name">{{ i18nStore.t(popoverBuff.nameKey) || popoverBuff.id }}</div>
          <div class="popover-desc">{{ i18nStore.t(popoverBuff.descKey) }}</div>
          <template v-if="popoverType === 'pending'">
            <div class="popover-timer-hint">{{ i18nStore.t('dailyBuff.durationHint') || '生效30分钟' }}</div>
            <div class="popover-actions">
              <button class="popover-btn popover-cancel" @click="closePopover">{{ i18nStore.t('dailyBuff.dismiss') || '取消' }}</button>
              <button class="popover-btn popover-activate" @click="onActivate">{{ i18nStore.t('dailyBuff.activate') || '激活' }}</button>
            </div>
          </template>
          <template v-else>
            <div class="popover-remaining">{{ formatRemaining(popoverBuff) }}</div>
            <div class="popover-actions">
              <button class="popover-btn popover-close" @click="closePopover">{{ i18nStore.t('common.close') || '关闭' }}</button>
            </div>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useCurrencyStore } from '../../stores/currencyStore'
import { useLoopStore } from '../../stores/loopStore'
import { useBossStore } from '../../stores/bossStore'
import { useEnergyStore } from '../../stores/energyStore'
import { useDailyBuffStore, type DailyBuff } from '../../stores/dailyBuffStore'
import { useI18nStore } from '../../stores/i18nStore'
import { useSheet } from '../../composables/useSheet'

const currencyStore = useCurrencyStore()
const loopStore = useLoopStore()
const bossStore = useBossStore()
const energyStore = useEnergyStore()
const dailyBuffStore = useDailyBuffStore()
const i18nStore = useI18nStore()
const shopSheet = useSheet('shop-sheet')

defineEmits<{
  (e: 'open-map'): void
}>()

const now = ref(Date.now())
const lastEnergy = ref(energyStore.current)
const energyCountdown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => energyStore.current, (newVal) => {
  if (newVal < energyStore.regenCap) {
    if (newVal > lastEnergy.value || energyCountdown.value === 0) {
      energyCountdown.value = Math.floor(energyStore.regenInterval / 1000)
    }
  } else {
    energyCountdown.value = 0
  }
  lastEnergy.value = newVal
}, { immediate: true })

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
    dailyBuffStore.checkBuffExpiry()
    
    // Decrement energy countdown
    if (energyStore.current < energyStore.regenCap) {
      if (energyCountdown.value > 0) {
        energyCountdown.value--
      } else {
        energyCountdown.value = Math.floor(energyStore.regenInterval / 1000)
      }
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const popoverId = ref<string | null>(null)

const popoverType = computed<'pending' | 'active'>(() => {
  if (popoverId.value === 'pending') return 'pending'
  return 'active'
})

const popoverBuff = computed<DailyBuff | null>(() => {
  if (!popoverId.value) return null
  if (popoverId.value === 'pending') return dailyBuffStore.pendingBuff
  return dailyBuffStore.activeBuffs.find(b => b.id === popoverId.value) || null
})

function openPopover(id: string) {
  popoverId.value = id
}

function closePopover() {
  popoverId.value = null
}

function onActivate() {
  dailyBuffStore.activatePendingBuff()
  closePopover()
}

function formatRemaining(buff: DailyBuff): string {
  void now.value
  const ms = dailyBuffStore.getBuffRemainingMs(buff)
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const goldDisplay = computed(() => {
  return currencyStore.formatGold(currencyStore.gold)
})

const diamondDisplay = computed(() => {
  return currencyStore.formatGold(currencyStore.diamonds)
})

const levelText = computed(() => {
  if (bossStore.currentLevelIdx < 0) return '--'
  return `${bossStore.currentLevelIdx + 1}`
})

const formattedEnergyCountdown = computed(() => {
  if (energyStore.current >= energyStore.regenCap) return ''
  const min = Math.floor(energyCountdown.value / 60)
  const sec = energyCountdown.value % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
})
</script>

<style scoped>
#status-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100cqw;
  padding: calc(3cqw + env(safe-area-inset-top, 0px)) 3cqw 0 3cqw;
  box-sizing: border-box;
  position: relative;
  z-index: var(--z-fixed);
  flex-shrink: 0;
  min-height: calc(14cqw + env(safe-area-inset-top, 0px));
}

.status-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.star-rating-circle {
  width: 11cqw;
  height: 11cqw;
  min-width: 44px;
  min-height: 44px;
  background: var(--off-white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(170, 170, 204, 0.4);
  z-index: 2;
}

.star-icon {
  font-size: 22px;
  line-height: 1;
}

.rating-gold-pill {
  background: var(--accent-pink);
  border-radius: 20px;
  padding: 1px 8px;
  margin-top: -6px;
  z-index: 3;
  box-shadow: 0px 2px 4px rgba(243, 86, 131, 0.3);
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.gold-text {
  font-size: 10px;
  font-weight: 900;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1.2;
}

.loop-index-pill {
  background: var(--peach-light);
  border-radius: 20px;
  padding: 1px 8px;
  margin-top: 3px;
  z-index: 3;
  display: inline-flex;
  justify-content: center;
  align-items: center;
}

.loop-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Plus Jakarta Sans', sans-serif;
  line-height: 1.2;
}

.status-center {
  display: flex;
  align-items: flex-start;
  gap: 2.5cqw;
  margin-top: 1cqw;
}

.energy-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.energy-pill,
.diamond-pill {
  background: var(--off-white);
  box-shadow: 0 4px 10px rgba(170, 170, 204, 0.25);
  border-radius: 32px;
  height: 8cqw;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 0 6px 0 10px;
}

.energy-icon,
.diamond-icon {
  font-size: 14px;
}

.energy-value {
  font-size: 13px;
  font-weight: 800;
  color: var(--accent-pink);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.diamond-value {
  font-size: 13px;
  font-weight: 800;
  color: var(--warm-border);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.add-btn {
  width: 5cqw;
  height: 5cqw;
  min-width: 20px;
  min-height: 20px;
  border-radius: 50%;
  background: var(--color-success);
  border: none;
  color: white;
  font-size: 13px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.energy-countdown {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-success);
  margin-top: 2px;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 2.5cqw;
  margin-top: 1cqw;
}

.shop-circle-btn {
  width: 9cqw;
  height: 9cqw;
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
  background: var(--off-white);
  border: none;
  box-shadow: 0 4px 10px rgba(170, 170, 204, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.shop-btn-icon {
  font-size: 18px;
}

.rank-container {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rank-label {
  font-size: 14px;
  font-weight: 900;
  color: var(--text-primary);
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.rank-circle {
  width: 6cqw;
  height: 6cqw;
  min-width: 24px;
  min-height: 24px;
  border-radius: 50%;
  background: var(--off-white);
  border: 2px solid var(--text-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-number {
  font-size: 12px;
  font-weight: 900;
  color: var(--peach-light);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.buff-row {
  position: absolute;
  top: 14cqw;
  left: 3cqw;
  display: flex;
  gap: 6px;
  z-index: 10;
}

.buff-pill {
  background: var(--off-white);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border-radius: 32px;
  height: 6cqw;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  cursor: pointer;
}

.buff-pending {
  animation: buff-pulse 1.2s ease-in-out infinite;
}

.buff-icon {
  font-size: 12px;
}

.buff-timer {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-success);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

@keyframes buff-pulse {
  0%, 100% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 0 rgba(243, 86, 131, 0.4); }
  50% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 4px rgba(243, 86, 131, 0.15); }
}

.buff-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 798;
}

.buff-popover {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--off-white, #FAF5F8);
  border-radius: 16px;
  padding: 20px 24px;
  min-width: 220px;
  max-width: 85cqw;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 799;
}

.popover-icon {
  font-size: 32px;
  margin-bottom: 6px;
}

.popover-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-dark, #695E59);
  margin-bottom: 4px;
}

.popover-desc {
  font-size: 12px;
  color: var(--text-medium, #555);
  margin-bottom: 12px;
  line-height: 1.5;
}

.popover-timer-hint {
  font-size: 11px;
  color: var(--text-light, #999);
  margin-bottom: 12px;
}

.popover-remaining {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-pink);
  margin-bottom: 12px;
}

.popover-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.popover-btn {
  padding: 7px 20px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.popover-btn:active {
  transform: scale(0.94);
}

.popover-cancel,
.popover-close {
  background: var(--surface-muted);
  color: var(--text-muted-alt);
}

.popover-activate {
  background: var(--accent-pink);
  color: white;
}
</style>

