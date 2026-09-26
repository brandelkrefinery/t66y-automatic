'use strict';

/**
 * 新帖监控
 * 轮询版块,发现新主题(或命中关键词)时推送通知
 */

const { listThreads } = require('./reply');
const { sleep } = require('./client');

/**
 * 启动监控循环(长驻进程)
 * @param {T66yClient} client
 * @param {object} monitorConfig 配置中的 monitor 段
 * @param {State} state
 * @param {object} [hooks] { onLog(msg), onNotify(title, body) }
 */
async function runMonitor(client, monitorConfig, state, hooks = {}) {
  const log = hooks.onLog || (() => {});
  const { boardFid, intervalSeconds, keywords } = monitorConfig;

  log(`开始监控版块 fid=${boardFid},每 ${intervalSeconds} 秒检查一次`);
  if (keywords.length) log(`关键词过滤:${keywords.join(' / ')}`);

  // 首次运行只建立基线,不推送历史帖
  let firstRun = true;

  for (;;) {
    try {
      const threads = await listThreads(client, boardFid);
      let fresh = 0;

      for (const thread of threads) {
        if (state.hasSeen(thread.id)) continue;
        state.markSeen(thread.id);
        if (firstRun) continue;

        const hit =
          !keywords.length || keywords.some((kw) => thread.title.toLowerCase().includes(kw.toLowerCase()));
        if (!hit) continue;

        fresh += 1;
        const url = thread.url.startsWith('http') ? thread.url : `${client.baseUrl}/${thread.url}`;
        log(`新帖:《${thread.title}》 ${url}`);
        if (hooks.onNotify) {
          await hooks.onNotify('t66y 新帖提醒', `《${thread.title}》\n${url}`);
        }
      }

      if (firstRun) {
        log(`基线建立完成,已记录 ${threads.length} 个现有主题`);
        firstRun = false;
      } else if (fresh > 0) {
        log(`本轮发现 ${fresh} 个新帖`);
      }
    } catch (err) {
      log(`监控轮询出错:${err.message}`);
    }

    await sleep(intervalSeconds * 1000);
  }
}

module.exports = { runMonitor };
