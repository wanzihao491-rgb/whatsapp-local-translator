# 参与开发

运行扩展无需 npm。修改代码和运行测试建议使用 Node.js 24，以及 Windows PowerShell（当前打包脚本使用 PowerShell/.NET ZIP）。

```sh
npm ci --ignore-scripts
npm test
node scripts/serve.mjs
```

打开 `http://127.0.0.1:4174/demo/index.html` 测试虚构聊天。演示与正式扩展复用代码，语言包与实际翻译仍依赖浏览器 Translator API。

修改运行代码后，在扩展管理页重新加载，再刷新 WhatsApp 页面。请勿用真实客户信息制作测试夹具、截图或日志。

提交改动时说明问题、改变后的行为、已运行的测试，以及实际测试过的浏览器。消息 DOM 适配改动应覆盖引用文字、同组消息、双方方向、聊天切换和宿主重绘。

发布前运行 `npm test` 与 `npm run package`。后者生成 `dist/whatsapp-local-translator-<版本>.zip`，仅包含指定运行文件和说明，不包含开发依赖、测试或用户数据。

保留以下边界：本地翻译、最小权限、原文保留、保护已有草稿、没有自动发送。新增联网、存储或权限时同时更新隐私说明和用户提示。
