# 游戏逻辑全量分析文档

> 项目：Heartbeat Merge（心跳合合）— Vue 3 + Pinia + TypeScript 合成类手游
>
> 生成时间：2026-06-07
>
> 基于源码实际逻辑，非推测

---

## 1. 功能模块总览

| # | 模块 | 核心职责 | 关键文件 |
|---|------|---------|----------|
| 1 | **棋盘/合成系统** | 网格物品管理、拖拽/点击合成、生成器产出、剪刀拆分 | `BoardLogic.ts`, `boardStore.ts`, `BoardGrid.vue`, `GridCell.vue`, `BoardItem.vue` |
| 2 | **Boss/关卡系统** | Boss HP、订单（需求+伤害）、计时订单、关卡推进 | `BossLogic.ts`, `bossStore.ts`, `BossHeader.vue`, `MainQuestCard.vue` |
| 3 | **货币系统** | 金币/钻石的增加、消费、不足检测 | `CurrencyLogic.ts`, `currencyStore.ts` |
| 4 | **体力系统** | 体力消耗/恢复/上限/自然回体/离线恢复 | `EnergyLogic.ts`, `energyStore.ts` |
| 5 | **扭蛋/抽卡系统** | 单抽/十连/免费抽、稀有度概率、SSR首次追踪 | `GachaLogic.ts`, `gachaStore.ts`, `GachaSheet.vue` |
| 6 | **物品效果系统** | 扭蛋物品效果分类（即时/消耗/棋盘工具）、效果分发执行 | `ItemEffectLogic.ts` |
| 7 | **背包系统** | 物品存储、使用、拖拽到棋盘 | `inventoryStore.ts`, `InventorySheet.vue` |
| 8 | **商店系统** | 金币购买道具（体力药水、万能牌、剪刀、扫帚等） | `configStore.ts`(shopItems), `ShopSheet.vue` |
| 9 | **循环/周目系统** | 多周目递进、特殊规则、元升级、声望代币 | `loopStore.ts`, `LoopSummaryOverlay.vue` |
| 10 | **每日订单系统** | 每日随机NPC订单、金币奖励 | `dailyOrderStore.ts`, `DailyOrderCard.vue`, `DailyOrderSheet.vue` |
| 11 | **每日增益系统** | 每日随机Buff、30分钟限时 | `dailyBuffStore.ts`, `StatusBar.vue` |
| 12 | **女主角升级系统** | 钻石永久升级（体力上限/回体速度/回收加成/金币加成） | `heroineStore.ts`, `HeroineSheet.vue` |
| 13 | **成就系统** | 统计追踪、解锁条件检查、奖励领取 | `achievementStore.ts`, `AchievementSheet.vue` |
| 14 | **收藏/图鉴系统** | 物品发现、扭蛋卡片收集、链条完成 | `collectionStore.ts`, `CollectionSheet.vue` |
| 15 | **碎片系统** | 碎片收集、兑换生成器/故事 | `fragmentStore.ts` |
| 16 | **CG相册系统** | CG解锁、记忆碎片、故事阅读 | `cgAlbumStore.ts`, `CGAlbumSheet.vue` |
| 17 | **VN阅读器系统** | 视觉小说式对话、打字机效果、自动/跳过模式 | `vnReaderStore.ts`, `VNReaderOverlay.vue` |
| 18 | **对话系统** | NPC对话弹窗、打字机、对话队列 | `dialogueStore.ts`, `DialogueOverlay.vue` |
| 19 | **广告系统** | 模拟广告奖励（体力/金币/钻石/免费抽） | `adStore.ts` |
| 20 | **国际化系统** | 中英文切换、文本/emoji/UI配置 | `i18nStore.ts` |
| 21 | **存档系统** | 双层存档（META永久 + RUN当次）、离线恢复、迁移 | `saveStore.ts` |
| 22 | **配置系统** | 加载所有JSON数据表、提供全局配置 | `configStore.ts` |
| 23 | **事件总线** | 强类型全局发布/订阅、模块解耦 | `EventBus.ts` |
| 24 | **状态机** | 通用FSM、Boss/Energy/Gacha状态管控 | `StateMachine.ts` |
| 25 | **开发者工具** | 开发模式开关、资源无限、速度调节 | `DevConfig.ts`, `DevPanel.vue` |
| 26 | **音效系统** | BGM/SFX播放、静音、移动端AudioContext解锁 | `useAudio.ts` |
| 27 | **特效系统** | 合并弹出粒子、心飞Boss、Toast | `useEffects.ts`, `ParticleLayer.vue`, `ToastRoot.vue` |

---

## 2. 各模块详细逻辑

### 2.1 棋盘/合成系统

**模块职责**：管理网格棋盘上所有物品的放置、拖拽、合成、生成器产出、剪刀拆分、格子解锁。

**子逻辑/功能点**：
- **网格初始化**：7×9=63格，初始锁定20格，放置2个初始生成器（`gen_makeup_1`、`gen_study_1`）于棋盘中央
- **物品拖拽**：`useDrag` composable 处理 pointer 事件，阈值8px区分拖拽/点击；拖到背包区域触发`onDropOnBackpack`
- **合成判定**（`BoardLogic.tryMergeOrSwap`）：
  - 两个相同ID物品 → 合成为`nextId`（如有）
  - Joker + 普通物品 → 升级该物品为`nextId`
  - 生成器合成：同chain同level且nextId非null → 升级生成器（数据驱动，最高等级由nextId=null控制）
  - 不可合成 → swap（交换位置）
- **万能牌（Joker）**：type=`JOKER`，与任意有nextId的普通物品组合时升级该物品
- **剪刀（Scissor）**：`scissorMode`激活后点击物品，将level≥2的物品拆为2个上一级物品；不可拆生成器/Joker/剪刀
- **生成器产出**：点击生成器 → 消耗1体力 → 按drop_pool加权随机产出物品 → 放置到相邻空格；有`free_production_chance`概率免费产出
- **生成器容量/冷却**：`GeneratorState`追踪`currentClicks`/`maxClicks`/`cooldownUntil`；达上限后进入冷却（当前cooldown=0，已禁用）
- **格子解锁**：击败Boss解锁指定格子（`UNLOCK_PER_BOSS`）；也可花金币解锁（`CELL_UNLOCK_COSTS`）
- **回收/出售**：回收物品获得体力（按`RECYCLE_ENERGY_TABLE`按level计算，lv8→20）；生成器不可出售
- **双倍产出**：`doubleGenTurns` > 0时生成器产出翻倍
- **每日增益接入**：
  - `lucky_merge`：合成时30%概率跳2级
  - `merge_bonus`：合成成功额外产出1个同级物品
  - `gen_speed_up`：生成器产出2个物品
  - `energy_discount`：生成器体力消耗减半
- **物品置换（Reroll）**：随机替换N个非生成器物品
- **升级卡（Upgrade）**：`upgradeActive`时点击棋盘物品直接升级一级
- **棋盘满格处理**：生成器产出时`findEmptyCell`返回-1 → `produceFromGenerator`返回`{success:false, reason:'board_full'}` → `BoardGrid.vue`捕获并显示Toast提示"棋盘已满"；同样`no_energy`/`cooldown`也有对应Toast

**关键函数**：
| 函数 | 位置 | 触发条件 | 执行结果 |
|------|------|---------|---------|
| `tryMergeOrSwap(si, ti, items, generators)` | `BoardLogic.ts:197` | 拖拽释放到目标格 | 合成/交换/移动 |
| `useScissorOnItem(index, items)` | `BoardLogic.ts:277` | 剪刀模式点击物品 | 拆分为2个低级物品 |
| `rollGeneratorDrop(itemId, items, generators)` | `BoardLogic.ts:320` | 生成器产出时 | 加权随机返回物品ID |
| `produceFromGenerator(index)` | `boardStore.ts` | 点击棋盘上的生成器 | 消耗体力→产出物品→gen_speed_up双产出→doubleGen→放棋盘 |
| `merge(si, ti)` | `boardStore.ts` | 拖拽/点击合成 | 合成→lucky_merge跳级→merge_bonus额外产出 |
| `unlockCells(indices)` | `BoardLogic.ts:391` | 击败Boss/金币解锁 | 解锁格子→emit `board:cellsUnlocked` |
| `placeInitialGenerators(items, generators)` | `BoardLogic.ts:534` | 新游戏/新循环开始 | 放置2个初始生成器 |

---

### 2.2 Boss/关卡系统

**模块职责**：管理Boss关卡加载、HP伤害、订单提交、计时失败、Boss击败与关卡推进。

**子逻辑/功能点**：
- **FSM状态**：IDLE → BATTLE → SUBMITTING → DEFEATED → COMPLETE
- **关卡加载**：从`levels.json`加载Boss数据，应用Loop的HP倍率
- **订单系统**：每关3个订单，每个订单要求提交指定物品并造成伤害；可获取钻石奖励
- **计时订单**：`isTimed=true`的订单有倒计时，超时则失败（`failOrder`）
- **订单提交**：`beginSubmit()` → `commitSubmit(damage)` → 检查Boss是否击败
- **循环缩放**：`getScaledOrder()`根据loopIndex增加物品需求等级（+0到+4 tier）
- **Boss击败**：HP归零 → FSM转DEFEATED → emit `boss:defeated` → 解锁格子 → 加载下一关
- **游戏通关**：所有Boss击败 → emit `boss:gameComplete` → 显示通关界面

**关键函数**：
| 函数 | 位置 | 触发条件 | 执行结果 |
|------|------|---------|---------|
| `loadLevel(levelIdx, levels)` | `BossLogic.ts:176` | 新游戏/击败Boss | 加载关卡+订单+emit事件 |
| `commitSubmit(damage, levels)` | `BossLogic.ts:278` | 玩家提交订单 | 扣HP→检查击败→推进订单 |
| `failOrder()` | `BossLogic.ts:322` | 计时订单超时 | 标记失败→推进下一订单 |
| `getScaledOrder(order, items)` | `BossLogic.ts:146` | 加载订单时 | 按循环倍率提升物品需求等级 |

---

### 2.3 货币系统

**模块职责**：管理金币和钻石两种货币的增加、消费、不足检测。

**子逻辑/功能点**：
- **金币**：通过出售物品、每日订单奖励、扭蛋效果、循环奖励获得；用于商店购买、格子解锁、女主角升级
- **钻石**：通过Boss订单奖励、成就奖励、循环奖励、广告获得；用于扭蛋、女主角升级
- **不足检测**：消费失败时emit `currency:insufficient`
- **视觉反馈**：增减时emit `currency:flash`和`currency:goldEarned`
- **Dev覆盖**：`unlimitedGold`/`unlimitedDiamonds`时消费不扣减

**关键函数**：
| 函数 | 位置 | 触发条件 | 执行结果 |
|------|------|---------|---------|
| `addGold(amount)` | `CurrencyLogic.ts:36` | 出售/奖励 | gold+=amount → emit |
| `spendGold(amount)` | `CurrencyLogic.ts:48` | 商店/解锁/升级 | gold-=amount或emit不足 |
| `addDiamonds(amount)` | `CurrencyLogic.ts:63` | Boss/成就/循环 | diamonds+=amount → emit |
| `spendDiamonds(amount)` | `CurrencyLogic.ts:69` | 扭蛋/女主角升级 | diamonds-=amount或emit不足 |

---

### 2.4 体力系统

**模块职责**：管理体力的消耗、恢复、上限、自然回体、离线恢复。

**子逻辑/功能点**：
- **FSM状态**：FULL → REGENNING → EMPTY（及反向）
- **体力消耗**：生成器产出消耗1体力（`ENERGY_COST_PER_SPAWN`）
- **自然恢复**：每2分钟恢复1点，上限为`regenCap`（默认100）
- **道具恢复**：体力药水、扭蛋效果等可恢复体力，不受regenCap硬上限（可溢出）
- **离线恢复**：加载存档时根据时间差计算离线恢复量
- **循环规则**：`energyRegenDown`规则下恢复间隔翻倍
- **女主角升级**：`energy_cap`升级增加上限，`regen_speed`升级缩短恢复间隔

**关键函数**：
| 函数 | 位置 | 触发条件 | 执行结果 |
|------|------|---------|---------|
| `spend(amount)` | `EnergyLogic.ts:58` | 生成器产出 | current-=amount → 更新FSM |
| `recover(amount)` | `EnergyLogic.ts:67` | 道具/奖励 | current+=amount（可溢出） |
| `startRegen()` | `EnergyLogic.ts:95` | 游戏初始化 | 启动定时恢复 |
| `deserialize(data, savedTimestamp?)` | `energyStore.ts` | 读取存档 | 计算离线恢复量 |

---

### 2.5 扭蛋/抽卡系统

**模块职责**：管理单抽、十连、免费抽的概率计算与物品分发。

**子逻辑/功能点**：
- **FSM状态**：IDLE → ROLLING → RESULT → ACK → IDLE
- **概率**：R 74%、SR 25%、SSR 1%；SR有子类别权重（生成器0.25、joker/scissor/energy 0.2、special 0.15）
- **十连保底**：10抽无SR+则最后1抽替换为随机SR
- **免费抽**：每天1次，上限SR稀有度
- **SSR首次追踪**：`ssrOwned`记录已获得的SSR，首次获得触发特殊事件
- **效果分类**：即时效果（加钻石/金币/碎片/放置物品/放置生成器/SSR生成器）→立即执行；消耗品/棋盘工具→加入背包

**关键函数**：
| 函数 | 位置 | 触发条件 | 执行结果 |
|------|------|---------|---------|
| `rollOne(gachaConfig, maxRarity?)` | `GachaLogic.ts:68` | 单抽/十连内部 | 加权随机返回1个GachaItem |
| `pullSingle(gachaConfig, maxRarity?)` | `GachaLogic.ts:101` | 玩家单抽 | FSM PULL→ROLL→DONE |
| `pullTen(gachaConfig)` | `GachaLogic.ts:114` | 玩家十连 | 10次rollOne + SR保底 |
| `applyInstantEffect(effect, value, ...)` | `ItemEffectLogic.ts:167` | 即时效果扭蛋结果 | 直接执行效果（加资源/放物品） |
| `applyConsumableEffect(effect, itemId, value, ctx)` | `ItemEffectLogic.ts:300` | 使用背包消耗品 | 加体力/双倍生成/置换/清理/升级 |

---

### 2.6 物品效果系统

**模块职责**：统一分类和分发扭蛋物品的使用效果。

**效果分类**：
| 类别 | 效果列表 | 处理方式 |
|------|---------|---------|
| `instant` | add_diamond, add_gold, add_fragment, spawn_board_item, place_generator, ssr_generator | 抽到即执行 |
| `consumable` | add_energy_item, double_gen, reroll, lucky_coin, clear_lv1, space_clean, gen_refresh, upgrade_item | 存入背包，使用时执行 |
| `board_tool` | add_joker, add_scissor | 存入背包，拖到棋盘使用 |

**物品ID解析**（`resolveItemId`）：
- `spawn_board_item`：chain + level → `chainItemPrefix[prefix]_level`
- `place_generator`/`ssr_generator`：genChain + level → `genChain_level`
- `level: "random_X_Y"`：随机在[X,Y]范围取level
- `chain: "random"`：随机选chain

---

### 2.7 背包系统

**模块职责**：管理玩家持有的物品，支持添加、使用、拖拽到棋盘。

**子逻辑/功能点**：
- **无限容量**：`maxSlots = Infinity`
- **物品元数据**：`itemMetadata`存储每个物品的effect和value（来自扭蛋池）
- **使用物品**：`useItem(itemId, targetCellIndex?)` → emit `inventory:itemUsed`，由`useGameLoop`接收分发
- **拖拽到棋盘**：`InventorySheet`中拖拽物品到棋盘，支持剪刀/升级/放置/合成
- **迁移**：`energy_potion` → `energy_potion_20`

---

### 2.8 商店系统

**模块职责**：提供金币购买道具的商店。

**商品列表**（硬编码在`configStore.ts`）：
| 商品 | 价格 | 效果 |
|------|------|------|
| 体力药水(小) | 50金 | add_energy_item (+20体力) |
| 体力药水(大) | 150金 | add_energy_item (+60体力) |
| 万能牌 | 100金 | add_joker |
| 剪刀 | 80金 | add_scissor |
| 扫帚 | 60金 | clear_lv1 (清理Lv1物品) |

**购买流程**：花金币 → emit `shop:itemPurchased` → `useGameLoop`接收 → 按效果分发到背包/直接执行

---

### 2.9 循环/周目系统

**模块职责**：管理多周目循环递进、特殊规则、声望代币、元升级。

**子逻辑/功能点**：
- **循环递进**：4个Boss全部击败 → 当前循环完成 → 显示LoopSummaryOverlay → 进入下一循环
- **难度缩放**：
  - HP倍率：1.0 → 1.5 → 2.0 → 3.0 → 4.5 → 6.0 → 8.0 → 10.0
  - 奖励倍率：同步增长
  - 时间倍率：1.0 → 0.9 → 0.8 → 0.7 → 0.6 → 0.5
  - 订单物品等级提升：+0 → +1 → +2 → +3 → +4（loop 8+封顶）
- **特殊规则**（每循环不同）：
  - `dailyGoldUp`：每日订单金币×1.5
  - `perfumeBoost`：香水链产出加成
  - `timedOrdersUp`：更多计时订单
  - `energyRegenDown`：体力恢复间隔翻倍
- **声望代币**（学园声望）：循环完成时获得，用于购买元升级
- **元升级**（跨循环永久）：
  - `startingGold`：初始金币增加
  - `startingDiamonds`：初始钻石增加
  - `startingEnergy`：初始体力增加
  - `dailyBonus`：每日金币奖励增加
- **循环奖励计算**：基础奖励 + 发现新物品奖励 + 达成成就奖励
- **叙事标记**：`unlockedNarrativeFlags`追踪跨循环叙事进度

**关键函数**：
| 函数 | 位置 | 触发条件 | 执行结果 |
|------|------|---------|---------|
| `completeLoop()` | `loopStore.ts` | 所有Boss击败 | 计算奖励→增loopIndex→重置循环数据 |
| `buildLoopConfig(loopIndex)` | `loopStore.ts` | 新循环开始 | 构建倍率/规则/叙事配置 |
| `purchaseMetaUpgrade(upgradeId)` | `loopStore.ts` | 循环结算界面 | 消耗声望→永久升级 |
| `calculateLoopRewards(loop, summary)` | `loopStore.ts` | 循环完成 | 返回{tokens, gold, diamonds} |

---

### 2.10 每日订单系统

**模块职责**：每日刷新NPC订单，玩家提交物品获得金币。

**子逻辑/功能点**：
- **每日最多5个订单**：从`daily_orders.json`的56个订单池中按`minLoop`筛选后随机抽取（由`dailyOrderConfig.MAX_ACTIVE`配置，默认3）
- **订单完成**：棋盘有足够物品 → 消耗物品 → 获得金币奖励
- **每日重置**：新的一天自动重新抽取
- **金币加成**：`dailyGoldUp`规则下奖励×1.5

---

### 2.11 每日增益系统

**模块职责**：每日随机获得一个30分钟限时Buff。

**Buff类型**：
| Buff ID | 名称 | 效果 | 接入位置 |
|---------|------|------|---------|
| `merge_bonus` | 合成加成 | 合成成功时额外产出1个同级物品 | `boardStore.merge()` |
| `energy_discount` | 体力折扣 | 生成器消耗体力减半 | `boardStore.produceFromGenerator()` |
| `sell_price_up` | 售价提升 | 出售物品金币×1.5 | `GameView.vue` onSell |
| `gen_speed_up` | 生成加速 | 生成器产出2个物品 | `boardStore.produceFromGenerator()` |
| `lucky_merge` | 幸运合成 | 30%概率合成跳2级 | `boardStore.merge()` |

**流程**：每日首次进入 → `rollDailyBuff()` → 显示待确认Buff → 玩家确认/忽略 → 30分钟后过期

---

### 2.12 女主角升级系统

**模块职责**：消耗钻石进行永久升级，跨循环保留。

**升级项目**（3级/项）：
| 升级ID | 名称 | 效果 | 费用 |
|--------|------|------|------|
| `energy_cap` | 体力上限 | 100→120→150→200 | 100→300→800钻 |
| `regen_speed` | 回体速度 | 120s→100s→80s→60s | 100→300→800钻 |
| `recycle_bonus` | 回收加成 | 回收体力+0→+1→+2→+3 | 100→300→800钻 |
| `gold_bonus` | 金币加成 | 出售金币+0%→+10%→+20%→+30% | 100→300→800钻 |

**购买流程**：花钻石 → `purchaseUpgrade()` → `applyPermanentEffects()` → emit `heroine:upgradePurchased`

---

### 2.13 成就系统

**模块职责**：追踪游戏统计数据，达成条件时解锁成就，领取奖励。

**统计项**：merges, bossDefeats, collectionPct, maxLevelItems, totalGoldEarned, recycled, gachaPulls, cellsUnlocked, dailyCompleted, loopReached

**成就流程**：`incrementStat()` → `checkAll()` → 条件满足 → `unlock()` → `complete()` → 发放奖励

**32个成就**：涵盖首次合成、Boss击败、收集百分比、金币收入、循环到达等

---

### 2.14 收藏/图鉴系统

**模块职责**：追踪玩家发现的所有物品和收集的扭蛋卡片。

**子逻辑/功能点**：
- **物品发现**：合成出新物品时自动记录（`discovered` Set）
- **扭蛋收集**：抽到SSR/SR时记录（`gachaCollected` Set）
- **链条完成**：某chain所有物品都发现时标记完成，发放奖励
- **循环重置**：`discoveredThisLoop`在循环结束时清空，用于循环奖励计算

---

### 2.15 碎片系统

**模块职责**：管理碎片收集与兑换。

**碎片ID格式**：`frag_{chain}_{level}`，如`frag_lips_3`

**兑换阈值**（配置在`gacha_pool.json`）：
- `fragmentToGenerator`：60碎片 → 兑换生成器
- `fragmentToStory`：60碎片 → 解锁CG故事章节

---

### 2.16 CG相册系统

**模块职责**：管理CG插画解锁、记忆碎片收集、故事阅读。

**子逻辑/功能点**：
- **CG解锁**：SSR扭蛋获得时自动解锁对应CG（8个SSR对应8个CG）
- **记忆碎片**：通过碎片系统积累，达阈值解锁后续故事章节
- **故事阅读**：通过VN阅读器展示CG故事内容
- **每个CG 4个章节**：初遇→发展→高潮→告白

---

### 2.17 VN阅读器系统

**模块职责**：视觉小说式阅读器，展示CG故事内容。

**子逻辑/功能点**：
- **打字机效果**：逐字显示对话文本
- **角色映射**：4位男主（林墨白/Daniel/司徒渊/陆之昂）各有头像、颜色、背景
- **自动/跳过模式**：`autoMode`（3秒自动推进）、`skipMode`（80ms快速推进）
- **历史记录**：可查看所有已显示的对话
- **BGM切换**：打开时播放`story_bgm`，关闭时恢复`game_bgm`

---

### 2.18 对话系统

**模块职责**：NPC对话弹窗，支持打字机效果和对话队列。

**流程**：`show(npcName, portrait, npcText, playerText)` → 打字机动画 → 玩家点击/跳过 → `close()` → 处理队列中下一个对话

**用途**：Boss战前对话、Boss击败后对话、循环开始/结束叙事

---

### 2.19 广告系统

**模块职责**：模拟奖励广告，每日有观看次数限制。

**广告类型**：
| 类型 | 奖励 | 每日次数 |
|------|------|---------|
| energy | +20体力 | 无限 |
| gold | +50金币 | 3次 |
| diamonds | +50钻石 | 3次 |
| freePull | 1次免费抽(SR上限) | 1次 |

**每日重置**：新的一天自动重置计数

---

### 2.20 存档系统

**模块职责**：双层存档体系，支持离线恢复和旧版迁移。

**双层存档**：
| 层级 | Key | 内容 | 持久性 |
|------|-----|------|--------|
| META | `heartbeat_merge_meta` | 循环进度、女主角升级、扭蛋SSR、碎片、CG、收藏、成就、钻石、广告、每日增益 | 跨循环永久 |
| RUN | `heartbeat_merge_run` | 金币、体力、Boss、棋盘、背包、每日订单 | 仅当前循环 |

**存档版本**：当前v4

**自动保存**：每30秒 + 页面隐藏时 + 页面关闭前

**离线恢复**：加载存档时根据时间差计算体力恢复 + 检查生成器冷却是否过期

**旧版迁移**：`migrateLegacySave()`将v<4的单层存档转换为双层格式

---

### 2.21 配置系统

**模块职责**：加载所有JSON数据文件，提供全局配置访问。

**加载的数据文件**：settings.json, items.json, generators.json, levels.json, gacha_pool.json, achievements.json, daily_orders.json, loop_rules.json, loop_events.json, loop_narratives.json, cg_stories.json

**国际化**：locale='en'时加载`en/`目录下的JSON，与中文基础数据`deepMerge`

---

## 3. 核心工作流（Workflow）

### 3.1 玩家拖拽/点击合成物品的完整流程

```
1. 玩家pointer down on 棋盘格子
   → useDrag.onPointerDown(index) 记录起始位置

2. 玩家pointer move
   → 距离 < 8px: 不触发拖拽
   → 距离 ≥ 8px: 创建ghost元素跟随手指

3a. 拖拽释放到棋盘格 (onDragEnd)
   → boardStore.merge(fromIndex, toIndex)
   → BoardLogic.tryMergeOrSwap(si, ti, items, generators)
   → 判定结果: merge / joker / move / swap
   → 合成成功:
      - 更新cells数组 (源格清空, 目标格设为nextId)
      - 更新generatorStates
      - lucky_merge buff: 30%概率跳2级 (nextId的nextId)
      - merge_bonus buff: 在空格额外放置1个同级物品
      - emit 'board:merged'
      - 播放merge音效 + mergePopAt动画 + spawnParticles
      - collectionStore.discover(nextId) → 图鉴记录
      - achievementStore.incrementStat('merges')
      - 自动保存
   → 交换/移动:
      - 更新cells数组
      - 更新generatorStates

3b. 拖拽释放到背包区域 (onDropOnBackpack)
   → inventoryStore.addItem(itemId, 1, meta)
   → boardStore.clearCell(fromIndex)
   → 播放pop音效

4. 点击 (onTap, 距离 < 8px)
   → scissorActive: useScissorOnItem → 拆分物品
   → upgradeActive: placeItem(nextId) → 升级物品
    → 生成器: produceFromGenerator → 产出流程(见3.2)
      失败时: board_full/no_energy/cooldown → Toast提示
   → 已选物品: 尝试与点击格合成
   → 空格/普通物品: selectCell(index)
```

### 3.2 新物品生成的触发条件与生成逻辑

**生成器产出流程**：
```
1. 玩家点击棋盘上的生成器
   → boardStore.produceFromGenerator(index)

2. 体力检查
   → energy_discount buff: 体力消耗减半 (Math.max(1, cost*0.5))
   → energyStore.spend(cost)
   → 失败: 返回{success:false, reason:'no_energy'} → BoardGrid Toast提示

3. 棋盘空格检查
   → findAdjacentEmptyCell / findEmptyCell
   → 无空格: 返回{success:false, reason:'board_full'} → BoardGrid Toast提示"棋盘已满"

4. 免费产出检查
   → BoardLogic.isFreeProduction(itemId, items, generators)
   → 成功: 不扣体力

5. 物品随机
   → BoardLogic.rollGeneratorDrop(itemId, items, generators)
   → 先检查special_drop概率 (Lv8: 5%)
   → 按drop_pool加权随机选择
   → 返回itemId

6. 循环规则修正
   → perfumeBoost: 香水/唇彩链产物自动升1级

7. 放置到棋盘
   → findAdjacentEmptyCell(index) 优先相邻空格
   → 放置物品, 初始化generatorState(如果是生成器)

8. 生成器容量递增
   → incrementGeneratorClicks(index)
   → 达上限: startCooldown (当前cooldown=0, 已禁用)

9. gen_speed_up buff: 产出第二个物品
   → 再次rollGeneratorDrop
   → 应用perfumeBoost修正
   → 放置到相邻空格

10. double_gen效果: 消耗品双倍产出
    → doubleGenTurns > 0时再产出1个物品
    → 应用perfumeBoost修正
    → decrementDoubleGenTurns()

11. emit 'board:produced'
```

**扭蛋产出流程**：
```
1. 玩家点击单抽/十连
   → gachaStore.singlePull() / tenPull()

2. 钻石扣费
   → currencyStore.spendDiamonds(cost)

3. 概率抽取
   → GachaLogic.rollOne() × 1或10次
   → 每次rollOne内部:
     a. 随机数判定稀有度: R(74%) / SR(25%) / SSR(1%)
     b. 若有maxRarity限制(免费抽), SSR降级为SR
     c. SR/R按subWeights过滤子类别(生成器0.25, joker/scissor/energy 0.2, special 0.15)
     d. 子类别池内加权随机选择具体物品
   → 十连保底判定:
     a. 检查10次结果中是否有SR+
     b. 若无SR+: 替换最后1个为随机SR池物品

4. 效果分发
   → ItemEffectLogic.getEffectCategory(effect)
   → instant: applyInstantEffect() → 直接加资源/放物品/解锁CG
   → consumable/board_tool: inventoryStore.addItem() → 存入背包

5. SSR首次追踪
   → markSSROwned(ssrId)
   → 首次: emit 'gacha:ssrObtained'

6. 自动保存
```

### 3.3 关卡/进度推进机制

```
游戏启动
  → useGameInit.init() → 语言选择 → 加载数据 → 加载存档或新游戏
  → 新游戏: startNewMetaGame() → 循环1配置 → 放置生成器 → 加载Boss1 → 显示开场对话

Boss战斗循环:
  → loadLevel(levelIdx) → 加载Boss + 订单
  → 玩家在棋盘合成物品 → 收集订单所需物品
  → 点击MainQuestCard提交按钮 → submitOrder(damage)
  → commitSubmit: 扣HP → 检查击败
  → Boss击败: emit 'boss:defeated' → 解锁格子 → loadOrder(下一订单) 或 defeatBoss
  → 所有订单完成: Boss击败 → 下一关 → bossStore.nextLevel()
  → 4个Boss全部击败: useGameLoop watcher → emit 'loop:shouldComplete'

循环推进:
  → GameView监听 'loop:shouldComplete' → completeCurrentLoop()
  → 计算循环奖励(基础 + 新发现 + 成就)
  → loopTokens += 奖励声望
  → saveMeta() (保存永久进度)
  → clearRun() (清除当次存档)
  → 显示LoopSummaryOverlay (奖励详情 + 元升级商店)
  → 玩家购买元升级后点击继续
  → startNewRun(nextLoopIndex) → 应用元升级效果 → 重置棋盘 → 加载Boss
  → 循环8+通关: 显示GameCompleteOverlay → 显示ParadeOverlay

特殊: 循环8为"毕业前夜"，3个特殊规则同时生效，难度最高
```

### 3.4 能量/货币等资源的产生、消耗、更新链路

**金币**：
| 来源 | 触发 | 数额 |
|------|------|------|
| 出售物品 | 点击sell按钮 | item.sellPrice × (1 + dailyBuff + gold_bonus) |
| 每日订单 | 提交订单 | order.goldReward × (1.5 if dailyGoldUp) |
| Boss订单 | 提交订单 | 无直接金币(给钻石) |
| 扭蛋效果 | add_gold效果 | value.amount |
| 幸运七号 | lucky_coin效果 | 7次×50%概率×100金 |
| 循环结算 | 循环完成 | calculateLoopRewards |
| 广告 | watchAd('gold') | +50 |
| 元升级 | 新循环开始 | startingGold |

| 去向 | 触发 | 数额 |
|------|------|------|
| 商店购买 | 购买道具 | 50-150金 |
| 格子解锁 | 解锁锁定格 | CELL_UNLOCK_COSTS[cellsUnlocked] |
| 女主角升级 | purchaseUpgrade | 100-800钻(非金币) |

**钻石**：
| 来源 | 触发 | 数额 |
|------|------|------|
| Boss订单奖励 | 提交订单 | order.diamondReward |
| 成就奖励 | claimReward | achievement.reward.diamonds |
| 循环结算 | 循环完成 | calculateLoopRewards |
| 扭蛋效果 | add_diamond效果 | value.amount |
| 幸运七号 | lucky_coin效果 | 7次×50%概率×10钻 |
| 广告 | watchAd('diamonds') | +50 |

| 去向 | 触发 | 数额 |
|------|------|------|
| 扭蛋单抽 | singlePull | 100钻 |
| 扭蛋十连 | tenPull | 900钻 |
| 女主角升级 | purchaseUpgrade | 100-800钻 |

**体力**：
| 来源 | 触发 | 数额 |
|------|------|------|
| 自然恢复 | 每2分钟 | +1 (至regenCap) |
| 离线恢复 | 加载存档 | 按时间差计算 |
| 体力药水 | 使用add_energy_item | 20或60 |
| 回收物品 | 出售物品 | RECYCLE_ENERGY_TABLE[level] (lv1→0, lv8→20) |
| 清理低级 | clear_lv1/space_clean | 2或3/个 |
| 扭蛋效果 | add_energy_item | value.energy |
| 成就奖励 | claimReward | achievement.reward.energy |
| 广告 | watchAd('energy') | +20 |

| 去向 | 触发 | 数额 |
|------|------|------|
| 生成器产出 | 点击生成器 | 1 (energy_discount时0.5) |

**声望代币**（学园声望）：
| 来源 | 触发 |
|------|------|
| 循环完成 | getLoopTokenReward(loopIndex) |

| 去向 | 触发 |
|------|------|
| 元升级 | purchaseMetaUpgrade |

### 3.5 存档读取与保存流程

**保存流程**：
```
自动保存触发 (30秒定时 / 页面隐藏 / 页面关闭)
  → saveStore.saveAll()
    → saveMeta(): 序列化loopStore/heroineStore/gachaStore/fragmentStore/cgAlbumStore/
                  collectionStore/achievementStore/currencyStore.diamonds/adStore/dailyBuffStore
                → JSON.stringify → localStorage['heartbeat_merge_meta']
    → saveRun():  序列化currencyStore.gold/energyStore/bossStore/boardStore/inventoryStore/dailyOrderStore
                → JSON.stringify → localStorage['heartbeat_merge_run']
    → 更新 lastSaveTimestamp
```

**读取流程**：
```
游戏初始化 → proceedWithLocale()
  → saveStore.loadAll()
    → loadMeta(): localStorage['heartbeat_merge_meta'] → JSON.parse → applyMetaData()
      → 逐个store.deserialize()
      → 迁移: 旧版memoryFragments → cgAlbum格式
    → loadRun(): localStorage['heartbeat_merge_run'] → JSON.parse → applyRunData()
      → 逐个store.deserialize()
      → energyStore.deserialize(data, savedTimestamp) → 计算离线体力恢复
      → boardStore.deserialize() → processOfflineCooldown() → 检查生成器冷却
    → 版本检查: saveVersion不匹配则拒绝加载
```

**循环结束时**：
```
completeCurrentLoop()
  → saveStore.saveMeta()  (保存永久进度)
  → saveStore.clearRun()  (删除当次循环存档)
  → 新循环开始时 saveStore.saveRun() 重新创建
```

---

## 4. 资源与数据流

### 4.1 资源类型汇总

| 资源 | 存储 | 自然上限 | 可溢出 |
|------|------|---------|--------|
| 金币 | `currencyStore.gold` | 无 | 是 |
| 钻石 | `currencyStore.diamonds` | 无 | 是 |
| 体力 | `energyStore.current` | `regenCap`(默认100) | 是(道具/奖励) |
| 声望代币 | `loopStore.loopTokens` | 无 | 是 |
| 棋盘物品 | `boardStore.cells[]` | 63格 | 否 |
| 背包物品 | `inventoryStore.slots` | 无限 | 是 |
| 碎片 | `fragmentStore.fragments` | 无 | 是 |
| 记忆碎片 | `cgAlbumStore.cgData[*.memoryFragments` | 无 | 是 |

### 4.2 资源流转详图

```
┌─────────────────────────────────────────────────────────────┐
│                        产生来源                               │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  生成器   │  扭蛋    │  Boss    │  每日     │  成就/广告/循环  │
│  产出    │  效果    │  订单    │  订单    │  奖励           │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬────────┘
     │          │          │          │              │
     ▼          ▼          ▼          ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                    资源存储层                                  │
│  boardStore.cells    ← 棋盘物品(合成链物品+生成器+特殊道具)      │
│  inventoryStore.slots ← 背包物品(消耗品+棋盘工具)               │
│  currencyStore       ← 金币 + 钻石                             │
│  energyStore         ← 体力                                    │
│  loopStore.loopTokens← 声望代币                                │
│  fragmentStore       ← 碎片                                    │
│  cgAlbumStore        ← 记忆碎片                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
┌──────────────────┐ ┌──────────────┐ ┌────────────────┐
│   合成消耗        │ │  订单消耗     │ │  商店/升级消耗   │
│  2个同类→1个高级  │ │  提交物品     │ │  金币/钻石/代币  │
└──────────────────┘ └──────────────┘ └────────────────┘
```

### 4.3 模块间数据依赖关系

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

**关键数据流向**：

1. **棋盘→Boss**：boardStore.findItem/allItems → Boss订单提交时检查棋盘是否有足够物品
2. **Boss→棋盘**：Boss击败 → unlockCells → 棋盘格子解锁
3. **扭蛋→棋盘/背包**：gachaStore → instant效果直接放棋盘 → consumable/tool效果存背包
4. **背包→棋盘**：inventorySheet拖拽 → boardStore.placeItem/merge
5. **棋盘→收藏**：board:merged → collectionStore.discover → 图鉴记录
6. **循环→全局**：loopStore.buildLoopConfig → bossStore.setLoopConfig, energyStore.resetToBase
7. **女主角→体力**：heroine:upgradePurchased(energy_cap/regen_speed) → energyStore.setMax/setRegenInterval
8. **货币→所有**：currencyStore被gachaStore/heroineStore/shopSheet/bossStore等消费

---

## 5. 配置/数据表

### 5.1 数据文件清单

| 文件 | 用途 | 条目数 |
|------|------|--------|
| `settings.json` | 全局游戏配置 | 1 |
| `items.json` | 物品定义表 | ~52 |
| `generators.json` | 生成器配置表 | 2 |
| `levels.json` | Boss关卡表 | 4 |
| `gacha_pool.json` | 扭蛋池配置 | ~60 |
| `achievements.json` | 成就表 | 32 |
| `daily_orders.json` | 每日订单池 | 56 |
| `loop_rules.json` | 循环规则表 | 8 |
| `loop_events.json` | 循环事件表 | 16 |
| `loop_narratives.json` | 循环叙事表 | 8 |
| `cg_stories.json` | CG故事表 | 8 |

### 5.2 各配置字段含义

#### settings.json

| 顶级键 | 子字段 | 含义 |
|--------|--------|------|
| `GAME_CONFIG` | `BOARD_COLS` / `BOARD_ROWS` | 棋盘列数(7)/行数(9) |
| | `MAX_ENERGY` | 最大体力(100) |
| | `ENERGY_REGEN_CAP` | 自然恢复上限(100) |
| | `ENERGY_REGEN_INTERVAL` | 恢复间隔ms(120000=2分钟) |
| | `ENERGY_REGEN_AMOUNT` | 每次恢复量(1) |
| | `ENERGY_COST_PER_SPAWN` | 生成器产出体力消耗(1) |
| | `STARTING_GOLD` | 初始金币(0) |
| `RECYCLE_ENERGY_TABLE` | `{"1":0, "2":1, ..., "8":20}` | 按物品等级回收获得的体力（线性递增，高级物品回收价值不颠覆资源节奏） |
| `DAILY_ORDER_CONFIG` | `MAX_ACTIVE` | 每日最多订单数(5)，`REFRESH_COST` | 刷新费用(0) | 读取路径: `configStore.dailyOrderConfig.MAX_ACTIVE` |
| | `REFRESH_COST` | 刷新费用(0) |
| `CELL_UNLOCK_COSTS` | `[10, 20, 30, ...]` | 按顺序解锁格子所需的金币(20个) |
| `HEROINE_UPGRADES` | 4个升级项 | id/name/icon/description/levels[] |
| | levels[].cost | 该级升级费用 |
| | levels[].value | 该级效果数值 |
| | levels[].label | 该级显示文本 |
| `LOCKED_CELLS_INITIAL` | `[2,3,4,...]` | 初始锁定格子索引(20个) |
| `UNLOCK_PER_BOSS` | 4个子数组 | 击败每个Boss后解锁的格子索引 |
| `UI_ANIMATION` | 20+字段 | 各动画时长(ms)、粒子参数等 |
| `UI_COLORS` | `toastSSR/SR/Default` | Toast背景渐变CSS |
| `DIALOGUE_CONFIG` | `typewriterSpeedNormal/Fast` | 打字机速度(30/25ms) |
| `UI_TEXT` | `intro/game_complete/default_fail` | 固定UI文本(含NPC对话) |

#### items.json

| 字段 | 含义 |
|------|------|
| `id` | 唯一物品ID (如`lip_5`, `gen_makeup_3`, `joker`) |
| `name` | 显示名称(中文) |
| `level` | 合成等级(1-8) |
| `chain` | 所属链条: lips/perfume/study/food/gen_makeup/gen_study/special |
| `nextId` | 合成后产物ID (null=最高级) |
| `sellPrice` | 出售金币 |
| `emoji` | 显示emoji |
| `color` | 主题色(hex) |
| `type` | 物品类型(仅特殊物品): GENERATOR/JOKER/SCISSOR/ENERGY_POTION/SPECIAL/SURPRISE_BOX |
| `energyRecover` | 体力药水恢复量 |
| `description` | 特殊物品效果描述 |

**物品链结构**：
```
lips链:    lip_1 → lip_2 → ... → lip_8
perfume链: perf_1 → perf_2 → ... → perf_8
study链:   study_1 → study_2 → ... → study_8
food链:    food_1 → food_2 → ... → food_8
生成器链:  gen_makeup_1 → ... → gen_makeup_8
生成器链:  gen_study_1 → ... → gen_study_8
特殊物品:  joker, scissor, energy_potion_10/20/40/60/99
```

#### generators.json

| 字段 | 含义 |
|------|------|
| `id` | 生成器链ID |
| `name` / `emoji` | 显示信息 |
| `chains` | 产出物品所属的链条列表 |
| `levels` | 按等级(1-8)的产出配置 |

每级配置：
| 字段 | 含义 |
|------|------|
| `drop_pool` | `[{itemId, weight}]` 产出物品池及权重 |
| `free_production_chance` | 免费产出概率(0-1) |
| `capacity` | 最大点击次数(0=无限) |
| `cooldown` | 冷却时间ms(当前均为0，已禁用) |
| `special_drop` | `{chance, items:[{itemId,weight}]}` 特殊掉落 |

#### levels.json

| 字段 | 含义 |
|------|------|
| `id` | 关卡序号(0-3) |
| `bossName` / `bossTitle` | Boss名称/头衔 |
| `bossAvatar` | 头像图片路径 |
| `bossColor` / `bgGradient` | 主题色/背景渐变 |
| `totalHp` | Boss总HP |
| `orders` | 订单数组(每关3个) |

每订单：
| 字段 | 含义 |
|------|------|
| `id` / `name` | 订单标识/名称 |
| `required` | `[{itemId, count}]` 需求物品 |
| `isTimed` | 是否计时 |
| `timeLimit` | 时间限制(秒) |
| `damage` | 对Boss造成的伤害 |
| `diamondReward` | 钻石奖励 |
| `dialogue` | `{npc, player}` 提交后对话 |

#### gacha_pool.json

| 字段 | 含义 |
|------|------|
| `rarityConfig` | R/SR/SSR概率+颜色+光效CSS |
| `gachaCost` | `{singleCost:100, tenCost:900}` 钻石消耗 |
| `subWeights` | SR子类别权重: generator 0.25, joker/scissor/energy 0.2, special 0.15 |
| `recycleEnergy` | 回收体力表(同settings) |
| `fragmentToGenerator` / `fragmentToStory` | 碎片兑换阈值(60) |
| `chains` / `chainNames` / `chainIcons` | 链条ID/名称/图标映射 |
| `chainToGen` | 链条→生成器映射 (lips→gen_makeup等) |
| `chainItemPrefix` | 链条→物品ID前缀 (lips→lip, perfume→perf等) |
| `gachaPoolV2` | 扭蛋池物品数组 |

每池物品：
| 字段 | 含义 |
|------|------|
| `id` / `name` / `icon` | 标识/名称/图标 |
| `rarity` | R/SR/SSR |
| `subCategory` | item/generator/joker/scissor/energy/special |
| `weight` | 同稀有度内权重 |
| `effect` | 效果类型字符串 |
| `value` | 效果参数(详见ItemEffectLogic) |

#### achievements.json

| 字段 | 含义 |
|------|------|
| `id` | 成就ID |
| `name` / `icon` / `description` | 显示信息 |
| `condition` | 统计条件: merges/bossDefeats/collectionPct/maxLevelItems/totalGoldEarned/recycled/gachaPulls/cellsUnlocked/dailyCompleted/loopReached |
| `target` | 达成阈值 |
| `reward` | `{diamonds?, energy?, gold?}` |

#### daily_orders.json

| 字段 | 含义 |
|------|------|
| `id` / `name` | 订单标识/名称 |
| `required` | `[{itemId, count}]` 需求物品 |
| `goldReward` | 金币奖励 |
| `minLoop` | 最低循环要求 |
| `dialogue` | 完成时风味文本 |

#### loop_rules.json

| 字段 | 含义 |
|------|------|
| `title` | 循环章节名 |
| `specialRules` | 生效的特殊规则数组: dailyGoldUp/perfumeBoost/timedOrdersUp/energyRegenDown |

#### loop_events.json

Key格式：`{loop}_{step}`，如`1_0`, `8_3`

| 字段 | 含义 |
|------|------|
| `npcName` | 场景emoji |
| `text` | 叙事文本 |
| `playerText` | 玩家内心独白 |
| `goldReward?` / `diamondReward?` / `energyReward?` | 可选奖励 |

#### loop_narratives.json

Key为循环编号(1-8)

| 字段 | 含义 |
|------|------|
| `loopIntro` | 循环开始叙事 |
| `loopOutro` | 循环结束叙事 |
| `boss_{0-3}` | 每个Boss的`{intro, defeatOutro}` |

#### cg_stories.json

Key为SSR扭蛋ID(8个)

| 字段 | 含义 |
|------|------|
| `cgId` | CG标识 |
| `title` | 故事标题 |
| `maleLead` | 关联男主 |
| `stories` | 4个章节，每章含`{title, lines[]}` |
| `lines[].speaker` | 说话者(null=旁白) |
| `lines[].expression` | 情感标签 |
| `lines[].text` | 对话文本 |

---

## 附录：EventBus 全量事件协议

| 事件名 | 数据 | 触发方 |
|--------|------|--------|
| `boss:defeated` | `{levelIdx}` | BossLogic |
| `boss:gameComplete` | void | BossLogic |
| `boss:hpChanged` | `{currentHp, totalHp, pct}` | BossLogic |
| `boss:levelLoaded` | `{levelIdx, bossName, ...}` | BossLogic |
| `boss:orderComplete` | `{nextOrderIdx}` | BossLogic |
| `boss:orderFailed` | `{orderIdx, nextOrderIdx}` | BossLogic |
| `boss:orderLoaded` | `{orderIdx, order, isTimed, timeLimit}` | BossLogic |
| `boss:timerTick` | `{remaining}` | BossLogic |
| `bossfsm:stateChanged` | `{from, to, event, data}` | StateMachine |
| `energyfsm:stateChanged` | `{from, to, event, data}` | StateMachine |
| `gachafsm:stateChanged` | `{from, to, event, data}` | StateMachine |
| `board:cellsUnlocked` | `{indices}` | BoardLogic |
| `board:merged` | `{sourceIndex, targetIndex, result}` | boardStore |
| `board:produced` | `{generatorIndex, targetIndex, producedItemId}` | boardStore |
| `currency:changed` | `{gold, diamonds}` | CurrencyLogic |
| `currency:flash` | `{type, effect}` | CurrencyLogic |
| `currency:goldEarned` | `{amount}` | CurrencyLogic |
| `currency:insufficient` | `{type, current, needed}` | CurrencyLogic |
| `energy:changed` | `{current, max}` | EnergyLogic |
| `dialogue:opened` | `{npcName, npcText, ...}` | dialogueStore |
| `dialogue:closed` | void | dialogueStore |
| `achievement:unlocked` | `{achievement}` | achievementStore |
| `achievement:claimed` | `{achievement, reward}` | achievementStore |
| `ad:rewardGranted` | `{adType, reward}` | adStore |
| `ad:dailyReset` | void | adStore |
| `cg:unlocked` | `{cgId, storyIndex}` | cgAlbumStore |
| `cg:read` | `{cgId, storyIndex}` | cgAlbumStore |
| `cg:readRequested` | `{cgId}` | CGAlbumSheet |
| `cg:memoryFragmentsAdded` | `{cgId, count, total}` | cgAlbumStore |
| `cg:nextUnlocked` | `{cgId, storyIndex}` | cgAlbumStore |
| `collection:itemDiscovered` | `{itemId}` | collectionStore |
| `collection:gachaCollected` | `{cardId}` | collectionStore |
| `collection:chainCompleted` | `{chainId}` | collectionStore |
| `dailyBuff:rolled` | `{buff}` | dailyBuffStore |
| `dailyBuff:activated` | `{buff}` | dailyBuffStore |
| `dailyOrders:updated` | `{orders}` | dailyOrderStore |
| `dailyOrders:fulfilled` | `{order, index, goldReward}` | dailyOrderStore |
| `dailyOrders:allCompleted` | void | dailyOrderStore |
| `fragment:added` | `{fragmentId, count, total}` | fragmentStore |
| `fragment:exchanged` | `{fragmentId, count, remaining}` | fragmentStore |
| `fragment:cleared` | `{fragmentId}` | fragmentStore |
| `fragment:clearedAll` | void | fragmentStore |
| `gacha:pulled` | `{results}` | GachaLogic |
| `gacha:ssrObtained` | `{item, isFirst}` | gachaStore |
| `gacha:newSSRsObtained` | `{items}` | gachaStore |
| `heroine:upgradePurchased` | `{upgradeId, level, value}` | heroineStore |
| `heroine:effectApplied` | `{upgradeId, level, value}` | heroineStore |
| `inventory:itemAdded` | `{itemId, count, total}` | inventoryStore |
| `inventory:itemRemoved` | `{itemId, count, remaining}` | inventoryStore |
| `inventory:itemUsed` | `{itemId, targetCellIndex}` | inventoryStore |
| `inventory:cleared` | void | inventoryStore |
| `loop:completed` | `{loopIndex}` | useGameInit |
| `loop:metaUpgradePurchased` | `{upgradeId, level, cost}` | loopStore |
| `loop:narrativeFlagUnlocked` | `{flag}` | loopStore |
| `loop:shouldComplete` | void | useGameLoop |
| `loop:uiUpdated` | `{loopIndex, config}` | useGameInit |
| `shop:itemPurchased` | `{item: {id, cost, effect, value}}` | ShopSheet |
| `vn:opened` | `{ssrId, storyIndex}` | vnReaderStore |
| `vn:closed` | void | vnReaderStore |
| `localeChanged` | `{locale}` | i18nStore |
| `toast:show` | (bridged from gachaStore) | gachaStore |

---

## 7. 审计修复记录

> 以下修复基于 Merge 2 标准 H5 游戏设计模式审计，按模块分组

### 7.1 能量系统

| # | 修复 | 文件 | 说明 |
|---|------|------|------|
| 20 | 回收能量接入出售 | `GameView.vue` | `onSell` 调用 `getRecycleEnergy()` + `energyStore.recover()`，含 `recycle_bonus` 女主升级加成 |
| 21 | `regen_speed` 升级生效 | `useGameLoop.ts`, `useGameInit.ts` | `heroine:upgradePurchased` 添加 `regen_speed` case，`applyHeroineEffectsToEnergy` 加载时应用 |
| 22 | `recycle_bonus` 升级生效 | `GameView.vue` | 出售时读取 `heroineStore.getEffectValue('recycle_bonus')` 加到回收能量 |
| 23 | `energy_discount` 改为免费概率 | `boardStore.ts` | 50% 概率 cost=0，替代原来的 `ceil(cost*0.5)` 在 cost=1 时无效的逻辑 |

### 7.2 订单系统

| # | 修复 | 文件 | 说明 |
|---|------|------|------|
| 26 | 订单物品合并/回收保护 | `boardStore.ts` | `isNeededByActiveOrder()` 检查——棋盘上该类型物品数量 ≤ 订单所需数量时阻止合并/回收 |
| 27 | Boss 订单查找包含背包 | `MainQuestCard.vue` | `canSubmit` 改为 `backpackCount + boardCount >= req.count` |
| 40 | Boss 订单消耗优先棋盘 | `MainQuestCard.vue` | `onSubmit` 先扣棋盘 `clearCell()`，剩余扣背包 `removeItem()`，腾出格子空间 |

### 7.3 存档系统

| # | 修复 | 文件 | 说明 |
|---|------|------|------|
| 32 | 合并/产出后及时存档 | `BoardGrid.vue`, `saveStore.ts` | 成功操作后调 `debouncedSave(200ms)`，避免每次操作阻塞 |
| 33 | 增量版本迁移框架 | `saveStore.ts` | 添加 `migrations` 注册表 + `migrateData()` 逐级迁移，不再一刀切清档 |
| 34 | 损坏存档清理 | `saveStore.ts` | `JSON.parse` 失败后 `localStorage.removeItem(key)` |
| 38 | 存档数据校验 | `boardStore.ts` | `deserialize` 校验 cells 长度 + 无效 item ID 置 null + resize |
| 36 | 独立保存标志 | `saveStore.ts` | `savingMeta` + `savingRun` 替代共享 `saving` |

### 7.4 棋盘容量

| # | 修复 | 文件 | 说明 |
|---|------|------|------|
| 6 | `hasEmptySpace` 排除 locked | `boardStore.ts` | `some((c, i) => c === null && !locked.has(i))` |
| 9 | buff 奖励满格提示 | `boardStore.ts` | `merge_bonus`/`gen_speed_up`/`doubleGen` 找不到空格时 Toast |
| 10 | 剪刀 i18n key | `BoardGrid.vue` | 改为 `inventory.scissorFailNoSpace` 完整 key |
| 17 | doubleGen 满格不消耗回合 | `boardStore.ts` | `extraTarget === -1` 时跳过 `decrementDoubleGenTurns()` |

### 7.5 生成器系统

| # | 修复 | 文件 | 说明 |
|---|------|------|------|
| 19 | 离线产出积累 | `boardStore.ts`, `saveStore.ts` | `calculateOfflineProduction()` 按冷却间隔计算离线 ticks，滚物品入背包，上限 20/生成器 |
| 16 | 容量耗尽阻断产出 | `boardStore.ts` | `currentClicks >= maxClicks && maxClicks > 0` 时返回 `cooldown` |

### 7.6 合成规则安全

| # | 修复 | 文件 | 说明 |
|---|------|------|------|
| 1 | 满级物品拖拽反馈 | `boardStore.ts` | 同 ID 且 `nextId===null` 时 Toast"已满级，无法合成" |
| 2 | `canMerge()` 防空访问 | `BoardLogic.ts` | `if (!items[s] \|\| !items[t]) return false` |
| 3 | Joker 拖特殊物品提示 | `boardStore.ts` | ENERGY_POTION/SURPRISE_BOX/SPECIAL 时 Toast"百搭牌无法对此物品使用" |

### 7.7 收尾

| # | 修复 | 文件 | 说明 |
|---|------|------|------|
| 12 | 删除废弃 `energy_potion` | `items.json` | 移除无数字后缀的体力药水，迁移代码保留兜底 |
| 13 | SurpriseBox chain 重命名 | `items.json` | `lips`→`random_lips` 等，避免与常规链混淆 |
| 29 | 禁止回收消耗品 | `BoardLogic.ts` | `canSellItem` 增加ENERGY_POTION/SPECIAL 类型检查 |
| 41 | 剪刀满格替代方案 | `BoardLogic.ts`, `BoardGrid.vue` | 原位放第一个 lv1，第二个入背包（`secondItemToInventory` 字段） |
| 11 | Boss 解锁计数器注释 | `BoardLogic.ts` | 文档化 `cellsUnlocked` 共享计数器的设计意图 |
