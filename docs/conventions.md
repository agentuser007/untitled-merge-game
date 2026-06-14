# 开发约定（Conventions）

> 本项目最容易被违反的规则，全部在此列出。修改代码前必读。

---

## 1. deps 铁律

### 规则 1.1：deps 必填，不许 `??` 兜底

Logic 层和 Service 层函数签名中，deps 的所有字段必须是 **required**。缺失时 throw，不用 `??` 提供默认值。

```typescript
// ✅ 正确
function calculateLuckyCoin(value: any, deps: LuckyCoinDeps) {
  const count = deps.luckyCoinDefaultCount;
  const chance = deps.luckyCoinGoldChance;
  // ...
}

// ❌ 错误
function calculateLuckyCoin(value: any, deps: Partial<LuckyCoinDeps>) {
  const count = deps.luckyCoinDefaultCount ?? 7;   // 禁止
  const chance = deps.luckyCoinGoldChance ?? 0.5;  // 禁止
}
```

**理由**：`??` 兜底会在 config 缺失时静默使用错误值，比直接报错更危险。EnergyLogic 的兜底值 3000ms（实际应为 120000ms）就是前车之鉴。

### 规则 1.2：Logic/Service 不引用 configStore

Logic 层和 Service 层 **不得** `import { useConfigStore }` 或直接读取 configStore 的任何 ref。所有配置值通过 deps 参数从调用方（Store/composable）传入。

```typescript
// ✅ 正确：Store 传入 deps
const result = BoardService.resolveProduction(deps, {
  ...configStore.boardEconomy,
  perfumeBoostChains: configStore.boardEconomy.perfumeBoostChains,
});

// ❌ 错误：Service 内部读 configStore
import { useConfigStore } from '../stores/configStore';
const config = useConfigStore();
```

**理由**：Logic/Service 层保持纯函数性质，可独立测试，无需 Pinia 环境。

### 规则 1.3：random 通过 deps 传入

所有需要随机数的逻辑，`random: Math.random` 作为 deps 字段传入，不在逻辑层直接调用 `Math.random`。

```typescript
// ✅ 正确
interface LuckyCoinDeps {
  random: () => number;
  // ...
}
const isGold = deps.random() < deps.luckyCoinGoldChance;

// ❌ 错误
const isGold = Math.random() < deps.luckyCoinGoldChance;
```

**理由**：测试时可注入确定性随机数生成器，消除测试中的不确定性。

---

## 2. 函数签名约定

### 2.1 命名模式

| 层级 | 函数前缀 | 返回类型 | 示例 |
|------|---------|---------|------|
| Logic | 无前缀（动词） | 计算结果 | `tryMergeOrSwap`, `rollGeneratorDrop` |
| Service | `resolve*` | `ResolveResult` | `resolveProduction`, `resolveMerge` |
| Store | `do*` 或动词 | `void`（内部 apply + emit） | `produceFromGenerator`, `merge` |

### 2.2 deps 接口命名

- Logic 函数的 deps 接口：`XxxDeps`（如 `LuckyCoinDeps`, `ScissorDeps`）
- Service 函数的 deps 接口：`Resolve*XxxDeps`（如 `ResolveProductionDeps`, `ResolveMergeDeps`）
- deps 接口定义在对应 Logic/Service 文件顶部，不单独抽文件

### 2.3 ResolveResult 模式

Service 函数返回 `ResolveResult`，不在 Service 内部执行任何副作用（不修改 Store、不调用 API）。

```typescript
// ✅ 正确：返回声明式指令
function resolveProduction(deps: ResolveProductionDeps): ResolveResult {
  return {
    applyTo: { energy: { spend: cost }, board: { placeItems: [...] } },
    events: [{ name: 'board:produced', data: { ... } }],
    ui: { toasts: [...] },
  };
}

// ❌ 错误：Service 内部直接操作 Store
function resolveProduction(deps) {
  energyStore.spend(cost);     // 禁止
  boardStore.placeItem(...);   // 禁止
}
```

Store 层负责 `apply` ResolveResult 中的 `applyTo` 和 emit `events`。

---

## 3. 测试要点

### 3.1 文件位置

测试文件位于 `src/__tests__/`，文件名与被测模块对应。

### 3.2 Mock deps 必须完整

测试中构造的 deps 对象必须包含被测函数签名的所有必填字段，不可省略。

```typescript
// ✅ 正确：完整 deps
const deps = {
  luckyCoinDefaultCount: 7,
  luckyCoinGoldChance: 0.5,
  luckyCoinGoldAmount: 100,
  luckyCoinDiamondAmount: 10,
  random: () => 0.3,
};

// ❌ 错误：省略字段
const deps = {
  luckyCoinDefaultCount: 7,
  // 其余字段靠 ?? 兜底 — 但我们已经禁止 ?? 了
};
```

### 3.3 新增 deps 字段时

新增 deps 字段后，必须更新所有相关测试中的 mock 对象。运行 `npx vitest run` 验证。

### 3.4 测试命令

```bash
npx vitest run           # 全量测试
npx vitest run BoardService  # 单文件测试
```

---

## 4. 存档 Schema 约定

### 4.1 双层存档

| 层级 | Key | 内容 | 持久性 |
|------|-----|------|--------|
| META | `heartbeat_merge_meta` | 循环/女主角/扭蛋/碎片/CG/收藏/成就/钻石/广告/每日增益 | 跨循环永久 |
| RUN | `heartbeat_merge_run` | 金币/体力/Boss/棋盘/背包/每日订单/棋盘注册表 | 仅当前循环 |

### 4.2 版本迁移

新增存档字段时，必须在 `saveStore.ts` 的 `migrations` 注册表中添加迁移函数，确保旧版存档可自动升级。

当前版本：v4

### 4.3 反序列化校验

Store 的 `deserialize()` 方法必须校验数据完整性（如 cells 数组长度、无效 itemId 置 null）。

---

## 5. 事件总线约定

### 5.1 类型注册

所有事件必须在 `src/types/game.d.ts` 的 `GameEvents` 接口中注册，包括事件名和 payload 类型。

### 5.2 事件命名

格式：`模块:动作`，如 `boss:defeated`、`currency:insufficient`。

### 5.3 新增事件 checklist

1. 在 `GameEvents` 接口添加事件名和 payload 类型
2. 在 `docs/event-map.md` 更新事件表
3. 确保发射方和订阅方的 payload 类型匹配

详见 `docs/event-map.md`。

---

## 6. CSS / 设计约定

详见 `docs/design-system-v1.1.md`，核心原则一句话：

**暖色原则**：所有新增阴影/色值必须在暖色域内（棕/金/橙），禁止冷灰（如 `rgba(170,170,204,...)`）。CSS 变量优先，禁止 `<style scoped>` 中硬编码 hex 值。
