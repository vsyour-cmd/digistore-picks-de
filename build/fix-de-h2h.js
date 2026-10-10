#!/usr/bin/env node
/** fix-de-h2h.js — 修复 DE head-to-head 补丁中误被插值的模板变量 */
const fs = require("fs");
const f = "G:/Digistore24/site-de/build/patch-headtohead-de.js";
let s = fs.readFileSync(f, "utf8");
// 在 fn 数组的反引号字符串里,\${xxx} 被补丁脚本自己插值了——改为转义形式 \${xxx}
const vars = ["cheaper", "biggerEps", "betterConv", "lowerCancel", "A", "B"];
for (const v of vars) {
  const re = new RegExp("\\$\\{" + v + "\\.", "g");
  s = s.replace(re, "\\${" + v + ".");
}
fs.writeFileSync(f, s);
console.log("escaped");
