#!/usr/bin/env node
/**
 * build-site.js (DE) — Deutsche Version:Digistore24-Angebotsverzeichnis
 * Pfade: kategorie/, produkte/, alternativen/, empfehlungen/, blog/
 * Rechtliches: impressum.html, datenschutz.html (Platzhalter – vom Betreiber auszufüllen!)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "dataset.json"), "utf8"));
const SITE_NAME = "DigistorePicks DE";
const SITE_URL = "https://vsyour-cmd.github.io/digistore-picks-de";

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (n, cur) => (cur === "EUR" ? "€" : "$") + (n == null ? "—" : Number(n).toFixed(2));
const pct = (n) => (n == null ? "—" : Number(n).toFixed(2).replace(/\.?0+$/, "") + " %");
const datemark = (iso) => (iso ? iso.slice(0, 10) : "");
const outPath = (...p) => path.join(ROOT, ...p);
const jsonSafe = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

const IMG_DIR = path.join(ROOT, "assets", "products");
function localImage(id) {
  const m = path.join(IMG_DIR, id + ".img.json");
  if (fs.existsSync(m)) {
    try {
      const j = JSON.parse(fs.readFileSync(m, "utf8"));
      if (j.local) return { path: j.local, w: j.width || null, h: j.height || null };
    } catch {}
  }
  return null;
}

const articleIds = new Set(
  fs.existsSync(path.join(ROOT, "build", "articles.json"))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, "build", "articles.json"), "utf8")).map((a) => String(a.productId))
    : []
);

const VERIFY_META = (() => {
  const f = path.join(ROOT, "build", "verify-meta.txt");
  try { return fs.readFileSync(f, "utf8").trim(); } catch { return ""; }
})();
const GOATCOUNTER = '<script data-goatcounter="https://vsyour.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((c, i) => (i === items.length - 1 ? `<span>${esc(c.label)}</span>` : `<a href="${c.href}">${esc(c.label)}</a>`))
    .join(' <span class="sep">›</span> ')}</nav>`;
}

function layout({ title, desc, body, rel = ".", path = "", ogImage = null, jsonLd = [], crumb = null }) {
  const canonical = SITE_URL + "/" + path;
  const ogImg = ogImage
    ? (ogImage.startsWith("http") ? ogImage : SITE_URL + "/" + ogImage.replace(/^(\.\.\/)+/, ""))
    : null;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
${ogImg ? `<meta property="og:image" content="${esc(ogImg)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${esc(ogImg)}">` : '<meta name="twitter:card" content="summary">'}
<link rel="stylesheet" href="${rel}/assets/style.css">
${VERIFY_META}
${jsonLd.map((j) => `<script type="application/ld+json">${jsonSafe(j)}</script>`).join("\n")}
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="${rel}/index.html">${SITE_NAME}<span></span></a>
  <nav class="cats">
    <a href="${rel}/index.html">Alle Kategorien</a>
    <a href="${rel}/produkte/index.html">Alle Produkte</a>
    <a href="${rel}/blog/index.html">Blog</a>
    <a href="${rel}/impressum.html">Impressum</a>
    <a href="${rel}/datenschutz.html">Datenschutz</a>
  </nav>
</div></header>
<main class="wrap">
${crumb ? crumbs(crumb) + "\n" : ""}${body}
</main>
<footer class="site"><div class="wrap">
  <div class="disclosure"><b>Werbe-Hinweis:</b> ${SITE_NAME} enthält Affiliate-Links (Werbung). Kaufen Sie über einen Link, erhalten wir ggf. eine Provision vom Anbieter – für Sie entstehen keine Mehrkosten. Alle Marktplatz-Statistiken (Preis, Provision, Konversion, Verdienst) stammen vom offiziellen Digistore24-Marktplatz und sind keine Prognose Ihrer Ergebnisse.</div>
  <div>© ${new Date().getFullYear()} ${SITE_NAME} · Produktdaten: Digistore24-Marktplatz (Stand ${datemark(DATA.scrapedAt)}) · <a href="${rel}/impressum.html">Impressum</a> · <a href="${rel}/datenschutz.html">Datenschutz</a> · <a href="${rel}/about.html">Über uns &amp; Transparenz</a></div>
</div></footer>
${GOATCOUNTER}
</body>
</html>`;
}

function imgRel(p, rel, attrs = "") {
  const im = localImage(p.id);
  if (!im) return "";
  const dims = im.w && im.h ? `width="${im.w}" height="${im.h}"` : "";
  return `<img src="${rel}/${im.path}" ${dims} ${attrs} loading="lazy" alt="${esc(p.label)}" onerror="this.style.display='none'">`;
}

function productCard(p, rel = ".") {
  return `<div class="card">
  ${imgRel(p, rel, `style="width:100%;height:130px;object-fit:contain"`)}
  <div class="title"><a href="${rel}/produkte/${p.slug}.html">${esc(p.label)}</a></div>
  <div class="meta">
    <span>${esc(p.typeDe)}</span>
    <span>Preis <b>${money(p.price, p.currency)}</b></span>
    <span>Provision <b>${pct(p.commission)}</b></span>
  </div>
  <div class="meta">
    <span>Verdienst/Verkauf <b>${money(p.earningsPerSale, p.currency)}</b>*</span>
    <span>Checkout-CR <b>${pct(p.conversionRate)}</b>*</span>
    <span>Anbieter <b>${esc(p.vendorName)}</b></span>
  </div>
  ${p.description ? `<p class="desc">${esc(p.description).slice(0, 160)}</p>` : ""}
  <div class="links">
    <a class="badge" href="${rel}/produkte/${p.slug}.html">Profil ansehen</a>
    <a href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">Offizielle Verkaufsseite ↗</a>
  </div>
</div>`;
}

const products = DATA.products
  .map((p) => ({ ...p, slug: slug(p.label) + "-" + p.id }))
  .sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0));

{
  const cnt = {};
  for (const c of DATA.categories) { const b = slug(c.label); cnt[b] = (cnt[b] || 0) + 1; }
  for (const c of DATA.categories) { const b = slug(c.label); c.file = cnt[b] > 1 ? slug(c.section) + "-" + b : b; }
}
const catName = (c) => c.labelDe || c.label;
const catByFile = new Map(DATA.categories.map((c) => [c.file, c]));

// ---------- Auf einen Blick (TL;DR) ----------
function tldr(p) {
  const g = p.research && p.research.guaranteeMention ? ` Die Verkaufsseite wirbt mit „${esc(p.research.guaranteeMention)}".` : "";
  const dead = p.research && p.research.error ? ` Die Verkaufsseite ist derzeit nicht erreichbar (${esc(p.research.error.slice(0, 60))}).` : "";
  const cats = p.categories.length ? ` in ${p.categories.slice(0, 2).map(esc).join(" und ")}` : "";
  return `<div class="tldr">
<b>Auf einen Blick</b> (Marktplatz-Daten vom ${datemark(DATA.scrapedAt)}):
<ul>
<li>${esc(p.label)} ist ein/e ${esc(p.typeDe)}${cats}, vertrieben über den Digistore24-Marktplatz von Anbieter <b>${esc(p.vendorName)}</b>, gelistet seit <b>${datemark(p.createdAt)}</b>.</li>
<li>Listenpreis <b>${money(p.price, p.currency)}</b>; Digistore24 meldet <b>${pct(p.conversionRate)}</b> Checkout-Konversion, <b>${pct(p.cancelRate)}</b> Stornierungsquote und <b>${pct(p.commission)}</b> Affiliate-Provision.</li>
<li>Verdienst pro Verkauf (Affiliate): <b>${money(p.earningsPerSale, p.currency)}</b> (Anbieter-seitige Statistik, keine Prognose).${g}${dead}</li>
</ul>
</div>`;
}

// ---------- Startseite ----------
function homePage() {
  const top = products.slice(0, 12);
  const cats = DATA.categories.slice().sort((a, b) => b.count - a.count);
  const uncategorized = products.filter((p) => !p.categories.length).length;
  const body = `
<h1>Digistore24-Produkte, sortiert nach Zahlen</h1>
<p class="sub">Ein unabhängiges Verzeichnis von ${DATA.total} deutschsprachigen Produkten im Digistore24-Marktplatz — ${DATA.categories.length} Kategorien, offizielle Preise und Provisionen, Verkaufsseiten-Recherche zu ${DATA.withResearch} Angeboten. Datenstand: ${datemark(DATA.scrapedAt)}.</p>
<h2>Top-Angebote nach Verdienst pro Verkauf</h2>
<p class="sub">Rangliste nach dem vom Marktplatz gemeldeten Verdienst pro Verkauf. Offizielle Marktplatz-Statistiken, keine我们的 Prognosen.</p>
<div class="grid">
${top.map((p) => productCard(p)).join("\n")}
</div>
<h2>Alle ${DATA.categories.length} Kategorien</h2>
<div class="cat-index">
${cats.map((c) => `<a href="kategorie/${c.file}.html"><span>${esc(catName(c))}</span><span class="n">${c.count} Produkte</span></a>`).join("\n")}
${uncategorized ? `\n<a href="kategorie/ohne-kategorie.html"><span>Ohne Kategorie</span><span class="n">${uncategorized} Produkte</span></a>` : ""}
</div>
<p class="sub" style="margin-top:26px">Jedes Produkt hat ein vollständiges Profil mit Marktplatz-Daten und Recherche seiner Verkaufsseite. <a href="produkte/index.html">Alle Produkte A–Z</a> oder im <a href="blog/index.html">Blog</a> weiterlesen.</p>`;
  const jsonLd = [{
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL + "/",
    description: `Unabhängiges Verzeichnis von ${DATA.total} Digistore24-Produkten mit offiziellen Preisen, Provisionen und Verkaufsseiten-Recherche.`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL + "/about.html" },
  }];
  fs.writeFileSync(outPath("index.html"), layout({
    title: `${SITE_NAME} — alle ${DATA.total} Digistore24-Produkte: Preise, Provisionen & Recherche`,
    desc: `Verzeichnis von ${DATA.total} Digistore24-Produkten mit offiziellen Preisen, Provisionen, Konversionsdaten und Verkaufsseiten-Recherche. Stand ${datemark(DATA.scrapedAt)}.`,
    body, path: "", jsonLd,
  }));
}

// ---------- Kategorieseiten (paginiert) ----------
function categoryPages() {
  const dir = outPath("kategorie");
  fs.mkdirSync(dir, { recursive: true });
  const CHUNK = 60;
  const writeCat = (c, items, extraIntro = "") => {
    const pages = [];
    for (let i = 0; i < items.length; i += CHUNK) pages.push(items.slice(i, i + CHUNK));
    if (!pages.length) pages.push([]);
    const avg = items.length ? items.reduce((a, p) => a + (p.price || 0), 0) / items.length : 0;
    const minC = items.length ? Math.min(...items.map((p) => p.commission || 0)) : 0;
    const maxC = items.length ? Math.max(...items.map((p) => p.commission || 0)) : 0;
    const pager = (idx) => {
      if (pages.length === 1) return "";
      const link = (i) =>
        i === idx ? `<b>${i + 1}</b>` : `<a href="${i === 0 ? c.file + ".html" : c.file + "-p" + (i + 1) + ".html"}">${i + 1}</a>`;
      return `<p class="pager">Seiten: ${Array.from({ length: pages.length }, (_, i) => link(i)).join(" · ")}</p>`;
    };
    pages.forEach((chunk, idx) => {
      const file = idx === 0 ? c.file + ".html" : `${c.file}-p${idx + 1}.html`;
      const pageSub = pages.length > 1 ? ` · Seite ${idx + 1} von ${pages.length}` : "";
      const intro = `<p class="lead">${extraIntro}Die Kategorie <b>${esc(catName(c))}</b> listet im Digistore24-Marktplatz <b>${items.length} Angebote</b> (Stand ${datemark(DATA.scrapedAt)}). Durchschnittspreis: <b>${money(avg, "USD")}</b>; Provisionen zwischen <b>${pct(minC)}</b> und <b>${pct(maxC)}</b>. Alle Statistiken werden von Digistore24 über den Traffic der Anbieter gemeldet und hängen von der Traffic-Qualität ab.</p>`;
      const bestOf = idx === 0 && items.length >= 8 ? `<p class="sub">Wenig Zeit? Zu den <a href="../empfehlungen/beste-${c.file}.html">Top-Empfehlungen in ${esc(catName(c))}</a> — rechnerisch aus denselben Daten ermittelt.</p>` : "";
      const body = `
<h1>${esc(catName(c))}</h1>
<p class="sub">${items.length} Produkte · Bereich: ${esc(c.sectionDe || c.section)}${pageSub} · <a href="../index.html">alle Kategorien</a> · <a href="../produkte/index.html">alle Produkte A–Z</a></p>
${intro}
${bestOf}
<div class="grid">
${chunk.map((p) => productCard(p, "..")).join("\n")}
</div>
${pager(idx)}
<p class="sub" style="margin-top:22px">* Marktplatz-Statistiken werden von Digistore24 über den Traffic der Anbieter gemeldet; sie hängen von der Traffic-Qualität ab und sind keine Prognose.</p>`;
      const jsonLd = [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${catName(c)} — Digistore24-Produkte`,
          description: `${items.length} Digistore24-Produkte in ${catName(c)} mit offiziellen Preisen, Provisionen und Marktplatz-Statistiken.`,
          url: `${SITE_URL}/kategorie/${file}`,
          isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/" },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Start", item: SITE_URL + "/" },
            { "@type": "ListItem", position: 2, name: catName(c), item: `${SITE_URL}/kategorie/${file}` },
          ],
        },
      ];
      fs.writeFileSync(path.join(dir, file), layout({
        title: `${catName(c)} — ${items.length} Digistore24-Produkte: Preise & Provisionen${pages.length > 1 ? ` (Seite ${idx + 1})` : ""}`,
        desc: `${items.length} Digistore24-Produkte in ${catName(c)}: offizielle Preise, Provisionen (Ø ${money(avg, "USD")}), Konversion und Stornoquoten. Stand ${datemark(DATA.scrapedAt)}.`,
        body, rel: "..", path: `kategorie/${file}`, jsonLd,
        crumb: [{ label: "Start", href: "../index.html" }, { label: catName(c), href: `../kategorie/${file}` }],
      }));
    });
  };
  for (const c of DATA.categories) {
    const items = products.filter((p) => (p.categoryIds || []).includes(String(c.catId)));
    writeCat(c, items);
  }
  const uncats = products.filter((p) => !p.categories.length);
  if (uncats.length) {
    writeCat({ label: "Uncategorized", labelDe: "Ohne Kategorie", section: "Digistore24", sectionDe: "Digistore24-Marktplatz", file: "ohne-kategorie" }, uncats,
      "Diese Angebote haben keine Marktplatz-Kategorie. ");
  }
}

// ---------- Verkaufsseiten-Recherche ----------
function researchSection(p) {
  const r = p.research;
  if (!r || r.error) {
    const msg = r && r.error ? esc(r.error) : "noch nicht recherchiert";
    return `<h2>Von der Verkaufsseite des Anbieters</h2>
<div class="notice">Recherche nicht verfügbar: <b>${msg}</b>. Eine nicht erreichbare Verkaufsseite ist selbst eine Information — behandeln Sie alle Aussagen zu diesem Angebot als unbestätigt, bis Sie die offizielle Seite selbst öffnen können.</div>`;
  }
  const parts = [];
  if (r.title) parts.push(`<p><b>Seitentitel:</b> ${esc(r.title)}</p>`);
  if (r.metaDescription) parts.push(`<p><b>Meta-Beschreibung:</b> ${esc(r.metaDescription)}</p>`);
  if (r.h1 && r.h1.length) parts.push(`<h3>Hauptüberschrift</h3><blockquote>${r.h1.map((h) => esc(h)).join("<br>")}</blockquote>`);
  if (r.h2 && r.h2.length) parts.push(`<h3>Abschnitts-Überschriften</h3><ul>${r.h2.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`);
  else if (r.h3 && r.h3.length) parts.push(`<h3>Abschnitts-Überschriften</h3><ul>${r.h3.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`);
  if (r.excerpt && r.excerpt.length) parts.push(`<h3>Einstiegstext</h3>${r.excerpt.map((t) => `<blockquote>${esc(t)}</blockquote>`).join("")}`);
  if (r.faqQuestions && r.faqQuestions.length) parts.push(`<h3>Fragen, die die Verkaufsseite beantwortet</h3><ul>${r.faqQuestions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>`);
  if (r.priceMentions && r.priceMentions.length) parts.push(`<p><b>Preisangaben auf der Seite:</b> ${r.priceMentions.map((x) => esc(x)).join(" · ")}</p>`);
  if (r.guaranteeMention) parts.push(`<p><b>Garantie-Formulierung:</b> „${esc(r.guaranteeMention)}" — bitte vor dem Kauf immer die aktuellen Bedingungen auf der offiziellen Seite prüfen.</p>`);
  if (r.ctaTexts && r.ctaTexts.length) parts.push(`<p><b>CTA-Buttons:</b> ${r.ctaTexts.map((t) => `„${esc(t)}"`).join(" · ")}</p>`);
  parts.push(`<p class="sub">Recherche-Methode: ${r.method === "browser-render" ? "gerenderte Seite (Browser)" : "rohes HTML"} · ${r.wordCount} Wörter · Qualität: ${r.quality} · recherchiert am ${datemark(DATA.researchedAt)}. <a href="https://github.com/vsyour-cmd/digistore-picks-de/blob/main/content/products/${p.id}-${slug(p.label)}.md" rel="noopener">Vollständige Recherche-Datei (MD) ↗</a></p>`);
  return `<h2>Von der Verkaufsseite des Anbieters</h2>
<div class="notice"><b>Dies sind die eigenen Werbeaussagen des Anbieters</b>, wörtlich aus der offiziellen Verkaufsseite übernommen${r.finalUrl && r.finalUrl !== p.salesPageUrl ? ` (finale URL: ${esc(r.finalUrl)})` : ""}. Wir überprüfen weder Ergebnisse, Testimonials noch Einkommensversprechen.</div>
${parts.join("\n")}`;
}

// ---------- Produkprofile (alle) ----------
function computeAltSlugs() {
  const set = new Set();
  for (const p of products.slice(0, 120)) {
    const primaryCatId = (p.categoryIds || [])[0];
    if (!primaryCatId) continue;
    const alts = products.filter((x) => x.id !== p.id && (x.categoryIds || []).includes(String(primaryCatId))).slice(0, 4);
    if (alts.length >= 3) set.add(p.slug);
  }
  return set;
}

function profilePages(altSlugs) {
  const dir = outPath("produkte");
  fs.mkdirSync(dir, { recursive: true });
  for (const p of products) {
    const file = path.join(dir, p.slug + ".html");
    if (articleIds.has(String(p.id)) && fs.existsSync(file)) continue;
    const cats = (p.categories || []).map((c) => esc(c)).join(", ");
    const imgTag = imgRel(p, "..", `style="max-width:340px;height:auto;border:1px solid var(--line);border-radius:8px"`);
    const localImg = localImage(p.id);

    const primaryCatId = (p.categoryIds || [])[0];
    let related = [];
    if (primaryCatId) related = products.filter((x) => x.id !== p.id && (x.categoryIds || []).includes(String(primaryCatId))).slice(0, 4);
    const relatedBlock = related.length
      ? `<h2>Ähnliche Angebote in ${esc(p.categories[0] ? catName(DATA.categories.find((c) => c.label === p.categories[0]) || { labelDe: p.categories[0] }) : "")}</h2>
<div class="grid">${related.map((x) => productCard(x, "..")).join("\n")}</div>`
      : "";

    const vendorSiblings = products.filter((x) => x.id !== p.id && x.vendorName === p.vendorName).slice(0, 4);
    const vendorBlock = vendorSiblings.length
      ? `<h2>Weitere Angebote von ${esc(p.vendorName)}</h2>
<div class="grid">${vendorSiblings.map((x) => productCard(x, "..")).join("\n")}</div>`
      : "";

    const altLink = altSlugs.has(p.slug)
      ? `<p class="sub">Optionen vergleichen? <a href="../alternativen/${p.slug}.html">${esc(p.label)} im Vergleich mit den nächsten Alternativen</a> — Marktplatz-Zahlen direkt nebeneinander.</p>`
      : "";

    const primaryCat = DATA.categories.find((c) => String(c.catId) === String(primaryCatId));
    const crumbItems = [{ label: "Start", href: "../index.html" }];
    if (primaryCat) crumbItems.push({ label: catName(primaryCat), href: `../kategorie/${primaryCat.file}.html` });
    crumbItems.push({ label: p.label, href: `../produkte/${p.slug}.html` });

    const topCta = `<div class="cta-row">
<p><b>Interesse an ${esc(p.label)}?</b> Aktueller Preis, Boni und Garantiebedingungen finden Sie auf der offiziellen Seite des Anbieters:</p>
<p><a class="cta" href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">Offizielle Verkaufsseite ansehen</a><br>
<span class="cta-note">Affiliate-Link (Werbung) — wir verdienen ggf. eine Provision, ohne Mehrkosten für Sie.</span></p>
</div>`;

    const body = `
<h1>${esc(p.label)}</h1>
<p class="sub">Produktprofil · Marktplatz-Daten ${datemark(DATA.scrapedAt)} · Verkaufsseiten-Recherche ${datemark(DATA.researchedAt) || "—"} · Kategorien: ${cats || "Ohne Kategorie"}</p>

<div class="notice"><b>Wie diese Seite recherchiert wurde:</b> ein <b>Datenprofil</b> — offizieller Digistore24-Marktplatz-Eintrag plus wörtliche Auszüge aus der öffentlichen Verkaufsseite des Anbieters. Kein Praxis-Test. Ein Praxis-Test folgt erst, nachdem wir das Produkt selbst gekauft und genutzt haben.</div>

${tldr(p)}

${topCta}

${imgTag}

<h2>Marktplatz-Daten</h2>
<table class="specs">
<tr><th>Produkttyp</th><td>${esc(p.typeDe)}</td></tr>
<tr><th>Preis</th><td>${money(p.price, p.currency)} (${esc((p.billingTypes || []).join(", ")) || "siehe Verkaufsseite"})</td></tr>
<tr><th>Affiliate-Provision</th><td>${pct(p.commission)}</td></tr>
<tr><th>Garantie/Rückgabe</th><td>Laut Verkaufsseite des Anbieters — vor dem Kauf auf der offiziellen Seite prüfen</td></tr>
<tr><th>Anbieter</th><td>${esc(p.vendorName)} (gelistet seit ${datemark(p.createdAt)})</td></tr>
<tr><th>Marktplatz-Statistiken*</th><td>Checkout-Konversion ${pct(p.conversionRate)} · Stornoquote ${pct(p.cancelRate)} · Verdienst/Verkauf ${money(p.earningsPerSale, p.currency)}</td></tr>
</table>
<p class="sub">* Anbieter-seitige Statistiken von Digistore24; sie hängen von der Traffic-Qualität ab und sind keine Prognose.</p>
${p.description ? `<h2>Marktplatz-Beschreibung des Anbieters</h2><p>${esc(p.description)}</p>` : ""}

${researchSection(p)}

${relatedBlock}

${vendorBlock}

${altLink}

<h2>Wo Sie es sich ansehen können</h2>
<p>Aktuelle Preise, Garantie und Boni finden Sie auf der offiziellen Verkaufsseite:<br>
<a class="cta" href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">Offizielle Verkaufsseite ansehen</a></p>
<p style="font-size:.88rem;color:var(--ink-soft)">Das ist ein Affiliate-Link (Werbung) — kaufen Sie darüber, verdienen wir ggf. eine Provision, ohne Mehrkosten für Sie.</p>`;

    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.label,
        description: (p.research && p.research.metaDescription) || p.description || `${p.label} — ${p.typeDe} im Digistore24-Marktplatz`,
        ...(localImg ? { image: SITE_URL + "/" + localImg.path } : {}),
        brand: { "@type": "Brand", name: p.vendorName },
        category: (p.categories || [])[0] || "Uncategorized",
        offers: {
          "@type": "Offer",
          price: Number(Number(p.price).toFixed(2)),
          priceCurrency: p.currency === "EUR" ? "EUR" : "USD",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/produkte/${p.slug}.html`,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbItems.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.label,
          item: SITE_URL + "/" + c.href.replace(/^(\.\.\/)+/, ""),
        })),
      },
    ];
    fs.writeFileSync(file, layout({
      title: `${p.label} — Preis, Provision & Verkaufsseiten-Recherche (${p.typeDe})`,
      desc: `${p.label}: ${p.typeDe} von ${p.vendorName} auf Digistore24. Preis ${money(p.price, p.currency)}, ${pct(p.commission)} Provision, Marktplatz-Statistiken und wörtliche Verkaufsseiten-Recherche. Stand ${datemark(DATA.scrapedAt)}.`,
      body, rel: "..", path: `produkte/${p.slug}.html`, ogImage: localImg ? localImg.path : null, jsonLd,
      crumb: crumbItems,
    }));
  }

  const top = products.slice(0, 100);
  const az = [...products].sort((a, b) => a.label.localeCompare(b.label, "de"));
  const written = articleIds.size
    ? `<h2>Praxis-Tests</h2><ul>${[...articleIds].map((id) => {
        const p = products.find((x) => String(x.id) === String(id));
        return p ? `<li><a href="${p.slug}.html">${esc(p.label)}</a> — Praxis-Test</li>` : "";
      }).join("")}</ul>`
    : "";
  const body = `
<h1>Alle ${DATA.total} Produkte</h1>
<p class="sub">Jedes Produkt im Digistore24-Marktplatz mit vollständigem Profil: Marktplatz-Daten + wörtliche Verkaufsseiten-Recherche. Unten die Top 100 nach Verdienst/Verkauf, dann die komplette A–Z-Liste.</p>
${written}
<h2>Top 100 nach Verdienst/Verkauf</h2>
<ul style="line-height:2">
${top.map((p) => `<li><a href="${p.slug}.html">${esc(p.label)}</a> — ${money(p.earningsPerSale, p.currency)}/Verkauf, ${pct(p.commission)} Provision${p.research && p.research.error ? " · <b>Verkaufsseite nicht erreichbar</b>" : ""}</li>`).join("\n")}
</ul>
<h2>Vollständige Liste (A–Z, ${az.length} Produkte)</h2>
<ul class="az" style="line-height:1.9;columns:2;column-gap:34px">
${az.map((p) => `<li><a href="${p.slug}.html">${esc(p.label)}</a></li>`).join("\n")}
</ul>`;
  fs.writeFileSync(path.join(dir, "index.html"), layout({
    title: `Alle ${DATA.total} Digistore24-Produkte (A–Z) — ${SITE_NAME}`,
    desc: `Vollständige A–Z-Liste von ${DATA.total} Digistore24-Produktprofilen mit Preisen, Provisionen und Verkaufsseiten-Recherche.`,
    body, rel: "..", path: "produkte/index.html",
    crumb: [{ label: "Start", href: "../index.html" }, { label: "Alle Produkte", href: "../produkte/index.html" }],
  }));
}

// ---------- Alternativen ----------
function alternativesPages(altSlugs) {
  const dir = outPath("alternativen");
  fs.mkdirSync(dir, { recursive: true });
  let built = 0;
  for (const p of products) {
    if (!altSlugs.has(p.slug)) continue;
    const primaryCatId = (p.categoryIds || [])[0];
    const alts = products.filter((x) => x.id !== p.id && (x.categoryIds || []).includes(String(primaryCatId))).slice(0, 4);
    if (alts.length < 3) continue;
    const catObj = DATA.categories.find((c) => String(c.catId) === String(primaryCatId));
    const row = (x) => `<tr>
<td><a href="../produkte/${x.slug}.html">${esc(x.label)}</a></td>
<td>${esc(x.typeDe)}</td>
<td><b>${money(x.price, x.currency)}</b></td>
<td>${pct(x.commission)}</td>
<td>${pct(x.conversionRate)}</td>
<td>${pct(x.cancelRate)}</td>
<td><b>${money(x.earningsPerSale, x.currency)}</b></td>
</tr>`;
    const all = [p, ...alts];
    const body = `
<h1>${esc(p.label)}: Alternativen &amp; Vergleich</h1>
<p class="sub">${catObj ? esc(catName(catObj)) : ""} · Marktplatz-Daten ${datemark(DATA.scrapedAt)} · <a href="../produkte/${p.slug}.html">vollständiges ${esc(p.label)}-Profil</a></p>
<div class="tldr"><b>Auf einen Blick:</b> die nächstähnlichen Digistore24-Angebote zu <b>${esc(p.label)}</b> (${esc(p.typeDe)}, ${money(p.price, p.currency)}, ${money(p.earningsPerSale, p.currency)} Verdienst/Verkauf), verglichen über offizielle Marktplatz-Statistiken. „Nächstähnlich" bedeutet: gleiche Kategorie, sortiert nach Verdienst pro Verkauf — ein objektives Maß, keine Empfehlung.</div>
<table class="specs">
<tr><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Checkout-CR*</th><th>Storno*</th><th>Verdienst/Verkauf</th></tr>
<tr class="self"><td><b>${esc(p.label)}</b> (diese Seite)</td><td>${esc(p.typeDe)}</td><td><b>${money(p.price, p.currency)}</b></td><td>${pct(p.commission)}</td><td>${pct(p.conversionRate)}</td><td>${pct(p.cancelRate)}</td><td><b>${money(p.earningsPerSale, p.currency)}</b></td></tr>
${alts.map(row).join("\n")}
</table>
<p class="sub">* Anbieter-seitige Marktplatz-Statistiken von Digistore24; abhängig von der Traffic-Qualität, keine Prognose. Preise/Provisionen ändern sich — offizielle Seiten sind die maßgebliche Quelle.</p>
<h2>Wie man anhand der Zahlen wählt</h2>
<ul>
<li><b>Höchster Verdienst/Verkauf:</b> ${esc(all.sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0))[0].label)} (${money(Math.max(...all.map((x) => x.earningsPerSale || 0)), "USD")}).</li>
<li><b>Beste Checkout-Konversion:</b> ${esc([...all].sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))[0].label)} (${pct(Math.max(...all.map((x) => x.conversionRate || 0)))}).</li>
<li><b>Niedrigste Stornoquote:</b> ${esc([...all].sort((a, b) => (a.cancelRate || 99) - (b.cancelRate || 99))[0].label)} (${pct(Math.min(...all.map((x) => x.cancelRate || 99)))}) — weniger Kaufreue.</li>
<li><b>Niedrigster Preis:</b> ${esc([...all].sort((a, b) => (a.price || 1e9) - (b.price || 1e9))[0].label)} (${money(Math.min(...all.map((x) => x.price || 1e9)), p.currency)}).</li>
</ul>
<p>Jedes Produkt verlinkt auf ein vollständiges Profil mit wörtlicher Verkaufsseiten-Recherche. Preis und Garantie immer auf der offiziellen Seite bestätigen.</p>`;
    const jsonLd = [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${p.label} Alternativen auf Digistore24`,
      itemListElement: [p, ...alts].map((x, i) => ({
        "@type": "ListItem", position: i + 1,
        url: `${SITE_URL}/produkte/${x.slug}.html`, name: x.label,
      })),
    }];
    fs.writeFileSync(path.join(dir, p.slug + ".html"), layout({
      title: `${p.label} Alternativen: die 4 nächsten Digistore24-Angebote im Vergleich`,
      desc: `${p.label} (${money(p.price, p.currency)}) im Vergleich mit den nächsten Alternativen in ${catObj ? catName(catObj) : "Marktplatz"}: Preis, Provision, Konversion und Stornoquote nebeneinander.`,
      body, rel: "..", path: `alternativen/${p.slug}.html`, jsonLd,
      crumb: [{ label: "Start", href: "../index.html" }, { label: p.label, href: `../produkte/${p.slug}.html` }, { label: "Alternativen", href: `../alternativen/${p.slug}.html` }],
    }));
    built++;
  }
  return built;
}

// ---------- Empfehlungen (Best-of) ----------
function bestOfPages() {
  const dir = outPath("empfehlungen");
  fs.mkdirSync(dir, { recursive: true });
  let built = 0;
  for (const c of DATA.categories) {
    if (c.count < 8) continue;
    const items = products.filter((p) => (p.categoryIds || []).includes(String(c.catId)));
    if (items.length < 8) continue;
    const byEps = [...items].sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0));
    const bestOverall = byEps[0];
    const bestConv = [...items].sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))[0];
    const budget = [...items].sort((a, b) => (a.price || 1e9) - (b.price || 1e9)).find((p) => (p.earningsPerSale || 0) > 0);
    const pick = (label, p, why) => `<div class="card">
  <div class="title">${label}: <a href="../produkte/${p.slug}.html">${esc(p.label)}</a></div>
  <div class="meta"><span>Preis <b>${money(p.price, p.currency)}</b></span><span>Provision <b>${pct(p.commission)}</b></span><span>Verdienst/Verkauf <b>${money(p.earningsPerSale, p.currency)}</b></span></div>
  <p class="desc">${why}</p>
</div>`;
    const avg = items.reduce((a, p) => a + (p.price || 0), 0) / items.length;
    const body = `
<h1>Die besten ${esc(catName(c))}-Produkte auf Digistore24 (${new Date().getFullYear()}, nach Zahlen)</h1>
<p class="sub">Datengestützte Auswahl · ${items.length} Angebote analysiert · Marktplatz-Daten ${datemark(DATA.scrapedAt)} · <a href="../kategorie/${c.file}.html">ganze Kategorie durchsuchen</a></p>
<div class="tldr"><b>Kernaussagen:</b>
<ul>
<li>Das Regal ${esc(catName(c))} listet <b>${items.length} Angebote</b> mit einem Durchschnittspreis von <b>${money(avg, "USD")}</b>.</li>
<li>Höchster Verdienst/Verkauf aktuell: <b>${esc(bestOverall.label)}</b> mit <b>${money(bestOverall.earningsPerSale, bestOverall.currency)}</b> (${pct(bestOverall.commission)} Provision).</li>
<li>Beste Checkout-Konversion: <b>${esc(bestConv.label)}</b> mit <b>${pct(bestConv.conversionRate)}</b>. Alle Zahlen: Anbieter-seitige Marktplatz-Daten, keine Prognosen.</li>
</ul>
</div>
<div class="notice"><b>Wie diese Auswahl entstand:</b> rein rechnerisch aus offiziellen Digistore24-Marktplatz-Statistiken — keine Sponsorings, keine Praxis-Tests. „Best" heißt hier: am besten in einem gemessenen Merkmal, keine Qualitätsbewertung des Produkts.</div>
<h2>Die Auswahl</h2>
<div class="grid">
${pick("🏆 Bester Verdienst/Verkauf", bestOverall, `Zahlt Affiliates in dieser Kategorie am meisten pro Verkauf (${money(bestOverall.earningsPerSale, bestOverall.currency)}), gelistet seit ${datemark(bestOverall.createdAt)}.`)}
${pick("⚡ Beste Konversion", bestConv, `Höchste Checkout-Konversion der Kategorie (${pct(bestConv.conversionRate)}) — der Trichter des Anbieters schließt am besten.`)}
${budget && budget.id !== bestOverall.id && budget.id !== bestConv.id ? pick("💡 Preis-Tipp", budget, `Niedrigster Einstiegspreis (${money(budget.price, budget.currency)}) unter den Angeboten mit relevantem Verdienst/Verkauf (${money(budget.earningsPerSale, budget.currency)}).`) : ""}
</div>
<h2>Top 10 in ${esc(catName(c))} nach Verdienst/Verkauf</h2>
<table class="specs">
<tr><th>#</th><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Verdienst/Verkauf</th><th>Checkout-CR*</th></tr>
${byEps.slice(0, 10).map((p, i) => `<tr><td>${i + 1}</td><td><a href="../produkte/${p.slug}.html">${esc(p.label)}</a></td><td>${esc(p.typeDe)}</td><td>${money(p.price, p.currency)}</td><td>${pct(p.commission)}</td><td><b>${money(p.earningsPerSale, p.currency)}</b></td><td>${pct(p.conversionRate)}</td></tr>`).join("\n")}
</table>
<p class="sub">* Anbieter-seitige Statistiken; abhängig von der Traffic-Qualität, keine Prognose. Aktuelle Preise und Garantien immer auf der offiziellen Verkaufsseite prüfen.</p>`;
    const jsonLd = [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Beste ${catName(c)}-Produkte auf Digistore24`,
      description: `Top-${catName(c)}-Angebote im Digistore24-Marktplatz, sortiert nach offiziellen Verdienst-pro-Verkauf-Statistiken.`,
      itemListElement: byEps.slice(0, 10).map((x, i) => ({
        "@type": "ListItem", position: i + 1,
        url: `${SITE_URL}/produkte/${x.slug}.html`, name: x.label,
      })),
    }];
    fs.writeFileSync(path.join(dir, `beste-${c.file}.html`), layout({
      title: `Beste ${catName(c)}-Produkte auf Digistore24 (${items.length} analysiert)`,
      desc: `Beste ${catName(c)}-Angebote auf Digistore24, ausgewählt nach offiziellen Marktplatz-Zahlen: Verdienst/Verkauf, Konversion, Preis. ${items.length} Angebote analysiert, Stand ${datemark(DATA.scrapedAt)}.`,
      body, rel: "..", path: `empfehlungen/beste-${c.file}.html`, jsonLd,
      crumb: [{ label: "Start", href: "../index.html" }, { label: catName(c), href: `../kategorie/${c.file}.html` }, { label: "Empfehlungen", href: `../empfehlungen/beste-${c.file}.html` }],
    }));
    built++;
  }
  return built;
}

// ---------- Über uns / Impressum / Datenschutz / 404 ----------
function staticPages() {
  const about = `
<h1>Über ${SITE_NAME}</h1>
<p class="sub">Unabhängiges Verzeichnis von Digistore24-Marktplatz-Produkten</p>
<h2>Was wir machen</h2>
<p>${SITE_NAME} sortiert die deutschsprachigen Angebote im <a href="https://www.digistore24.com" rel="noopener">Digistore24</a>-Affiliate-Marktplatz (${DATA.total} Produkte in ${DATA.categories.length} Kategorien, Stand ${datemark(DATA.scrapedAt)}) und veröffentlicht die Zahlen, die vor dem Kauf oder der Bewerbung zählen: Preis, Provision, Checkout-Konversion, Stornoquote, Verdienst pro Verkauf, Anbieter, Listungsalter — plus wörtliche Recherche jeder Verkaufsseite (Überschriften, Preisangaben, Garantie-Formulierungen, CTA-Texte).</p>
<h2>Wie wir recherchieren</h2>
<ul>
<li><b>Datenprofil</b> — Fakten aus dem offiziellen Marktplatz-Eintrag plus wörtliche Auszüge aus der öffentlichen Verkaufsseite, klar als Anbieteraussagen markiert. Keine Praxis-Behauptungen.</li>
<li><b>Praxis-Test</b> — wir haben das Produkt selbst gekauft und genutzt. Screenshots sind eigene.</li>
</ul>
<p>Wir veröffentlichen keine Testimonials, die wir nicht prüfen können, und zitieren keine Einkommensversprechen, die nicht auf der offiziellen Seite des Anbieters stehen. Ist eine Verkaufsseite nicht erreichbar (tote Domain, abgelaufenes Zertifikat), sagen wir das — auch das ist eine Information.</p>
<h2>Affiliate-Offenlegung (Werbung)</h2>
<p>Diese Website enthält Affiliate-Links (Werbung im Sinne des § 56 UWG bzw. kennzeichnungsrechtlicher Vorgaben). Klicken Sie auf einen Link und kaufen, erhalten wir ggf. eine Provision vom Anbieter — ohne Mehrkosten für Sie. Links sind mit „Affiliate-Link" gekennzeichnet.</p>
<h2>Kontakt & Datenquellen</h2>
<p>Fragen oder Korrekturen? Öffnen Sie ein Issue in unserem <a href="https://github.com/vsyour-cmd/digistore-picks-de" rel="noopener">GitHub-Repository</a>. Die vollständige Recherche-Datei jedes Produkts liegt versioniert unter <code>content/products/</code>. Produktdaten kommen von der offiziellen Digistore24-Marktplatz-API (eingeloggte Affiliate-Sicht); die Verkaufsseiten-Recherche wird regelmäßig aktualisiert, jede Seite zeigt ihre Datenstände.</p>`;
  fs.writeFileSync(outPath("about.html"), layout({
    title: `Über uns & Transparenz — ${SITE_NAME}`,
    desc: "Recherche-Methoden, Affiliate-Offenlegung und Kontaktdaten von DigistorePicks DE.",
    body: about, path: "about.html",
    crumb: [{ label: "Start", href: "index.html" }, { label: "Über uns", href: "about.html" }],
  }));

  // Impressum — echte Angaben des Betreibers
  const impressum = `
<h1>Impressum</h1>
<p class="sub">Anbieterkennzeichnung</p>
<h2>Anbieter</h2>
<p><b>adminstore</b><br>
Room 70, Unit 10B, 7/F, Tower B, New Mandarin Plaza,<br>
14 Science Museum Road, Tsim Sha Tsui,<br>
Kowloon, Hongkong (Sonderverwaltungszone der VR China)</p>
<h2>Kontakt</h2>
<p>E-Mail: <a href="mailto:admin@2bkf.com">admin@2bkf.com</a></p>
<h2>Verantwortlich für den Inhalt</h2>
<p>adminstore, Adresse wie oben</p>
<h2>EU-Streitschlichtung</h2>
<p>Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
<h2>Haftung für Inhalte und Links</h2>
<p>Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Für Inhalte externer Links sind ausschließlich deren Betreiber verantwortlich; zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Diese Website enthält Affiliate-Links (Werbung); näheres auf der Seite <a href="about.html">Über uns &amp; Transparenz</a>.</p>`;
  fs.writeFileSync(outPath("impressum.html"), layout({
    title: `Impressum — ${SITE_NAME}`,
    desc: "Impressum und Anbieterkennzeichnung von DigistorePicks DE.",
    body: impressum, path: "impressum.html",
    crumb: [{ label: "Start", href: "index.html" }, { label: "Impressum", href: "impressum.html" }],
  }));

  const datenschutz = `
<h1>Datenschutzerklärung</h1>
<p class="sub">Informationen zur Verarbeitung personenbezogener Daten (DSGVO)</p>
<h2>1. Verantwortlicher</h2>
<p>adminstore<br>
Room 70, Unit 10B, 7/F, Tower B, New Mandarin Plaza, 14 Science Museum Road, Tsim Sha Tsui, Kowloon, Hongkong<br>
E-Mail: <a href="mailto:admin@2bkf.com">admin@2bkf.com</a></p>
<h2>2. Hosting (GitHub Pages)</h2>
<p>Diese Website wird über GitHub Pages (GitHub, Inc., 88 Colin P Kelly Jr Street, San Francisco, CA 94107, USA) ausgeliefert. Beim Aufruf werden technisch notwendige Server-Logdaten (u. a. IP-Adresse, Zeitpunkt, User-Agent) durch GitHub verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren und effizienten Betrieb). <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" rel="noopener">Datenschutzerklärung von GitHub</a>.</p>
<h2>3. Reichweitenmessung (GoatCounter)</h2>
<p>Wir nutzen GoatCounter (Ardit Trikali p/k, Slowenien) für die Statistik der Seitenaufrufe. GoatCounter verwendet <b>keine Cookies</b> und keine Tracking-Frames; es werden keine personenbezogenen Daten an Werbenetzwerke weitergegeben. Erhoben werden Seiten-URL, Referrer, Bildschirmgröße, User-Agent und ein Sitzungs-Hash ohne Cookie-Speicherung. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. <a href="https://www.goatcounter.com/privacy" rel="noopener">GoatCounter-Datenschutz</a>.</p>
<h2>4. Affiliate-Links (Digistore24)</h2>
<p>Diese Website enthält Affiliate-Links zu Produkten, die über Digistore24 abgerechnet werden. Beim Klick werden Ihre Daten (u. a. die Affiliate-Kennung) an Digistore24 Inc. übermittelt und beim Kauf zur Abwicklung und Provisionszuordnung verarbeitet. Für Verträge mit Anbietern ist ausschließlich Digistore24 bzw. der jeweilige Anbieter verantwortlich. <a href="https://www.digistore24.com/page/privacy/2/de" rel="noopener">Datenschutzerklärung von Digistore24</a>.</p>
<h2>5. Ihre Rechte</h2>
<p>Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21 DSGVO). Zudem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde.</p>
<h2>6. Keine Cookies, kein Tracking von Drittanbietern für Werbung</h2>
<p>Diese Website setzt selbst keine Marketing- oder Analyse-Cookies und bindet keine Werbenetzwerke ein.</p>`;
  fs.writeFileSync(outPath("datenschutz.html"), layout({
    title: `Datenschutzerklärung — ${SITE_NAME}`,
    desc: "Datenschutzerklärung (DSGVO) von DigistorePicks DE.",
    body: datenschutz, path: "datenschutz.html",
    crumb: [{ label: "Start", href: "index.html" }, { label: "Datenschutz", href: "datenschutz.html" }],
  }));

  const cats = DATA.categories.slice().sort((a, b) => b.count - a.count).slice(0, 8);
  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seite nicht gefunden — ${SITE_NAME}</title>
<meta name="robots" content="noindex">
<link rel="stylesheet" href="/digistore-picks-de/assets/style.css">
</head>
<body>
<header class="site"><div class="wrap"><a class="brand" href="/digistore-picks-de/">${SITE_NAME}</a></div></header>
<main class="wrap">
<h1>Seite nicht gefunden</h1>
<p class="sub">Die angeforderte Seite existiert nicht (oder wurde bei der Datenaktualisierung umbenannt). Alles ist einen Klick entfernt:</p>
<p><a class="cta" href="/digistore-picks-de/">Zum vollständigen Verzeichnis</a></p>
<h2>Beliebte Kategorien</h2>
<div class="cat-index">
${cats.map((c) => `<a href="/digistore-picks-de/kategorie/${c.file}.html"><span>${esc(catName(c))}</span><span class="n">${c.count} Produkte</span></a>`).join("\n")}
</div>
</main>
<footer class="site"><div class="wrap"><div>© ${new Date().getFullYear()} ${SITE_NAME} · <a href="/digistore-picks-de/impressum.html">Impressum</a> · <a href="/digistore-picks-de/datenschutz.html">Datenschutz</a></div></div></footer>
${GOATCOUNTER}
</body>
</html>`;
  fs.writeFileSync(outPath("404.html"), html);
}

const altSlugs = computeAltSlugs();
homePage();
categoryPages();
profilePages(altSlugs);
const altCount = alternativesPages(altSlugs);
const bestCount = bestOfPages();
staticPages();
console.log(`Built (DE): index, about, impressum, datenschutz, 404, categories (paginated), ${products.length} profiles, ${altCount} alternatives, ${bestCount} empfehlungen. Articles protected: ${articleIds.size}`);
