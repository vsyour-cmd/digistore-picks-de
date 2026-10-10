#!/usr/bin/env node
/** inject-headtohead-de.js — 从干净的 .fn 模板注入 headToHead(无 bash/转义问题) */
const fs = require("fs");
const f = "G:/Digistore24/site-de/build/build-blog.js";
let s = fs.readFileSync(f, "utf8");
if (s.includes("function headToHead")) { console.log("already present"); process.exit(0); }
const fnCode = fs.readFileSync("G:/Digistore24/site-de/build/headtohead-de.fn", "utf8").replace(/\r\n/g, "\n").trimEnd();
s = s.replace("function blogIndex() {", fnCode + "\n\nfunction blogIndex() {");
s = s.replace("checklist();", "checklist();\nheadToHead();");
// blogIndex 加 vs 区块
if (!s.includes('startsWith("vs-")')) {
  s = s.replace(
    "<h2>Guides &amp; Ranglisten</h2>",
    "<h2>Head-to-head-Vergleiche</h2>\n<ul style=\"line-height:2.1;max-width:760px\">\n${fs.readdirSync(path.join(ROOT, \"blog\")).filter((vf) => vf.startsWith(\"vs-\") && vf.endsWith(\".html\")).map((vf) => { const vh = fs.readFileSync(path.join(ROOT, \"blog\", vf), \"utf8\"); const vt = (vh.match(/<h1>([\\\\s\\\\S]*?)<\\\\/h1>/) || [])[1] || vf; return `<li><a href=\"${vf}\"><b>${vt}</b></a></li>`; }).join(\"\\n\")}\n</ul>\n<h2>Guides &amp; Ranglisten</h2>"
  );
}
fs.writeFileSync(f, s);
console.log("injected:", s.includes("function headToHead"), "| call:", s.includes("headToHead();"), "| vs scan:", s.includes('startsWith("vs-")'));
