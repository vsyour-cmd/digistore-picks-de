#!/usr/bin/env node
/** fix-de-h2h3.js — 规范化 fn 段内 \\${ → \${(单反斜杠才是模板转义) */
const fs = require("fs");
const f = "G:/Digistore24/site-de/build/patch-headtohead-de.js";
const BS = String.fromCharCode(92);
let s = fs.readFileSync(f, "utf8");
const start = s.indexOf("const fn = [");
const end = s.indexOf("].join", start);
const seg = s.slice(start, end);
// \\${ → \${ (双反斜杠收敛为单)
const dbl = BS + BS + "$" + "{";
const sgl = BS + "$" + "{";
let patched = seg.split(dbl).join(sgl);
// 段内若仍有裸 ${ (无反斜杠前缀),也转义
patched = patched.split("$" + "{").join(BS + "$" + "{");
// 上面会把合法的 \${ 再变成 \\${ —— 再收敛一次
patched = patched.split(dbl).join(sgl);
s = s.slice(0, start) + patched + s.slice(end);
fs.writeFileSync(f, s);
// 验证:段内不应再有裸 ${,也不应有 \\${
const bad1 = patched.includes("$" + "{") && /[^\\]\$\{/.test(patched);
const bad2 = patched.includes(BS + BS + "$");
console.log("残留裸${:", bad1 ? "有" : "无", "| 双反斜杠$:", bad2 ? "有" : "无");
