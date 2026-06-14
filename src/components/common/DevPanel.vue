<!-- ============================================================
     DevPanel.vue — Developer Mode Panel
     ============================================================
     Conditional overlay: only rendered when devConfig.enabled is true.
     Uses CSS classes from src/styles/dev-panel.css (already imported
     globally in main.ts).
     ============================================================ -->
<template>
  <template v-if="devConfig.enabled">
    <!-- Toggle Button -->
    <button
      class="dev-toggle-btn"
      :class="{ 'dev-hidden': panelOpen }"
      @click="panelOpen = true"
      title="Open Dev Panel"
    >⚙</button>

    <!-- Main Panel -->
    <div
      v-show="panelOpen"
      class="dev-panel"
      :class="{ 'dev-dragging': isDragging }"
      :style="panelPositionStyle"
    >
      <!-- Header -->
      <div
        class="dev-panel-header"
        @mousedown.prevent="startDrag"
        @touchstart.prevent="startDrag"
      >
        <span class="dev-panel-title">🛠 Dev Panel</span>
        <button class="dev-panel-close" @click="panelOpen = false">✕</button>
      </div>

      <!-- Tab Bar -->
      <div class="dev-tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="dev-tab-btn"
          :class="{ 'dev-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>

      <!-- Tab Content -->
      <div class="dev-tab-content">

        <!-- ===== Resources Tab ===== -->
        <div class="dev-tab-page" :class="{ 'dev-active': activeTab === 'resources' }">
          <div class="dev-section-header">💎 Diamonds</div>

          <label class="dev-toggle-row">
            <span class="dev-toggle-label">Unlimited Diamonds</span>
            <input
              type="checkbox"
              class="dev-toggle-switch"
              :checked="devConfig.unlimitedDiamonds"
              @change="setDevFlag('unlimitedDiamonds', ($event.target as HTMLInputElement).checked)"
            />
          </label>

          <button class="dev-action-btn dev-resource-btn" @click="addDiamonds(100)">
            💎 +100 Diamonds
          </button>
          <button class="dev-action-btn dev-resource-btn" @click="addDiamonds(1000)">
            💎 +1,000 Diamonds
          </button>
          <button class="dev-action-btn dev-resource-btn" @click="addDiamonds(10000)">
            💎 +10,000 Diamonds
          </button>

          <div class="dev-section-header">🪙 Gold</div>

          <label class="dev-toggle-row">
            <span class="dev-toggle-label">Unlimited Gold</span>
            <input
              type="checkbox"
              class="dev-toggle-switch"
              :checked="devConfig.unlimitedGold"
              @change="setDevFlag('unlimitedGold', ($event.target as HTMLInputElement).checked)"
            />
          </label>

          <button class="dev-action-btn dev-resource-btn" @click="addGold(500)">
            🪙 +500 Gold
          </button>
          <button class="dev-action-btn dev-resource-btn" @click="addGold(5000)">
            🪙 +5,000 Gold
          </button>
          <button class="dev-action-btn dev-resource-btn" @click="addGold(50000)">
            🪙 +50,000 Gold
          </button>

          <div class="dev-info-row">
            Current: 💎{{ currencyStore.diamonds }} | 🪙{{ currencyStore.gold }}
          </div>
        </div>

        <!-- ===== Energy Tab ===== -->
        <div class="dev-tab-page" :class="{ 'dev-active': activeTab === 'energy' }">
          <div class="dev-section-header">⚡ Energy</div>

          <label class="dev-toggle-row">
            <span class="dev-toggle-label">Unlimited Energy</span>
            <input
              type="checkbox"
              class="dev-toggle-switch"
              :checked="devConfig.unlimitedEnergy"
              @change="setDevFlag('unlimitedEnergy', ($event.target as HTMLInputElement).checked)"
            />
          </label>

          <label class="dev-toggle-row">
            <span class="dev-toggle-label">Instant Regen</span>
            <input
              type="checkbox"
              class="dev-toggle-switch"
              :checked="devConfig.instantEnergyRegen"
              @change="setDevFlag('instantEnergyRegen', ($event.target as HTMLInputElement).checked)"
            />
          </label>

          <button class="dev-action-btn" @click="refillEnergy">
            ⚡ Refill to Max
          </button>
          <button class="dev-action-btn" @click="addEnergy(50)">
            ⚡ +50 Energy
          </button>
          <button class="dev-action-btn" @click="setMaxEnergy(200)">
            ⚡ Set Max = 200
          </button>
          <button class="dev-action-btn" @click="setMaxEnergy(999)">
            ⚡ Set Max = 999
          </button>

          <div class="dev-info-row">
            Current: {{ energyStore.current }}/{{ energyStore.max }}
            (cap: {{ energyStore.regenCap }})
          </div>
        </div>

        <!-- ===== Game Tab ===== -->
        <div class="dev-tab-page" :class="{ 'dev-active': activeTab === 'game' }">
          <div class="dev-section-header">🔄 Loop</div>

          <button class="dev-action-btn" @click="advanceLoop">
            🔄 Advance Loop (+1)
          </button>
          <button class="dev-action-btn" @click="addLoopTokens(50)">
            🏅 +50 Loop Tokens
          </button>

          <div class="dev-info-row">
            Loop: #{{ loopStore.loopIndex }} | Tokens: {{ loopStore.loopTokens }}
          </div>

          <div class="dev-section-header">🎰 Gacha</div>

          <button class="dev-action-btn" @click="addFreePulls(10)">
            🎰 +10 Free Pulls
          </button>
          <button class="dev-action-btn" @click="unlockAllSSR">
            ✨ Unlock All SSR
          </button>

          <div class="dev-info-row">
            Free Pulls: {{ gachaStore.freePullsLeft }} | SSR: {{ gachaStore.ownedSSRCount }}/{{ gachaStore.totalSSRCount }}
          </div>

          <div class="dev-section-header">📦 Offline Production</div>

          <label class="dev-toggle-row">
            <span class="dev-toggle-label">Offline Production</span>
            <input
              type="checkbox"
              class="dev-toggle-switch"
              :checked="devConfig.offlineProductionEnabled"
              @change="setDevFlag('offlineProductionEnabled', ($event.target as HTMLInputElement).checked)"
            />
          </label>

          <div class="dev-info-row">
            Status: {{ devConfig.offlineProductionEnabled ? '✅ Enabled' : '⏸ Disabled' }}
          </div>
        </div>

        <!-- ===== Save / Debug Tab ===== -->
        <div class="dev-tab-page" :class="{ 'dev-active': activeTab === 'debug' }">
          <div class="dev-section-header">💾 Save</div>

          <button class="dev-action-btn" @click="saveGame">
            💾 Save Now
          </button>
          <button class="dev-action-btn" @click="loadGame">
            📂 Load Save
          </button>

          <div class="dev-section-header">🗑️ Reset</div>

          <button class="dev-action-btn dev-danger-btn" @click="resetRun">
            🗑️ Reset Current Run
          </button>
          <button class="dev-action-btn dev-danger-btn" @click="clearAllData">
            💀 Clear ALL Data
          </button>

          <div class="dev-section-header">🔧 Tools</div>

          <button class="dev-action-btn" @click="exportSave">
            📤 Export Save JSON
          </button>
          <button class="dev-action-btn" @click="logState">
            📋 Log State to Console
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="dev-panel-footer">
        <span>v{{ version }}</span>
        <button
          class="dev-persist-btn"
          :class="{ 'dev-persist-on': devConfig.persistPanel }"
          @click="togglePersistPanel(!devConfig.persistPanel)"
        >
          {{ devConfig.persistPanel ? '📌 Persist ON' : '📌 Persist' }}
        </button>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
// ============================================================
// DevPanel.vue — Script
// ============================================================
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
  devConfig,
  setDevFlag,
  togglePersistPanel,
} from '../../core/DevConfig';
import { useCurrencyStore } from '../../stores/currencyStore';
import { useEnergyStore } from '../../stores/energyStore';
import { useLoopStore } from '../../stores/loopStore';
import { useGachaStore } from '../../stores/gachaStore';
import { useSaveStore } from '../../stores/saveStore';
import { useConfigStore } from '../../stores/configStore';

// --- Stores ---
const currencyStore = useCurrencyStore();
const energyStore = useEnergyStore();
const loopStore = useLoopStore();
const gachaStore = useGachaStore();
const saveStore = useSaveStore();

// --- Panel State ---
const panelOpen = ref(false);
const activeTab = ref('resources');
const version = '1.0.0';

const tabs = [
  { id: 'resources', label: '💎 Res' },
  { id: 'energy', label: '⚡ NRG' },
  { id: 'game', label: '🎮 Game' },
  { id: 'debug', label: '🔧 Debug' },
];

// --- Dragging ---
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const panelPos = ref({ x: -1, y: -1 }); // -1 means use CSS default

const panelPositionStyle = computed(() => {
  if (panelPos.value.x < 0 || panelPos.value.y < 0) return {};
  return {
    position: 'fixed' as const,
    left: `${panelPos.value.x}px`,
    top: `${panelPos.value.y}px`,
    right: 'auto' as const,
  };
});

function startDrag(e: MouseEvent | TouchEvent) {
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  const panelEl = (e.currentTarget as HTMLElement).parentElement;
  if (!panelEl) return;

  const rect = panelEl.getBoundingClientRect();
  dragOffset.value = { x: clientX - rect.left, y: clientY - rect.top };
  isDragging.value = true;
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

  panelPos.value = {
    x: Math.max(0, clientX - dragOffset.value.x),
    y: Math.max(0, clientY - dragOffset.value.y),
  };
}

function endDrag() {
  isDragging.value = false;
}

onMounted(() => {
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('touchend', endDrag);

  // Auto-open if persist is on
  if (devConfig.persistPanel) {
    panelOpen.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', endDrag);
  window.removeEventListener('touchmove', onDragMove);
  window.removeEventListener('touchend', endDrag);
});

// --- Resource Actions ---
function addDiamonds(amount: number) {
  currencyStore.addDiamonds(amount);
}

function addGold(amount: number) {
  currencyStore.addGold(amount);
}

// --- Energy Actions ---
function refillEnergy() {
  energyStore.add(energyStore.max - energyStore.current);
}

function addEnergy(amount: number) {
  energyStore.add(amount);
}

function setMaxEnergy(newMax: number) {
  energyStore.setMax(newMax);
}

// --- Instant regen watcher ---
let instantRegenInterval: ReturnType<typeof setInterval> | null = null;

watch(
  () => devConfig.instantEnergyRegen,
  (on) => {
    if (on) {
      // Every 500ms, refill energy to max
      instantRegenInterval = setInterval(() => {
        if (energyStore.current < energyStore.max) {
          energyStore.add(energyStore.max - energyStore.current);
        }
      }, 500);
    } else {
      if (instantRegenInterval) {
        clearInterval(instantRegenInterval);
        instantRegenInterval = null;
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (instantRegenInterval) {
    clearInterval(instantRegenInterval);
  }
});

// --- Game Actions ---
function advanceLoop() {
  loopStore.loopIndex++;
}

function addLoopTokens(amount: number) {
  loopStore.loopTokens += amount;
}

function addFreePulls(amount: number) {
  gachaStore.freePullsLeft += amount;
}

function unlockAllSSR() {
  const configStore = useConfigStore();
  const ssrItems = configStore.gachaPool.filter((item) => item.rarity === 'SSR');
  ssrItems.forEach((item) => {
    gachaStore.ssrOwned[item.id] = true;
  });
  gachaStore.ssrOwned = { ...gachaStore.ssrOwned }; // trigger reactivity
}

// --- Save / Debug Actions ---
function saveGame() {
  saveStore.saveMeta();
  saveStore.saveRun();
  console.log('[DevPanel] Game saved.');
}

function loadGame() {
  saveStore.loadAll();
  console.log('[DevPanel] Game loaded.');
}

function resetRun() {
  if (confirm('[Dev] Reset current run? This will clear run-scoped data.')) {
    localStorage.removeItem('heartbeat_merge_run');
    window.location.reload();
  }
}

function clearAllData() {
  if (confirm('[Dev] ⚠️ Clear ALL saved data? This cannot be undone!')) {
    localStorage.removeItem('heartbeat_merge_meta');
    localStorage.removeItem('heartbeat_merge_run');
    localStorage.removeItem('heartbeat_merge_save'); // legacy key
    window.location.reload();
  }
}

function exportSave() {
  const meta = localStorage.getItem('heartbeat_merge_meta');
  const run = localStorage.getItem('heartbeat_merge_run');
  const data = { meta: meta ? JSON.parse(meta) : null, run: run ? JSON.parse(run) : null };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `merge-save-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function logState() {
  console.group('[DevPanel] Game State');
  console.log('Currency:', currencyStore.serialize());
  console.log('Energy:', energyStore.serialize());
  console.log('Loop:', loopStore.serialize());
  console.log('Gacha SSR:', gachaStore.ssrOwned);
  console.log('DevConfig:', { ...devConfig });
  console.groupEnd();
}
</script>
