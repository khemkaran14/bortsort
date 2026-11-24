/** Tiny HTML helpers for the admin panel. Every value goes through esc() unless wrapped in raw(). */
export class Raw {
  constructor(readonly s: string) {}
}
export const raw = (s: string) => new Raw(s);

export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function html(strings: TemplateStringsArray, ...vals: unknown[]): Raw {
  let out = '';
  strings.forEach((s, i) => {
    out += s;
    if (i < vals.length) {
      const v = vals[i];
      if (v instanceof Raw) out += v.s;
      else if (Array.isArray(v)) out += v.map((x) => (x instanceof Raw ? x.s : esc(x))).join('');
      else if (v !== false && v !== null && v !== undefined) out += esc(v);
    }
  });
  return new Raw(out);
}

export const fmtDate = (ms: number | null | undefined) =>
  ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '—';

export function page(title: string, body: Raw, opts: { nav?: boolean; flash?: string } = {}): string {
  const nav =
    opts.nav === false
      ? ''
      : html`<nav>
          <strong>Nutwise admin</strong>
          <a href="/admin">Dashboard</a><a href="/admin/users">Users</a><a href="/admin/subscriptions">Subscriptions</a>
          <a href="/admin/ads">Ads</a><a href="/admin/settings">Ad settings</a>
          <form method="post" action="/admin/logout" class="inline"><button class="link">Log out</button></form>
        </nav>`.s;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Nutwise admin</title><meta name="robots" content="noindex">
<style>
:root{--bg:#f5f6f8;--card:#fff;--ink:#1d2b3a;--dim:#5d6d7e;--line:#dde3ea;--accent:#3d8bf2;--ok:#2fae63;--bad:#e8554e}
@media (prefers-color-scheme:dark){:root{--bg:#10171f;--card:#1a2430;--ink:#e8eef5;--dim:#9fb0c2;--line:#2b3846}}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--ink)}
nav{display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:12px 16px;background:var(--card);border-bottom:1px solid var(--line)}
nav a{color:var(--ink);text-decoration:none}nav a:hover{color:var(--accent)}
main{max-width:1100px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:8px 0 16px}h2{font-size:17px;margin:24px 0 8px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.stat b{display:block;font-size:26px}.stat span{color:var(--dim)}
.tablewrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card)}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}th{color:var(--dim);font-weight:600}
input,select,textarea{font:inherit;padding:7px 9px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);max-width:100%}
label{display:block;margin:10px 0 4px;color:var(--dim)}
button,.btn{font:inherit;padding:7px 14px;border:0;border-radius:6px;background:var(--accent);color:#fff;cursor:pointer;text-decoration:none;display:inline-block}
button.bad{background:var(--bad)}button.ok{background:var(--ok)}button.link{background:none;color:var(--dim);padding:0}
.inline{display:inline}.pill{padding:2px 8px;border-radius:99px;font-size:13px;background:var(--line)}
.pill.ok{background:var(--ok);color:#fff}.pill.bad{background:var(--bad);color:#fff}
.flash{background:#fff7d6;color:#5a4500;padding:10px 14px;border-radius:8px;margin-bottom:12px}
img.thumb{max-width:160px;max-height:90px;border-radius:6px;border:1px solid var(--line)}
.dim{color:var(--dim)}.row{display:flex;flex-wrap:wrap;gap:12px;align-items:end}
</style></head><body>${nav}<main>${opts.flash ? `<div class="flash">${esc(opts.flash)}</div>` : ''}<h1>${esc(title)}</h1>${body.s}</main></body></html>`;
}
