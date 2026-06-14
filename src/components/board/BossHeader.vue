<template>
  <div id="boss-header">
    <div class="quest-row">
      <div id="quest-carousel">
        <!-- Floating Backpack Button -->
        <div class="floating-backpack-container">
          <div class="warehouse-tag">仓库</div>
          <button id="floating-backpack-btn" @click="openInventory">
            <span class="backpack-emoji">🍩</span>
            <span class="backpack-badge" v-if="inventoryCount > 0">{{ inventoryCount }}</span>
          </button>
        </div>
        <!-- Main Quest Card -->
        <MainQuestCard />
        <!-- Daily Order Cards -->
        <DailyOrderCard
          v-for="order in dailyOrderStore.pendingOrders"
          :key="order.id"
          :order="order"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDailyOrderStore } from '../../stores/dailyOrderStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSheet } from '../../composables/useSheet';
import MainQuestCard from './MainQuestCard.vue';
import DailyOrderCard from './DailyOrderCard.vue';

const dailyOrderStore = useDailyOrderStore();
const inventoryStore = useInventoryStore();
const inventorySheet = useSheet('inventory-sheet');

const inventoryCount = computed(() => inventoryStore.totalItems);

const openInventory = () => {
  inventorySheet.open();
};
</script>

<style scoped>
#boss-header {
  position: relative;
  width: 100cqw;
  height: auto;
  padding: 0 0cqw 0cqw 1cqw;
  display: block;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
  z-index: var(--z-fixed);
  box-sizing: border-box;
}

#boss-header::before {
  content: '' !important;
  position: absolute !important;
  inset: 0 !important;
  background: linear-gradient(
    to bottom,
    rgba(221, 170, 139, 0) 0%,
    rgba(255, 234, 195, 0.51) 50%,
    #DDAA8B 100%
  ) !important;
  z-index: -1 !important;
  pointer-events: none !important;
  border-radius: 0 0 5px 5px !important;
}

.quest-row {
  display: flex;
  align-items: stretch;
  width: 100%;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  overflow: visible !important;
}

#quest-carousel {
  position: relative;
  width: 100%;
  height: auto;
  display: flex;
  gap: 2cqw;
  align-items: flex-end;
  padding: 1cqw 0 0 0;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  max-height: none !important;
  flex: 1 1 auto;
  min-width: 0;
  z-index: 1;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
#quest-carousel::-webkit-scrollbar {
  display: none;
}

.floating-backpack-container {
  position: relative;
  align-self: flex-end;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2cqw;
  margin-left: 2cqw;
  z-index: 65;
}

.warehouse-tag {
  background: var(--surface-muted);
  border-radius: 2px;
  color: var(--text-heading);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  text-align: center;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  line-height: 1.2;
  white-space: nowrap;
  margin-bottom: 4px;
}

#floating-backpack-btn {
  background: var(--cream);
  border: 2px solid var(--pale-peach);
  border-radius: 10px;
  width: 52px;
  height: 52px;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0px 3px 6px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  padding: 0;
}
#floating-backpack-btn:active {
  transform: scale(0.95);
}
#floating-backpack-btn.drop-target,
.floating-backpack-container.drop-target #floating-backpack-btn {
  transform: scale(1.18);
  border-color: #ff6b9d;
  box-shadow: 0 0 16px rgba(255, 107, 157, 0.75);
  background: var(--off-white);
}

.backpack-emoji {
  font-size: 28px;
  line-height: 1;
}

.backpack-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: var(--accent-pink);
  color: var(--text-primary);
  font-size: 9px;
  font-weight: 900;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 50%;
  border: 1.5px solid var(--text-primary);
  box-shadow: 0 2px 4px rgba(243, 86, 131, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  line-height: 1;
  box-sizing: border-box;
}

@media (max-height: 760px) {
  #boss-header { padding: 4px 10px; gap: 8px; }
  #quest-carousel { padding: 4px 8px; gap: 6px; max-height: 95px; }
}
</style>

