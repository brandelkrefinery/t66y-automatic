'use strict';

/**
 * 每日自动签到
 * 流程:打开论坛首页 → 定位签到入口 → 提交签到 → 解析结果
 */

const cheerio = require('cheerio');

/**
 * 为单个账号执行签到
 * @param {T66yClient} client
 * @returns {Promise<{success:boolean, message:string}>}
 */
async function checkin(client) {
  // 1. 验证登录状态
  const loggedIn = await client.checkLogin();
  if (!loggedIn) {
    return { success: false, message: 'Cookie 已失效或未登录,请重新获取 Cookie' };
  }

  // 2. 在首页查找签到入口(签到插件链接中通常含 sign / qiandao 等关键字)
  const { html } = await client.get('index.php');
  const $ = cheerio.load(html);
  let signUrl = null;
  $('a[href]').each((_, el) => {
    const href = String($(el).attr('href') || '');
    const text = String($(el).text() || '');
    if (/sign|qiandao|打卡|签到/i.test(href) || /每日签到|签到/.test(text)) {
      signUrl = href;
      return false;
    }
  });

  if (!signUrl) {
    return { success: false, message: '未找到签到入口,论坛可能改版或今日已签到' };
  }

  // 3. 打开签到页并提交
  const signPage = await client.get(signUrl);
  const $sign = cheerio.load(signPage.html);

  if (/已签到|已经签到|今日已签/.test(signPage.html)) {
    return { success: true, message: '今日已签到,无需重复操作' };
  }

  // 提取签到表单(若有)并提交;否则按 GET 触发处理
  const form = $sign('form[action]').first();
  if (form.length) {
    const action = String(form.attr('action'));
    const fields = {};
    form.find('input[name]').each((_, el) => {
      const name = $sign(el).attr('name');
      const value = $sign(el).attr('value') || '';
      if (name && $sign(el).attr('type') !== 'file') fields[name] = value;
    });
    const result = await client.postForm(action, fields);
    return parseResult(result.html);
  }

  return parseResult(signPage.html);
}

function parseResult(html) {
  if (/签到成功|打卡成功|恭喜/.test(html)) {
    const money = html.match(/(\d+)\s*(金钱|金币|贡献)/);
    return {
      success: true,
      message: money ? `签到成功,获得 ${money[1]} ${money[2]}` : '签到成功',
    };
  }
  if (/已签到|已经签到|今日已签/.test(html)) {
    return { success: true, message: '今日已签到' };
  }
  return { success: false, message: '签到结果未知,请人工确认或到 Issue 区反馈页面结构' };
}

module.exports = { checkin };
