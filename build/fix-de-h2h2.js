#!/usr/bin/env node
/** fix-de-h2h2.js — 转义 DE head-to-head fn 数组中所有未转义的 ${ */
const fs = require("fs");
const f = "G:/Digistore24/site-de/build/patch-headtohead-de.js";
let s = fs.readFileSync(f, "utf8");
const BS = String.fromCharCode(92); // 反斜杠
// 只处理 fn 数组段(从 "const fn = [" 到 "].join")
const start = s.indexOf("const fn = [");
const end = s.indexOf("].join", start);
if (start < 0 || end < 0) { console.error("segment not found"); process.exit(1); }
const seg = s.slice(start, end);
// 将该段内所有未转义的 ${ 替换为 \${(用占位符避免二次匹配)
let patched = seg.split("$" + "{").join(BS + "$" + "{");
// 但 join("\n") 和注入调用里的合法 \n 保持原样(它们不含 ${)
s = s.slice(0, start) + patched + s.slice(end);
fs.writeFileSync(f, s);
console.log("escaped in segment");
