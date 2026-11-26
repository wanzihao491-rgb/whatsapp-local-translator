globalThis.WATStyles = `
 :host { all: initial; font: 14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif; color:#202631; color-scheme:light; }
 * { box-sizing:border-box; } [hidden] { display:none!important; }
 .panel { display:flex; flex-direction:column; width:308px; max-width:calc(100vw - 24px); max-height:min(460px,calc(100dvh - 24px)); border:1px solid #dce1e9; border-radius:14px; background:#fff; box-shadow:0 12px 48px #16284724; overflow:hidden; }
 header { display:flex; flex-shrink:0; align-items:center; gap:8px; padding:12px 14px; border-bottom:1px solid #edf0f4; }
 .drag-handle { cursor:grab; touch-action:none; user-select:none; } .drag-handle.dragging { cursor:grabbing; }
 .mark { color:#2859c7; background:#edf3ff; border-radius:10px; width:36px; height:36px; display:grid; place-items:center; font-size:18px; font-weight:700; }
 h1 { font-size:15px; line-height:1.5; margin:0; font-weight:650; } .sub { font-size:12px; color:#626e80; }
 .content { padding:12px 14px; flex:1 1 auto; min-height:0; overflow:auto; scrollbar-width:thin; }
 .eyebrow { color:#697487; font-size:11px; letter-spacing:.12em; font-weight:650; margin-bottom:5px; }
 label { display:block; font-size:13px; font-weight:600; margin:0 0 6px; }
 button,select,textarea { font:inherit; } button,select { cursor:pointer; }
 button { min-height:36px; border:1px solid #dce2ec; background:white; color:#273244; border-radius:8px; padding:7px 10px; transition:background .15s; }
 button:hover { background:#f0f4fa; } button:disabled { cursor:default; opacity:.48; }
 button.primary { background:#2859c7; border-color:#2859c7; color:#fff; } button.primary:hover { background:#214bab; }
 button:focus-visible,select:focus-visible,textarea:focus-visible,input:focus-visible,summary:focus-visible { outline:3px solid #9dbbff; outline-offset:2px; }
 select,textarea { width:100%; border:1px solid #d8dfe9; border-radius:8px; color:#273244; background:#fff; padding:9px 10px; }
 textarea { resize:vertical; min-height:80px; line-height:1.6; } textarea[readonly] { background:#f6f8fb; }
 .row { display:flex; align-items:center; gap:8px; } .row > button { flex:1; } .row.actions { margin-top:8px; }
 .prepare { margin:9px 0; } .prepare button { font-size:12px; }
 .status { font-size:12px; color:#626e80; white-space:pre-wrap; overflow-wrap:anywhere; margin:9px 0 13px; }
 .status.error { color:#ad2d2d; } .hint { font-size:12px; color:#626e80; margin:6px 0; }
 .wide { width:100%; } hr { border:0; border-top:1px solid #edf0f4; margin:16px 0; }
 .check { display:flex; gap:8px; align-items:center; margin:11px 0 4px; font-size:12px; font-weight:400; cursor:pointer; }
 .check input { accent-color:#2859c7; width:16px; height:16px; }
 .close { margin-left:auto; border:0; min-width:32px; min-height:32px; padding:0; font-size:18px; }
 .badge { background:#f1f5fb; border-radius:5px; padding:2px 5px; color:#4b607b; font-size:11px; }
 #launcher { border-radius:22px; background:#2859c7; color:#fff; box-shadow:0 5px 20px #16284730; padding:10px 18px; min-height:44px; }
 details { margin:12px 0 0; } summary { cursor:pointer; font-size:12px; color:#4b607b; margin-bottom:8px; }
 .privacy { flex-shrink:0; padding:8px 14px; background:#f7f9fc; border-top:1px solid #edf0f4; font-size:11px; color:#637086; }
 .message { margin:7px 0 3px; border-top:1px solid #8899aa40; padding-top:5px; max-width:100%; }
 .message button { font-size:11px; min-height:28px; padding:3px 8px; border-radius:5px; color:#2859c7; background:#f5f8ff; }
 .translation { font-size:13px; line-height:1.6; margin-top:5px; white-space:pre-wrap; overflow-wrap:anywhere; color:var(--wat-translation-color,#274563); }
 .message .error { color:#ac3737; } .message small { color:#697487; font-size:10px; }
 @media (prefers-reduced-motion:reduce) { * { transition:none!important; } }
`;
