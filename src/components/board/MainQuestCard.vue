<template>
  <div v-if="showCard" id="main-quest-card" class="quest-card" :class="{ ready: canSubmit }" @click="openHeroineDetails">
    <!-- Reward bubble floating above -->
    <div class="order-reward-bubble">
      <div class="reward-row">
        <span class="reward-icon">💎</span>
        <span class="reward-amount">+{{ bossReward }}</span>
      </div>
      <div class="reward-row">
        <span class="reward-icon">❤️</span>
        <span class="reward-amount">+{{ affectionReward }}</span>
      </div>
    </div>

    <!-- Boss/Heroine Portrait -->
    <div id="boss-portrait" :style="portraitStyle">
      <div id="boss-blush"></div>
    </div>

    <!-- Card Body -->
    <div class="quest-card-body">
      <div class="quest-card-header-row">
        <div id="boss-header-name">
          <span id="boss-name">{{ bossStore.bossName }}</span>
          <span class="boss-heart-icon">❤️</span>
        </div>
        <div class="hp-bar-container">
          <div id="hp-bar-fill" :style="hpBarStyle"></div>
        </div>
      </div>
      
      <div class="quest-card-items-row">
        <div class="quest-card-items" id="order-items">
          <div 
            v-for="(slot, idx) in expandedRequiredSlots" 
            :key="idx" 
            class="order-item-slot" 
            :class="{ fulfilled: slot.fulfilled }"
          >
            <span class="slot-emoji">{{ slot.emoji }}</span>
          </div>
        </div>
      </div>
      
      <button class="submit-order-btn" :disabled="!canSubmit" @click.stop="onSubmit">提交</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBossStore } from '../../stores/bossStore';
import { useBoardStore } from '../../stores/boardStore';
import { useConfigStore } from '../../stores/configStore';
import { useCurrencyStore } from '../../stores/currencyStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useLoopStore } from '../../stores/loopStore';
import { useSaveStore } from '../../stores/saveStore';
import { useSheet } from '../../composables/useSheet';

interface OrderSlot {
  itemId: string;
  emoji: string;
  fulfilled: boolean;
}

const bossStore = useBossStore();
const boardStore = useBoardStore();
const configStore = useConfigStore();
const currencyStore = useCurrencyStore();
const inventoryStore = useInventoryStore();
const loopStore = useLoopStore();
const saveStore = useSaveStore();
const heroineSheet = useSheet('heroine-sheet');

const showCard = computed(() => {
  return loopStore.loopStatus === 'active';
});

const openHeroineDetails = () => {
  heroineSheet.open();
};

const portraitStyle = computed(() => {
  return {
    backgroundImage: `url('${bossStore.bossAvatar}')`,
    backgroundSize: 'contain',
    backgroundPosition: 'center bottom',
    backgroundRepeat: 'no-repeat'
  };
});

const hpBarStyle = computed(() => {
  return {
    width: `${bossStore.hpPercentage}%`
  };
});

const currentOrderRequired = computed(() => {
  if (bossStore.orders.length === 0) return [];
  
  const currentOrder = bossStore.orders[0];
  if (!currentOrder || !currentOrder.required) return [];
  
  return currentOrder.required.map(req => {
    const item = configStore.items[req.itemId];
    return {
      ...req,
      emoji: item?.emoji || '❓'
    };
  });
});

const expandedRequiredSlots = computed(() => {
  const slots: OrderSlot[] = [];
  currentOrderRequired.value.forEach(req => {
    const ownedCells = boardStore.findAllItems(req.itemId);
    const backpackCount = inventoryStore.slots[req.itemId] || 0;
    const totalOwned = ownedCells.length + backpackCount;
    for (let i = 0; i < req.count; i++) {
      slots.push({
        itemId: req.itemId,
        emoji: req.emoji,
        fulfilled: i < totalOwned
      });
    }
  });
  return slots;
});

const canSubmit = computed(() => {
  if (bossStore.orders.length === 0) return false;
  const order = bossStore.orders[0];
  if (!order?.required) return false;
  for (const req of order.required) {
    const boardCount = boardStore.findAllItems(req.itemId).length;
    const backpackCount = inventoryStore.slots[req.itemId] || 0;
    if (boardCount + backpackCount < req.count) return false;
  }
  return true;
});

const bossReward = computed(() => {
  if (bossStore.orders.length === 0) return 0;
  const order = bossStore.orders[0];
  return order?.diamondReward ?? (order?.damage ?? 10);
});

const affectionReward = computed(() => {
  if (bossStore.orders.length === 0) return 10;
  const order = bossStore.orders[0];
  return order?.affectionReward ?? 10;
});

const onSubmit = () => {
  if (!canSubmit.value) return;
  const order = bossStore.orders[0];
  if (!order?.required) return;

  for (const req of order.required) {
    let remaining = req.count;
    const cellIndices = boardStore.findAllItems(req.itemId);
    const boardConsume = Math.min(remaining, cellIndices.length);
    for (let i = 0; i < boardConsume; i++) {
      boardStore.clearCell(cellIndices[i]);
    }
    remaining -= boardConsume;
    if (remaining > 0) {
      inventoryStore.removeItem(req.itemId, remaining);
    }
  }

  const reward = bossReward.value;
  if (reward > 0) {
    currencyStore.addDiamonds(reward);
  }

  bossStore.submitOrder(order.damage || 10);
  saveStore.saveAll();
};
</script>

<style scoped>
#main-quest-card {
  width: 45cqw !important;
  min-height: 0 !important;
  padding-left: 0 !important;
  position: relative !important;
  overflow: visible !important;
  margin-top: 18cqw !important;
  align-self: flex-end !important;
  flex-shrink: 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  box-sizing: border-box;
  padding: 0 !important;
  gap: 1cqw !important;
  cursor: pointer;
}

#boss-portrait {
  position: absolute !important;
  left: 50% !important;
  bottom: 11cqw !important;
  transform: translateX(-50%) scale(1.55) !important;
  width: 32cqw !important;
  height: 40cqw !important;
  z-index: 60 !important;
  border: none !important;
  border-radius: 0 !important;
  background-color: transparent !important;
  box-shadow: none !important;
  background-size: contain !important;
  background-position: bottom center !important;
  background-repeat: no-repeat !important;
  overflow: visible !important;
  transition: transform 0.3s ease;
  pointer-events: none !important;
  flex-shrink: 0;
}

#boss-blush {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background: radial-gradient(circle, rgba(255, 100, 100, 0.5) 0%, transparent 80%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.quest-card-body {
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
  justify-content: center !important;
  gap: 1.5cqw !important;
  width: 100% !important;
  margin-top: 0.5cqw !important;
  margin-left: 0 !important;
  flex: 0 1 auto !important;
  background: rgba(0, 0, 0, 0.41) !important;
  backdrop-filter: blur(7.3px) !important;
  -webkit-backdrop-filter: blur(7.3px) !important;
  border: 1px solid var(--reward-bubble-border) !important;
  border-radius: 10px !important;
  padding: 1.5cqw 1.5cqw 1.5cqw 1.5cqw !important;
  box-sizing: border-box !important;
  height: auto !important;
  min-height: 5cqw !important;
  transition: background 0.2s ease, box-shadow 0.2s ease;
  position: relative !important;
  z-index: 61 !important;
  box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.4);
}

#main-quest-card.ready .quest-card-body {
  background: rgba(255, 255, 255, 0.4) !important;
  border-color: var(--accent-pink) !important;
  box-shadow: 0 0 10px rgba(255, 101, 132, 0.4) !important;
}

.quest-card-header-row {
  display: flex;
  align-items: center;
  gap: 1.5cqw;
  width: 100%;
}

#boss-header-name {
  background: var(--name-tag-bg) !important;
  border-radius: 12px !important;
  padding: 3px 8px !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  gap: 3px;
}

#boss-name {
  font-size: 11px !important;
  font-weight: 700;
  color: var(--name-tag-text) !important;
  white-space: nowrap;
  font-family: 'Jiangcheng Yuanti', sans-serif;
}

.boss-heart-icon {
  font-size: 10px;
  line-height: 1;
}

.hp-bar-container {
  flex: 1;
  height: 10px !important;
  background: var(--progress-track) !important;
  border-radius: 13px !important;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.15);
}

#hp-bar-fill {
  height: 100%;
  width: 0%;
  background: var(--progress-fill) !important;
  border-radius: 13px;
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  box-shadow: 0 0 6px rgba(243, 86, 131, 0.4);
}

.quest-card-items-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1cqw;
  width: 100%;
}

.quest-card-items {
  display: flex !important;
  gap: 1.5cqw !important;
  align-items: center !important;
  justify-content: center !important;
  flex-wrap: wrap !important;
  flex: 0 1 auto !important;
  min-width: 0 !important;
  margin: 0.5cqw !important;
}

.order-item-slot {
  width: 9.5cqw !important;
  height: 9.5cqw !important;
  min-width: 32px !important;
  min-height: 32px !important;
  border-radius: 8px !important;
  background: rgba(90, 62, 43, 0.25) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.35) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  position: relative !important;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2) !important;
}

.slot-emoji {
  font-size: 18px !important;
  line-height: 1;
}

.order-item-slot.fulfilled {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: var(--color-success) !important;
}

.order-item-slot.fulfilled::after {
  content: '✓';
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: var(--color-success) !important;
  color: white !important;
  font-size: 8px !important;
  font-weight: 900 !important;
  width: 14px !important;
  height: 14px !important;
  border-radius: 50% !important;
  border: 1px solid var(--text-primary) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
  pointer-events: none;
  z-index: 10 !important;
  line-height: 1;
}

.order-reward-bubble {
  position: absolute;
  top: -12cqw;
  left: 50%;
  transform: translateX(-50%);
  background: var(--reward-bubble-bg);
  border-radius: 8px;
  padding: 4px 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.4);
  z-index: 62;
}

.reward-row {
  display: flex;
  align-items: center;
  gap: 3px;
}

.reward-icon {
  font-size: 11px;
  line-height: 1;
}

.reward-amount {
  font-size: 10px;
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.submit-order-btn {
  background: linear-gradient(135deg, var(--accent-pink), #ff7f9e);
  border: none;
  border-radius: 8px;
  padding: 1.5cqw 3cqw;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  cursor: pointer;
  font-family: 'Jiangcheng Yuanti', sans-serif;
  box-shadow: 0px 2px 4px rgba(243, 86, 131, 0.4);
  transition: transform 0.1s ease;
  align-self: center;
}

.submit-order-btn:active {
  transform: scale(0.92);
}

.submit-order-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

