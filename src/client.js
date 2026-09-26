'use strict';

/**
 * HTTP 客户端
 * 基于 Node 18+ 原生 fetch,支持 Cookie 会话、代理、自动重试与编码处理
 */

const { ProxyAgent } = require('undici');

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class T66yClient {
  /**
   * @param {object} options
   * @param {string} options.baseUrl 论坛地址
   * @param {string} options.cookie  登录 Cookie
   * @param {string} [options.proxy] 代理地址,如 http://127.0.0.1:7890
   * @param {number} [options.retries] 失败重试次数
   * @param {number} [options.timeout] 单次请求超时(毫秒)
   */
  constructor({ baseUrl, cookie, proxy, retries = 3, timeout = 20000 }) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.cookie = cookie;
    this.retries = retries;
    this.timeout = timeout;
    this.dispatcher = proxy ? new ProxyAgent(proxy) : undefined;
  }

  /**
   * 发起请求(带重试)
   * @param {string} urlPath 相对路径或完整 URL
   * @param {object} [opts] fetch 选项
   * @returns {Promise<{status:number, html:string, url:string}>}
   */
  async request(urlPath, opts = {}) {
    const url = urlPath.startsWith('http') ? urlPath : `${this.baseUrl}/${urlPath.replace(/^\/+/, '')}`;
    let lastError;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        const res = await fetch(url, {
          redirect: 'follow',
          signal: controller.signal,
          dispatcher: this.dispatcher,
          ...opts,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            Cookie: this.cookie,
            Referer: this.baseUrl + '/',
            ...(opts.headers || {}),
          },
        });
        clearTimeout(timer);

        const buffer = Buffer.from(await res.arrayBuffer());
        // t66y 页面使用 UTF-8;如遇 GBK 页面可在此扩展 iconv 解码
        const html = buffer.toString('utf8');
        return { status: res.status, html, url: res.url };
      } catch (err) {
        lastError = err;
        if (attempt < this.retries) {
          await sleep(1000 * attempt);
        }
      }
    }
    throw new Error(`请求失败(${url}):${lastError.message}`);
  }

  /** GET 页面 */
  async get(urlPath) {
    return this.request(urlPath);
  }

  /** POST 表单 */
  async postForm(urlPath, fields) {
    const body = new URLSearchParams(fields).toString();
    return this.request(urlPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  /** 检测 Cookie 是否仍处于登录状态 */
  async checkLogin() {
    const { html } = await this.get('index.php');
    // 已登录页面通常包含"退出/ logout"链接,未登录则跳转到登录页
    const loggedIn = /logout|退出|短消息|我的主题/i.test(html) && !/action=login|游客/.test(html.slice(0, 2000));
    return loggedIn;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { T66yClient, sleep, USER_AGENT };
