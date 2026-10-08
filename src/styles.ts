/**
 * All component CSS. Theming = override the --pl-* variables on the element (or any ancestor):
 *   play-load { --pl-accent: #6d28d9; --pl-radius: 8px; }
 * The defaults live in :where() (zero specificity), so a plain selector like the one above always wins.
 */
export const CSS = `
:where(.pl-root){--pl-accent:#e8631f;--pl-bg:#eaedf3;--pl-card:#fff;--pl-text:#14161a;--pl-muted:#7a8190;--pl-line:#c9ceda;--pl-ok:#1f9d57;--pl-err:#d93f3f;--pl-radius:20px;--pl-font:system-ui,-apple-system,"Segoe UI",sans-serif}
.pl-root.pl-dark{--pl-bg:#1b1f2a;--pl-card:#262c3a;--pl-text:#eef0f5;--pl-muted:#9aa3b5;--pl-line:#3d465a;color-scheme:dark}
.pl-root{display:block;max-width:560px;font-family:var(--pl-font);color:var(--pl-text);user-select:none;-webkit-user-select:none}
.pl-arena{position:relative;height:var(--pl-height,520px);background:var(--pl-bg);border-radius:var(--pl-radius);overflow:hidden;touch-action:pan-y;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}
.pl-touch{position:absolute;z-index:1}
.pl-touch[hidden]{display:none}
.pl-choose,.pl-skip,.pl-sound,.pl-act,.pl-zone{touch-action:manipulation}
.pl-sound{flex:none;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:var(--pl-bg);color:var(--pl-text);cursor:pointer;display:grid;place-items:center}
.pl-sound[hidden]{display:none}
.pl-sound:hover{background:var(--pl-line)}
.pl-sound:focus-visible{outline:3px solid var(--pl-accent);outline-offset:2px}
.pl-sound svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.pl-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}
.pl-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;min-height:34px}
.pl-top[hidden]{display:none}
.pl-counter{margin-left:auto;background:var(--pl-bg);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--pl-muted);white-space:nowrap}
.pl-counter[hidden]{display:none}
.pl-counter b{color:var(--pl-text);font-size:16px;margin-left:4px}
.pl-zone{position:absolute;top:var(--pl-zone-top,20px);left:50%;transform:translateX(-50%);width:min(340px,calc(100% - 32px));height:var(--pl-zone-h,190px);box-sizing:border-box;
  background:var(--pl-card);border:2px dashed var(--pl-line);border-radius:var(--pl-radius);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:16px;
  transition:border-color .15s,background .15s,transform .15s;cursor:pointer}
.pl-zone.pl-over{border-color:var(--pl-accent);background:color-mix(in srgb,var(--pl-accent) 8%,var(--pl-card));transform:translateX(-50%) scale(1.02)}
.pl-zone svg{width:28px;height:28px;stroke:var(--pl-text);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.pl-zone-title{margin-top:10px;font-size:20px;font-weight:600}
.pl-zone-sub{margin-top:4px;font-size:14px;color:var(--pl-muted)}
.pl-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.pl-hint{position:absolute;right:16px;bottom:14px;max-width:240px;text-align:right;font-size:13px;color:var(--pl-muted);pointer-events:none;transition:opacity .2s}
.pl-hint.pl-hidden{opacity:0}
.pl-theme-rocket .pl-hint{color:rgba(255,255,255,.55)}
.pl-bar{display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap}
.pl-choose{font:inherit;font-size:14px;font-weight:600;padding:9px 16px;border-radius:calc(var(--pl-radius)/2);border:1px solid var(--pl-line);background:var(--pl-card);color:var(--pl-text);cursor:pointer}
.pl-choose[hidden]{display:none}
.pl-skip{font:inherit;font-size:14px;font-weight:600;padding:9px 16px;border-radius:calc(var(--pl-radius)/2);border:1px solid var(--pl-accent);background:var(--pl-accent);color:#fff;cursor:pointer}
.pl-skip[hidden]{display:none}
.pl-skip:focus-visible{outline:3px solid var(--pl-text);outline-offset:2px}
.pl-choose:hover{border-color:var(--pl-accent)}
.pl-choose:focus-visible,.pl-act:focus-visible,.pl-zone:focus-visible{outline:3px solid var(--pl-accent);outline-offset:2px}
.pl-status{font-size:13px;color:var(--pl-muted)}
.pl-status.pl-bad{color:var(--pl-err)}
.pl-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px;max-height:340px;overflow-y:auto}
.pl-list[hidden]{display:none}
.pl-item{background:var(--pl-card);border-radius:calc(var(--pl-radius)*.6);padding:10px 12px;font-size:13px;display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:center}
.pl-item-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.pl-item-state{color:var(--pl-muted);display:flex;gap:8px;align-items:center}
.pl-item.pl-done .pl-item-state{color:var(--pl-ok)}
.pl-item.pl-fail .pl-item-state{color:var(--pl-err)}
.pl-track{grid-column:1/-1;height:4px;background:color-mix(in srgb,var(--pl-muted) 25%,transparent);border-radius:2px;overflow:hidden}
.pl-fill{height:100%;width:0;background:var(--pl-accent);transition:width .15s}
.pl-item.pl-done .pl-fill{background:var(--pl-ok)}
.pl-rules{display:none}
.pl-plain .pl-arena{height:auto;touch-action:auto;display:flex;flex-direction:column;background:transparent;border-radius:0;overflow:visible}
.pl-plain .pl-zone{position:relative;top:auto;left:auto;transform:none;width:100%;height:auto;min-height:160px;padding:28px 16px;justify-content:center;margin:0}
.pl-plain .pl-zone.pl-over{transform:none}
.pl-plain .pl-zone:hover{border-color:var(--pl-accent)}
.pl-plain .pl-rules{display:block;margin-top:10px;font-size:12px;color:var(--pl-muted);text-align:center}
.pl-plain .pl-rules:empty{display:none}
.pl-plain .pl-touch,.pl-plain .pl-canvas,.pl-plain .pl-hint,.pl-plain .pl-sound,.pl-plain .pl-fx{display:none}
.pl-act{font:inherit;font-size:12px;border:0;background:none;color:var(--pl-accent);cursor:pointer;text-decoration:underline;padding:0}
.pl-act[hidden]{display:none}
@media (pointer:coarse){.pl-sound{width:44px;height:44px}.pl-choose,.pl-skip{padding:12px 18px}.pl-act{padding:10px 8px}.pl-item{padding:12px}}
`
