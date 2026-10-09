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
    .replace(/\$\{/g, "$ { ")
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

// Deep details (Anwendung/Hinweise/Galerie, aus erneuter Verkaufsseiten-Recherche)
const DETAILS_FILE = process.env.DETAILS_FILE || "G:/Digistore24/data-de/details-de.json";
const DETAILS = fs.existsSync(DETAILS_FILE) ? JSON.parse(fs.readFileSync(DETAILS_FILE, "utf8")) : {};
const productDetails = (id) => DETAILS[id] || null;

// Cross-Language: Datensatz der englischen Website (gleiche Anbieter verlinken sich gegenseitig)
const EN_DATASET_FILE = "G:/Digistore24/site/data/dataset.json";
const EN_DATA = fs.existsSync(EN_DATASET_FILE) ? JSON.parse(fs.readFileSync(EN_DATASET_FILE, "utf8")) : null;
const enVendorMap = (() => {
  if (!EN_DATA) return new Map();
  const m = new Map();
  for (const p of EN_DATA.products) {
    const k = (p.vendorName || "").toLowerCase();
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  }
  for (const [, arr] of m) arr.sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0));
  return m;
})();

const TYPE_USAGE_DE = {
  "E-books": "E-Books auf Digistore24 werden als digitaler Download geliefert (meist PDF/EPUB): direkt nach dem Checkout erhalten Sie einen Downloadlink oder Mitgliederzugang und können auf jedem Gerät lesen.",
  "Downloads": "Download-Produkte werden digital geliefert: sofort nach dem Checkout erhalten Sie Downloadlinks (oder Zugang zu einem Mitgliederbereich) — kein physischer Versand.",
  "Member area and video courses": "Videokurse laufen über einen Mitgliederbereich: nach dem Checkout erhalten Sie Zugangsdaten per E-Mail und können die Lektionen in Ihrem eigenen Tempo streamen.",
  "Supplements - health": "Nahrungsergänzungen werden physisch versandt; Einnahme-/Dosierhinweise stehen auf dem Etikett und der offiziellen Verkaufsseite. Halten Sie sich genau ans Etikett.",
  "Supplements - for slimming": "Abnehm-Präparate werden physisch versandt; folgen Sie der Dosierung auf dem Etikett und der offiziellen Verkaufsseite.",
  "Software": "Software wird digital geliefert — entweder als direkter Download oder per Lizenzschlüssel/Mitgliederbereich nach dem Checkout.",
  "Book (printed)": "Gedruckte Bücher werden physisch versandt; Lieferzeit hängt von Ihrer Region ab und wird im Checkout angezeigt.",
  "Deliverable": "Physische Produkte werden an Ihre Adresse versandt; Versandkosten und -zeiten erscheinen im Checkout.",
  "Audio book (download)": "Hörbücher werden direkt nach dem Checkout als digitaler Download (MP3) geliefert — auf jedem Gerät abspielbar.",
  "Online coaching": "Online-Coaching läuft über geplante Videocalls und/oder einen Mitgliederbereich; der Coach meldet sich nach dem Kauf zur Terminvereinbarung.",
  "Webinar": "Webinare sindLive-Online-Sitzungen: nach der Anmeldung erhalten Sie den Link per E-Mail für den Termin.",
  "Remote service provided electronically": "Remote-Dienstleistungen werden elektronisch erbracht — der Anbieter meldet sich nach dem Kauf.",
};

function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items
    .map((c, i) => (i === items.length - 1 ? `<span>${esc(c.label)}</span>` : `<a href="${c.href}">${esc(c.label)}</a>`))
    .join(' <span class="sep">›</span> ')}</nav>`;
}

// SERP 保护:标题 ≤68 字符(词边界截断),描述 ≤158 字符
const capTitle = (s, max = 68) => {
  s = String(s == null ? "" : s).trim().replace(/\s+/g, " ");
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 30 ? cut.slice(0, sp) : cut).replace(/[\s—–-]+$/g, "").replace(/[\s—–-]+$/, "") + "…";
};
const capDesc = (s, max = 158) => {
  s = String(s == null ? "" : s).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > 80 ? cut.slice(0, sp) : cut).replace(/[\s,;]+$/g, "").replace(/[\s,;]+$/, "") + "…";
};

function layout({ title, desc, body, rel = ".", path = "", ogImage = null, jsonLd = [], crumb = null, hreflangLinks = "" }) {
  const canonical = SITE_URL + "/" + path;
  const ogImg = ogImage
    ? (ogImage.startsWith("http") ? ogImage : SITE_URL + "/" + ogImage.replace(/^(\.\.\/)+/, ""))
    : SITE_URL + "/assets/og-default.png";
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(capTitle(title))}</title>
<meta name="description" content="${esc(capDesc(desc))}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(capTitle(title))}">
<meta property="og:description" content="${esc(capDesc(desc))}">
<meta property="og:url" content="${canonical}">
${ogImg ? `<meta property="og:image" content="${esc(ogImg)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${esc(ogImg)}">` : '<meta name="twitter:card" content="summary">'}
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="alternate" type="application/atom+xml" title="Blog feed" href="${rel}/feed.xml">
<link rel="stylesheet" href="${rel}/assets/style.css">
${hreflangLinks}${VERIFY_META}
${jsonLd.map((j) => `<script type="application/ld+json">${jsonSafe(j)}</script>`).join("\n")}
</head>
<body>
<a class="skip-link" href="#main">Zum Inhalt springen</a>
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
<main id="main" class="wrap">
${crumb ? crumbs(crumb) + "\n" : ""}${body}
</main>
<footer class="site"><div class="wrap">
  <div class="disclosure"><b>Werbe-Hinweis:</b> ${SITE_NAME} enthält Affiliate-Links (Werbung). Kaufen Sie über einen Link, erhalten wir ggf. eine Provision vom Anbieter – für Sie entstehen keine Mehrkosten. Alle Marktplatz-Statistiken (Preis, Provision, Konversion, Verdienst) stammen vom offiziellen Digistore24-Marktplatz und sind keine Prognose Ihrer Ergebnisse.</div>
  <div>© ${new Date().getFullYear()} ${SITE_NAME} · Produktdaten: Digistore24-Marktplatz (Stand ${datemark(DATA.scrapedAt)}) · <a href="${rel}/impressum.html">Impressum</a> · <a href="${rel}/datenschutz.html">Datenschutz</a> · <a href="${rel}/about.html">Über uns &amp; Transparenz</a> · <a href="https://vsyour-cmd.github.io/digistore-picks/" hreflang="en">English site: 1243 Digistore24 products</a> · <a href="${rel}/changelog.html">Neuigkeiten</a></div>
</div></footer>
${GOATCOUNTER}
</body>
</html>`;
}

function imgRel(p, rel, attrs = "") {
  const im = localImage(p.id);
  if (!im) return "";
  const dims = im.w && im.h ? `width="${im.w}" height="${im.h}"` : "";
  return `<a href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank" aria-label="${esc(p.label)} — offizielle Verkaufsseite (Affiliate-Link)"><img src="${rel}/${im.path}" ${dims} ${attrs} loading="lazy" alt="${esc(p.label)}" onerror="this.style.display='none'"></a>`;
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

const HREF_HOME = '<link rel="alternate" hreflang="en" href="https://vsyour-cmd.github.io/digistore-picks/"><link rel="alternate" hreflang="de" href="https://vsyour-cmd.github.io/digistore-picks-de/">';
function enCatHref(catId) {
  if (!EN_DATA) return null;
  const c2 = EN_DATA.categories.find((c) => String(c.catId) === String(catId));
  const c1 = DATA.categories.find((c) => String(c.catId) === String(catId));
  if (!c2 || !c1) return null;
  const mk = (cats) => {
    const cnt = {};
    for (const c of cats) { const b = slug(c.label); cnt[b] = (cnt[b] || 0) + 1; }
    return (c) => (cnt[slug(c.label)] > 1 ? slug(c.section) + "-" + slug(c.label) : slug(c.label));
  };
  const enFile = mk(EN_DATA.categories)(c2);
  const deFile = mk(DATA.categories)(c1);
  return '<link rel="alternate" hreflang="en" href="https://vsyour-cmd.github.io/digistore-picks/category/' + enFile + '.html"><link rel="alternate" hreflang="de" href="https://vsyour-cmd.github.io/digistore-picks-de/kategorie/' + deFile + '.html">';
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
<p class="sub">Rangliste nach dem vom Marktplatz gemeldeten Verdienst pro Verkauf. Offizielle Marktplatz-Statistiken, keine Prognosen von uns.</p>
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
    hreflangLinks: HREF_HOME,
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
      const isRealCat = DATA.categories.some((x) => x.file === c.file);
      const catQas = categoryFaq(c, items);
      const faqBlock = `<h2 id="faq">FAQ: ${esc(catName(c))} auf Digistore24</h2>
${catQas.map(({ q, a }) => `<h3>${esc(q)}</h3>\n<p>${a}</p>`).join("\n")}`;
      const faqLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: catQas.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") },
        })),
      };
      const bestOf = idx === 0 && isRealCat && items.length >= 8 ? `<p class="sub">Wenig Zeit? Zu den <a href="../empfehlungen/beste-${c.file}.html">Top-Empfehlungen in ${esc(catName(c))}</a> — rechnerisch aus denselben Daten ermittelt.</p>` : "";
      const body = `
<h1>${esc(catName(c))}</h1>
<p class="sub">${items.length} Produkte · Bereich: ${esc(c.sectionDe || c.section)}${pageSub} · <a href="../index.html">alle Kategorien</a> · <a href="../produkte/index.html">alle Produkte A–Z</a></p>
${intro}
${bestOf}
<div class="grid">
${chunk.map((p) => productCard(p, "..")).join("\n")}
</div>
${pager(idx)}
${idx === 0 ? faqBlock : ""}
<p class="sub" style="margin-top:22px">* Marktplatz-Statistiken werden von Digistore24 über den Traffic der Anbieter gemeldet; sie hängen von der Traffic-Qualität ab und sind keine Prognose.</p>`;
      const jsonLd = [
        ...(idx === 0 ? [faqLd] : []),
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
        body, rel: "..", path: `kategorie/${file}`, jsonLd, hreflangLinks: enCatHref(c.catId) || "",
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
  return `<h2 id="research">Von der Verkaufsseite des Anbieters</h2>
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
    p.vendorSiblings = vendorSiblings;
    const vendorBlock = vendorSiblings.length
      ? `<h2 id="vendor">Weitere Angebote von ${esc(p.vendorName)}</h2>
<div class="grid">${vendorSiblings.map((x) => productCard(x, "..")).join("\n")}</div>`
      : "";

    const altLink = altSlugs.has(p.slug)
      ? `<p class="sub">Optionen vergleichen? <a href="../alternativen/${p.slug}.html">${esc(p.label)} im Vergleich mit den nächsten Alternativen</a> — Marktplatz-Zahlen direkt nebeneinander.</p>`
      : "";
    const altData = altSlugs.has(p.slug)
      ? products.filter((x) => x.id !== p.id && (x.categoryIds || []).includes(String(primaryCatId))).slice(0, 4)
      : [];
    const compareBlock = altData.length >= 3
      ? `<h2>Wie schneidet ${esc(p.label)} ab? (Marktplatz-Zahlen)</h2>
${compareTable(p, altData)}
<p class="sub">* Anbieter-seitige Statistiken; abhängig von der Traffic-Qualität, keine Prognose. Vollständiger Kontext: <a href="../alternativen/${p.slug}.html">Alternativen-Seite zu ${esc(p.label)}</a>.</p>`
      : "";

    // Verknüpfungen: gleicher Anbieter auf EN-Seite / weitere Kategorien / ähnlicher Preis
    const enList = (enVendorMap.get((p.vendorName || "").toLowerCase()) || []).slice(0, 3);
    const crossBlock = enList.length
      ? `<h2>Gleicher Anbieter auf unserer englischen Website</h2>
<ul style="line-height:1.9">
${enList.map((x) => `<li><a href="https://vsyour-cmd.github.io/digistore-picks/reviews/${slug(x.label)}-${x.id}.html" hreflang="en">${esc(x.label)}</a> — ${money(x.price, x.currency)}${x.categories && x.categories.length ? ` <span class="sub">(${esc(x.categories[0])})</span>` : ""}</li>`).join("\n")}
</ul>
<p class="sub">Gleicher Anbieter, englischsprachige Marktplatz-Listings.</p>`
      : "";
    const relatedIds = new Set(related.map((r) => r.id));
    const priceNear = primaryCatId
      ? products.filter((x) => x.id !== p.id && !relatedIds.has(x.id) && (x.categoryIds || []).includes(String(primaryCatId)) && x.price && p.price && Math.abs(x.price - p.price) / Math.max(p.price, 1) <= 0.35).slice(0, 4)
      : [];
    const priceNearBlock = priceNear.length
      ? `<h2>Ähnliche Preislage in ${esc(p.categories[0] ? catName(DATA.categories.find((c) => c.label === p.categories[0]) || { labelDe: p.categories[0] }) : "dieser Kategorie")}</h2>
<div class="grid">${priceNear.map((x) => productCard(x, "..")).join("\n")}</div>`
      : "";
    const otherCats = (p.categoryIds || []).slice(1).map((id) => DATA.categories.find((c) => String(c.catId) === String(id))).filter(Boolean).slice(0, 2);
    const otherCatsBlock = otherCats.length
      ? `<h2>${esc(p.label)} ist auch gelistet in</h2>
<p>${otherCats.map((c) => `<a href="../kategorie/${c.file}.html">${esc(catName(c))}</a> (${c.count} Produkte)`).join(" · ")}</p>`
      : "";
    const methodBox = `<h2 id="method">Wie wir Produkte wie ${esc(p.label)} bewerten</h2>
<p class="sub">Sechs Prüfungen, ausschließlich mit offiziellen Marktplatz-Zahlen. <a href="../blog/digistore24-zahlen-checkliste.html">Die vollständige Bewertungsmethode lesen</a> · <a href="../about.html">unsere Recherche-Standards &amp; Kennzeichnung</a>.</p>`;
    const faqQas = faqData(p, altData);
    const faqBlock = faqSection(p, faqQas);
    const faqLd = faqJsonLd(p, faqQas);

    const primaryCat = DATA.categories.find((c) => String(c.catId) === String(primaryCatId));
    const crumbItems = [{ label: "Start", href: "../index.html" }];
    if (primaryCat) crumbItems.push({ label: catName(primaryCat), href: `../kategorie/${primaryCat.file}.html` });
    crumbItems.push({ label: p.label, href: `../produkte/${p.slug}.html` });

    const topCta = `<div class="cta-row">
<p><b>Interesse an ${esc(p.label)}?</b> Aktueller Preis, Boni und Garantiebedingungen finden Sie auf der offiziellen Seite des Anbieters:</p>
<p><a class="cta" href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">Offizielle Verkaufsseite ansehen</a><br>
<span class="cta-note">Affiliate-Link (Werbung) — wir verdienen ggf. eine Provision, ohne Mehrkosten für Sie.</span></p>
</div>`;

    const stickyCta = `<div class="sticky-cta"><div class="sc-info"><span class="sc-price">${money(p.price, p.currency)}</span><span class="sc-note">über Digistore24 · Werbung</span></div><a class="cta" href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">Zur Verkaufsseite</a></div>`;

    const body = `
<h1>${esc(p.label)}</h1>
<p class="sub">Produktprofil · Marktplatz-Daten ${datemark(DATA.scrapedAt)} · Verkaufsseiten-Recherche ${datemark(DATA.researchedAt) || "—"} · Kategorien: ${cats || "Ohne Kategorie"}</p>

<div class="notice"><b>Wie diese Seite recherchiert wurde:</b> ein <b>Datenprofil</b> — offizieller Digistore24-Marktplatz-Eintrag plus wörtliche Auszüge aus der öffentlichen Verkaufsseite des Anbieters. Kein Praxis-Test. Ein Praxis-Test folgt erst, nachdem wir das Produkt selbst gekauft und genutzt haben.</div>

${tldr(p)}

${topCta}

${imgTag}

<h2 id="record">Marktplatz-Daten</h2>
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

${usageSection(p)}

${galleryBlock(p)}

${cautionSection(p)}

${faqBlock}

${relatedBlock}

${vendorBlock}

${crossBlock}

${altLink}

${compareBlock}

${otherCatsBlock}

${priceNearBlock}

${relatedSearches(p, altSlugs)}

<h2>Wo Sie es sich ansehen können</h2>

<h2>Wo Sie es sich ansehen können</h2>
<p>Aktuelle Preise, Garantie und Boni finden Sie auf der offiziellen Verkaufsseite:<br>
<a class="cta" href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">Offizielle Verkaufsseite ansehen</a></p>
<p style="font-size:.88rem;color:var(--ink-soft)">Das ist ein Affiliate-Link (Werbung) — kaufen Sie darüber, verdienen wir ggf. eine Provision, ohne Mehrkosten für Sie.</p>

${sourcesBlock(p)}

${methodBox}

${interactionBlock(p)}

${stickyCta}`;

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
      title: `${p.label} — Preis, Provision & Recherche`,
      desc: `${p.label}: ${p.typeDe} von ${p.vendorName} auf Digistore24. Preis ${money(p.price, p.currency)}, ${pct(p.commission)} Provision, Marktplatz-Statistiken und wörtliche Verkaufsseiten-Recherche. Stand ${datemark(DATA.scrapedAt)}.`,
      body, rel: "..", path: `produkte/${p.slug}.html`, ogImage: localImg ? localImg.path : null, jsonLd: [...jsonLd, faqLd],
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

// ---------- Anwendung / Hinweise / Galerie / Vergleich ----------
function usageSection(p) {
  const d = productDetails(p.id);
  if (d && d.usage && d.usage.length) {
    return `<h2>Anwendung — laut Anbieter</h2>
<div class="notice"><b>Anbieteraussagen</b>, wörtlich aus der offiziellen Verkaufsseite übernommen — keine von uns geprüften Anwendungshinweise.</div>
${d.usage.map((t) => `<blockquote>${esc(t)}</blockquote>`).join("")}`;
  }
  const generic = TYPE_USAGE_DE[p.type];
  if (generic) {
    return `<h2>Wie Produkte dieser Art geliefert werden</h2>
<p class="sub"><b>Allgemeiner Hinweis zu diesem Produkttyp</b> (keine anbieterspezifische Anleitung): ${esc(generic)} Für die genaue Anwendung von ${esc(p.label)} sind die offizielle Verkaufsseite und die enthaltenen Materialien maßgeblich.</p>`;
  }
  return "";
}

function cautionSection(p) {
  const items = [];
  const cat = DATA.categories.find((c) => String(c.catId) === String((p.categoryIds || [])[0]));
  const catItems = cat ? products.filter((x) => (x.categoryIds || []).includes(String(cat.catId))) : [];
  const catCancelMedian = catItems.length
    ? [...catItems].map((x) => x.cancelRate || 0).sort((a, b) => a - b)[Math.floor(catItems.length / 2)]
    : null;
  if ((p.cancelRate || 0) >= 10 && catCancelMedian != null && p.cancelRate >= catCancelMedian) {
    items.push(`<b>Hohe Stornoquote:</b> ${pct(p.cancelRate)} der Käufer stornieren (Kategorie-Median: ${pct(catCancelMedian)}). Lesen Sie die Kündigungsbedingungen auf der Verkaufsseite, bevor Sie ein Abo eingehen.`);
  }
  if ((p.price || 0) >= 197) {
    items.push(`<b>Hoher Preis:</b> ${money(p.price, p.currency)} ist eine erhebliche Ausgabe — prüfen Sie, ob es einen Zahlungsplan gibt, und vergleichen Sie zuerst die günstigeren Alternativen der Kategorie.`);
  }
  if (p.research && p.research.error) {
    items.push(`<b>Verkaufsseite derzeit nicht erreichbar</b> (${esc(p.research.error.slice(0, 60))}) — prüfen Sie, ob das Angebot noch aktiv ist, bevor Sie kaufen oder bewerben.`);
  }
  if (p.research && !p.research.error && !p.research.guaranteeMention) {
    items.push(`<b>Keine Garantie-Formulierung in unserer Recherche gefunden</b> — bestätigen Sie das Rückgabefenster auf der offiziellen Seite, bevor Sie kaufen.`);
  }
  if (/supplement/i.test(p.type)) {
    items.push(`<b>Allgemeiner Hinweis:</b> Nahrungsergänzungen sind kein Ersatz für eine ausgewogene Ernährung und gesunde Lebensweise; im Zweifel ärztlich beraten lassen — besonders in Schwangerschaft, bei Medikamenteneinnahme oder Vorerkrankungen. Allgemeine Information, keine medizinische Beratung.`);
  }
  const d = productDetails(p.id);
  if (d && d.caution && d.caution.length) {
    return `<h2>Gut zu wissen</h2>
<ul>
${items.map((x) => `<li>${x}</li>`).join("\n")}
${d.caution.map((t) => `<li><i>Hinweise der Verkaufsseite</i> (wörtlich, nicht von uns geprüft): „${esc(t)}"</li>`).join("\n")}
</ul>`;
  }
  if (!items.length) return "";
  return `<h2>Gut zu wissen</h2>
<ul>
${items.map((x) => `<li>${x}</li>`).join("\n")}
</ul>`;
}

function galleryBlock(p) {
  const d = productDetails(p.id);
  if (!d || !d.gallery || !d.gallery.length) return "";
  return `<h2>Weitere Bilder (von der Verkaufsseite des Anbieters)</h2>
<div class="gallery">
${d.gallery.map((g) => `<a href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank"><img src="../${g.file}" width="${g.width}" height="${g.height}" loading="lazy" alt="${esc(p.label)}" onerror="this.style.display='none'"></a>`).join("\n")}
</div>
<p class="sub">Bilder stammen von der offiziellen Verkaufsseite des Anbieters und zeigen das Produkt, wie es beworben wird.</p>`;
}

function compareTable(p, alts) {
  const row = (x, self = false) => `<tr${self ? ' class="self"' : ""}>
<td>${self ? `<b>${esc(x.label)}</b>` : `<a href="../produkte/${x.slug}.html">${esc(x.label)}</a>`}</td>
<td>${esc(x.typeDe)}</td>
<td><b>${money(x.price, x.currency)}</b></td>
<td>${pct(x.commission)}</td>
<td>${pct(x.conversionRate)}</td>
<td>${pct(x.cancelRate)}</td>
<td><b>${money(x.earningsPerSale, x.currency)}</b></td>
</tr>`;
  return `<table class="specs">
<tr><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Checkout-CR*</th><th>Storno*</th><th>Verdienst/Verkauf</th></tr>
${row(p, true)}
${alts.map((x) => row(x)).join("\n")}
</table>`;
}

// Keyword-Tags (interne Verlinkung) + Quellen + Bewertungsmethode + Interaktion
function relatedSearches(p, altSlugs) {
  const pills = [];
  if (altSlugs && altSlugs.has(p.slug)) pills.push([`${p.label} Alternativen`, `../alternativen/${p.slug}.html`]);
  pills.push([`${p.label} Preis & Daten`, "#record"]);
  pills.push([`${p.label} Erfahrungen & Recherche`, "#research"]);
  if (p.vendorSiblings && p.vendorSiblings.length) pills.push([`Alle ${p.vendorName} Angebote`, "#vendor"]);
  const cat = DATA.categories.find((c) => String(c.catId) === String((p.categoryIds || [])[0]));
  if (cat) {
    pills.push([`${catName(cat)} auf Digistore24`, `../kategorie/${cat.file}.html`]);
    if (cat.count >= 8) pills.push([`Beste ${catName(cat)} Produkte`, `../empfehlungen/beste-${cat.file}.html`]);
  }
  pills.push([`${p.label} FAQ`, "#faq"]);
  pills.push([`Wie wir Produkte bewerten`, `../blog/digistore24-zahlen-checkliste.html`]);
  return `<h2>Ähnliche Suchanfragen</h2>
<div class="pills">
${pills.map(([t, href]) => `<a href="${href}">${esc(t)}</a>`).join("\n")}
</div>`;
}

function sourcesBlock(p) {
  return `<h2>Quellen &amp; weiterführende Informationen</h2>
<ul style="line-height:1.9">
<li><b>Offizielle Verkaufsseite</b> (aktueller Preis, Garantie, Boni): <a href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">${esc((p.salesPageUrl || "").replace(/^https?:\/\//, "").slice(0, 60))}</a> (Affiliate-Link)</li>
<li><b>Öffentliche Digistore24-Produktseite:</b> <a href="https://www.digistore24.com/product/${p.productId}" rel="nofollow noopener" target="_blank">digistore24.com/product/${p.productId}</a></li>
<li><b>Vollständige Recherche-Datei (Markdown, versioniert):</b> <a href="https://github.com/vsyour-cmd/digistore-picks-de/blob/main/content/products/${p.id}-${slug(p.label)}.md" rel="noopener">content/products/${p.id}-${slug(p.label)}.md</a></li>
${p.affiliateSupportPageUrl ? `<li><b>Affiliate-Supportseite des Anbieters:</b> <a href="${esc(p.affiliateSupportPageUrl)}" rel="nofollow noopener" target="_blank">${esc(p.affiliateSupportPageUrl.replace(/^https?:\/\//, "").slice(0, 60))}</a></li>` : ""}
<li><b>Marktplatz-Kategorie:</b> ${(p.categories || [])[0] ? `<a href="../kategorie/${(DATA.categories.find((c) => c.label === p.categories[0]) || {}).file || ""}.html">${esc(catName(DATA.categories.find((c) => c.label === p.categories[0]) || { labelDe: p.categories[0] }))}</a>` : "Ohne Kategorie"}</li>
</ul>`;
}

function interactionBlock(p) {
  const q = encodeURIComponent(p.label);
  const mail = encodeURIComponent("Korrektur: " + p.label);
  return `<h2>Fragen oder eigene Erfahrungen mit ${esc(p.label)}?</h2>
<p>Praxis-Tests veröffentlichen wir erst, nachdem wir ein Produkt selbst gekauft haben — aber Ihre Erfahrung hilft anderen Lesern:
<a href="https://github.com/vsyour-cmd/digistore-picks-de/discussions?discussions_q=${q}" rel="noopener" target="_blank">Diskussion zu ${esc(p.label)} auf GitHub starten/verfolgen</a>.
Falsche Zahl gefunden? <a href="mailto:admin@2bkf.com?subject=${mail}">Korrektur melden</a> — jede Seite zeigt ihre Datenstände, Korrekturen gelten für die ganze Website.</p>`;
}

// FAQ: Antworten ausschließlich aus offiziellen Marktplatz-Daten (berechnet) oder Anbieteraussagen (markiert), mit echten internen Links
function faqData(p, altData) {
  const gm = p.research && !p.research.error && p.research.guaranteeMention;
  const q = encodeURIComponent(p.label);
  const qas = [];
  qas.push({
    q: `Was ist ${p.label}?`,
    a: `${p.label} ist ein Angebot des Typs „${p.typeDe}" im Digistore24-Marktplatz, Anbieter: <a href="#vendor">${p.vendorName}</a>, gelistet seit <b>${datemark(p.createdAt)}</b>.${(p.categories || []).length ? ` Eingepflegt unter ${p.categories.slice(0, 2).map((c) => {
      const co = DATA.categories.find((x) => x.label === c);
      return co ? `<a href="../kategorie/${co.file}.html">${catName(co)}</a>` : catName(co);
    }).join(" und ")}.` : ""} Digistore24 wickelt Checkout, Lieferung und Rückgaben ab.`,
  });
  qas.push({
    q: `Wie viel kostet ${p.label}?`,
    a: `Der Digistore24-Marktplatz listet es für <b>${money(p.price, p.currency)}</b> (${(p.billingTypes || []).join(", ").toLowerCase() || "siehe Verkaufsseite"}). Preise legt der Anbieter fest und können sich ändern — der <a href="#record">Marktplatz-Eintrag oben</a> zeigt den Schnappschuss; die offizielle Verkaufsseite zeigt den aktuellen Preis.`,
  });
  qas.push({
    q: `Gibt es eine Geld-zurück-Garantie für ${p.label}?`,
    a: gm
      ? `Die Verkaufsseite des Anbieters wirbt mit: „${p.research.guaranteeMention}". Das Garantiefenster legt der Anbieter fest — prüfen Sie die aktuellen Bedingungen vor dem Kauf auf der offiziellen Seite. Die Abwicklung läuft über Digistore24.`
      : `Unsere Verkaufsseiten-Recherche hat keine explizite Garantie-Formulierung gefunden. Viele Digistore24-Produkte bieten 60 Tage Geld-zurück, aber das legt jeder Anbieter selbst fest — bestätigen Sie es auf der offiziellen Verkaufsseite, bevor Sie kaufen.`,
  });
  qas.push({
    q: `Ist ${p.label} seriös?`,
    a: `Wir bewerten keine Seriosität — wir veröffentlichen überprüfbare Zahlen: Anbieter <b>${p.vendorName}</b> (gelistet seit ${datemark(p.createdAt)}), Checkout-Konversion ${pct(p.conversionRate)}, Stornoquote ${pct(p.cancelRate)}, Affiliate-Verdienst/Verkauf ${money(p.earningsPerSale, p.currency)} (alles Anbieter-seitige Marktplatz-Statistiken). Lesen Sie unsere <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Bewertungsmethode</a> und entscheiden Sie anhand der Zahlen — oder <a href="https://github.com/vsyour-cmd/digistore-picks-de/discussions?discussions_q=${q}" rel="noopener">diskutieren Sie ${esc(p.label)} auf GitHub</a>.`,
  });
  if (altData && altData.length >= 3) {
    qas.push({
      q: `Gibt es Alternativen zu ${p.label}?`,
      a: `Ja — die nächstähnlichen Angebote derselben Kategorie sind ${altData.slice(0, 3).map((x) => `<a href="../produkte/${x.slug}.html">${x.label}</a>`).join(", ")}. Details in der <a href="#compare">Vergleichstabelle oben</a> bzw. auf der <a href="../alternativen/${p.slug}.html">Alternativen-Seite</a> mit allen Marktplatz-Zahlen.`,
    });
  }
  qas.push({
    q: `Wo kann ich ${p.label} sicher kaufen?`,
    a: `Nur über die <a href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">offizielle Verkaufsseite</a>, die auf dieser Seite verlinkt ist (Checkout und Rückgaben laufen über Digistore24). Prüfen Sie dort Preis und Garantie vor der Bestellung. Der Link ist ein Affiliate-Link — der Kauf unterstützt diese Website ohne Mehrkosten für Sie.`,
  });
  return qas;
}

function faqSection(p, qas) {
  return `<h2 id="faq">Häufige Fragen zu ${esc(p.label)}</h2>
${qas.map(({ q, a }) => `<h3>${esc(q)}</h3>\n<p>${a}</p>`).join("\n")}`;
}

function faqJsonLd(p, qas) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a.replace(/<a [^>]*>/g, "").replace(/<\/a>/g, "").replace(/<[^>]+>/g, "") },
    })),
  };
}

// Kategorie-FAQ (berechnet aus allen Angeboten der Kategorie)
function categoryFaq(c, items) {
  const cn = catName(c);
  const avg = items.length ? items.reduce((a, p) => a + (p.price || 0), 0) / items.length : 0;
  const best = [...items].sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0))[0];
  const bestConv = [...items].sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))[0];
  return [
    {
      q: `Wie viele ${cn}-Produkte gibt es auf Digistore24?`,
      a: `<b>${items.length} deutschsprachige Angebote</b> (Stand ${datemark(DATA.scrapedAt)}), Durchschnittspreis ${money(avg, "USD")}. Diese Seite listet alle mit offiziellen Marktplatz-Statistiken.`,
    },
    {
      q: `Welches ${cn}-Produkt zahlt Affiliates am meisten?`,
      a: `<a href="../produkte/${best.slug}.html">${best.label}</a> führt aktuell mit <b>${money(best.earningsPerSale, best.currency)}</b> Verdienst pro Verkauf bei ${pct(best.commission)} Provision (Anbieter-seitige Marktplatz-Daten, keine Prognose).`,
    },
    {
      q: `Welches ${cn}-Angebot konvertiert am besten?`,
      a: `<a href="../produkte/${bestConv.slug}.html">${bestConv.label}</a> hat die höchste gemeldete Checkout-Konversion der Kategorie (${pct(bestConv.conversionRate)}). Konversion hängt von der Traffic-Qualität ab — das ist die Funnel-Performance des Anbieters, kein Versprechen.`,
    },
    {
      q: `Wie wähle ich ein ${cn}-Produkt aus?`,
      a: `Nutzen Sie die Zahlen des Marktplatzes selbst. Unsere <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Bewertungsmethode</a> führt hindurch; jedes Profil auf dieser Seite zeigt alle sechs Datenpunkte.`,
    },
  ];
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

function changelogPage() {
  const f = path.join(ROOT, "build", "changelog.json");
  if (!fs.existsSync(f)) return;
  const entries = JSON.parse(fs.readFileSync(f, "utf8")).entries || [];
  const body = `<h1>Neuigkeiten auf ${SITE_NAME}</h1>
<p class="sub">Jede Verbesserung, täglich protokolliert. Die Marktplatz-Daten aktualisieren sich jeden Morgen automatisch — die Zahlen auf der gesamten Website aktualisieren sich mit.</p>
${entries.map((e) => `<h2>${datemark(e.date)}</h2>
<p>${esc(e.summary)}</p>
<ul>${(e.changes || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`).join("\n")}`;
  fs.writeFileSync(outPath("changelog.html"), layout({ title: `Neuigkeiten — ${SITE_NAME}`, desc: `Tägliches Änderungslog von ${SITE_NAME}: Datenaktualisierungen, neue Artikel und Verbesserungen.`, body, path: "changelog.html", hreflangLinks: HREF_HOME }));
}

const altSlugs = computeAltSlugs();
homePage();
categoryPages();
profilePages(altSlugs);
const altCount = alternativesPages(altSlugs);
const bestCount = bestOfPages();
staticPages();
changelogPage();
console.log(`Built (DE): index, about, impressum, datenschutz, 404, categories (paginated), ${products.length} profiles, ${altCount} alternatives, ${bestCount} empfehlungen. Articles protected: ${articleIds.size}`);
