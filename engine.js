(function (scope) {
  'use strict';
  class Engine {
    constructor(api = scope.Translator) { this.api = api; this.pairs = new Map(); this.pending = new Map(); this.controllers = new Set(); this.translationControllers = new Set(); this.generation = 0; }
    ready(source, target) { return this.pairs.has(`${source}:${target}`); }
    prepare(source, target, progress = () => {}) {
      const key = `${source}:${target}`;
      if (this.pairs.has(key)) return Promise.resolve(this.pairs.get(key));
      if (this.pending.has(key)) return this.pending.get(key);
      if (!this.api?.create) return Promise.reject(new Error('当前 Ego 未提供本地翻译接口，请更新 Ego 后重试'));
      const generation = this.generation;
      const controller = new AbortController(); this.controllers.add(controller);
      const timer = setTimeout(() => controller.abort(), 180000);
      let creation;
      try {
        // Call create synchronously in the trusted click, before any await.
        creation = this.api.create({ sourceLanguage: source, targetLanguage: target, signal: controller.signal,
          monitor(m) { m.addEventListener('downloadprogress', e => progress(Math.round(e.loaded * 100))); }
        });
      } catch (error) { creation = Promise.reject(error); }
      const promise = Promise.resolve(creation).then(translator => {
        if (generation !== this.generation) { translator.destroy(); throw scope.WATCore.stale(); }
        this.pairs.set(key, translator); return translator;
      }).finally(() => {
        clearTimeout(timer); this.controllers.delete(controller);
        if (this.pending.get(key) === promise) this.pending.delete(key);
      });
      this.pending.set(key, promise); return promise;
    }
    async translate(text, source, target) {
      scope.WATCore.validateText(text);
      const translator = this.pairs.get(`${source}:${target}`);
      if (!translator) throw new Error('请先点击对应方向的“准备”按钮下载本地语言包');
      const controller = new AbortController(); this.controllers.add(controller); this.translationControllers.add(controller);
      const timer = setTimeout(() => controller.abort(), 60000);
      try {
        const result = await translator.translate(text, { signal: controller.signal });
        if (typeof result !== 'string' || !result.trim()) throw new Error('未得到有效译文，请重试');
        return result;
      } finally { clearTimeout(timer); this.controllers.delete(controller); this.translationControllers.delete(controller); }
    }
    cancelTranslations() { this.translationControllers.forEach(c => c.abort()); this.translationControllers.clear(); }
    clear() {
      this.generation++;
      this.controllers.forEach(c => c.abort()); this.controllers.clear();
      this.pairs.forEach(t => t.destroy()); this.pairs.clear(); this.pending.clear();
    }
  }
  const api = { Engine };
  scope.WATEngine = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
