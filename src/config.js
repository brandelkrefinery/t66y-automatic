'use strict';

/**
 * 配置加载模块
 * 优先级:环境变量 > t66y.config.json > 默认值
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = 't66y.config.json';

const DEFAULTS = {
  baseUrl: 'https://t66y.com',
  proxy: '',
  accounts: [],
  checkin: { cron: '30 8 * * *' },
  reply: {
    boardFid: 8,
    maxPerDay: 10,
    intervalSeconds: 1024,
    cron: '0 9 * * *',
    messages: ['感谢楼主分享,好人一生平安', '1024,好人一生平安'],
  },
  monitor: { boardFid: 8, intervalSeconds: 300, keywords: [] },
  notify: {
    telegram: { botToken: '', chatId: '' },
    bark: { key: '', server: 'https://api.day.app' },
    serverchan: { sendKey: '' },
  },
};

function deepMerge(base, override) {
  const out = { ...base };
  for (const key of Object.keys(override || {})) {
    if (
      override[key] &&
      typeof override[key] === 'object' &&
      !Array.isArray(override[key]) &&
      base[key] &&
      typeof base[key] === 'object'
    ) {
      out[key] = deepMerge(base[key], override[key]);
    } else {
      out[key] = override[key];
    }
  }
  return out;
}

/**
 * 加载配置
 * @param {string} [customPath] 自定义配置文件路径
 * @returns {object} 合并后的配置
 */
function loadConfig(customPath) {
  let fileConfig = {};
  const configPath = customPath || path.join(process.cwd(), CONFIG_FILE);

  if (fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      throw new Error(`配置文件 ${configPath} 解析失败:${err.message}`);
    }
  }

  // 环境变量兜底(适合 Docker / CI 场景)
  if (process.env.T66Y_COOKIE && !(fileConfig.accounts || []).length) {
    fileConfig.accounts = [{ name: 'default', cookie: process.env.T66Y_COOKIE }];
  }
  if (process.env.T66Y_BASE_URL) fileConfig.baseUrl = process.env.T66Y_BASE_URL;
  if (process.env.T66Y_PROXY) fileConfig.proxy = process.env.T66Y_PROXY;

  const config = deepMerge(DEFAULTS, fileConfig);
  config.configPath = configPath;
  return config;
}

/**
 * 校验配置是否可运行
 * @param {object} config
 * @returns {string[]} 问题列表,空数组表示通过
 */
function validateConfig(config) {
  const problems = [];
  if (!config.accounts.length) {
    problems.push('未配置任何账号,请在 t66y.config.json 的 accounts 中填入 Cookie');
  }
  config.accounts.forEach((acc, i) => {
    if (!acc.cookie || acc.cookie.includes('在此粘贴')) {
      problems.push(`账号 #${i + 1} (${acc.name || '未命名'}) 的 Cookie 未填写`);
    }
  });
  return problems;
}

module.exports = { loadConfig, validateConfig, CONFIG_FILE, DEFAULTS };
