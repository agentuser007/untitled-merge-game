// ============================================================
// bossStore.ts — Boss Game State Store
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { globalBus } from '../core/EventBus';
import { BossLogic, LevelData, OrderData } from '../logic/BossLogic';
import { useConfigStore } from './configStore';
import type { BossSerializeData } from '../types/serialize';
import { useLoopStore } from './loopStore';
import type { LogicEvent } from '../logic/BoardLogic';
import type { GameEvents, LoopConfig } from '../types/game';

function emitEvents(events: LogicEvent[]): void {
    globalBus.emitLogicEvents(events);
}

export const useBossStore = defineStore('boss', () => {
    // --- State ---
    const currentLevelIdx = ref(0);
    const currentHp = ref(0);
    const totalHp = ref(0);
    const bossName = ref('');
    const bossAvatar = ref('');
    const fsmState = ref('');
    const orders = ref<OrderData[]>([]);
    const currentOrderIdx = ref(0);

    // --- Logic instance ---
    const logic = new BossLogic();

    // Initialize state from logic
    currentLevelIdx.value = logic.currentLevelIdx;
    currentHp.value = logic.currentHp;
    totalHp.value = logic.totalHp;
    currentOrderIdx.value = logic.currentOrderIdx;
    fsmState.value = logic.fsm.getState();

    // --- Subscribe to FSM state changes ---
    globalBus.on('bossfsm:stateChanged', (data) => {
        if (data) {
            fsmState.value = data.to;
        }
    });

    // --- Computed ---
    const hpPercentage = computed(() => {
        return totalHp.value > 0 ? Math.max(0, ((totalHp.value - currentHp.value) / totalHp.value) * 100) : 0;
    });

    const isDefeated = computed(() => currentHp.value <= 0);

    // --- Actions ---
    function loadLevel(levelIdx: number) {
        const configStore = useConfigStore();
        const loopStore = useLoopStore();
        const { level, events } = logic.loadLevel(levelIdx, configStore.levels as unknown as LevelData[], configStore.bossProgression);
        if (level) {
            currentLevelIdx.value = logic.currentLevelIdx;
            currentHp.value = logic.currentHp;
            totalHp.value = logic.totalHp;
            bossName.value = level.bossName;
            bossAvatar.value = level.bossAvatar;

            // Extract order from the orderLoaded event payload
            const orderEvent = events.find(e => e.type === 'boss:orderLoaded');
            if (orderEvent && orderEvent.payload) {
                const p = orderEvent.payload as GameEvents['boss:orderLoaded'];
                const order = p.order;
                if (loopStore.hasRule('timedOrdersUp')) {
                    if (!order.isTimed) {
                        order.isTimed = true;
                        order.timeLimit = 30;
                    }
                    order.timeLimit = Math.floor((order.timeLimit || 30) * 0.7);
                    logic.timerRemaining = order.timeLimit;
                }
                orders.value = [order];
                currentOrderIdx.value = logic.currentOrderIdx;
            }
        }

        emitEvents(events);
        return level;
    }

    function submitOrder(damage: number) {
        const configStore = useConfigStore();
        const result = logic.commitSubmit(damage, configStore.levels as unknown as LevelData[]);
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        currentOrderIdx.value = logic.currentOrderIdx;
        emitEvents(result.events);

        if (!result.isDefeated) {
            loadOrder(logic.currentOrderIdx);
        }

        return result;
    }

    function nextLevel() {
        const nextLevelIdx = currentLevelIdx.value + 1;
        return loadLevel(nextLevelIdx);
    }

    function damageBoss(damage: number) {
        const result = logic.applyDamage(damage);
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        emitEvents(result.events);
        return result;
    }

    function setLoopConfig(config: LoopConfig) {
        logic.setLoopConfig(config);
    }

    function loadOrder(orderIdx: number) {
        const configStore = useConfigStore();
        const loopStore = useLoopStore();
        const level = logic.getCurrentLevel(configStore.levels as unknown as LevelData[]);
        if (level && level.orders && orderIdx < level.orders.length) {
            const { order, events } = logic.loadOrder(orderIdx, configStore.levels as unknown as LevelData[], configStore.bossProgression, configStore.items);
            if (order && loopStore.hasRule('timedOrdersUp')) {
                if (!order.isTimed) {
                    order.isTimed = true;
                    order.timeLimit = 30;
                }
                order.timeLimit = Math.floor((order.timeLimit || 30) * 0.7);
                logic.timerRemaining = order.timeLimit;
            }
            if (order) {
                orders.value = [order];
                currentOrderIdx.value = logic.currentOrderIdx;
            }
            emitEvents(events);
            return order;
        }
        return null;
    }

    function reset(): void {
        logic.currentLevelIdx = -1;
        logic.currentOrderIdx = 0;
        logic.currentHp = 0;
        logic.totalHp = 0;
        logic.timerRemaining = 0;
        logic.fsm.reset('IDLE');

        currentLevelIdx.value = logic.currentLevelIdx;
        currentOrderIdx.value = logic.currentOrderIdx;
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        fsmState.value = logic.fsm.getState();
        orders.value = [];
        bossName.value = '';
        bossAvatar.value = '';
    }

    // --- Serialization ---
    function serialize() {
        return {
            levelIdx: currentLevelIdx.value,
            orderIdx: currentOrderIdx.value,
            hp: currentHp.value,
            totalHp: totalHp.value,
            state: fsmState.value,
            timerRemaining: logic.timerRemaining,
            bossName: bossName.value,
            bossAvatar: bossAvatar.value
        };
    }

    function deserialize(data: unknown) {
        if (!data) return;
        const d = data as BossSerializeData;
        logic.currentLevelIdx = d.levelIdx ?? 0;
        logic.currentOrderIdx = d.orderIdx ?? 0;
        logic.currentHp = d.hp ?? 0;
        logic.totalHp = d.totalHp ?? 0;
        logic.timerRemaining = d.timerRemaining ?? 0;
        
        if (d.bossName) bossName.value = d.bossName;
        if (d.bossAvatar) bossAvatar.value = d.bossAvatar;
        
        if (d.state) {
            const validStates = ['IDLE', 'BATTLE', 'SUBMITTING', 'DEFEATED', 'COMPLETE'];
            const targetState = d.state === 'SUBMITTING' ? 'BATTLE' : d.state;
            logic.fsm.reset(validStates.includes(targetState) ? targetState : 'IDLE');
        }
        
        currentLevelIdx.value = logic.currentLevelIdx;
        currentOrderIdx.value = logic.currentOrderIdx;
        currentHp.value = logic.currentHp;
        totalHp.value = logic.totalHp;
        fsmState.value = logic.fsm.getState();

        if (logic.currentLevelIdx >= 0) {
            loadOrder(logic.currentOrderIdx);
        }
    }

    return {
        // State
        currentLevelIdx,
        currentHp,
        totalHp,
        bossName,
        bossAvatar,
        fsmState,
        orders,
        currentOrderIdx,
        
        // Computed
        hpPercentage,
        isDefeated,
        
        // Actions
        loadLevel,
        submitOrder,
        nextLevel,
        damageBoss,
        setLoopConfig,
        loadOrder,
        reset,
        
        // Serialization
        serialize,
        deserialize
    };
});
