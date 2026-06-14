# 硬编码值审计报告 — 可插拔化剩余工作量评估

> 扫描范围：`src/logic/*.ts` + `src/services/*.ts`（不含测试文件）
> 扫描日期：2026-06-12
> 对标配置：`public/assets/data/*.json` + `src/stores/configStore.ts`
> v2 更新：加入 config schema 设计、排除项、分阶段执行计划

---

## 一、逐项审计表

### 1. `src/logic/ItemEffectLogic.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 1 | :142 | `10` | calculateAddFragment | 碎片默认数量 `value?.count \|\| 10` | 未在 config 中找到对应字段 |
| 2 | :146 | `3` | calculateAddFragment | 碎片默认生成器等级 `value?.genLevel \|\| 3` | 未在 config 中找到对应字段 |
| 3 | :159 | `20` | calculateAddEnergy | 默认体力恢复量 `value?.energy \|\| items[id].energyRecover \|\| 20` | 未在 config 中找到对应字段 |
| 4 | :167 | `3` | calculateDoubleGenTurns | 双倍产出默认回合数 `value?.turns \|\| 3` | 未在 config 中找到对应字段 |
| 5 | :177 | `7` | calculateLuckyCoin | 幸运七号默认翻转次数 `value?.count \|\| 7` | 未在 config 中找到对应字段 |
| 6 | :182 | `0.5` | calculateLuckyCoin | 幸运七号金币/钻石概率阈值（50%） | 未在 config 中找到对应字段 |
| 7 | :183 | `100` | calculateLuckyCoin | 幸运七号每次金币奖励 | 未在 config 中找到对应字段 |
| 8 | :185 | `10` | calculateLuckyCoin | 幸运七号每次钻石奖励 | 未在 config 中找到对应字段 |

### 2. `src/logic/GachaLogic.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 9 | :119 | `10` | pullTen | 十连抽次数（循环边界，同时定义"十连"业务规则） | 未在 config 中找到对应字段 |

### 3. `src/logic/BossLogic.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 10 | :136-140 | 阶跃表整体 | getOrderTierBoost | 订单等级提升规则：loop≤1→+0, ≤3→+1, ≤5→+2, ≤7→+3, 8+→+4 | 未在 config 中找到对应字段 |
| 11 | :153 | `8` | getScaledOrder | 物品最大等级上限 MAX_TIER | 未在 config 中找到对应字段 |

### 4. `src/logic/BoardLogic.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 12 | :548 | `'gen_makeup_1'` | placeInitialGenerators | 初始放置的化妆生成器 itemId | 未在 config 中找到对应字段 |
| 13 | :558 | `'gen_study_1'` | placeInitialGenerators | 初始放置的学业生成器 itemId | 未在 config 中找到对应字段 |

### 5. `src/logic/EnergyLogic.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 14 | :37 | `3000` | constructor | 体力恢复间隔兜底值。⚠️ 实际配置 120000ms，兜底值过小 | 已有 config：`GAME_CONFIG.ENERGY_REGEN_INTERVAL`。✅ **已修复**：改为缺省报错 |
| 15 | :38 | `1` | constructor | 体力恢复量兜底值 | 已有 config：`GAME_CONFIG.ENERGY_REGEN_AMOUNT`。✅ **已修复**：改为缺省报错 |

### 6. `src/services/InventoryService.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 16 | :95 | `20` | resolveLegacyPotionUse | 旧版体力药水默认恢复量 `energyRecover \|\| 20` | 未在 config 中找到对应字段 |

### 7. `src/services/ItemEffectService.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 17 | :165 | `3` | resolveConsumableEffect(reroll) | 默认重置物品数量 `value?.count \|\| 3` | 未在 config 中找到对应字段 |
| 18 | :189 | `[1]` | resolveConsumableEffect(clear_lv1) | 清理 Lv1 目标等级列表 | 未在 config 中找到对应字段 |
| 19 | :196 | `2` | resolveConsumableEffect(clear_lv1) | 每清理一个物品的体力奖励 | 未在 config 中找到对应字段 |
| 20 | :207 | `[1, 2]` | resolveConsumableEffect(space_clean) | 空间清理目标等级列表 | 未在 config 中找到对应字段 |
| 21 | :214 | `3` | resolveConsumableEffect(space_clean) | 每清理一个物品的体力奖励 | 未在 config 中找到对应字段 |

### 8. `src/services/BoardService.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 22 | :438 | `1.5` | calculateSellPrice | 售价加成倍率 `sellPrice * 1.5` | 未在 config 中找到对应字段 |
| 23 | :551 | `0.5` | resolveProduction | 能量折扣免费概率（energyDiscountActive 时 50% 免费生产） | 未在 config 中找到对应字段 |
| 24 | :564,579,598 | `'perfume'`,`'lips'` | resolveProduction | 香水加成适用链条 ID | 不确定 — chains 在 config 中但加成适用列表无对应字段 |
| 25 | :651 | `0.3` | resolveMerge | 幸运合成概率 30%（luckyMergeActive 跳一级） | 未在 config 中找到对应字段 |

### 9. `src/services/ShopService.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 26 | :69 | `'scissor'` | resolveShopItemPurchased | 剪刀商品硬编码 itemId | 未在 config 中找到对应字段 |
| 27 | :83 | `2` | resolveShopItemPurchased(clear_lv1) | 清理默认体力/物品 `value?.energyPerItem ?? 2` | 不确定 — 代码支持 value.energyPerItem 但 shopItems 本身硬编码在 configStore |

### 10. `src/services/RewardService.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 28 | :61,:76 | `1.5` | resolveDailyOrderFulfilled | 日常订单金币加成倍率（dailyGoldUp 规则生效时） | 未在 config 中找到对应字段 |
| 29 | :153 | `'SR'` | resolveAdReward | 广告免费抽最大稀有度上限 | 未在 config 中找到对应字段 |

### 11. `src/services/AffectionService.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 30 | :61-66 | MALE_LEAD_CHAR_MAP(4条) | resolveVnCompleted | VN 男主名字→characterId 映射 | 未在 config 中找到对应字段 |

> 注：`bossDefeat: {base:15, perLoop:3}`、`vnStorySSR||50`、`vnStorySR||20` 均已在 `affection_config.json` sources 中配置，不列入待办。

### 12. `src/services/LoopService.ts`

| # | 文件:行号 | 硬编码值 | 所在函数 | 用途描述 | 当前状态 |
|---|-----------|----------|----------|----------|----------|
| 31 | :14 | `2` | calculateLoopRewards | 成就解锁奖励倍率：每个成就给 2 个额外 token | 未在 config 中找到对应字段 |

### 无硬编码的文件

- `logic/CurrencyLogic.ts` — 构造函数参数传入
- `services/GachaService.ts` — 稀有度/费用从 deps 传入
- `services/HeroineService.ts` — 升级数据从 deps 传入
- `services/TouchInteractionService.ts` — 数据从 deps 传入
- `services/SaveService.ts` — 无游戏逻辑硬编码（`CURRENT_VERSION=4` 属技术实现）
- `services/ServiceResultTypes.ts` — 纯类型定义

---

## 二、汇总统计

### 按文件/模块分组

| 文件 | 硬编码项 | 已有config | 未在config | 不确定 |
|------|---------|-----------|-----------|--------|
| logic/ItemEffectLogic.ts | 8 | 0 | 8 | 0 |
| logic/GachaLogic.ts | 1 | 0 | 1 | 0 |
| logic/BossLogic.ts | 2 | 0 | 2 | 0 |
| logic/BoardLogic.ts | 2 | 0 | 2 | 0 |
| logic/EnergyLogic.ts | 2 | 2 | 0 | 0 |
| services/InventoryService.ts | 1 | 0 | 1 | 0 |
| services/ItemEffectService.ts | 5 | 0 | 5 | 0 |
| services/BoardService.ts | 4 | 0 | 3 | 1 |
| services/ShopService.ts | 2 | 0 | 1 | 1 |
| services/RewardService.ts | 2 | 0 | 2 | 0 |
| services/AffectionService.ts | 1 | 0 | 1 | 0 |
| services/LoopService.ts | 1 | 0 | 1 | 0 |
| **合计** | **31** | **2** | **27** | **2** |

### 核心指标

| 指标 | 数量 |
|------|------|
| 硬编码项总数 | 31 |
| 已有 config 字段 | 2 |
| **未在 config 中找到对应字段（真正待办）** | **27** |
| 不确定（需人工判断） | 2 |

### 按业务领域分类

| 业务领域 | 项数 | 编号 |
|----------|------|------|
| 道具效果数值 | 14 | #1-8, #16-21 |
| 合成规则 | 5 | #12, #13, #22, #25, #26 |
| Boss/循环规则 | 3 | #9-11 |
| 生成器产出 | 4 | #18, #20, #23, #24 |
| 订单奖励 | 2 | #28, #29 |
| 好感度 | 1 | #30 |
| 循环结算 | 1 | #31 |
| 体力系统(已有config) | 2 | #14, #15 |

---

## 三、排除项与范围裁定

以下 5 项从本次可插拔化范围中排除，理由如下：

| 编号 | 值 | 排除理由 |
|------|-----|----------|
| #12-13 | 初始生成器 ID `gen_makeup_1` / `gen_study_1` | 通常不变，排除出本次范围 |
| #24 | 香水加成链 ID `perfume`/`lips` | 逻辑触发条件配置化，设计成本高于数值类，放到第二批 |
| #26 | 剪刀 itemId `'scissor'` | 代码逻辑与数据耦合点，非纯数值，改动需谨慎，放到第二批 |
| #27 | clear_lv1 体力/物品 `2` | 归并到 shopItems 整体外置问题一起处理，不单独算一项 |
| #30 | VN 角色名映射 MALE_LEAD_CHAR_MAP | 逻辑触发条件配置化（名字→ID映射），应随 i18n 一起处理，放到第二批 |

排除后，**本次"纯数值、改动直接"的可插拔化范围 = 27 - 5 = 22 项**。

---

## 四、Config Schema 设计

### 文件归属映射

| 新增/扩展文件 | 涵盖编号 | 说明 |
|--------------|----------|------|
| `item_effects.json` | #1-8, #16-21 (14项) | 道具效果数值，按 effect 名分组 |
| `board_economy.json` | #22, #25, #28, #31 (4项) | 合成/经济倍率 |
| `boss_progression.json` | #10, #11 (2项) | Boss/循环规则 |
| `gacha_config.json` | #9, #29 (2项) | 扭蛋配置（十连次数、免费抽上限） |
| `shop_items.json` | 附加发现 + #27 | 商店商品整体外置 |
| **第二批待定** | #24, #26, #30 | 逻辑触发条件配置化，需单独设计 schema |

### `item_effects.json` 结构

```json
{
  "luckyCoin": {
    "defaultCount": 7,
    "goldChance": 0.5,
    "goldAmount": 100,
    "diamondAmount": 10
  },
  "fragment": {
    "defaultCount": 10,
    "defaultGenLevel": 3
  },
  "energyItem": {
    "defaultRecover": 20
  },
  "doubleGen": {
    "defaultTurns": 3
  },
  "clearLv1": {
    "targetLevels": [1],
    "energyPerItem": 2
  },
  "spaceClean": {
    "targetLevels": [1, 2],
    "energyPerItem": 3
  },
  "reroll": {
    "defaultCount": 3
  }
}
```

设计原则：
- 按 effect 名分组，策划调"幸运七号"时所有参数一目了然
- 字段命名与代码中 `value?.xxx` 的 key 对齐，降低理解成本
- 数组型参数（`targetLevels`）直接写明值，不用逗号分隔的字符串

### `board_economy.json` 结构

```json
{
  "sellPriceBoost": 1.5,
  "luckyMergeChance": 0.3,
  "dailyGoldBoost": 1.5,
  "achievementTokenBonus": 2,
  "energyDiscountFreeChance": 0.5
}
```

设计原则：
- 每项独立 key，不嵌套，因为这些参数分属不同子系统（合成、出售、订单、循环），只是共享"经济倍率"这个领域
- `energyDiscountFreeChance`（#23）也归入此文件，因为它是"能量折扣 → 经济影响"的参数

### `boss_progression.json` 结构

```json
{
  "orderTierBoost": [
    { "maxLoop": 1, "boost": 0 },
    { "maxLoop": 3, "boost": 1 },
    { "maxLoop": 5, "boost": 2 },
    { "maxLoop": 7, "boost": 3 },
    { "maxLoop": null, "boost": 4 }
  ],
  "maxItemTier": 8
}
```

设计原则：
- `orderTierBoost` 用数组替代代码中的 if-else 阶梯，策划可以增减阶段
- `maxLoop: null` 表示兜底（对应代码中的 `return 4`）
- ~~`tenPullCount`~~ 和 ~~`freePullMaxRarity`~~ 最初误放此文件，2c-0 阶段已迁至 `gacha_config.json`

### `gacha_config.json` 结构

```json
{
  "tenPullCount": 10,
  "freePullMaxRarity": "SR"
}
```

设计原则：
- `tenPullCount` 和 `freePullMaxRarity` 都属于扭蛋机制，语义上不应与 Boss/循环规则混放
- 从 `boss_progression.json` 迁出，确保文件名与字段语义匹配

### `shop_items.json` 结构

```json
[
  {
    "id": "shop_energy_small",
    "icon": "⚡",
    "cost": 50,
    "effect": "add_energy_item",
    "value": { "energy": 30 },
    "i18nName": "shopEnergySmall",
    "i18nDesc": "shopEnergySmallDesc"
  },
  {
    "id": "shop_energy_large",
    "icon": "🔋",
    "cost": 120,
    "effect": "add_energy_item",
    "value": { "energy": 80 },
    "i18nName": "shopEnergyLarge",
    "i18nDesc": "shopEnergyLargeDesc"
  },
  {
    "id": "shop_joker",
    "icon": "🃏",
    "cost": 200,
    "effect": "add_joker",
    "value": {},
    "i18nName": "shopJoker",
    "i18nDesc": "shopJokerDesc"
  },
  {
    "id": "shop_scissor",
    "icon": "✂️",
    "cost": 150,
    "effect": "add_scissor",
    "value": {},
    "i18nName": "shopScissor",
    "i18nDesc": "shopScissorDesc"
  },
  {
    "id": "shop_clear_lv1",
    "icon": "🧹",
    "cost": 80,
    "effect": "clear_lv1",
    "value": { "energyPerItem": 2 },
    "i18nName": "shopClearLv1",
    "i18nDesc": "shopClearLv1Desc"
  }
]
```

直接从 configStore 现有硬编码迁移，结构不变，只是数据源从代码移到 JSON。

---

## 五、优先级建议（排除后）

### P0 — 策划高频调整，硬编码影响大

| 编号 | 值 | 归属文件 |
|------|-----|----------|
| #6-8 | 幸运七号概率/金币/钻石 | item_effects.json |
| #10-11 | Boss阶跃表 + MAX_TIER | boss_progression.json |
| #22 | 售价加成 ×1.5 | board_economy.json |
| #25 | 幸运合成概率 0.3 | board_economy.json |
| #28 | 日常金币加成 ×1.5 | board_economy.json |

### P1 — 应尽快可配置

| 编号 | 值 | 归属文件 |
|------|-----|----------|
| #1-2 | 碎片默认数量 10 / 默认等级 3 | item_effects.json |
| #3 | 体力恢复默认值 20 | item_effects.json |
| #4 | 双倍产出默认 3 回合 | item_effects.json |
| #5 | 幸运七号默认次数 7 | item_effects.json |
| #9 | 十连抽次数 10 | gacha_config.json |
| #18-21 | 清理效果目标等级 + 体力奖励 | item_effects.json |
| #23 | 能量折扣免费概率 0.5 | board_economy.json |
| #29 | 广告免费抽上限 'SR' | gacha_config.json |
| #31 | 成就奖励倍率 2 | board_economy.json |

### 第二批 — 逻辑触发条件配置化（不进本次范围）

| 编号 | 值 | 排除理由 |
|------|-----|----------|
| #24 | 香水加成链 ID | 需设计"哪些 chain 享受加成"的 schema |
| #26 | 剪刀 itemId | 代码逻辑与数据耦合，可与 shopItems 外置一起做 |
| #30 | VN 角色名映射 | 应随 i18n 一起处理 |

---

## 六、分阶段执行计划

### 阶段 0 ✅ 已完成：修复 #14 兜底值 bug

- **问题**：EnergyLogic 兜底值 3000ms 与实际配置 120000ms 不一致
- **修复**：改为缺省报错（缺 config 就 throw，不在代码里留错误的 fallback）
- **改动**：`src/logic/EnergyLogic.ts` constructor
- **测试**：60 个相关测试全部通过

### 阶段 1 ✅ 已完成：Config schema 落地

- 创建 `public/assets/data/item_effects.json`
- 创建 `public/assets/data/board_economy.json`
- 创建 `public/assets/data/boss_progression.json`
- 在 `configStore.ts` 中新增对应 ref + loadGameData 加载逻辑
- 在 `loadGameData` 中 fetch 这 3 个新 JSON 并赋值
- （2c-0 追加）创建 `public/assets/data/gacha_config.json`，新增 `gachaConfig` ref + fetch

### 阶段 2：数值类迁移（22 项，按业务领域分批）

每批改动模式统一：函数签名加 deps 参数 → 从 deps 读取而非硬编码 → 更新调用方传入 config 值 → 更新测试。

#### 2a ✅ 已完成：道具效果数值（14 项）

涉及文件：`ItemEffectLogic.ts`、`ItemEffectService.ts`、`InventoryService.ts`

| 编号 | 改动点 | config 来源 |
|------|--------|------------|
| #1 | calculateAddFragment: `10` → deps.fragmentDefaultCount | item_effects.fragment.defaultCount |
| #2 | calculateAddFragment: `3` → deps.fragmentDefaultGenLevel | item_effects.fragment.defaultGenLevel |
| #3 | calculateAddEnergy: `20` → deps.energyItemDefaultRecover | item_effects.energyItem.defaultRecover |
| #4 | calculateDoubleGenTurns: `3` → deps.doubleGenDefaultTurns | item_effects.doubleGen.defaultTurns |
| #5 | calculateLuckyCoin: `7` → deps.luckyCoinDefaultCount | item_effects.luckyCoin.defaultCount |
| #6 | calculateLuckyCoin: `0.5` → deps.luckyCoinGoldChance | item_effects.luckyCoin.goldChance |
| #7 | calculateLuckyCoin: `100` → deps.luckyCoinGoldAmount | item_effects.luckyCoin.goldAmount |
| #8 | calculateLuckyCoin: `10` → deps.luckyCoinDiamondAmount | item_effects.luckyCoin.diamondAmount |
| #16 | resolveLegacyPotionUse: `20` → deps.energyItemDefaultRecover | item_effects.energyItem.defaultRecover |
| #17 | resolveConsumableEffect(reroll): `3` → deps.rerollDefaultCount | item_effects.reroll.defaultCount |
| #18 | resolveConsumableEffect(clear_lv1): `[1]` → deps.clearLv1TargetLevels | item_effects.clearLv1.targetLevels |
| #19 | resolveConsumableEffect(clear_lv1): `2` → deps.clearLv1EnergyPerItem | item_effects.clearLv1.energyPerItem |
| #20 | resolveConsumableEffect(space_clean): `[1,2]` → deps.spaceCleanTargetLevels | item_effects.spaceClean.targetLevels |
| #21 | resolveConsumableEffect(space_clean): `3` → deps.spaceCleanEnergyPerItem | item_effects.spaceClean.energyPerItem |

#### 2b ✅ 已完成：合成/经济倍率（5 项）

涉及文件：`BoardService.ts`、`RewardService.ts`、`LoopService.ts`

| 编号 | 改动点 | config 来源 |
|------|--------|------------|
| #22 | calculateSellPrice: `1.5` → deps.sellPriceBoost | board_economy.sellPriceBoost |
| #23 | resolveProduction: `0.5` → deps.energyDiscountFreeChance | board_economy.energyDiscountFreeChance |
| #25 | resolveMerge: `0.3` → deps.luckyMergeChance | board_economy.luckyMergeChance |
| #28 | resolveDailyOrderFulfilled: `1.5` → deps.dailyGoldBoost | board_economy.dailyGoldBoost |
| #31 | calculateLoopRewards: `2` → deps.achievementTokenBonus | board_economy.achievementTokenBonus |

#### 2c ✅ 已完成：Boss/循环/扭蛋规则（4 项）

涉及文件：`BossLogic.ts`、`GachaLogic.ts`、`RewardService.ts`

前置步骤 2c-0：将 `tenPullCount`/`freePullMaxRarity` 从 `boss_progression.json` 迁至新建的 `gacha_config.json`，并在 `configStore.ts` 新增 `gachaConfig` ref + fetch 逻辑。

| 编号 | 改动点 | config 来源 |
|------|--------|------------|
| #9 | pullTen: `10` → tenPullCount 参数 | gacha_config.tenPullCount |
| #10 | getOrderTierBoost: if-else → deps.orderTierBoost 表查找 | boss_progression.orderTierBoost |
| #11 | getScaledOrder: `8` → deps.maxItemTier | boss_progression.maxItemTier |
| #29 | resolveAdReward: `'SR'` → deps.freePullMaxRarity | gacha_config.freePullMaxRarity |

等价性测试：loopIndex 0-9 + 100，逐一验证 if-else 与表查找输出完全一致。

### 阶段 3 ✅ 已完成：shopItems 外置化

- 创建 `public/assets/data/shop_items.json`，5 个商品从 configStore 硬编码 1:1 迁移
- `shop_clear_lv1` 的 `value` 填入 `{ "energyPerItem": 2 }`，解决 #27
- `configStore.ts`：`shopItems` 初始化为空数组，`loadGameData()` fetch `shop_items.json` 并赋值
- `ShopService.ts`：`value?.energyPerItem ?? 2` → `value.energyPerItem`（缺失时 throw）；switch 末尾加 default throw（未知 effect 报错）
- `game.d.ts`：`ShopItem` 接口移除 `name`/`description` 必填字段，`i18nName`/`i18nDesc` 改为必填
- 测试：755 全通过；新增"energyPerItem 缺失时 throw"、"未知 effect throw"、"energyPerItem 缺失但无可清除格时不 throw"三个用例

### 阶段 4 ✅ 已完成：逻辑触发条件配置化 — Architecture Freeze v1.0

- **#24 香水加成链 ID**：
  - `board_economy.json` 新增 `"perfumeBoostChains": ["perfume", "lips"]`
  - `BoardService.ts`：`ResolveProductionDeps` 新增 `perfumeBoostChains: string[]`（required），3 处 `chain === 'perfume' || chain === 'lips'` → `perfumeBoostChains.includes(chain)`
  - `boardStore.ts`：生产调用方传入 `configStore.boardEconomy.perfumeBoostChains`

- **#26 剪刀 itemId**：
  - `item_effects.json` 新增 `"toolItems": { "scissor": "scissor" }`
  - `shop_items.json`：`shop_scissor.value` 改为 `{ "itemId": "scissor" }`
  - `ShopService.ts`：`add_scissor` case 用 `value.itemId` 替代硬编码；`addItems` 加 `meta: { effect, value }` 修复信息丢失
  - `InventoryService.ts`：`effect === 'add_scissor'` 替代 `itemId === 'scissor'` 兜底
  - `BoardGrid.vue`、`InventorySheet.vue`（3 处）：`'scissor'` → `configStore.itemEffects.toolItems.scissor` / metadata effect
  - 6 处硬编码 `'scissor'` 字符串字面量全部消除

- **#30 VN 角色名映射**（彻底重构）：
  - `cg_stories.json`（中/英）：`speaker` → `speakerId`、`maleLead` → `maleLeadId`，显示名替换为 canonical ID（morven/daniel/vincent/leo）
  - `vnReaderStore.ts`：删除 `CHARACTER_MAP`（8 条），运行时从 `configStore.characterProfiles` 按 canonical ID 查找 avatar/color/background；`speakerInfo` 渲染显示名从 profile.name/nameEn 根据 locale 取
  - `AffectionService.ts`：删除 `MALE_LEAD_CHAR_MAP`（4 条），`data.maleLeadId` 直接作为 characterId
  - `cgAlbumStore.ts`：`CGData.maleLead` → `CGData.maleLeadId`
  - `CGStoryDetailOverlay.vue`：`getLeadAvatarEmoji`/`leadColorClass` 改用 canonical ID；新增 `getSpeakerDisplayName()` 从 profile 解析显示名
  - `game.d.ts`：事件类型 `'affection:vnCompleted'` 改为 `{ cgId: string; maleLeadId: string }`
  - `VNHistoryEntry` 新增 `speakerId` 字段，历史记录显示名 + ID 双存储

- 测试：755 全通过

### 阶段 2 收尾 ✅ 已完成：移除 `??` 兜底，deps 字段改必填

- 所有 `deps?.xxx ?? 默认值` 改为 `deps.xxx`（去掉 `?` 和 `??`）
- deps 接口字段从可选改为必填
- BossLogic: `getOrderTierBoost` 删除 if-else 兜底分支，统一走表查找；`getScaledOrder`/`loadOrder`/`loadLevel`/`getCurrentOrder`/`canFulfillOrder` 的 deps 参数改必填
- GachaLogic: `pullTen` 的 `tenPullCount` 参数改必填
- 生产调用方：去掉 `configStore.xxx?.field` 可选链，`luckyCoin`/`fragment` 展开时补 `random: Math.random`
- 涉及文件：`ItemEffectLogic.ts`、`ItemEffectService.ts`、`InventoryService.ts`、`BoardService.ts`、`RewardService.ts`、`LoopService.ts`、`BossLogic.ts`、`GachaLogic.ts`
- 测试：754 全通过，更新所有 mock 传入完整 deps

---

## 七、附加发现（扫描范围外但相关）

### `src/stores/configStore.ts` — shopItems 硬编码

```typescript
// 第 96-102 行：商店商品直接写在代码中，未从 JSON 加载
const shopItems = ref([
    { id: 'shop_energy_small', cost: 50, value: { energy: 30 } },
    { id: 'shop_energy_large', cost: 120, value: { energy: 80 } },
    { id: 'shop_joker', cost: 200 },
    { id: 'shop_scissor', cost: 150 },
    { id: 'shop_clear_lv1', cost: 80 },
]);
```

策划无法通过修改配置调整商店价格和效果数值。已纳入阶段 3 统一处理。

---

## 八、后续依赖项

**策划编辑界面**：当前 config 全是 JSON 文件，策划直接改 JSON 出错概率高。本报告只解决"代码层面可插拔化"（从 config 读取而非硬编码），至于策划用 JSON 编辑器、内部工具、还是 CMS 来修改这些配置，是独立的后续议题。代码侧的改动与编辑方式无关——只要 config 文件里的值对了，代码行为就对了。
