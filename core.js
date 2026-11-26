(function (scope) {
  'use strict';
  function validateText(text) {
    if (typeof text !== 'string' || !text.trim()) throw new Error('请先输入文字');
    if (text.length > 4000) throw new Error('每条最多 4,000 字符，请缩短后重试');
    return text;
  }
  function stale() { const e = new Error('聊天或原文已变化，请重新翻译'); e.name = 'StaleError'; return e; }
  class Session {
    constructor(limit = 100) { this.limit = limit; this.generation = 0; this.cache = new Map(); this.tail = Promise.resolve(); }
    token() { return this.generation; }
    valid(token) { return token === this.generation; }
    reset() { this.generation++; this.cache.clear(); this.tail = Promise.resolve(); }
    enqueue(key, work, token = this.token()) {
      const result = this.tail.then(async () => {
        if (!this.valid(token)) throw stale();
        if (this.cache.has(key)) return this.cache.get(key);
        const value = await work();
        if (!this.valid(token)) throw stale();
        this.cache.set(key, value);
        while (this.cache.size > this.limit) this.cache.delete(this.cache.keys().next().value);
        return value;
      });
      this.tail = result.catch(() => {});
      return result;
    }
  }
  function sameReply(a, b) {
    return !!a && !!b && ['chat', 'draft', 'language', 'generation'].every(k => a[k] === b[k]);
  }
  const api = { Session, validateText, sameReply, stale };
  scope.WATCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
