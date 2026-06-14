# Tech Debt Register

## TD-001: Logic 层直接引用 globalBus

- **影响范围**: CurrencyLogic, BossLogic, EnergyLogic, GachaLogic, BoardLogic
- **违规描述**: 直接 `import globalBus` 并 emit 事件，Logic 层应为纯函数零外部依赖
- **当前状态**: 已修复 — 所有 5 个 Logic 类的 globalBus 引用已移除，方法改为返回 `LogicEvent[]`，Store 层负责 emit

## TD-002: EnergyLogic.startRegen 使用 setInterval/clearInterval

- **影响范围**: EnergyLogic
- **违规描述**: Logic 层不应有副作用，timer 应通过 deps 注入
- **当前状态**: 已修复 — Approach B：timer 管理移至 energyStore，Logic 提供 `tick()` 纯函数

## TD-003: GachaPoolItem schema 曾缺少 itemId/description 字段

- **影响范围**: `GachaPoolItemSchema`, `GachaPoolItem` 类型
- **违规描述**: Zod 默认 strip 未知 key，导致 `itemId`（实际数据全量存在）和 `description`（部分存在）被静默丢弃
- **当前状态**: 已修复（B2-B5 阶段补充）
- **教训**: 新增 schema 时应与实际 JSON 数据对跑验证，避免 strip 模式掩盖字段缺失

## TD-004: boardStore.produceFromGenerator 返回类型使用联合类型临时绕过 TS2322

- **影响范围**: `boardStore.ts`, `BoardGrid.vue`
- **违规描述**: `ResolveProductionResult` 与 `ResolveResult` 的 `applyTo.board` 形状不同（前者用 `placements`，后者用 `placeItems`），导致 TS2322。临时用 `ResolveResult | ResolveProductionResult` 联合类型 + `as ResolveResult` 断言绕过
- **当前状态**: 已修复 — 方案 B：`ResolveProductionResult` 重构为 `resolveResult: ResolveResult`（energy spend + events）+ `storeMeta`（placements/incrementGeneratorClicks/decrementDoubleGenBy），明确分离声明式指令与 Store 专用操作。`fail()` 返回 `incrementGeneratorClicks: null`（不递增）。Store 只传 `resolveResult` 给 `applyResolveResult`，手动处理 `storeMeta`。删除联合类型、TEMP 注释、`as ResolveResult` cast

## TD-005: saveStore migrateLegacySave 内部使用 any 访问旧存档字段

- **影响范围**: `saveStore.ts` `migrateLegacySave()`
- **违规描述**: 旧存档 JSON 无类型定义，migration 函数内部用 `Record<string, any>` 访问 30+ 个字段
- **当前状态**: 局部 `as Record<string, any>` + `// TEMP: see TD-005` 标记，仅限 legacy migration 内部
- **修复方案**: 如需彻底消除，可定义 `LegacySaveDataV0` 接口（字段全 optional），但投入产出比低
- **预计时机**: 如有存档格式大改时一并处理

## TD-006: InventoryService.resolveConsumableUse 不安全的 unknown → GachaPoolItemValue 类型断言

- **影响范围**: `InventoryService.ts` `resolveConsumableUse()`
- **违规描述**: `value: unknown`（来自事件 payload `ItemUsedData.value`）通过 `as GachaPoolItemValue` 断言传入 `ItemEffectService.resolveConsumableEffect`，无运行时校验
- **当前状态**: 已修复 — 双轨方案：(1) `ItemUsedData.value` 类型从 `unknown` 收紧为 `GachaPoolItemValue | undefined`，消除源头类型丢失；(2) 新增 `isGachaPoolItemValue` type guard（选项X：防御 null/原始类型/数组，`!Array.isArray(v)` 排除数组，空 `{}` 为合法值）+ fallback 返回 error toast。`resolveConsumableUse` 参数改为 `GachaPoolItemValue | undefined`。TEMP 注释已删除
- **已知局限**: type guard 不校验对象字段结构（因 GachaPoolItemValue 所有字段 optional，6/74 实际数据为空 `{}`，无普适 discriminant 字段）

## TD-007: DailyOrder 双重接口 — game.d.ts 与 dailyOrderStore 结构不一致

- **影响范围**: `useGameLoop.ts`, `boardStore.ts`, `BoardService.ts`, `ServiceResultTypes.ts`
- **违规描述**: `DailyOrder` 在 game.d.ts、dailyOrderStore、BoardService 中有三套定义，结构不一致。game.d.ts 无 `fulfilled`（配置表结构），store/BoardService 各自定义混合版。跨层赋值时需 bridge-cast，且 `useGameLoop` 中 `fulfilled: false` 硬编码覆盖了真实的 `fulfilled` 值（已完成订单在 board switch 恢复后会被重置为未完成）
- **当前状态**: 已修复 — 方案 B：新增 `DailyOrderState extends DailyOrder { fulfilled: boolean }` 明确区分配置与运行时状态；删除 dailyOrderStore/BoardService 本地 `DailyOrder` 定义；`BoardSnapshot.frozenDailyOrders` / `ResolveResult.setFrozenOrders` / `DailyOrderSerializeData` 统一改用 `DailyOrderState[]`；`dailyOrderStore.deserialize` 用 `normalizeDailyOrder()` + `satisfies` 补默认值保证旧存档兼容；boardStore 删除 `as ServiceDailyOrder[]` cast；useGameLoop 删除 bridge-cast，直接赋值（修复 fulfilled 覆盖 bug）

## TD-008: 测试代码 170 处 TS 错误（TS2345/2322 为主）

- **影响范围**: `src/__tests__/` 下 16 个文件
- **违规描述**: 测试字面量与函数参数类型不匹配（如 `ItemData` 字面量 vs `{ [key: string]: ItemData }`、缺少属性、类型不兼容），vue-tsc 报 170 处错误
- **当前状态**: 运行时无影响（908 tests pass），生产代码零 TS 错误
- **修复方案**: 批量给测试字面量加 `as const satisfies` 或补全缺失字段
- **预计时机**: 待 CI 配置 `vue-tsc` 对测试目录严格检查时统一处理
