'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadConfig, validateConfig, DEFAULTS } = require('../src/config');
const { State } = require('../src/state');
const fs = require('fs');
const path = require('path');
const os = require('os');

test('默认配置包含必要字段', () => {
  assert.ok(DEFAULTS.baseUrl.startsWith('https://'));
  assert.strictEqual(DEFAULTS.reply.intervalSeconds, 1024);
  assert.strictEqual(DEFAULTS.reply.maxPerDay, 10);
});

test('无配置文件时加载默认值并提示缺少账号', () => {
  const config = loadConfig(path.join(os.tmpdir(), 'not-exist-config.json'));
  const problems = validateConfig(config);
  assert.ok(problems.length > 0);
});

test('环境变量 T66Y_COOKIE 可作为账号兜底', () => {
  process.env.T66Y_COOKIE = 'test-cookie-value';
  const config = loadConfig(path.join(os.tmpdir(), 'not-exist-config.json'));
  assert.strictEqual(config.accounts.length, 1);
  assert.strictEqual(config.accounts[0].cookie, 'test-cookie-value');
  delete process.env.T66Y_COOKIE;
});

test('状态文件可记录并去重回帖', () => {
  const tmp = path.join(os.tmpdir(), `t66y-state-${Date.now()}.json`);
  const state = new State(tmp);
  assert.strictEqual(state.hasReplied('123'), false);
  state.markReplied('123');
  assert.strictEqual(state.hasReplied('123'), true);
  state.incrReplyCount('acc1');
  assert.strictEqual(state.replyCountToday('acc1'), 1);
  fs.unlinkSync(tmp);
});
