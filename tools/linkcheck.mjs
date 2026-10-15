// Link checker (Windows-safe). Usage: node tools/linkcheck.mjs
import fs from 'node:fs';
import path from 'node:path';

function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== '.git' && f !== 'node_modules') walk(p, out);
    } else out.push(p);
  }
  return out;
}

const htmls = walk('.').filter((f) => f.endsWith('.html'));
const bySection = {};
let refsTotal = 0;

const rootDir = process.cwd();
for (const f0 of htmls) {
  const f = f0.split(path.sep).join('/'); // 统一 posix 斜杠,dirname/解析才正确
  const norm = f;
  const section = norm.includes('/') ? norm.split('/')[0] : '(root)';
  const h = fs.readFileSync(path.join(rootDir, f), 'utf8');
  const broken = new Set();

  for (const m of h.matchAll(/(?:href|src)="([^"#]+)(#[^"]*)?"/g)) {
    const href = m[1];
    if (!href || /^(https?:|mailto:|data:|\/\/|\/)/.test(href)) continue;
    refsTotal++;
    const rel = decodeURIComponent(href);
    // 浏览器语义:根页面的 ../ 会钳制到站点根;按站点根+钳制解析,避免 CWD 误报
    const clamp = (p) => { let o = path.posix.normalize(p.split(path.sep).join("/")); while (o.startsWith("../")) o = o.slice(3); return o; };
    const target = path.join(rootDir, clamp(path.posix.join(path.posix.dirname(f), rel)));
    if (!fs.existsSync(target)) broken.add(href);
  }

  if (broken.size) {
    const s = (bySection[section] ??= { pages: 0, refs: 0, hrefs: {} });
    s.pages++;
    s.refs += broken.size;
    for (const b of broken) s.hrefs[b] = (s.hrefs[b] || 0) + 1;
  }
}

console.log(`html: ${htmls.length} | internal refs checked: ${refsTotal}`);
for (const [s, v] of Object.entries(bySection)) {
  console.log(`\n[${s}] ${v.pages} pages, ${v.refs} broken refs`);
  for (const [h, n] of Object.entries(v.hrefs).sort((a, b) => b[1] - a[1]).slice(0, 10))
    console.log(`   ${n}x ${h}`);
}
const totals = Object.values(bySection).reduce((a, v) => a + v.refs, 0);
console.log(`\nTOTAL broken internal refs: ${totals}`);
