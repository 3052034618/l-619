# 时光沙漏 - 多人在线魔法世界冒险系统

## 项目简介

一个基于时间沙漏与时光回溯主题的多人在线冒险游戏系统，包含沙漏合成、时光副本、时空对决、交易市场、公会系统、数据报告等完整功能模块。

## 技术栈

### 后端
- **Node.js** + **TypeScript** - 服务端运行环境
- **Express** - Web框架
- **Socket.IO** - 实时通信
- **TypeORM** + **PostgreSQL** - 数据库ORM与存储
- **Redis** - 缓存与会话管理
- **Winston** - 日志系统
- **PDFKit** + **Canvas** - 报告生成与图表渲染
- **Bcrypt** + **JWT** - 认证安全

### 前端
- **React 18** + **TypeScript** - UI框架
- **Vite** - 构建工具
- **Zustand** - 状态管理
- **React Router** - 路由管理
- **Socket.IO Client** - 实时通信
- **Recharts** - 数据可视化
- **Framer Motion** - 动画效果
- **TailwindCSS** - 样式框架
- **Lucide React** - 图标库

## 功能特性

### 🕐 沙漏合成系统
- 收集6个年代（远古/中世纪/文艺复兴/近代/未来/神话）的时间碎片
- 工坊合成完整沙漏，支持4槽位排列
- 根据碎片品质、排列顺序、工匠熟练度计算成功率
- 稀有词缀系统：时间停滞、加速流逝、时光回溯、时间膨胀、时光护盾、时空爆发、时间悖论、永恒之境
- 6个品质等级：普通、优秀、稀有、史诗、传说、神话

### 🗺️ 时光副本探险
- 6个时代主题副本，5个难度等级
- 时间流速异常机制（0.5x~3.0x）
- 时光裂缝、历史事件碎片、守时怪物
- 实时更新队伍位置、时间余额、碎片回收进度
- 随机触发：时间风暴、历史修正事件
- 时间涟漪事件影响全服副本刷新率

### ⚔️ 时光联赛
- 按历史战绩和沙漏强度自动匹配对手
- 实时PVP对战，技能与时间场覆盖
- 时空反制系统
- 8个段位：青铜→白银→黄金→铂金→钻石→大师→宗师
- 赛后发放积分和稀有沙漏碎片

### 💰 交易市场
- 沙漏和碎片的自由交易
- 近7天同类成交均价自动建议价格区间
- 成交全服公告
- 大额交易触发"时间涟漪"事件
- 影响当日副本刷新率和稀有事件概率

### 🏰 公会系统
- 创建/加入公会
- 联合时光塔、时空研究厅、仓库、工坊、神殿
- 材料与金币全员贡献
- 提升全体成员沙漏合成成功率和副本收益
- 贡献度与权限管理

### 📊 数据报告与排行榜
- 每周自动生成时光产业报告
- 各时代副本热度热力图
- 合成成功率曲线图
- 交易价格走势图
- 时光能量雷达图
- 支持导出含图表的PDF报告
- 全服排行榜：沙漏收藏度、联赛积分、公会贡献
- 玩家时光工坊布局展示与冒险记录查看

### ⚡ 高并发架构
- 数千玩家同时合成和探索
- Redis缓存热点数据
- 数据库连接池优化
- Socket.IO实时事件推送
- 连接池与消息队列设计

## 项目结构

```
619/
├── server/                          # 后端服务
│   ├── src/
│   │   ├── config/                  # 配置文件
│   │   │   ├── index.ts             # 应用配置
│   │   │   ├── database.ts          # 数据库配置
│   │   │   └── redis.ts             # Redis配置
│   │   ├── entities/                # 数据模型（13个实体）
│   │   │   ├── Player.ts
│   │   │   ├── Sandglass.ts
│   │   │   ├── Fragment.ts
│   │   │   ├── PlayerInventory.ts
│   │   │   ├── Dungeon.ts
│   │   │   ├── DungeonSession.ts
│   │   │   ├── Guild.ts
│   │   │   ├── GuildMember.ts
│   │   │   ├── GuildBuilding.ts
│   │   │   ├── Trade.ts
│   │   │   ├── LeagueMatch.ts
│   │   │   ├── LeagueRank.ts
│   │   │   ├── WeeklyReport.ts
│   │   │   └── Achievement.ts
│   │   ├── services/                # 业务逻辑服务
│   │   │   ├── CraftingService.ts   # 沙漏合成
│   │   │   ├── DungeonManager.ts    # 副本管理
│   │   │   ├── LeagueManager.ts     # 联赛管理
│   │   │   ├── TradeManager.ts      # 交易管理
│   │   │   ├── GuildService.ts      # 公会服务
│   │   │   ├── PlayerService.ts     # 玩家服务
│   │   │   ├── AchievementService.ts
│   │   │   ├── ReportGenerator.ts   # 报告生成
│   │   │   └── EventScheduler.ts    # 定时任务
│   │   ├── routes/                  # API路由
│   │   │   ├── players.ts
│   │   │   ├── crafting.ts
│   │   │   ├── dungeons.ts
│   │   │   ├── league.ts
│   │   │   ├── trades.ts
│   │   │   ├── guilds.ts
│   │   │   ├── achievements.ts
│   │   │   ├── reports.ts
│   │   │   └── index.ts
│   │   ├── socket/                  # Socket.IO处理
│   │   │   └── index.ts
│   │   ├── middleware/              # 中间件
│   │   │   └── auth.ts
│   │   ├── types/                   # TypeScript类型
│   │   │   └── index.ts
│   │   ├── utils/                   # 工具函数
│   │   │   ├── index.ts
│   │   │   └── logger.ts
│   │   └── index.ts                 # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── client/                          # 前端应用
│   ├── src/
│   │   ├── pages/                   # 页面组件
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Workshop.tsx
│   │   │   ├── DungeonList.tsx
│   │   │   ├── DungeonSession.tsx
│   │   │   ├── League.tsx
│   │   │   ├── Trade.tsx
│   │   │   ├── Guild.tsx
│   │   │   ├── Achievements.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   └── PlayerProfile.tsx
│   │   ├── components/              # 公共组件
│   │   │   └── Layout.tsx
│   │   ├── store/                   # 状态管理
│   │   │   ├── authStore.ts
│   │   │   └── socketStore.ts
│   │   ├── services/                # API服务
│   │   │   └── api.ts
│   │   ├── utils/                   # 工具函数
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── package.json                     # Monorepo根配置
├── .env.example
└── .gitignore
```

## 快速开始

### 环境要求
- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 7

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 配置数据库和Redis连接
```

### 3. 启动数据库
确保 PostgreSQL 和 Redis 服务已启动，并创建数据库：
```sql
CREATE DATABASE time_sandglass;
```

### 4. 启动开发服务器
```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:server    # 后端 http://localhost:3001
npm run dev:client    # 前端 http://localhost:5173
```

### 5. 构建生产版本
```bash
npm run build
npm start
```

## API文档

### 认证
- `POST /api/players/register` - 注册
- `POST /api/players/login` - 登录
- `POST /api/players/logout` - 登出
- `GET /api/players/me` - 获取当前用户信息

### 沙漏合成
- `POST /api/crafting/craft` - 合成沙漏
- `GET /api/crafting/history` - 合成历史
- `GET /api/crafting/stats` - 合成统计

### 时光副本
- `GET /api/dungeons` - 获取副本列表
- `POST /api/dungeons/session` - 创建副本会话
- `POST /api/dungeons/session/:id/start` - 开始副本
- `POST /api/dungeons/session/:id/abandon` - 放弃副本
- `POST /api/dungeons/session/:id/fragment` - 收集碎片

### 时光联赛
- `POST /api/league/queue/join` - 加入匹配队列
- `POST /api/league/queue/leave` - 离开队列
- `POST /api/league/match/:id/skill` - 使用技能
- `POST /api/league/match/:id/counter` - 时空反制
- `GET /api/league/leaderboard` - 排行榜

### 交易市场
- `GET /api/trades` - 获取交易列表
- `POST /api/trades/list` - 上架物品
- `POST /api/trades/:id/cancel` - 取消上架
- `POST /api/trades/:id/buy` - 购买物品
- `GET /api/trades/price-trend` - 价格走势

### 公会系统
- `GET /api/guilds` - 获取公会列表
- `POST /api/guilds/create` - 创建公会
- `GET /api/guilds/:id` - 获取公会详情
- `POST /api/guilds/:id/join` - 加入公会
- `POST /api/guilds/leave` - 离开公会
- `POST /api/guilds/contribute` - 贡献资源
- `POST /api/guilds/building/:id/upgrade` - 升级建筑

## Socket.IO事件

### 副本相关
- `dungeon:join` / `dungeon:leave` - 加入/离开副本房间
- `dungeon:position` - 更新玩家位置
- `dungeon:state` - 实时副本状态
- `dungeon:fragment_collected` - 碎片收集通知
- `dungeon:dungeon_event` - 副本事件（时间风暴等）
- `dungeon:session_ended` - 副本结束
- `dungeon:time_ripple` - 全服时间涟漪事件

### 联赛相关
- `match:join` / `match:leave` - 加入/离开对战房间
- `league:match_found` - 找到对手
- `league:state` - 实时对战状态
- `league:skill_used` - 技能使用
- `league:counter_activated` - 反制激活
- `league:match_result` - 比赛结果

### 全局
- `chat:message` - 聊天消息
- `trade:announcement` - 交易公告

## 数据模型概览

| 实体 | 说明 | 关键字段 |
|------|------|---------|
| Player | 玩家 | level, exp, gold, gems, craftMastery, collectionScore, leaguePoints |
| Fragment | 碎片 | era, quality, slotPosition, temporalEnergy, attributes |
| Sandglass | 沙漏 | rarity, temporalControl, specialEffectChance, affixes[], collectionValue |
| Dungeon | 副本模板 | era, difficulty, timeFlowRate, rewards, timeRifts[] |
| DungeonSession | 副本会话 | playerPositions[], timeBalance, fragmentProgress, events[] |
| Guild | 公会 | level, exp, craftBonus, dungeonBonus, members[] |
| GuildBuilding | 公会建筑 | type, level, bonuses{} |
| Trade | 交易 | itemType, price, avg7dPrice, timeRippleStrength |
| LeagueMatch | 联赛对局 | player1/2, status, eventLog[] |
| LeagueRank | 联赛段位 | tier, points, winStreak |
| WeeklyReport | 周报 | heatmap, priceTrends, temporalRadar |
| Achievement | 成就 | type, targetValue, rewards{} |

## 许可证

MIT
