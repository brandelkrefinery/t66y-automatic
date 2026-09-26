#!/usr/bin/env node
'use strict';

/**
 * t66y-automatic 命令行入口
 *
 * 用法:
 *   t66y checkin   立即执行一次签到
 *   t66y reply     立即执行一轮回帖任务
 *   t66y monitor   启动新帖监控(长驻)
 *   t66y run       启动定时调度器(签到 + 回帖,长驻)
 *   t66y init      在当前目录生成配置文件模板
 *   t66y help      显示帮助
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, validateConfig } = require('./src/config');
const { T66yClient } = require('./src/client');
const { checkin } = require('./src/checkin');
const { runReplyTask } = require('./src/reply');
const { runMonitor } = require('./src/monitor');
const { notify } = require('./src/notify');
const { State } = require('./src/state');
const { startScheduler } = require('./src/scheduler');

const BANNER = `
  ┌───────────────────────────────────────┐
  │   t66y-automatic · 草榴社区自动化工具   │
  │   自动签到 · 自动回帖 · 新帖监控        │
  └───────────────────────────────────────┘
`;

const HELP = `
用法: t66y <命令> [选项]

命令:
  checkin     立即为所有账号执行一次每日签到
  reply       立即执行一轮自动回帖任务(遵守 1024 秒间隔与每日上限)
  monitor     启动新帖监控,发现新帖立即推送通知(长驻进程)
  run         启动定时调度器,按 cron 自动签到 + 回帖(长驻进程)
  init        在当前目录生成 t66y.config.json 配置模板
  help        显示本帮助

选项:
  -c, --config <路径>   指定配置文件路径(默认 ./t66y.config.json)

示例:
  t66y init
  t66y checkin
  t66y run --config ~/my-config.json
`;

function log(msg) {
  const time = new Date().toLocaleString('zh-CN', { hour12: false });
  console.log(`[${time}] ${msg}`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const configFlagIndex = args.findIndex((a) => a === '-c' || a === '--config');
  const customConfigPath = configFlagIndex >= 0 ? args[configFlagIndex + 1] : undefined;

  console.log(BANNER);

  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (command === 'init') {
    const target = path.join(process.cwd(), 't66y.config.json');
    if (fs.existsSync(target)) {
      console.log('t66y.config.json 已存在,不会覆盖。');
      return;
    }
    const template = path.join(__dirname, 't66y.config.example.json');
    fs.copyFileSync(template, target);
    console.log('已生成 t66y.config.json,请编辑并填入你的 Cookie 后运行 t66y checkin 验证。');
    return;
  }

  // 其余命令都需要有效配置
  let config;
  try {
    config = loadConfig(customConfigPath);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const problems = validateConfig(config);
  if (problems.length) {
    console.error('配置检查未通过:');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('\n先运行 t66y init 生成配置模板,或参考 README 的配置说明。');
    process.exit(1);
  }

  const state = new State();

  switch (command) {
    case 'checkin': {
      for (const account of config.accounts) {
        const client = new T66yClient({
          baseUrl: config.baseUrl,
          cookie: account.cookie,
          proxy: config.proxy,
        });
        try {
          const result = await checkin(client);
          log(`[${account.name}] ${result.message}`);
          await notify(
            config.notify,
            result.success ? 't66y 签到成功' : 't66y 签到失败',
            `[${account.name}] ${result.message}`
          );
        } catch (err) {
          log(`[${account.name}] 签到异常:${err.message}`);
        }
      }
      break;
    }

    case 'reply': {
      for (const account of config.accounts) {
        const client = new T66yClient({
          baseUrl: config.baseUrl,
          cookie: account.cookie,
          proxy: config.proxy,
        });
        await runReplyTask(client, config.reply, state, account.name, {
          onLog: (msg) => log(`[${account.name}] ${msg}`),
          onNotify: (title, body) => notify(config.notify, title, `[${account.name}] ${body}`),
        });
      }
      break;
    }

    case 'monitor': {
      const account = config.accounts[0];
      const client = new T66yClient({
        baseUrl: config.baseUrl,
        cookie: account.cookie,
        proxy: config.proxy,
      });
      await runMonitor(client, config.monitor, state, {
        onLog: log,
        onNotify: (title, body) => notify(config.notify, title, body),
      });
      break;
    }

    case 'run': {
      startScheduler(config, { onLog: log });
      break;
    }

    default: {
      console.error(`未知命令:${command}`);
      console.log(HELP);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(`发生未处理错误:${err.message}`);
  process.exit(1);
});
