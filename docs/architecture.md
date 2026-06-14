# 架构文档（Architecture）

> 本文档描述 Heartbeat Merge 的核心架构模式，相对静态，重大重构时才需更新。

---

## 1. 三层架构：Logic → Service → Store

```
┌──────────────────────────────────────────────────────────┐
│ Store 层 (Pinia)                                         │
│  - 调用 Service，传入 deps（从 configStore 取值）          │
│  - apply ResolveResult（修改 ref/状态）                    │
│  - emit EventBus 事件                                    │
│  - 序列化/反序列化                                        │
├──────────────────────────────────────────────────────────┤
│ Service 层 (纯函数)                                       │
│  - 编排 Logic 函数                                        │
│  - 返回 ResolveResult（声明式指令）                        │
│  - 零 Vue 依赖（无 ref/computed/reactive）                │
├──────────────────────────────────────────────────────────┤
│ Logic 层 (纯函数)                                         │
│  - 核心业务计算                                           │
│  - 所有外部值通过 deps 传入                                │
│  - 零 Vue 依赖 + 零 configStore 引用                      │
└──────────────────────────────────────────────────────────┘
```

### 1.1 Logic 层

**职责**：纯计算，给定输入返回输出，无副作用。

**约束**：
- 不得 import 任何 Store
- 不得 import configStore
- 所有配置值通过 deps 参数传入
- random 通过 `deps.random` 传入
- 可 emit EventBus 事件（BoardLogic 的特殊情况，历史遗留）

**模块清单**（`src/logic/`）：

| 文件 | 职责 |
|------|------|
| `BoardLogic.ts` | 棋盘合成/拖拽/剪刀/生成器产出/格子解锁 |
| `BossLogic.ts` | Boss关卡加载/HP/订单/击败 |
| `CurrencyLogic.ts` | 金币/钻石增减 |
| `EnergyLogic.ts` | 体力消耗/恢复/自然回体 |
| `GachaLogic.ts` | 扭蛋概率/单抽/十连 |
| `ItemEffectLogic.ts` | 道具效果计算（即时/消耗/棋盘工具） |

### 1.2 Service 层

**职责**：编排 Logic 函数，返回 `ResolveResult` 声明式指令。

**约束**：
- 不得 import 任何 Store
- 不得 import configStore
- 不得执行副作用（不修改 Store、不调用 API）
- 返回 ResolveResult，由 Store 层 apply

**模块清单**（`src/services/`）：

| 文件 | 职责 |
|------|------|
| `ServiceResultTypes.ts` | ResolveResult 类型定义 + mergeResolveResult |
| `BoardService.ts` | 棋盘生产/合成/出售/剪刀 |
| `BossService.ts` | (未独立，逻辑在 BossLogic) |
| `GachaService.ts` | 扭蛋效果分发 |
| `ItemEffectService.ts` | 道具效果分发执行 |
| `InventoryService.ts` | 背包物品使用 |
| `ShopService.ts` | 商店购买效果 |
| `RewardService.ts` | Boss/每日订单/广告/循环奖励 |
| `LoopService.ts` | 循环结算/元升级 |
| `AffectionService.ts` | 好感度计算/升级 |
| `HeroineService.ts` | 女主角升级效果 |
| `TouchInteractionService.ts` | 触摸互动 |
| `SaveService.ts` | 存档序列化/反序列化 |

### 1.3 Store 层

**职责**：Pinia 状态管理，调用 Service，apply ResolveResult，emit 事件。

**约束**：
- 不包含业务计算逻辑（计算全在 Logic/Service）
- 通过 `deps` 从 configStore 取值传给 Service
- 依赖 EventBus 进行跨模块通信

**模块清单**（`src/stores/`）：

| 文件 | 职责 |
|------|------|
| `configStore.ts` | 加载所有JSON配置，提供全局配置访问 |
| `boardStore.ts` | 棋盘状态、调用 BoardService |
| `bossStore.ts` | Boss/关卡状态 |
| `currencyStore.ts` | 金币/钻石 |
| `energyStore.ts` | 体力 |
| `gachaStore.ts` | 扭蛋状态 |
| `inventoryStore.ts` | 背包 |
| `loopStore.ts` | 循环/周目 |
| `achievementStore.ts` | 成就 |
| `collectionStore.ts` | 图鉴/收藏 |
| `fragmentStore.ts` | 碎片 |
| `cgAlbumStore.ts` | CG相册 |
| `vnReaderStore.ts` | VN阅读器 |
| `dialogueStore.ts` | NPC对话 |
| `dailyOrderStore.ts` | 每日订单 |
| `dailyBuffStore.ts` | 每日增益 |
| `heroineStore.ts` | 女主角升级 |
| `adStore.ts` | 广告系统 |
| `affectionStore.ts` | 好感度 |
| `touchInteractionStore.ts` | 触摸互动 |
| `i18nStore.ts` | 国际化 |
| `saveStore.ts` | 双层存档 |

---

## 2. ResolveResult 模式

### 2.1 Schema

```typescript
interface ResolveResult {
  applyTo: {
    currency?: { addGold?: number; addDiamonds?: number; spendDiamonds?: number };
    energy?: { add?: number; spend?: number; setMax?: number; setRegenInterval?: number };
    board?: {
      placeItems?: Array<{ cellIndex: number; itemId: string }>;
      clearCells?: number[];
      scissorActive?: boolean;
      activateDoubleGenTurns?: number;
      resetGenerators?: boolean;
      upgradeActive?: boolean;
    };
    inventory?: { addItems?: Array<{ itemId: string; count: number; meta?: { effect?: string; value?: unknown } }> };
    fragment?: { addFragments?: Array<{ fragmentId: string; count: number }> };
    cgAlbum?: { unlockCGs?: Array<{ cgId: string; storyIndex: number }> };
    achievement?: {
      incrementStats?: Array<{ key: string; amount: number }>;
      checkAll?: boolean;
      resetLoopAchievements?: boolean;
    };
    affection?: {
      addAffections?: Array<{ characterId: string; amount: number; source: string }>;
      recordTouch?: { characterId: string; zoneId: string };
    };
    gacha?: { singlePull?: { rarity: string } };
    loop?: {
      syncLoopStatus?: string;
      incrementLoopIndex?: { addLoopTokens?: number };
    };
    collection?: { resetLoopDiscoveries?: boolean };
    dailyOrders?: { rollNewOrders?: boolean; setFrozenOrders?: unknown };
    save?: { saveAll?: boolean; saveMeta?: boolean };
  };
  events?: Array<{ name: string; data: unknown }>;
  ui?: {
    toasts?: Array<{ messageKey: string; messageParams?: Record<string, unknown>; fallback: string; type: string }>;
    closeSheets?: string[];
  };
}
```

### 2.2 mergeResolveResult 合并规则

多个 ResolveResult 可通过 `mergeResolveResult(target, source)` 合并为一个。合并规则：

| 字段类型 | 合并策略 |
|---------|---------|
| 数值加法字段（addGold, addDiamonds, add, spend 等） | 求和，结果为0则 undefined |
| energy.spend | 求和，保留0（0有语义：未消耗体力） |
| setMax / setRegenInterval | last-writer-wins（source 覆盖 target） |
| 数组字段（placeItems, clearCells, events, toasts 等） | concat |
| 布尔字段（scissorActive, resetGenerators 等） | OR |
| gacha / loop / collection / dailyOrders | last-writer-wins |

### 2.3 空结果

`emptyResult()` 返回 `{ applyTo: {} }`，用于无操作返回。

---

## 3. Config 数据流

### 3.1 配置文件 → configStore → deps → Logic/Service

```
public/assets/data/*.json
  └→ configStore.loadGameData()  (fetch + 赋值到各 ref)
      └→ Store 调用 Service 时从 configStore 取值构造 deps
          └→ Service 传给 Logic 函数
```

### 3.2 配置文件清单

| 文件 | 对应 configStore ref | 主要消费者 |
|------|---------------------|-----------|
| `settings.json` | `gameSettings` | energyStore, boardStore |
| `items.json` | `items` | boardStore, gachaStore |
| `generators.json` | `generators` | boardStore |
| `levels.json` | `levels` | bossStore |
| `gacha_pool.json` | `gachaPool` | gachaStore |
| `achievements.json` | `achievementsData` | achievementStore |
| `daily_orders.json` | `dailyOrders` | dailyOrderStore |
| `loop_rules.json` | `loopRules` | loopStore |
| `loop_events.json` | `loopEvents` | loopStore |
| `loop_narratives.json` | `loopNarratives` | loopStore |
| `cg_stories.json` | `cgStories` | cgAlbumStore |
| `item_effects.json` | `itemEffects` | ItemEffectService |
| `board_economy.json` | `boardEconomy` | BoardService, RewardService |
| `boss_progression.json` | `bossProgression` | BossLogic |
| `gacha_config.json` | `gachaConfig` | GachaLogic, RewardService |
| `shop_items.json` | `shopItems` | ShopService |
| `affection_config.json` | `affectionConfig` | AffectionService |
| `affection_shop.json` | `affectionShop` | affectionStore |
| `character_profiles.json` | `characterProfiles` | vnReaderStore |
| `touch_interactions.json` | `touchInteractions` | TouchInteractionService |

### 3.3 国际化

`locale='en'` 时加载 `en/` 目录下的 JSON，与中文基础数据 `deepMerge`。

---

## 4. 模块间依赖关系

```
configStore ──────→ 所有store (提供配置数据)
                     │
                     ├→ boardStore ←── energyStore (体力消耗)
                     │      ↑↓          dailyBuffStore (增益检查)
                     │      │           loopStore (循环规则)
                     │      │
                     ├→ bossStore ←── loopStore (HP倍率, 订单缩放)
                     │      │
                     ├→ currencyStore ←── DevConfig (无限资源覆盖)
                     │      ↑↓
                     ├→ gachaStore ←── configStore (扭蛋池)
                     │      │            currencyStore (钻石消费)
                     │      │            inventoryStore (物品存入)
                     │      │            boardStore (物品放置)
                     │      │            cgAlbumStore (CG解锁)
                     │      │            fragmentStore (碎片添加)
                     │      │
                     ├→ heroineStore ←── currencyStore (钻石消费)
                     │
                     ├→ loopStore ←── collectionStore (新发现计数)
                     │      │         achievementStore (成就计数)
                     │      │
                     ├→ dailyOrderStore ←── loopStore (循环筛选)
                     │      │              boardStore (物品检查)
                     │
                     ├→ saveStore ←── 所有store (序列化/反序列化)
                     │
                     └→ useGameLoop ←── 几乎所有store (跨模块通信)
                            │
                            └→ EventBus 桥接所有模块间事件
```

### 4.1 关键数据流向

1. **棋盘→Boss**：boardStore.findItem/allItems → Boss订单提交时检查棋盘是否有足够物品
2. **Boss→棋盘**：Boss击败 → unlockCells → 棋盘格子解锁
3. **扭蛋→棋盘/背包**：gachaStore → instant效果直接放棋盘 → consumable/tool效果存背包
4. **背包→棋盘**：InventorySheet拖拽 → boardStore.placeItem/merge
5. **棋盘→收藏**：board:merged → collectionStore.discover → 图鉴记录
6. **循环→全局**：loopStore.buildLoopConfig → bossStore.setLoopConfig, energyStore.resetToBase
7. **女主角→体力**：heroine:upgradePurchased(energy_cap/regen_speed) → energyStore.setMax/setRegenInterval
8. **货币→所有**：currencyStore 被多个 Store 消费（gacha/heroine/shop/boss）

---

## 5. EventBus

事件总线实现为 `src/core/EventBus.ts`，强类型约束基于 `GameEvents` 接口（`src/types/game.d.ts`）。

完整事件映射表见 `docs/event-map.md`。

---

## 6. 存档架构

### 6.1 双层存档

| 层级 | localStorage Key | 内容 | 持久性 |
|------|-----------------|------|--------|
| META | `heartbeat_merge_meta` | 循环/女主角/扭蛋/碎片/CG/收藏/成就/钻石/广告/每日增益 | 跨循环永久 |
| RUN | `heartbeat_merge_run` | 金币/体力/Boss/棋盘/背包/每日订单/棋盘注册表 | 仅当前循环 |

### 6.2 自动保存

- 每30秒 + 页面隐藏时 + 页面关闭前
- `debouncedSave(200ms)` 用于合成/产出后及时存档

### 6.3 版本迁移

`saveStore.ts` 中 `migrations` 注册表 + `migrateData()` 逐级迁移。当前版本 v4。

### 6.4 离线恢复

加载存档时根据时间差计算体力恢复 + 检查生成器冷却是否过期。

---

## 7. 其他基础设施

### 7.1 状态机（StateMachine）

`src/core/StateMachine.ts`，通用 FSM 实现，用于：
- Boss: IDLE → BATTLE → SUBMITTING → DEFEATED → COMPLETE
- Energy: FULL → REGENNING → EMPTY
- Gacha: IDLE → ROLLING → RESULT → ACK → IDLE

### 7.2 开发者工具

`src/core/DevConfig.ts`，开发模式下可开启：无限资源、速度调节、跳过动画。

### 7.3 离线产出策略

`src/features/`，策略模式：
- `DefaultOfflineProduction.ts`：按冷却间隔计算离线 ticks
- `DisabledOfflineProduction.ts`：禁用离线产出
- `OfflineProductionManager.ts`：策略选择器

### 7.4 存档 Schema 验证

`src/schemas/`，提供存档数据结构校验：
- `core.schema.ts`：核心字段
- `economy.schema.ts`：经济系统
- `loop.schema.ts`：循环系统
- `affection.schema.ts`：好感度系统
- `registry.ts`：schema 注册表
