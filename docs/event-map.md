# EventBus 事件映射表

> 所有事件必须在 `src/types/game.d.ts` 的 `GameEvents` 接口中注册。
> 新增事件时同步更新本表。

---

## Boss

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `boss:defeated` | `{ levelIdx: number }` | BossLogic | Boss被击败 |
| `boss:gameComplete` | `void` | BossLogic | 所有关卡通关 |
| `boss:hpChanged` | `{ currentHp, totalHp, pct }` | BossLogic | Boss HP变化 |
| `boss:levelLoaded` | `{ levelIdx, bossName, bossTitle, bossAvatar, bossColor, bgGradient, currentHp, totalHp }` | BossLogic | 关卡加载完成 |
| `boss:orderComplete` | `{ nextOrderIdx: number }` | BossLogic | 订单完成，推进下一订单 |
| `boss:orderFailed` | `{ orderIdx, nextOrderIdx }` | BossLogic | 计时订单超时 |
| `boss:orderLoaded` | `{ orderIdx, order, isTimed, timeLimit }` | BossLogic | 订单加载完成 |
| `boss:timerTick` | `{ remaining: number }` | BossLogic | 计时订单倒计时 |

## FSM 状态变化

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `bossfsm:stateChanged` | `FSMStateChangedEvent` | StateMachine | Boss FSM 状态转换 |
| `energyfsm:stateChanged` | `FSMStateChangedEvent` | StateMachine | Energy FSM 状态转换 |
| `gachafsm:stateChanged` | `FSMStateChangedEvent` | StateMachine | Gacha FSM 状态转换 |

> `FSMStateChangedEvent = { from: string | null; to: string; event: string; data?: any }`

## Board

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `board:cellsUnlocked` | `{ indices: number[] }` | BoardLogic | 格子解锁 |
| `board:merged` | `{ sourceIndex, targetIndex, result }` | boardStore | 合成完成 |
| `board:produced` | `{ generatorIndex, targetIndex, producedItemId }` | boardStore | 生成器产出 |
| `board:itemConsumed` | `{ index, itemId }` | boardStore | 物品被订单消耗 |
| `board:itemPlaced` | `{ index, itemId }` | boardStore | 物品放置到棋盘 |
| `board:sold` | `{ cellIndex, itemId, gold, energy }` | boardStore | 物品出售 |
| `board:switched` | `{ loopIndex, status }` | boardStore | 多棋盘切换 |

## Currency

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `currency:changed` | `{ gold, diamonds }` | CurrencyLogic | 货币数量变化 |
| `currency:flash` | `{ type: 'gold' \| 'diamonds', effect: 'add' \| 'spend' }` | CurrencyLogic | 货币闪烁动画 |
| `currency:goldEarned` | `{ amount }` | CurrencyLogic | 金币获得（闪烁金色） |
| `currency:insufficient` | `{ type, current, needed }` | CurrencyLogic | 货币不足 |

## Energy

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `energy:changed` | `{ current, max }` | EnergyLogic | 体力变化 |

## Dialogue

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `dialogue:opened` | `{ npcName, npcText, playerText, portraitUrl, portraitEmoji }` | dialogueStore | NPC对话打开 |
| `dialogue:closed` | `void` | dialogueStore | NPC对话关闭 |

## Achievement

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `achievement:unlocked` | `{ achievement: Achievement }` | achievementStore | 成就解锁 |
| `achievement:claimed` | `{ achievement, reward }` | achievementStore | 成就奖励领取 |

## Ad

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `ad:rewardGranted` | `{ adType, reward }` | adStore | 广告奖励发放 |
| `ad:dailyReset` | `void` | adStore | 广告每日重置 |

## CG / Story

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `cg:unlocked` | `{ cgId, storyIndex }` | cgAlbumStore | CG解锁 |
| `cg:read` | `{ cgId, storyIndex }` | cgAlbumStore | CG已读 |
| `cg:readRequested` | `{ cgId }` | CGAlbumSheet | 请求阅读CG |
| `cg:memoryFragmentsAdded` | `{ cgId, count, total }` | cgAlbumStore | 记忆碎片增加 |
| `cg:nextUnlocked` | `{ cgId, storyIndex }` | cgAlbumStore | 下一章解锁 |

## Collection

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `collection:itemDiscovered` | `{ itemId }` | collectionStore | 新物品发现 |
| `collection:gachaCollected` | `{ cardId }` | collectionStore | 扭蛋卡片收集 |
| `collection:chainCompleted` | `{ chainId }` | collectionStore | 链条完成 |

## Daily Buff

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `dailyBuff:rolled` | `{ buff: { id, icon, nameKey, descKey } }` | dailyBuffStore | 每日增益抽取 |
| `dailyBuff:activated` | `{ buff: { id, icon, nameKey, descKey } }` | dailyBuffStore | 每日增益激活 |

## Daily Orders

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `dailyOrders:updated` | `{ orders: DailyOrder[] }` | dailyOrderStore | 每日订单更新 |
| `dailyOrders:fulfilled` | `{ order, index, goldReward }` | dailyOrderStore | 每日订单完成 |
| `dailyOrders:allCompleted` | `void` | dailyOrderStore | 全部每日订单完成 |

## Fragment

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `fragment:added` | `{ fragmentId, count, total }` | fragmentStore | 碎片增加 |
| `fragment:exchanged` | `{ fragmentId, count, remaining }` | fragmentStore | 碎片兑换 |
| `fragment:cleared` | `{ fragmentId }` | fragmentStore | 碎片清空 |
| `fragment:clearedAll` | `void` | fragmentStore | 全部碎片清空 |

## Gacha

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `gacha:pulled` | `{ results: GachaPoolItem[] }` | GachaLogic | 抽卡结果 |
| `gacha:ssrObtained` | `{ item, isFirst }` | gachaStore | SSR获得 |
| `gacha:newSSRsObtained` | `{ items }` | gachaStore | 新SSR批量获得 |

## Heroine

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `heroine:upgradePurchased` | `{ upgradeId, level, value }` | heroineStore | 女主角升级购买 |
| `heroine:effectApplied` | `{ upgradeId, level, value }` | heroineStore | 升级效果应用 |

## Inventory

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `inventory:itemAdded` | `{ itemId, count, total }` | inventoryStore | 物品入背包 |
| `inventory:itemRemoved` | `{ itemId, count, remaining }` | inventoryStore | 物品出背包 |
| `inventory:itemUsed` | `{ itemId, targetCellIndex }` | inventoryStore | 物品使用 |
| `inventory:cleared` | `void` | inventoryStore | 背包清空 |

## Loop

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `loop:completed` | `{ loopIndex }` | useGameInit | 循环完成 |
| `loop:settling` | `{ loopIndex }` | loopStore | 循环结算中 |
| `loop:metaUpgradePurchased` | `{ upgradeId, level, cost }` | loopStore | 元升级购买 |
| `loop:narrativeFlagUnlocked` | `{ flag }` | loopStore | 叙事标记解锁 |
| `loop:shouldComplete` | `void` | useGameLoop | 触发循环完成流程 |
| `loop:uiUpdated` | `{ loopIndex, config }` | useGameInit | 循环UI更新 |

## Shop

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `shop:itemPurchased` | `{ item: { id, cost, effect, value } }` | ShopSheet | 商店物品购买 |

## VN Reader

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `vn:opened` | `{ ssrId, storyIndex }` | vnReaderStore | VN阅读器打开 |
| `vn:closed` | `void` | vnReaderStore | VN阅读器关闭 |

## Affection

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `affection:changed` | `{ characterId, delta, source }` | affectionStore | 好感度变化 |
| `affection:levelUp` | `{ characterId, newLevel, oldLevel }` | affectionStore | 好感度升级 |
| `affection:bossDefeated` | `{ bossId, loopIndex }` | affectionStore | Boss击败好感 |
| `affection:vnCompleted` | `{ cgId, maleLeadId }` | affectionStore | VN完成好感 |
| `affection:giftGiven` | `{ characterId, giftId, affectionGained }` | affectionStore | 赠送礼物 |
| `affection:touchPerformed` | `{ characterId, zoneId, affectionGained }` | affectionStore | 触摸互动 |
| `affection:coinsEarned` | `{ amount, source }` | affectionStore | 好感币获得 |
| `affection:shopPurchased` | `{ itemId, coinsSpent }` | affectionStore | 好感商店购买 |
| `affection:shopEffect` | `{ item, effect }` | affectionStore | 好感商店效果 |

## Locale

| 事件名 | Payload | 发射方 | 说明 |
|--------|---------|--------|------|
| `locale:changed` | `{ locale }` | i18nStore | 语言切换 |

---

## 新增事件 Checklist

1. 在 `src/types/game.d.ts` 的 `GameEvents` 接口添加事件名和 payload 类型
2. 在本表对应模块分组中添加一行
3. 确认发射方的 `emit()` 调用 payload 与 `GameEvents` 定义类型一致
4. 确认订阅方的 `on()` handler 参数类型与 payload 匹配
