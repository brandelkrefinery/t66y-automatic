<div align="center">

# t66y-automatic

### 草榴社区 t66y(1024)自动化工具 —— 自动签到 · 自动回帖 · 新帖监控 · 消息推送

[![npm version](https://img.shields.io/npm/v/t66y-automatic?color=brightgreen&label=npm)](https://github.com/brandelkrefinery/t66y-automatic)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/brandelkrefinery/t66y-automatic/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)](https://github.com/brandelkrefinery/t66y-automatic)
[![GitHub stars](https://img.shields.io/github/stars/brandelkrefinery/t66y-automatic?style=social)](https://github.com/brandelkrefinery/t66y-automatic/stargazers)

**一条命令安装,每天自动签到、自动回帖,新帖秒级推送到手机。**

[快速开始](#-快速开始) · [功能特性](#-功能特性) · [配置说明](#%EF%B8%8F-配置说明) · [开发者指南](#-开发者指南) · [常见问题](#-常见问题)

</div>

---

**t66y-automatic** 是为草榴社区(t66y、1024、CL 社区、小草)打造的开源自动化工具,基于 Node.js 构建。它帮你自动完成每日签到领取奖励、按论坛规则自动回帖完成新手上路任务、7×24 小时监控版块新帖并通过 Telegram / Bark / Server 酱即时推送到你的手机。支持多账号、代理、定时任务,零数据库依赖,一条 npm 命令即可安装运行。

> 新手上路回帖间隔 1024 秒、每天最多 10 帖、回够 1000 帖才能上岛?交给 t66y-automatic,挂着就行。

---

## ✨ 功能特性

| 功能 | 说明 |
| --- | --- |
| 📅 **自动签到** | 每日定时自动签到,领取金钱与贡献,结果推送到手机,断签不存在 |
| 💬 **自动回帖** | 新手上路任务辅助:严格遵守 1024 秒回复间隔与每日 10 帖上限,自动跳过签到帖/专用帖,安全不违规 |
| 👀 **新帖监控** | 轮询指定版块,新帖出现即刻推送,支持关键词过滤,好资源不再错过 |
| 🔔 **消息推送** | 内置 Telegram Bot、Bark(iOS)、Server 酱(微信)三大推送渠道,可同时开启 |
| 👥 **多账号支持** | 一个配置文件管理多个账号,签到回帖批量执行 |
| 🌐 **代理支持** | 内置 HTTP/SOCKS 代理,网络环境复杂也能稳定运行 |
| ⏰ **定时任务** | 内置 cron 调度器,长驻运行全自动;也可配合 crontab / pm2 / launchd |
| 🪶 **零依赖负担** | 仅 3 个生产依赖,无数据库,状态落盘本地 JSON,绿色便携 |
| 🔌 **可编程 API** | 每个功能都是独立模块,可作为库集成到你自己的 Node.js 项目 |

---

## 🚀 快速开始

### macOS 一键安装(三步,复制粘贴即可)

```bash
# 1. 安装 Xcode 命令行工具(如已安装会提示,忽略即可)
xcode-select --install

# 2. 安装 Node.js —— 前往 https://nodejs.org/en/download 下载,或使用 nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash && nvm install --lts

# 3. 一条命令安装 t66y-automatic
mkdir -p 't66y' && cd 't66y' && npm install github:brandelkrefinery/t66y-automatic
```

### Linux / Windows

任何装有 **Node.js ≥ 18** 的环境都可以:

```bash
mkdir t66y && cd t66y
npm install github:brandelkrefinery/t66y-automatic
```

### 初始化配置

```bash
npx t66y init        # 生成 t66y.config.json 配置模板
```

编辑 `t66y.config.json`,把你的论坛 Cookie 填进去(获取方法见[配置说明](#%EF%B8%8F-配置说明)),然后:

```bash
npx t66y checkin     # 立即签到一次,验证配置是否正确
npx t66y run         # 启动定时调度器,从此全自动
```

> 💡 用 `npm install -g github:brandelkrefinery/t66y-automatic` 全局安装后,可直接使用 `t66y` 命令,无需 `npx`。

---

## ⚙️ 配置说明

运行 `npx t66y init` 生成 `t66y.config.json`,完整字段如下:

```jsonc
{
  "baseUrl": "https://t66y.com",        // 论坛地址,域名变动时改这里
  "proxy": "",                          // 代理,如 "http://127.0.0.1:7890",留空直连
  "accounts": [                         // 多账号数组,可加任意多个
    { "name": "账号1", "cookie": "你的 Cookie" }
  ],
  "checkin": {
    "cron": "30 8 * * *"                // 每天 08:30 自动签到
  },
  "reply": {
    "boardFid": 8,                      // 回帖版块 ID(新手上路)
    "maxPerDay": 10,                    // 每日回帖上限(论坛规则就是 10)
    "intervalSeconds": 1024,            // 回复间隔(论坛规则就是 1024 秒)
    "cron": "0 9 * * *",                // 每天 09:00 开始回帖任务
    "messages": [                       // 随机回帖语料库,可自行扩充
      "感谢楼主分享,好人一生平安",
      "1024,好人一生平安"
    ]
  },
  "monitor": {
    "boardFid": 8,                      // 监控的版块 ID
    "intervalSeconds": 300,             // 每 5 分钟检查一次
    "keywords": []                      // 关键词过滤,如 ["合集","4K"],留空推送全部新帖
  },
  "notify": {
    "telegram": { "botToken": "", "chatId": "" },   // Telegram Bot 推送
    "bark": { "key": "", "server": "https://api.day.app" },  // Bark(iOS)推送
    "serverchan": { "sendKey": "" }                  // Server 酱(微信)推送
  }
}
```

### 🍪 如何获取 Cookie?

1. 用 Chrome / Edge 打开论坛并**登录**;
2. 按 `F12` 打开开发者工具 → **Network(网络)** 标签;
3. 刷新页面,点击第一个请求(通常是 `index.php`);
4. 在 **Headers → Request Headers** 中找到 `Cookie:` 一行,**整行复制**;
5. 粘贴到配置文件的 `cookie` 字段。

> ⚠️ Cookie 等同账号密码,**切勿提交到 Git 或分享给他人**。`t66y.config.json` 已内置在 `.gitignore` 中。

### 🔔 推送渠道配置

| 渠道 | 获取方式 |
| --- | --- |
| **Telegram** | 找 [@BotFather](https://t.me/BotFather) 创建 Bot 拿 `botToken`;找 [@userinfobot](https://t.me/userinfobot) 拿 `chatId` |
| **Bark** | App Store 安装 Bark,打开 App 复制 URL 中的 key |
| **Server 酱** | 登录 [sct.ftqq.com](https://sct.ftqq.com) 获取 SendKey,微信扫码绑定 |

三个渠道可同时配置,留空的自动跳过。

---

## 📖 命令一览

```bash
t66y init        # 生成配置文件模板
t66y checkin     # 立即为所有账号签到一次
t66y reply       # 立即执行一轮回帖任务(自动遵守 1024 秒间隔)
t66y monitor     # 启动新帖监控(长驻进程)
t66y run         # 启动定时调度器:签到 + 回帖全自动(长驻进程)
t66y help        # 显示帮助

# 指定配置文件
t66y run --config ~/configs/my-t66y.json
```

### 后台常驻运行(可选)

```bash
# 方式一:pm2(推荐)
npm install -g pm2
pm2 start "npx t66y run" --name t66y
pm2 save && pm2 startup

# 方式二:macOS launchd / Linux crontab,每天定时触发单次任务
30 8 * * *  cd ~/t66y && npx t66y checkin >> t66y.log 2>&1
```

---

## ❓ 常见问题

**Q: 提示"Cookie 已失效或未登录"?**
Cookie 有有效期,重新按上面的步骤获取一次即可。建议顺手在浏览器里勾选"保持登录"。

**Q: 论坛域名变了打不开?**
修改配置里的 `baseUrl` 为最新地址即可,无需更新程序。

**Q: 回帖会被封号吗?**
本工具**严格遵守**论坛的 1024 秒间隔与每日 10 帖上限,并自动跳过签到帖、专用帖、公告帖,行为与手动回帖一致。但任何自动化都有风险,请控制语料质量,勿发违规内容,后果自负。

**Q: 支持 Docker / 青龙面板 / 群晖吗?**
支持。任何能跑 Node.js 18+ 的环境都行,也可以用环境变量 `T66Y_COOKIE` 代替配置文件,方便容器化部署。

**Q: 会泄露我的账号吗?**
不会。所有数据只保存在你自己的机器上,Cookie 仅用于向你配置的论坛地址发请求,源码完全开放可审计。

---

## 🛠 开发者指南

> 这一部分面向想阅读源码、二次开发或贡献代码的开发者。

### 技术栈与设计决策

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 运行时 | **Node.js ≥ 18** | 原生 `fetch`、零构建、`npm install github:...` 一条命令分发 |
| HTML 解析 | **cheerio** | 服务端 jQuery 语法,解析论坛页面最顺手 |
| 定时调度 | **node-cron** | 语义化 cron 表达式,进程内调度无需外部依赖 |
| 代理 | **undici ProxyAgent** | 与原生 fetch 无缝对接,支持 HTTP/SOCKS |
| 状态存储 | **本地 JSON 文件** | 只需记录回帖计数与已读 ID,引入数据库是过度设计 |
| 分发方式 | **npm (git 源)** | 用户无需 clone 仓库,`npm install github:user/repo` 即用 |

### 项目结构

```
t66y-automatic/
├── index.js                  # CLI 入口(命令路由、参数解析)
├── package.json              # npm 包定义,bin 注册 t66y 命令
├── t66y.config.example.json  # 配置模板(t66y init 的拷贝源)
├── src/
│   ├── api.js                # 编程接口聚合入口(main 字段指向这里)
│   ├── config.js             # 配置加载:文件 + 环境变量 + 默认值深合并
│   ├── client.js             # HTTP 客户端:Cookie 会话 / 代理 / 重试 / 超时
│   ├── checkin.js            # 签到:入口发现 → 表单提交 → 结果解析
│   ├── reply.js              # 回帖:列表抓取 → 频率控制 → 表单提交
│   ├── monitor.js            # 监控:轮询基线 → 增量发现 → 关键词过滤
│   ├── notify.js             # 推送:Telegram / Bark / Server 酱多渠道并发
│   ├── scheduler.js          # 调度:cron 驱动签到与回帖任务
│   └── state.js              # 状态:每日计数 / 已回帖 / 已推送,落盘去重
├── test/
│   └── config.test.js        # node:test 单元测试
└── docs/
    └── github-seo.md         # 仓库 SEO 配置建议(描述 / Topics / 封面)
```

### 本地开发

```bash
git clone https://github.com/brandelkrefinery/t66y-automatic.git
cd t66y-automatic
npm install
npm test                 # 运行单元测试
node index.js help       # 本地调试 CLI
node index.js checkin -c ./my-dev-config.json
```

### 作为库集成

`package.json` 的 `main` 指向 `src/api.js`,所有能力都可编程调用:

```js
const { T66yClient, checkin, listThreads, notify } = require('t66y-automatic');

const client = new T66yClient({
  baseUrl: 'https://t66y.com',
  cookie: process.env.T66Y_COOKIE,
  proxy: 'http://127.0.0.1:7890',
});

const result = await checkin(client);
console.log(result.message);

const threads = await listThreads(client, 8);
console.log(threads.slice(0, 5));
```

### 扩展点

- **新增推送渠道**:在 `src/notify.js` 中仿照 `sendBark` 添加一个函数,接入 `notify()` 的渠道数组即可,10 行代码搞定。
- **适配论坛改版**:页面解析集中在 `checkin.js` 与 `reply.js` 的 cheerio 选择器中,论坛结构变化时只需调整选择器,业务逻辑零改动。
- **自定义任务**:`scheduler.js` 暴露了通用模式,新增任务 = 写一个 async 函数 + 一行 `cron.schedule()`。

### 贡献指南

1. Fork 本仓库并创建特性分支:`git checkout -b feat/my-feature`
2. 提交遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/):`feat: 支持钉钉推送`
3. 确保 `npm test` 通过后发起 Pull Request
4. 发现论坛页面结构变化导致失效?直接开 Issue,附上(脱敏后的)页面片段,社区会尽快适配

---

## ⚠️ 免责声明

本项目仅供学习与技术交流使用,模拟正常手动操作并严格遵守论坛频率规则。请勿用于恶意刷帖、发布违规内容或任何违反论坛规则与所在地法律法规的行为。使用本项目产生的一切后果由使用者自行承担,作者概不负责。本项目与草榴社区官方无任何关联。

---

## 🔑 关键词

t66y · 1024 · 草榴社区 · 草榴 · CL社区 · 小草 · caoliu · t66y 签到 · 1024 签到 · 草榴自动签到 · 自动签到脚本 · 自动回帖 · 新手上路 · 上岛 · 侠客 · 1024 回帖 · 草榴回帖辅助 · 论坛自动化 · 签到机器人 · Telegram 推送 · Bark 推送 · Server酱 · Node.js 签到 · t66y automatic · forum automation bot

---

<div align="center">

**如果这个项目帮到了你,请点一个 ⭐ Star 支持一下!**

Made with ❤️ by [brandelkrefinery](https://github.com/brandelkrefinery) · [MIT License](LICENSE)

</div>
