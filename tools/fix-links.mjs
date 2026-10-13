// DE-Site-Reparatur: gleiche Krankheiten wie die EN-Site (2026-10-13/14).
// Usage: node tools/fix-links.mjs   (aus dem Repo-Root site-de/)
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
let touched = 0;
const edit = (f, fn) => {
  const before = fs.readFileSync(f, 'utf8');
  const after = fn(before);
  if (after !== before) { fs.writeFileSync(f, after, 'utf8'); touched++; }
};

// 1. faq/*.html: bare root links in answers -> ../
const faqFixes = [
  ['href="price-watch.html"', 'href="../price-watch.html"'],
  ['href="changelog.html"', 'href="../changelog.html"'],
  ['href="llms-full.txt"', 'href="../llms-full.txt"'],
  ['href="monthly-new.html"', 'href="../monthly-new.html"'],
  ['href="about.html"', 'href="../about.html"'],
];
for (const f of htmls.filter((f) => f.split(path.sep).join('/').startsWith('faq/'))) {
  edit(f, (h) => {
    let out = h;
    for (const [from, to] of faqFixes) out = out.split(from).join(to);
    return out;
  });
}

// 2. CUSDM1: www.digistore24.com/product/* shows an error page to users
let domainFiles = 0;
for (const f of htmls) {
  edit(f, (h) => {
    const after = h
      .split('https://www.digistore24.com/product/')
      .join('https://www.checkout-ds24.com/product/')
      .replace(/>digistore24\.com\/product\//g, '>checkout-ds24.com/product/');
    if (after !== h) domainFiles++;
    return after;
  });
}

// 3. root pages: strip site-escaping ../ on targets that 404 as a result
for (const f of htmls.filter((f) => !f.includes(path.sep))) {
  edit(f, (h) =>
    h.replace(/href="\.\.\/([^"]+)"/g, (m, rel) =>
      fs.existsSync(rel) ? m : `href="${rel}"`,
    ),
  );
}

console.log('patched files:', touched, '| domain-swap files:', domainFiles);
