'use strict';

/**
 * 消息推送
 * 支持 Telegram Bot、Bark(iOS)、Server 酱(微信)
 * 全部基于原生 fetch,未配置的渠道自动跳过
 */

/**
 * 发送通知到所有已配置渠道
 * @param {object} notifyConfig 配置中的 notify 段
 * @param {string} title
 * @param {string} body
 */
async function notify(notifyConfig, title, body) {
  const tasks = [];
  const { telegram, bark, serverchan } = notifyConfig || {};

  if (telegram && telegram.botToken && telegram.chatId) {
    tasks.push(sendTelegram(telegram, title, body));
  }
  if (bark && bark.key) {
    tasks.push(sendBark(bark, title, body));
  }
  if (serverchan && serverchan.sendKey) {
    tasks.push(sendServerChan(serverchan, title, body));
  }

  const results = await Promise.allSettled(tasks);
  return results.filter((r) => r.status === 'fulfilled').length;
}

async function sendTelegram({ botToken, chatId }, title, body) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: `*${title}*\n${body}`,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) throw new Error(`Telegram 推送失败:HTTP ${res.status}`);
}

async function sendBark({ key, server = 'https://api.day.app' }, title, body) {
  const url = `${server.replace(/\/+$/, '')}/${key}/${encodeURIComponent(title)}/${encodeURIComponent(body)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Bark 推送失败:HTTP ${res.status}`);
}

async function sendServerChan({ sendKey }, title, body) {
  const url = `https://sctapi.ftqq.com/${sendKey}.send`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ title, desp: body }).toString(),
  });
  if (!res.ok) throw new Error(`Server 酱推送失败:HTTP ${res.status}`);
}

module.exports = { notify };
