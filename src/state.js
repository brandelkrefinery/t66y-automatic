'use strict';

/**
 * 本地状态持久化
 * 记录每日回帖计数、已回帖主题、已推送主题,避免重复操作
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = '.t66y-state.json';

function today() {
  return new Date().toISOString().slice(0, 10);
}

class State {
  constructor(filePath) {
    this.filePath = filePath || path.join(process.cwd(), STATE_FILE);
    this.data = { days: {}, repliedThreads: [], seenThreads: [] };
    this.load();
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = { ...this.data, ...JSON.parse(fs.readFileSync(this.filePath, 'utf8')) };
      } catch {
        // 状态文件损坏时从零开始,不影响主流程
      }
    }
  }

  save() {
    // 裁剪历史,防止文件无限膨胀
    this.data.repliedThreads = this.data.repliedThreads.slice(-5000);
    this.data.seenThreads = this.data.seenThreads.slice(-5000);
    const days = Object.keys(this.data.days).sort().slice(-30);
    this.data.days = Object.fromEntries(days.map((d) => [d, this.data.days[d]]));
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  /** 今日某账号已回帖数量 */
  replyCountToday(accountName) {
    const day = this.data.days[today()] || {};
    return day[`reply:${accountName}`] || 0;
  }

  incrReplyCount(accountName) {
    const day = this.data.days[today()] || {};
    day[`reply:${accountName}`] = (day[`reply:${accountName}`] || 0) + 1;
    this.data.days[today()] = day;
    this.save();
  }

  hasReplied(threadId) {
    return this.data.repliedThreads.includes(String(threadId));
  }

  markReplied(threadId) {
    this.data.repliedThreads.push(String(threadId));
    this.save();
  }

  hasSeen(threadId) {
    return this.data.seenThreads.includes(String(threadId));
  }

  markSeen(threadId) {
    this.data.seenThreads.push(String(threadId));
    this.save();
  }
}

module.exports = { State, STATE_FILE };
