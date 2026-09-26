'use strict';

/**
 * 编程接口入口
 * 供开发者将 t66y-automatic 作为库集成到自己的项目中:
 *
 *   const { T66yClient, checkin, runReplyTask } = require('t66y-automatic');
 */

const { T66yClient, sleep } = require('./client');
const { checkin } = require('./checkin');
const { listThreads, postReply, runReplyTask } = require('./reply');
const { runMonitor } = require('./monitor');
const { notify } = require('./notify');
const { State } = require('./state');
const { loadConfig, validateConfig } = require('./config');
const { startScheduler } = require('./scheduler');

module.exports = {
  T66yClient,
  sleep,
  checkin,
  listThreads,
  postReply,
  runReplyTask,
  runMonitor,
  notify,
  State,
  loadConfig,
  validateConfig,
  startScheduler,
};
