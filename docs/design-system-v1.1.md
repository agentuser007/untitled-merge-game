# Merge 2 — UI/UX 视觉与组件规范 (Design System v1.1)

> **修订说明 v1.1**：对齐现有 `variables.css` token 命名；修正阴影冷暖色调；补充 Gacha / VN / Rarity 系统；响应式方案改用 `cqw` 与现有 `--figma-scale` 方案一致；解决 `--text-primary` 语义冲突。

---

## 目录

1. [设计哲学](#1-设计哲学)
2. [Token 命名策略](#2-token-命名策略)
3. [配色系统](#3-配色系统)
4. [字体系统](#4-字体系统)
5. [圆角与间距](#5-圆角与间距)
6. [阴影系统](#6-阴影系统)
7. [图层体系（Z-Index）](#7-图层体系)
8. [响应式适配](#8-响应式适配)
9. [核心组件规范](#9-核心组件规范)
10. [扩展系统：Gacha / Rarity / VN](#10-扩展系统)
11. [动效规范](#11-动效规范)
12. [variables.css 完整清单](#12-variablescss-完整清单)
13. [开发使用规则](#13-开发使用规则)

---

## 1 设计哲学

**风格定义：奶油暖糖**

柔和奶茶色调为主，局部使用饱和状态色点缀。质感参考实体糖果包装盒与手账本：圆角大、阴影柔、颜色暖。

**三条核心原则：**

- **温柔优先**：暖棕色系主导，避免任何冷蓝或高对比度的 UI。阴影色必须使用暖棕/暖金色调，禁止使用冷灰（如 `rgba(170,170,204,...)` 是冷色，不允许用于本项目阴影）。
- **Neumorphism 軟触感**：圆形快捷按钮全部使用暖色双向投影（亮部 + 暗部），让按钮如同从背景中「浮起」。
- **信息分层**：背景 → 棋盘 → 浮层 → 弹窗，每一层有独立的背景色与阴影，不允许层级混淆。

---

## 2 Token 命名策略

### 2.1 保留现有命名

**不做全量重命名**。现有 `variables.css` 中已有的 token（如 `--cream`、`--caramel`、`--text-primary`）保持不变，所有现有 `.vue` 文件引用不受影响。

本文档新增的 token 使用现有命名风格（短名、无 `--color-` 前缀）追加到 `variables.css` 末尾。

### 2.2 已知命名冲突处理

| 冲突项 | 现有值 | 文档 v1.0 错误值 | 正确处理 |
|--------|--------|-----------------|---------|
| `--text-primary` | `#fff`（白色） | `#695E59`（深棕） | 保留现有，深棕改用 `--text-dark` |
| `--shadow-neu` | 暖棕双向投影 | 冷灰双向投影 | 保留现有暖色值 |
| `--locked-bg` | `rgba(0,0,0,0.25)` | `#A3E4EB` | 见 §3.3 讨论 |

### 2.3 新增 token 的命名约定

```
--{模块}-{属性}-{变体}
示例：--ach-card-active、--rarity-sr、--vn-overlay-bg
```

---

## 3 配色系统

### 3.1 主色板（Warm Palette）

对齐现有 `variables.css` 的短名风格：

| 现有 Token | HEX | 用途 |
|-----------|-----|------|
| `--cream` | `#FFDFC8` | 面板背景、Sheet 主背景 |
| `--cream-light` | `#FFCCAC` | 棋盘外框、输入框背景 |
| `--peach-light` | `#E9C3A8` | 棋盘奇数格、边框高亮 |
| `--caramel` | `#DDAA8B` | 棋盘偶数格、标签背景 |
| `--caramel-dark` | `#A88664` | 棋盘外框底层阴影盒 |
| `--info-bar-bg` | `#968173` | 卡片激活背景、底部信息栏 |
| `--caramel-mid` | `#BC9E8C` | 信息栏左侧色块 |
| `--off-white` | `#FAF5F8` | Neumorphism 按钮背景 |
| `--text-dark` | `#695E59` | 浅色背景上的深色文字 ⚠️新增 |
| `--text-gold` | `#DDAA8B` | 标题、数值显示 |

> ⚠️ **`--text-primary` 仍然是 `#fff`**，用于深色背景（棋盘卡片、信息栏）上的白色文字。新增 `--text-dark: #695E59` 用于浅色背景上的深棕文字。

### 3.2 状态色（Semantic Colors）

| Token | HEX | 用途 |
|-------|-----|------|
| `--color-success` | `#5BAD7D` | 订单完成勾、加号按钮 |
| `--primary-pink` | `#F35683` | HP 进度条、通知徽章 |
| `--pink-soft` | `#FFA1C9` | 订单物品槽边框 |
| `--accent-purple` | `#A38CCC` | NPC 名牌、标签 pill |
| `--purple-text` | `#E3DAFF` | 紫标签内文字 |
| `--order-slot-bg` | `#433131` | 订单物品槽背景 |
| `--progress-partial` | `#E0B75D` | 未完成进度圆弧 |
| `--scissor-color` | *(保留现有值)* | 剪刀道具专属色 |

### 3.3 锁定格颜色讨论

**现有**：`--locked-bg: rgba(0,0,0,0.25)` 半透明黑遮罩。

**建议方向**：保留现有值用于运行时，新增一个语义色用于 UI 提示状态（玩家可点击解锁时）：

```css
--locked-cell-overlay: rgba(0, 0, 0, 0.25);      /* 现有，运行时遮罩 */
--locked-cell-unlockable: rgba(180, 150, 120, 0.35); /* 新增，可解锁提示（暖色调） */
```

不使用冰蓝 `#A3E4EB`，与暖色主调冲突。

### 3.4 成就界面专属色

```css
--ach-card-active:   #968173;   /* 可领取/已完成卡片背景 */
--ach-card-inactive: #E4D0C1;   /* 未完成卡片背景 */
--ach-btn-claim:     #C99270;   /* 领取按钮 */
--ach-connector:     #E3CEC0;   /* 卡片间连接线 */
--ach-bottom-bg:     #FFE1CC;   /* 底部信息栏背景 */
--ach-bottom-border: #DDAA8B;   /* 底部信息栏边框 */
```

---

## 4 字体系统

### 4.1 字体族

| 字体 | 用途 |
|------|------|
| `JiangChengYuanTi`（江城圆体） | 游戏主字体，所有中文 UI、数值。Weight：400 / 500 / 600W |
| `Candal Regular` | 排行榜数字专用，装饰感强 |
| `Plus Jakarta Sans Medium` | 英文标签（Daily 等），待统一替换 |

**字体 fallback 完整链：**

```css
font-family: 'JiangChengYuanTi', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
```

### 4.2 字号规范

| 级别 | 规格 | 典型场景 |
|------|------|---------|
| 标题大 | `24px / 600W / --text-gold` | Rank 标题、弹窗主标题 |
| 标题中 | `14px / 600W / --text-primary` | 物品名、状态栏数值 |
| 标题小 | `12px / 600W / white` | 循环计数、Sheet 标题 |
| 正文主 | `12px / 500W / rgba(250,245,248,0.7)` | 信息栏副标题、提示文字 |
| 正文次 | `10px / 500W / white` | 奖励弹出数字 |
| 标签 pill | `10–12px / 500W / --purple-text` | NPC 名牌 |
| 微标签 | `8px / 500W / --color-success` | 倒计时、小状态标签 |
| 奖励小字 | `8px / 400W / white` | 订单奖励弹出（次要） |
| VN 对话 | `14–16px / 400W / white` | VN 阅读模式对话文字 |

---

## 5 圆角与间距

### 5.1 圆角 Token

```css
--radius-full:     32px;   /* 圆形快捷按钮 */
--radius-panel:    12px;   /* Sheet 面板、棋盘内框 */
--radius-card:     10px;   /* 信息栏、成就卡片、生成器框 */
--cell-radius:      4px;   /* 棋盘格子（复用现有 token，值从 6px 更新为 4px） */
--radius-grid:      6px;   /* 棋盘网格容器 */
--radius-tag:       7px;   /* NPC 名牌、状态 pill */
--radius-capsule:  13px;   /* 状态栏胶囊（半圆端） */
--radius-badge:     5px;   /* 订单物品槽、小图标块 */
--radius-popup:     6px;   /* 奖励弹出气泡 */
```

### 5.2 间距节奏

基础单位 `4px`，所有间距为 4 的倍数。

| 场景 | 值 |
|------|----|
| 棋盘格间隙 | `1px` |
| 订单物品槽横向间隙 | `3px` |
| 快捷按钮组纵向间隙 | `5px` |
| 棋盘面板内边距 | `15px`（左右）× `8px`（上下） |
| Sheet 内容区水平内边距 | `16px` |
| 成就卡片内边距 | `8–12px` |

---

## 6 阴影系统

> ⚠️ **所有阴影必须保持暖色调**。现有 `--shadow-neu-up/down` 使用 `rgba(160,120,80,0.25)` 暖棕色，保持不变。禁止引入冷灰（`rgba(170,170,204,...)`）。

### 6.1 阴影 Token

```css
/* 保留现有命名，值按 v1.1 更新（更小更柔、亮面偏暖黄） */
--shadow-neu-up:    -3px -3px 6px rgba(255,235,210,0.8),  3px  3px 6px rgba(160,120,80,0.25);
--shadow-neu-down:   3px  3px 6px rgba(255,235,210,0.8), -3px -3px 6px rgba(160,120,80,0.25);

/* 以下为新增/对齐 token */
--shadow-red:        0px 1px 3.7px #60190F;                   /* 卡片底部、激活按钮 */
--shadow-panel:      0 0 5.8px rgba(0,0,0,0.7);               /* Sheet 面板外框 */
--shadow-overlay:    0px 3px 3.7px rgba(0,0,0,0.6);           /* 棋盘浮层 */
--shadow-popup:      0px 4px 5.1px rgba(0,0,0,0.81);          /* 奖励弹出气泡 */
--shadow-board-outer:0px 4px 4px rgba(0,0,0,0.41);            /* 棋盘外框盒 */
--shadow-status-pill:0px 4px 4px rgba(0,0,0,0.25);            /* 状态栏胶囊 */
```

### 6.2 使用映射

| 场景 | Token |
|------|-------|
| 圆形浮动快捷按钮 | `--shadow-neu-up` + `--shadow-neu-down` |
| 激活卡片、领取按钮 | `--shadow-red` |
| Sheet 面板外框 | `--shadow-panel` |
| 角色订单浮层 | `--shadow-overlay` |
| 奖励弹出气泡 | `--shadow-popup` |
| 棋盘底壳 | `--shadow-board-outer` |
| 状态栏胶囊 | `--shadow-status-pill` |

---

## 7 图层体系

现有代码无统一 z-index 管理，建议以下规范落地：

```css
--z-bg:        0;     /* 游戏背景、渐变叠层 */
--z-character: 10;    /* NPC / 玩家立绘 */
--z-board:     20;    /* 棋盘外框 + 内格 */
--z-items:     30;    /* 棋盘物品、生成器 */
--z-hud:       40;    /* 订单浮层、角色浮窗（backdrop-blur） */
--z-fixed:     50;    /* 顶部状态栏、底部信息栏、左右快捷按钮 */
--z-sheet:    100;    /* BaseBottomSheet 及所有弹窗 */
--z-toast:    200;    /* Toast 提示、全局通知 */
--z-modal:    300;    /* 确认弹窗、付费弹窗（最顶层） */
```

**规则：**
- `position: fixed` 禁止在 Sheet 内部使用（会破坏 `transform` 上下文），改用 `Teleport to="#game-container"` + `position: absolute`。
- Sheet 内部的浮层（如 Gacha 动画）用局部 z-index（1/2/3），不影响全局层级。

---

## 8 响应式适配

### 8.1 使用现有 `--figma-scale` 方案

**保留并扩展现有的 `--figma-scale` + `cqw` 方案**，不使用 `100vw`（桌面端有滚动条会溢出）。

```css
/* 现有方案（保持不变） */
container-type: inline-size;   /* 在 #game-container 上声明 */

/* 棋盘格子尺寸：使用 cqw 而非 vw */
--cell-size: clamp(44px, calc((100cqw - 44px) / 7), 56px);
```

### 8.2 字号适配

```css
/* 使用 clamp，单位用 cqw */
--font-title-lg:  clamp(20px, 6cqw, 24px);
--font-title-md:  clamp(12px, 3.5cqw, 14px);
--font-body:      clamp(10px, 2.8cqw, 12px);
--font-label:     clamp(8px,  2cqw,  10px);
```

### 8.3 游戏容器声明

```css
#game-container {
  container-type: inline-size;
  container-name: game;
  width: 100%;
  max-width: 430px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}
```

---

## 9 核心组件规范

### 9.1 圆形快捷按钮（FloatButton）

**尺寸**：32×32px（主要）/ 16px（加号微型）/ 24px（状态圆钮）

#### 变体 A — Neumorphism（默认）
用于：左右侧快捷按钮、Sheet 返回/问号按钮

```css
background:    var(--off-white);
border-radius: var(--radius-full);
box-shadow:    var(--shadow-neu-up), var(--shadow-neu-down);
overflow:      hidden;
```

图标尺寸：16px（小）/ 24px（标准）

#### 变体 B — 成功绿（Accent）
用于：完成勾、加号按钮

```css
background:    var(--color-success);
border:        1px solid var(--off-white);
border-radius: var(--radius-full);
```

#### 变体 C — 暖棕（Warm）
用于：成就奖杯按钮（激活状态）

```css
background:    var(--ach-btn-claim);   /* #C99270 */
box-shadow:    var(--shadow-red);
```

---

### 9.2 资源状态胶囊（ResourceCapsule）

顶部状态栏的体力值 / 钻石数量展示单元。

```
[圆形图标按钮 32px] → [胶囊背景延伸 60px 宽]
                              ↕
                       [倒计时小牌，悬在底部]
```

```css
/* 胶囊背景 */
background:    var(--off-white);
height:        25px;
border-radius: 0 var(--radius-capsule) var(--radius-capsule) 0;
box-shadow:    var(--shadow-status-pill);

/* 数值文字 */
font-size:   14px;
font-weight: 600W;
color:       var(--text-gold);

/* 倒计时小牌 */
border-radius: 5px 5px 12px 12px;
font-size:     8px;
color:         var(--color-success);
```

---

### 9.3 NPC 名牌（NPCTag）

```css
background:    var(--accent-purple);
border-radius: var(--radius-tag);
padding:       6px 8px;
font-size:     12px;
font-weight:   500W;
color:         var(--purple-text);
```

---

### 9.4 订单浮层（OrderOverlay）

叠加在角色立绘下方，显示 Boss 或每日订单所需物品。

```css
backdrop-filter: blur(3.65px);
background:      rgba(0, 0, 0, 0.41);
border:          1px solid #FCEFFF;
border-radius:   var(--radius-popup);
box-shadow:      var(--shadow-overlay);
```

| 类型 | 尺寸 | 物品槽大小 |
|------|------|---------|
| Boss 订单 | 143×55px | 主槽 28px，次槽 28px |
| 每日订单 | 92×44px | 统一 20px，gap 3px |

```css
/* 主槽（Boss 订单第一格） */
background:    var(--pink-soft);
border:        1px solid var(--off-white);
border-radius: var(--radius-badge);

/* 次槽 */
background:    var(--order-slot-bg);
border:        1px solid var(--pink-soft);
border-radius: var(--radius-badge);
```

---

### 9.5 棋盘系统（Board）

#### 外框三层结构

```
┌─────────────────────────────────────┐  ← 底壳（--caramel-dark，阴影）
│  ┌───────────────────────────────┐  │  ← 面板（--cream-light，边框）
│  │  ┌─────────────────────────┐  │  │  ← 网格（--caramel，flex-wrap）
│  │  │  格子 × 63              │  │  │
```

```css
/* 底壳 */
background:    var(--caramel-dark);
border-radius: 0 0 20px 20px;
box-shadow:    var(--shadow-board-outer);

/* 面板 */
background:    var(--cream-light);
border:        2px solid #FEDAB2;
border-radius: var(--radius-panel);
padding:       8px 15px;

/* 网格容器 */
background:    var(--caramel);
border:        2px solid #E3B084;
border-radius: var(--radius-grid);
display:       flex;
flex-wrap:     wrap;
gap:           1px;
```

#### 格子状态

```css
/* 基础 */
width:         var(--cell-size);
height:        var(--cell-size);
border-radius: var(--cell-radius);
border:        2px solid transparent;

/* 奇数格 */
background: var(--peach-light);

/* 偶数格 */
background: var(--caramel);

/* 锁定格（运行时遮罩） */
background:   var(--peach-light);   /* 保持底色 */
::after {
  background: var(--locked-cell-overlay);   /* rgba(0,0,0,0.25) */
}

/* 可解锁格（待解锁提示） */
::after {
  background: var(--locked-cell-unlockable);   /* 暖色半透明 */
}

/* 选中格 */
border:    2px solid white;
transform: scale(1.05);

/* 拖拽目标 */
border:     2px solid var(--color-success);
box-shadow: 0 0 8px rgba(91,173,125,0.5);
```

---

### 9.6 生成器物品框（GeneratorCell）

悬浮在棋盘左上角边缘，视觉上「溢出」棋盘面板。

```css
background:    var(--cream);
border:        4px solid var(--peach-light);
border-radius: var(--radius-card);
filter:        drop-shadow(0px 1px 1.85px #60190F);
width:         var(--cell-size);
height:        var(--cell-size);
```

---

### 9.7 物品信息栏（ItemInfoBar）

```css
/* 主体 */
background:    var(--info-bar-bg);
border-radius: var(--radius-card);
box-shadow:    var(--shadow-red);
width:         250px;
height:        69px;

/* 左侧色块 */
background:    var(--caramel-mid);
border-radius: var(--radius-card) 0 0 var(--radius-card);
width:         17px;
```

内容布局：

```
[左色块 17px] [物品名 lv.N ←→ 卖出]
              [分隔线 1px]
              [提示文字（副标题色）]
```

---

### 9.8 BaseBottomSheet（底部弹窗基类）

支持 `theme="default" | "warm"` 两种主题，通过 prop 控制，不使用 `:deep()` 覆盖。

#### `theme="warm"` 样式

```css
/* 面板 */
background:    var(--cream);
border:        3px solid white;
border-radius: var(--radius-panel);
box-shadow:    var(--shadow-panel);

/* 返回/问号按钮 */
background:    var(--off-white);
border-radius: var(--radius-full);
box-shadow:    var(--shadow-neu-up), var(--shadow-neu-down);
color:         var(--text-dark);

/* 标题胶囊 */
background:    #F5F5FA;
border-radius: var(--radius-capsule);
filter:        drop-shadow(0px 4px 2px rgba(0,0,0,0.25));
color:         var(--text-gold);
font-weight:   600W;
```

---

### 9.9 成就卡片（AchievementCard）

高度 50px，宽度 100%。接收 `status: 'active' | 'claimed' | 'locked'` 和 `progress: number`。

| 状态 | 背景 | 文字 | 按钮 |
|------|------|------|------|
| `active` | `--ach-card-active` `#968173` | `--text-primary` white | `--ach-btn-claim` `#C99270`，文字「领取」 |
| `claimed` | `--ach-card-active` `#968173` | 同上 | `--ach-card-active`，文字「已领取」 |
| `locked` | `--ach-card-inactive` `#E4D0C1` | `--text-dark` `#695E59` | `--ach-card-active`，文字「未完成」 |

```css
border-radius: var(--radius-card);
box-shadow:    var(--shadow-red);
```

**进度圆弧（locked 状态）：**

```html
<svg width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="9" fill="none"
    stroke="var(--ach-card-inactive)" stroke-width="2.5"/>
  <circle cx="12" cy="12" r="9" fill="none"
    stroke="var(--progress-partial)"  stroke-width="2.5"
    stroke-dasharray="56.55"
    :stroke-dashoffset="56.55 * (1 - progress / 100)"
    stroke-linecap="round"
    transform="rotate(-90 12 12)"/>
</svg>
```

**卡片间连接线：**

```css
width:      2px;
height:     12px;
background: var(--ach-connector);
margin:     0 auto;
```

---

### 9.10 奖励弹出气泡（RewardPopup）

```css
background:    rgba(0, 0, 0, 0.62);
border-radius: var(--radius-popup);
box-shadow:    var(--shadow-popup);
font-size:     8–10px;
color:         white;
```

动画见 §11。

---

## 10 扩展系统

### 10.1 稀有度系统（Rarity）

```css
--rarity-r:    #7CB9E8;   /* R  — 蓝色（v1.1 升级，原 #4A90D9） */
--rarity-sr:   #C89FD4;   /* SR — 紫色（v1.1 升级，原 #9b59b6） */
--rarity-ssr:  #F5C842;   /* SSR — 金色（v1.1 升级，原 #f1c40f） */

/* 稀有度发光边框 */
--rarity-r-glow:   0 0 8px rgba(124,185,232,0.6);
--rarity-sr-glow:  0 0 8px rgba(200,159,212,0.6);
--rarity-ssr-glow: 0 0 12px rgba(245,200,66,0.8);
```

使用规则：
- 物品卡片边框颜色和背景光晕根据 `item.rarity` 读取对应 token。
- SSR 额外添加 shimmer 动画（CSS `@keyframes` 渐变扫光，duration 2s，loop）。
- 背包/图鉴列表中，稀有度角标放置在物品格右上角，8×8px 圆点或小菱形。

### 10.2 Gacha 抽卡系统

```css
--gacha-bg:          #1A0E2E;   /* 抽卡界面深紫底色 */
--gacha-card-flip:   0.6s;      /* 翻牌动画时长 */
--gacha-result-glow: 0 0 20px rgba(245,200,66,0.9);   /* SSR 结果光晕 */
```

**抽卡界面分层（局部 z-index）：**

```
z:1  背景粒子（canvas）
z:2  卡牌组
z:3  单卡翻转动画层
z:4  结果展示文字
z:5  关闭按钮
```

**抽卡流程动效节奏：**

1. 点击抽卡按钮 → 按钮 scale 0.95，200ms
2. 黑色幕布淡入，300ms
3. 卡牌从下方飞入（translateY 100% → 0），400ms，错开 50ms stagger
4. 点击卡牌 → 3D 翻转（`rotateY 0 → 180deg`），`--gacha-card-flip`
5. 背面亮色展示，稀有度决定光晕颜色
6. 全部翻开后，「确认」按钮淡入

### 10.3 VN / CG 阅读系统

> ⚠️ VN 相关 token 保留现有值，不做修改。

```css
/* 保留现有（不覆盖） */
--vn-accent:       #7B68EE;
--vn-accent-light: #9B88FF;
--vn-pink:         #FF6B9D;
--vn-pink-light:   #FF8E9E;

/* 新增 */
--vn-overlay-bg:    rgba(0, 0, 0, 0.55);   /* 对话框底部遮罩 */
--vn-text-box-bg:   rgba(20, 10, 5, 0.75); /* 文字框背景 */
--vn-choice-bg:     rgba(90, 60, 40, 0.8); /* 选项按钮背景 */
--vn-choice-hover:  rgba(140, 100, 70, 0.9);

/* CG 图鉴 */
--cg-locked-overlay: rgba(0, 0, 0, 0.6);   /* 未解锁 CG 遮罩 */
--cg-locked-blur:    8px;                   /* 未解锁模糊值 */
```

**VN 模式 z-index（基于 `--z-sheet: 100`）：**

```
100  背景 CG 图
101  角色立绘
102  对话遮罩层
103  文字框 + 人名框
104  选项按钮
105  自动/跳过按钮
```

---

## 11 动效规范

### 11.1 时长 Token

对齐现有 `--transition-fast` / `--transition-med`，新增 `--transition-slow`：

```css
--transition-fast:   100ms;   /* 按钮点击反馈 */
--transition-med:    200ms;   /* 状态切换、数值跳动 */
--transition-slow:   300ms;   /* Sheet 进出（新增） */
--transition-sheet-out: 220ms;   /* Sheet 退出（略快于进入） */
```

### 11.2 动效清单

| 场景 | 参数 |
|------|------|
| 按钮点击 | `scale(0.95)`，`--transition-fast`，`ease-in-out` |
| 合成成功 | 新物品 `scale(0 → 1.15 → 1)`，`250ms`，`cubic-bezier(0.34,1.56,0.64,1)` |
| 订单完成 | 勾图标 `scale(0 → 1)`，绿圈扩散，`300ms` |
| Sheet 进入 | `translateY(100% → 0)`，`--transition-slow`，`ease-out` |
| Sheet 退出 | `translateY(0 → 100%)`，`--transition-sheet-out`，`ease-in` |
| 奖励弹出 | `opacity 0→1→0` + `translateY +20→0→-10`，总 `1800ms` |
| 数值跳动 | `scale(1 → 1.2 → 1)`，`--transition-med` |
| 棋盘满格 Toast | 从顶部 slide-in，`--transition-med` |
| SSR 扫光 | CSS `@keyframes shimmer`，`2s linear infinite` |
| VN 对话进入 | `opacity 0→1` + `translateY 8px→0`，`250ms` |

### 11.3 合成粒子

- 仅在合成成功瞬间触发，Canvas 实现，持续 ≤ 500ms。
- 粒子颜色使用当前合成物品的主色。
- 低端设备（通过 `navigator.hardwareConcurrency <= 4` 检测）关闭粒子，保持 `scale` 动画。

---

## 12 variables.css 完整清单

以下为追加到现有 `variables.css` 末尾的完整新增内容。**现有变量不做改动（除 §6.1 阴影值更新和 §5.1 cell-radius 值更新外）。**

### 12.1 现有变量值更新

```css
/* 值更新（不改变 token 名） */
--cell-radius: 4px;    /* 原 6px，对齐 GridCell.vue 实际使用 */
--shadow-neu-up:  -3px -3px 6px rgba(255,235,210,0.8),  3px  3px 6px rgba(160,120,80,0.25);
--shadow-neu-down: 3px  3px 6px rgba(255,235,210,0.8), -3px -3px 6px rgba(160,120,80,0.25);
--rarity-r:   #7CB9E8;   /* 原 #4A90D9，色值升级 */
--rarity-sr:  #C89FD4;   /* 原 #9b59b6，色值升级 */
--rarity-ssr: #F5C842;   /* 原 #f1c40f，色值升级 */
```

### 12.2 新增变量

```css
:root {
  /* ─── 语义文字色（补充，不覆盖现有） ─── */
  --text-dark:   #695E59;   /* 浅色背景上的深棕文字 */
  --text-gold:   #DDAA8B;   /* 标题、数值显示 */

  /* ─── 状态色补充 ─── */
  --pink-soft:          #FFA1C9;
  --purple-text:        #E3DAFF;
  --order-slot-bg:      #433131;
  --progress-partial:   #E0B75D;
  --locked-cell-overlay:     rgba(0, 0, 0, 0.25);
  --locked-cell-unlockable:  rgba(180, 150, 120, 0.35);

  /* ─── 阴影补充 ─── */
  --shadow-red:          0px 1px 3.7px #60190F;
  --shadow-panel:        0 0 5.8px rgba(0, 0, 0, 0.7);
  --shadow-overlay:      0px 3px 3.7px rgba(0, 0, 0, 0.6);
  --shadow-popup:        0px 4px 5.1px rgba(0, 0, 0, 0.81);
  --shadow-board-outer:  0px 4px 4px rgba(0, 0, 0, 0.41);
  --shadow-status-pill:  0px 4px 4px rgba(0, 0, 0, 0.25);

  /* ─── 圆角（补充） ─── */
  --radius-full:      32px;
  --radius-panel:     12px;
  --radius-card:      10px;
  --radius-grid:      6px;
  --radius-tag:        7px;
  --radius-capsule:   13px;
  --radius-badge:      5px;
  --radius-popup:      6px;

  /* ─── 动效时长 ─── */
  --transition-slow:      300ms;
  --transition-sheet-out: 220ms;

  /* ─── Z-Index ─── */
  --z-bg:         0;
  --z-character: 10;
  --z-board:     20;
  --z-items:     30;
  --z-hud:       40;
  --z-fixed:     50;
  --z-sheet:    100;
  --z-toast:    200;
  --z-modal:    300;

  /* ─── 响应式 ─── */
  --cell-size: clamp(44px, calc((100cqw - 44px) / 7), 56px);
  --font-title-lg:  clamp(20px, 6cqw, 24px);
  --font-title-md:  clamp(12px, 3.5cqw, 14px);
  --font-body:      clamp(10px, 2.8cqw, 12px);
  --font-label:     clamp(8px,  2cqw,  10px);

  /* ─── 成就界面（已存在，不追加） ─── */
  /* --ach-card-active, --ach-card-inactive, --ach-btn-claim, */
  /* --ach-connector, --ach-bottom-bg, --ach-bottom-border 已在 variables.css 中 */

  /* ─── Rarity 发光（新增） ─── */
  --rarity-r-glow:   0 0 8px rgba(124, 185, 232, 0.6);
  --rarity-sr-glow:  0 0 8px rgba(200, 159, 212, 0.6);
  --rarity-ssr-glow: 0 0 12px rgba(245, 200, 66, 0.8);

  /* ─── Gacha ─── */
  --gacha-bg:          #1A0E2E;
  --gacha-card-flip:   0.6s;
  --gacha-result-glow: 0 0 20px rgba(245, 200, 66, 0.9);

  /* ─── VN / CG（保留现有 vn-accent/vn-pink，仅新增以下） ─── */
  --vn-overlay-bg:     rgba(0, 0, 0, 0.55);
  --vn-text-box-bg:    rgba(20, 10, 5, 0.75);
  --vn-choice-bg:      rgba(90, 60, 40, 0.8);
  --vn-choice-hover:   rgba(140, 100, 70, 0.9);
  --cg-locked-overlay: rgba(0, 0, 0, 0.6);
  --cg-locked-blur:    8px;
}
```

---

## 13 开发使用规则

1. **Token 优先**：颜色、阴影、圆角、z-index、动效时长必须使用 CSS 变量。组件 `<style scoped>` 内禁止硬编码 hex 值（一次性小图标色等极端情况除外）。

2. **阴影暖色原则**：所有新增阴影颜色必须在暖色域内（棕/金/橙）。冷灰阴影（`rgba(170,170,204,...)`）在本项目中禁用。

3. **不修改现有 token**：追加，不覆盖。如需调整现有值，先在 Slack/PR 中标注影响范围。

4. **BaseBottomSheet 新界面**：使用 `theme="warm"` prop，不允许 `:deep()` 覆盖 `.bottom-sheet` 样式。

5. **响应式单位**：棋盘/格子相关尺寸使用 `--cell-size` 和 `cqw`，不使用 `vw`。字号使用 `--font-*` token 或 `clamp()`。

6. **`position: fixed` 禁区**：Sheet 及其子组件内部禁止使用，改用 `Teleport to="#game-container"` + `position: absolute`。

7. **图片资源**：Figma 临时 URL（`figma.com/api/mcp/asset/...`）有效期 7 天，不可用于生产，必须下载到 `src/assets/` 目录后引用。

8. **字体 fallback**：使用完整链 `'JiangChengYuanTi', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif`。

9. **动效时长上限**：按钮反馈 ≤ 150ms，面板进出 200–300ms，奖励弹出 ≤ 2000ms，超出会让玩家感觉卡顿。

10. **低端设备兼容**：合成粒子、SSR 扫光动画必须有降级逻辑（检测 `hardwareConcurrency` 或 `prefers-reduced-motion`）。
