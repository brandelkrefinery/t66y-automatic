'use strict';

/**
 * 自动回帖(新手上路任务辅助)
 *
 * 规则内建于草榴社区等级体系:
 *  - 新手上路每 1024 秒才能回复一次
 *  - 每日最多回复 10 帖
 *  - 跳过签到帖 / 专用帖,避免违规
 *
 * 本模块严格遵守上述频率限制,绝不并发刷帖。
 */

const cheerio = require('cheerio');
const { sleep } = require('./client');

const SKIP_TITLE = /签到|专用|禁止回复|公告|版规/;

/**
 * 抓取版块主题列表
 * @param {T66yClient} client
 * @param {number|string} fid 版块 ID
 * @returns {Promise<Array<{id:string, title:string, url:string}>>}
 */
async function listThreads(client, fid) {
  const { html } = await client.get(`thread0806.php?fid=${fid}`);
  const $ = cheerio.load(html);
  const threads = [];

  $('a[href*="read.php"], a[href*="htm_data"], a[href*="tid="]').each((_, el) => {
    const href = String($(el).attr('href') || '');
    const title = String($(el).text() || '').trim();
    const tidMatch = href.match(/tid=(\d+)/) || href.match(/\/(\d+)\.html/);
    if (!tidMatch || !title || title.length < 4) return;
    if (SKIP_TITLE.test(title)) return;
    threads.push({ id: tidMatch[1], title, url: href });
  });

  // 去重
  const seen = new Set();
  return threads.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
}

/**
 * 回复单个主题
 * @param {T66yClient} client
 * @param {object} thread
 * @param {string} message
 */
async function postReply(client, thread, message) {
  // 先打开主题页,提取回帖表单(含隐藏字段,如 verify / tid / fid)
  const page = await client.get(thread.url);
  const $ = cheerio.load(page.html);
  const form = $('form[action*="post"], form[name*="FORM"], form#anchor').first();

  if (!form.length) {
    throw new Error('未找到回帖表单,可能无权限或页面结构变化');
  }

  const action = String(form.attr('action'));
  const fields = {};
  form.find('input[name], textarea[name]').each((_, el) => {
    const name = $(el).attr('name');
    if (!name) return;
    fields[name] = $(el).attr('value') || '';
  });

  // 填写回帖内容字段(常见字段名:atc_content / content)
  const contentField = ['atc_content', 'content', 'message'].find((k) => k in fields) || 'atc_content';
  fields[contentField] = message;

  const result = await client.postForm(action, fields);
  if (/回复成功|发表成功|操作成功|跳轉|跳转/.test(result.html)) {
    return { success: true };
  }
  const errMatch = result.html.match(/(不能回复|无权|间隔|失敗|失败|頻繁|频繁)[^<]{0,40}/);
  return { success: false, reason: errMatch ? errMatch[0] : '未知原因' };
}

/**
 * 执行一轮自动回帖任务
 * @param {T66yClient} client
 * @param {object} replyConfig 配置中的 reply 段
 * @param {State} state
 * @param {string} accountName
 * @param {object} [hooks] { onLog(msg), onNotify(title, body) }
 */
async function runReplyTask(client, replyConfig, state, accountName, hooks = {}) {
  const log = hooks.onLog || (() => {});
  const { boardFid, maxPerDay, intervalSeconds, messages } = replyConfig;

  let done = state.replyCountToday(accountName);
  if (done >= maxPerDay) {
    log(`今日已回复 ${done}/${maxPerDay} 帖,任务完成`);
    return { replied: 0, finished: true };
  }

  const threads = await listThreads(client, boardFid);
  log(`版块 fid=${boardFid} 抓取到 ${threads.length} 个可回复主题`);

  let replied = 0;
  for (const thread of threads) {
    if (done + replied >= maxPerDay) break;
    if (state.hasReplied(thread.id)) continue;

    const message = messages[Math.floor(Math.random() * messages.length)];
    try {
      const result = await postReply(client, thread, message);
      if (result.success) {
        replied += 1;
        state.incrReplyCount(accountName);
        state.markReplied(thread.id);
        log(`[${done + replied}/${maxPerDay}] 已回复:《${thread.title}》`);
        if (hooks.onNotify) {
          await hooks.onNotify('回帖成功', `《${thread.title}》 (${done + replied}/${maxPerDay})`);
        }
      } else {
        log(`回复被拦截:${result.reason},跳过该帖`);
        state.markReplied(thread.id); // 避免死循环重试同一帖
      }
    } catch (err) {
      log(`回复出错:${err.message}`);
    }

    // 严格遵守 1024 秒间隔,最后一次不再等待
    if (done + replied < maxPerDay) {
      log(`等待 ${intervalSeconds} 秒(论坛回复间隔限制)...`);
      await sleep(intervalSeconds * 1000);
    }
  }

  return { replied, finished: done + replied >= maxPerDay };
}

module.exports = { listThreads, postReply, runReplyTask };
