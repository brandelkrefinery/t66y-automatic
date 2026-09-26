'use strict';

/**
 * 定时任务调度器
 * 以 cron 表达式驱动每日签到与回帖任务,长驻运行
 */

const cron = require('node-cron');
const { T66yClient } = require('./client');
const { checkin } = require('./checkin');
const { runReplyTask } = require('./reply');
const { notify } = require('./notify');
const { State } = require('./state');

/**
 * 启动调度器
 * @param {object} config 完整配置
 * @param {object} [hooks] { onLog(msg) }
 */
function startScheduler(config, hooks = {}) {
  const log = hooks.onLog || console.log;
  const state = new State();

  const makeHooks = (accountName) => ({
    onLog: (msg) => log(`[${accountName}] ${msg}`),
    onNotify: (title, body) => notify(config.notify, title, `[${accountName}] ${body}`),
  });

  // 每日签到
  cron.schedule(config.checkin.cron, async () => {
    log('触发定时签到任务');
    for (const account of config.accounts) {
      const client = new T66yClient({
        baseUrl: config.baseUrl,
        cookie: account.cookie,
        proxy: config.proxy,
      });
      try {
        const result = await checkin(client);
        log(`[${account.name}] 签到:${result.message}`);
        await notify(config.notify, result.success ? '签到成功' : '签到失败', `[${account.name}] ${result.message}`);
      } catch (err) {
        log(`[${account.name}] 签到异常:${err.message}`);
        await notify(config.notify, '签到异常', `[${account.name}] ${err.message}`);
      }
    }
  });

  // 每日回帖
  cron.schedule(config.reply.cron, async () => {
    log('触发定时回帖任务');
    for (const account of config.accounts) {
      const client = new T66yClient({
        baseUrl: config.baseUrl,
        cookie: account.cookie,
        proxy: config.proxy,
      });
      try {
        await runReplyTask(client, config.reply, state, account.name, makeHooks(account.name));
      } catch (err) {
        log(`[${account.name}] 回帖异常:${err.message}`);
      }
    }
  });

  log(`调度器已启动 — 签到:[${config.checkin.cron}] 回帖:[${config.reply.cron}]`);
  log('按 Ctrl+C 退出');
}

module.exports = { startScheduler };
