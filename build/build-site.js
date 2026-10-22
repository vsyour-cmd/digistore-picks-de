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

// Herausgeber-Organization (auf jeder Seite, für KI-/Google-Entity-Erkennung)
const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "adminstore",
  url: SITE_URL + "/",
  email: "admin@2bkf.com",
  description: "Unabhängiger Herausgeber von DigistorePicks DE, einem Verzeichnis von Digistore24-Marktplatz-Produkten mit überprüfbaren Marktplatz-Daten und gekennzeichneter Verkaufsseiten-Recherche.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Room 70, Unit 10B, 7/F, Tower B, New Mandarin Plaza, 14 Science Museum Road, Tsim Sha Tsui",
    addressLocality: "Kowloon",
    addressRegion: "Kowloon",
    postalCode: "999077",
    addressCountry: "HK",
  },
  sameAs: [
    "https://github.com/vsyour-cmd/digistore-picks-de",
    "https://vsyour-cmd.github.io/digistore-picks/",
  ],
};

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
  const allLd = [ORG_LD, ...jsonLd];
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
${allLd.map((j) => `<script type="application/ld+json">${jsonSafe(j)}</script>`).join("\n")}
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
  <div class="buyerlinks"><b>Käufer-Hilfe:</b> <a href="${rel}/digistore24-rueckerstattung.html">Rückerstattungen: So funktioniert's</a> · <a href="${rel}/ist-digistore24-sicher.html">Ist Digistore24 sicher?</a> · <a href="${rel}/sicher-kaufen.html">Checkliste vor dem Kauf</a></div>
  <div>© ${new Date().getFullYear()} ${SITE_NAME} · Produktdaten: Digistore24-Marktplatz (Stand ${datemark(DATA.scrapedAt)}) · <a href="${rel}/impressum.html">Impressum</a> · <a href="${rel}/datenschutz.html">Datenschutz</a> · <a href="${rel}/about.html">Über uns &amp; Transparenz</a> · <a href="https://vsyour-cmd.github.io/digistore-picks/" hreflang="en">English site</a> · <a href="${rel}/changelog.html">Neuigkeiten</a> · <a href="${rel}/price-watch.html">Preis-Beobachtung</a> · <a href="${rel}/amazon-picks.html">Amazon-Empfehlungen</a></div>
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
    <span>Anbieter <b>${esc(p.vendorName)}</b></span>
    <span>Gelistet <b>${datemark(p.createdAt)}</b></span>
  </div>
  ${p.description ? `<p class="desc">${esc(p.description).slice(0, 160)}</p>` : ""}
  <div class="links">
    <a class="badge" href="${rel}/produkte/${p.slug}.html">Profil ansehen</a>
    <a href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">Offizielle Verkaufsseite ↗</a>
  </div>
</div>`;
}

const products = DATA.products
  .map((p) => ({ ...p, label: p.label || `Digistore24 Produkt ${p.id}`, slug: slug(p.label || `produkt-${p.id}`) + "-" + p.id }))
  .sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0));

// Anbieter-Hubs: Top-100-Auswahl EINMALig hier (gemeinsame Quelle für HUB_SLUGS und vendorHubs()),
// damit Gleichstand-Grenzen identisch bleiben (Produkt-Reihenfolge kann sich unterwegs ändern)
const TOP_VENDORS = (() => {
  const m = new Map();
  for (const p of products) m.set(p.vendorName, (m.get(p.vendorName) || 0) + 1);
  return new Map([...m.entries()].filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 100));
})();
const HUB_SLUGS = new Set([...TOP_VENDORS.keys()].map((k) => slug(k)));

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
<li>Listenpreis <b>${money(p.price, p.currency)}</b>${(p.billingTypes || []).length ? " (" + esc(p.billingTypes.join(", ").toLowerCase()) + ")" : ""} — Checkout, Auslieferung und Rückerstattungen laufen über Digistore24 selbst, nicht über den Anbieter.</li>
<li>Käuferschutz: ${g ? "die Verkaufsseite wirbt mit einer Geld-zurück-Garantie — genauiges Zeitfenster bitte im Checkout bestätigen" : "keine standardisierte Garantie-Formulierung gefunden — Rückerstattungsbedingungen vor der Zahlung auf der offiziellen Seite prüfen"}.${dead}</li>
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
<div class="tldr"><b>Auf einen Blick</b> (Daten vom ${datemark(DATA.scrapedAt)}):
<ul>
<li>${DATA.total} deutschsprachige Digistore24-Angebote in ${DATA.categories.length} Kategorien im Blick.</li>
<li>Jede Seite kennzeichnet ihre Belege: offizielle Marktplatz-Statistiken vs. Anbieteraussagen.</li>
<li>Einstieg: Top-Liste unten, die <a href="../monthly-new.html">neuesten Angebote</a> oder die <a href="blog/digistore24-zahlen-checkliste.html">6-Punkte-Bewertungsmethode</a>.</li>
</ul></div>
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
    // 改进项 category-compare-table:分类级 Top10 收益对比表,所有分页共用(补 credibility 的 comparison-table 缺项)
    const top10 = [...items].sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0)).slice(0, 10);
    const topTable = top10.length ? `<h2>Top-Angebote in ${esc(catName(c))} nach Verdienst/Verkauf — im direkten Vergleich</h2>
<table class="specs">
<tr><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Verdienst/Verkauf</th><th>Warenkorb-Konv.*</th><th>Storno*</th></tr>
${top10.map((p) => `<tr><td><a href="../produkte/${p.slug}.html">${esc(p.label)}</a></td><td>${esc(p.typeDe || p.type)}</td><td><b>${money(p.price, p.currency)}</b></td><td>${pct(p.commission)}</td><td><b>${money(p.earningsPerSale, p.currency)}</b></td><td>${pct(p.conversionRate)}</td><td>${pct(p.cancelRate)}</td></tr>`).join("\n")}
</table>
<p class="sub">* Warenkorb-Konversion und Stornoquote sind Anbieter-seitige Marktplatz-Statistiken und hängen von der Traffic-Qualität ab — keine Prognose. Kategorie-weite Top 10 per ${datemark(DATA.scrapedAt)}; identisch auf allen Seiten dieser Kategorie.</p>` : "";
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
      const tldrBlock = `<div class="tldr"><b>Auf einen Blick</b> (Marktplatz-Daten vom ${datemark(DATA.scrapedAt)}): <ul><li><b>${items.length} Angebote</b> in ${esc(catName(c))}, Durchschnittspreis ${money(avg, "USD")}.</li><li>Provisionen ${pct(minC)}–${pct(maxC)}; alle Zahlen sind Anbieter-gemeldete Marktplatz-Daten.</li><li>${isRealCat && items.length >= 8 ? `Top-Auswahl: <a href="../empfehlungen/beste-${c.file}.html">beste ${esc(catName(c))}</a> · ` : ""}<a href="../faq/${c.file}.html">50 Käuferfragen</a> · Methode: <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Check</a>.</li></ul></div>`;
      const methodLine = `<p class="sub">Wie wir bewerten: <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Zahlen-Check</a> · <a href="../about.html">Recherche-Standards</a>.</p>`;
      const evidenceLine = `<p class="sub">Beleg- &amp; Validierungsbedingungen: Statistiken aus der offiziellen Digistore24-Marktplatz-API (Snapshot ${datemark(DATA.scrapedAt)}); aktuelle Preise immer auf offiziellen Seiten prüfen.</p>`;
      const body = `
<h1>${esc(catName(c))}</h1>
<p class="sub">${items.length} Produkte · Bereich: ${esc(c.sectionDe || c.section)}${pageSub} · <a href="../index.html">alle Kategorien</a> · <a href="../produkte/index.html">alle Produkte A–Z</a></p>
${intro}
${tldrBlock}
${bestOf}
<div class="grid">
${chunk.map((p) => productCard(p, "..")).join("\n")}
</div>
${pager(idx)}
${topTable}
${idx === 0 ? faqBlock : ""}
${methodLine}
${evidenceLine}
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
        title: idx === 0
          ? `${catName(c)} — ${items.length} Digistore24-Produkte: Preise & Provisionen`
          : `${catName(c)} (${idx + 1}/${pages.length}) — ${items.length} Digistore24-Produkte`,
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
  for (const p of products.slice(0, 200)) {
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
${HUB_SLUGS.has(slug(p.vendorName)) ? `<p class="sub">Gesamtes Sortiment: <a href="../hersteller/${slug(p.vendorName)}.html">${esc(p.vendorName)} Anbieter-Hub</a> — alle Listings mit Marktplatz-Daten.</p>` : ""}
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
<h2>Entscheidungsfaktoren für Käufer</h2>
<ul>
<li><b>Funktion:</b> Checkout-Konversion und Anbieter-Bilanz vergleichen — beide in der Tabelle oben.</li>
<li><b>Passung:</b> Typ und Voraussetzungen (Lieferformat, Vorkenntnisse) in jedem Profil prüfen.</li>
<li><b>Wartung:</b> Die Stornoquote ist das Kaufreue-Signal; Nutzungsbedingungen stehen auf den offiziellen Seiten.</li>
<li><b>After-Sales:</b> Garantie-Formulierung und Support — vor dem Kauf auf offiziellen Seiten verifizieren.</li>
</ul>
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
    const faqHubCat = DATA.categories.find((c) => String(c.catId) === String(primaryCatId));
    const faqHubHtml = faqHubCat ? `<p class="sub"><a href="../faq/${faqHubCat.file}.html">Alle 50 Käuferfragen zu ${esc(catName(faqHubCat))}</a> — das komplette Kategorie-FAQ.</p>` : "";
    const communityHtml = communityBlockDe(p);
    const amazonHtmlDe = amazonBlockDe(p);

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
<tr><th>Garantie/Rückgabe</th><td>Laut Verkaufsseite des Anbieters — vor dem Kauf auf der offiziellen Seite prüfen</td></tr>
<tr><th>Anbieter</th><td>${esc(p.vendorName)} (gelistet seit ${datemark(p.createdAt)})</td></tr>
</table>
${p.description ? `<h2>Marktplatz-Beschreibung des Anbieters</h2><p>${esc(p.description)}</p>` : ""}

${researchSection(p)}

${usageSection(p)}

${galleryBlock(p)}

${cautionSection(p)}

${longTailContentDe(p)}

${evidenceBox(p)}

${buyerChecklist(p)}

${faqBlock}

${faqHubHtml}

${communityHtml}

${amazonHtmlDe}

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
        sku: "DS24-" + p.productId,
        brand: { "@type": "Brand", name: p.vendorName },
        category: (p.categories || [])[0] || "Uncategorized",
        additionalProperty: [{
          "@type": "PropertyValue",
          name: "Intended use",
          value: (TYPE_USAGE_DE[p.type] || `Digital über Digistore24 nach dem Checkout geliefert; genaue Nutzung siehe Verkaufsseite des Anbieters.`).split(";")[0].trim(),
        }],
        offers: {
          "@type": "Offer",
          price: Number(Number(p.price).toFixed(2)),
          priceCurrency: p.currency === "EUR" ? "EUR" : "USD",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          url: `${SITE_URL}/produkte/${p.slug}.html`,
          seller: { "@type": "Organization", name: p.vendorName },
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
<p>Jedes Produkt verlinkt auf ein vollständiges Profil mit wörtlicher Verkaufsseiten-Recherche. Preis und Garantie immer auf der offiziellen Seite bestätigen.</p>
<p class="sub">Wie wir bewerten: <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Zahlen-Check</a> · <a href="../about.html">Recherche-Standards</a>. Beleg- &amp; Validierungsbedingungen: alle Statistiken aus der offiziellen Digistore24-Marktplatz-API (Snapshot ${datemark(DATA.scrapedAt)}); Vergleiche werden bei jedem täglichen Rebuild neu berechnet.</p>
<p><a href="index.html">← Alle Alternativen &amp; Vergleiche</a> — das vollständige Vergleichsverzeichnis.</p>`;
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
      title: `Alternativen zu ${p.label}: die 4 nächsten Angebote im Vergleich`,
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
<p class="sub">* Anbieter-seitige Statistiken; abhängig von der Traffic-Qualität, keine Prognose. Aktuelle Preise und Garantien immer auf der offiziellen Verkaufsseite prüfen.</p>
<p class="sub">Wie wir bewerten: <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Zahlen-Check</a> · <a href="../about.html">Recherche-Standards</a>. Beleg- &amp; Validierungsbedingungen: Rangierungen berechnet aus der offiziellen Digistore24-Marktplatz-API (Snapshot ${datemark(DATA.scrapedAt)}); „beste" heißt bestes auf einer gemessenen Dimension, neu berechnet bei jedem täglichen Rebuild.</p>`;
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
  if (GQ.products[String(p.id)]) pills.push([`${p.label} Kauf-Risiko-Checkliste`, "#buying-decisions"]);
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
<li><b>Öffentliche Digistore24-Produktseite:</b> <a href="https://www.checkout-ds24.com/product/${p.productId}/" rel="nofollow noopener" target="_blank">checkout-ds24.com/product/${p.productId}</a></li>
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
// Belegbasis & Validierungsbedingungen: jede Aussage → Quelle → Datum → Prüfweg
function evidenceBox(p) {
  const res = p.research && !p.research.error;
  const srcPage = res ? (p.research.finalUrl || p.salesPageUrl) : p.salesPageUrl;
  const method = res && p.research.method === "browser-render" ? "im Browser gerendert" : "rohes HTML";
  return `<div class="tldr"><b>Belegbasis & Validierungsbedingungen</b>
<ul>
<li><b>Listenpreis & Abrechnung</b> — Quelle: offizielle Digistore24-Marktplatz-API, Stand <b>${datemark(DATA.scrapedAt)}</b>. Maßgeblich für den aktuellen Preis ist immer die Kassenseite.</li>
<li><b>Verkaufsseiten-Zitate</b> — Quelle: ${esc(srcPage || "offizielle Verkaufsseite")}, abgerufen <b>${datemark(DATA.researchedAt) || "—"}</b> (Methode: ${method}). Verify: offizielle Seite öffnen.</li>
<li><b>Garantie / Rückgabe</b> — vom Anbieter festgelegt; vor dem Kauf auf der Verkaufsseite bestätigen.</li>
<li><b>Nicht von uns geprüft:</b> Produktqualität, Ergebnisse, Testimonials — kein Praxistest für dieses Listing durchgeführt.</li>
</ul></div>`;
}

// Kauf-Risiko-Checkliste (KI-simulierte Käufer-Due-Diligence; Antworten nur aus Marktplatz-Daten oder gekennzeichneten Anbieteraussagen)
const GQ_FILE = "G:/Digistore24/data-de/gemini-questions-de.json";
const GQ = fs.existsSync(GQ_FILE) ? JSON.parse(fs.readFileSync(GQ_FILE, "utf8")) : { products: {} };
function buyerChecklist(p) {
  const g = GQ.products[String(p.id)];
  if (!g || !g.groups) return "";
  const renderItem = (item) => {
    const l = item.toLowerCase();
    let pointer = "→ klären Sie mit dem Anbieter auf der <a href=\"" + esc(p.promoLink) + "\" rel=\"nofollow sponsored noopener\" target=\"_blank\">offiziellen Verkaufsseite</a>";
    if (/price|cost|€|preis|billed|€/.test(l)) pointer = "→ Antwort: <a href=\"#record\">Marktplatz-Eintrag</a>";
    if (/garantie|geld.zurück|rückgabe|refund/.test(l)) pointer = "→ Antwort: <a href=\"#research\">Garantie-Recherche</a> + auf der offiziellen Seite bestätigen";
    if (/seriös|evidence|verif|fallstudie|track record|testimonial/.test(l)) pointer = "→ Antwort: <a href=\"#research\">Verkaufsseiten-Recherche</a> — Anbieteraussagen, nicht von uns geprüft";
    if (/anbieter|mentor|autor|autorin|wer steckt/.test(l)) pointer = "→ Antwort: <a href=\"#vendor\">Anbieter-Block</a> + <a href=\"#research\">Recherche</a>";
    if (/alternativ/.test(l)) pointer = "→ Antwort: <a href=\"../alternativen/" + p.slug + ".html\">Alternativen-Seite</a>";
    if (/liefer|download|zugang nach|nach der zahlung|member area/.test(l)) pointer = "→ Antwort: <a href=\"#faq\">Liefer-FAQ</a>";
    return `<li>${esc(item)} <span class="sub">${pointer}</span></li>`;
    };
    const groups = g.groups.map((grp) => `<h3>${esc(grp.group)} — hält es stand?</h3><ul>${grp.questions.map(renderItem).join("")}</ul>`).join("");
    return `<h2 id="buying-decisions">Bevor Sie zahlen: was Käufer von ${esc(p.label)} zuerst klären</h2>
<div class="notice"><b>KI-simulierte Käufer-Due-Diligence-Fragen</b> (keine verifizierte Kundenforschung). Wo unsere Daten antworten, verlinken wir sie; alles andere muss vor der Zahlung mit dem Anbieter geklärt werden.</div>
${groups}`;
  }

// ---------- Kategorie-FAQ (50 Fragen pro Kategorie) + Reddit-Community-Blöcke ----------
const DE_SUBREDDIT_MAP = [
  { re: /financ|invest|trading|crypto|immobilien|steuer/i, subs: ["Finanzen"] },
  { re: /business|marketing|unternehm|e-?commerce|vertrieb|management|projekt/i, subs: ["Unternehme", "Vertrieb"] },
  { re: /arbeits|job|karriere|profession|beruf|leads/i, subs: ["arbeitsleben"] },
  { re: /software|computer|internet|technik|edv/i, subs: ["de_EDV"] },
  { re: /ki|künstliche|intelligenz|ai/i, subs: ["KuenstlicheIntelligenz"] },
  { re: /social|sozial|media|instagram|tiktok/i, subs: ["sozialmedia"] },
  { re: /fitness|gesundheit|sport|ernähr/i, subs: ["FITNESS"] },
  { re: /sprach/i, subs: ["languagelearning"] },
  { re: /reisen|travel/i, subs: ["travel"] },
];
const subsForDe = (p) => {
  const lbl = (p.categories || []).join(" ") + " " + (p.typeDe || p.type || "");
  const hit = DE_SUBREDDIT_MAP.find((m) => m.re.test(lbl));
  return hit ? hit.subs : [];
};
const CURATED_QA_DE = (() => {
  const f = "G:/Digistore24/research-notes/reddit-questions-de-market.md";
  const map = { 1: "55852", 2: "55036", 3: "60229", 4: "54586", 5: "58678", 6: "48986" };
  try {
    const md = fs.readFileSync(f, "utf8");
    const out = {};
    for (const s of md.split(/^## /m).slice(1)) {
      const pid = map[parseInt(s, 10)];
      if (!pid) continue;
      const qs = [...s.matchAll(/^\|\s*\d+\s*\|\s*"?(.+?)"?\s*\|/gm)].map((m) => m[1]).filter((q) => q.length > 8);
      if (qs.length) out[pid] = qs;
    }
    return out;
  } catch { return {}; }
})();

function communityBlockDe(p) {
  const subs = subsForDe(p);
  const links = subs.slice(0, 3).map((s) => `<li><a href="https://www.reddit.com/r/${s}/" rel="noopener" target="_blank">r/${s}</a> — deutschsprachige Community mit Diskussionen zu ${esc((p.categories || [])[0] || "dieser Kategorie").toLowerCase()}.</li>`);
  links.push(`<li><a href="https://www.reddit.com/search/?q=${encodeURIComponent(p.label)}&sort=relevance&t=year" rel="noopener" target="_blank">Reddit-Suche nach „${esc(p.label)}"</a> — Live-Ergebnisse, von uns nicht beeinflusst.</li>`);
  links.push(`<li><a href="https://www.reddit.com/search/?q=${encodeURIComponent(p.label + " Erfahrung")}&sort=top&t=year" rel="noopener" target="_blank">Top-„Erfahrungs"-Treffer dieses Jahr</a> — selbst nach Aktualität filtern.</li>`);
  const curated = CURATED_QA_DE[String(p.id)];
  const curatedHtml = curated ? `<p class="sub">Kuratierte Käuferfragen zu diesem Angebot (Community-Recherche, ${curated.length} erfasst):</p><ul>${curated.slice(0, 6).map((q) => `<li>${esc(q)}</li>`).join("")}</ul><p class="sub">Das sind Fragen, keine Antworten — die beantworteten Fragen stehen oben, die Diskussion läuft auf Reddit.</p>` : "";
  return `<h2 id="community">${esc(p.label)} auf Reddit diskutieren</h2>
<p class="sub">In Community-Threads vergleichen echte Käufer Erfahrungen. Wir verlinken Communities, keine einzelnen Posts — Threads verschwinden, Subreddits bleiben:</p>
<ul style="line-height:1.9">${links.join("\n")}</ul>
${curatedHtml}`;
}

function faqBankDe(cat, items) {
  const n = items.length;
  const sorted = [...items].sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0));
  const prices = items.map((p) => p.price).filter((x) => x != null).sort((a, b) => a - b);
  const med = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  const minP = prices[0], maxP = prices[prices.length - 1];
  const withG = items.filter((p) => p.research && !p.research.error && p.research.guaranteeMention);
  const gPct = n ? Math.round((withG.length / n) * 100) : 0;
  const cancels = items.map((p) => p.cancelRate).filter((x) => x != null).sort((a, b) => a - b);
  const medC = cancels.length ? cancels[Math.floor(cancels.length / 2)] : null;
  const vendors = new Set(items.map((p) => p.vendorName)).size;
  const subsN = items.filter((p) => (p.billingTypes || []).some((b) => /subscri/i.test(b))).length;
  const unreachable = items.filter((p) => p.research && p.research.error).length;
  const byDate = [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const newest = byDate[byDate.length - 1], oldestL = byDate[0];
  const top = sorted[0];
  const topConv = [...items].sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))[0];
  const lowC = sorted.slice(0, 10).sort((a, b) => (a.cancelRate || 99) - (b.cancelRate || 99))[0];
  const cheapest = [...items].sort((a, b) => (a.price || 1e9) - (b.price || 1e9))[0];
  const topTypes = Object.entries(items.reduce((m, p) => { const t = p.typeDe || p.type || "sonstige"; m[t] = (m[t] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const L = (p) => `<a href="../produkte/${p.slug}.html">${esc(p.label)}</a>`;
  const out = [];
  const add = (g, q, a) => out.push({ g, q, a });
  add("Preise & Kosten", `Wie viele ${cat.label}-Produkte gibt es auf Digistore24?`, `<b>${n} deutschsprachige Angebote</b> von ${vendors} verschiedenen Anbietern (Stand ${datemark(DATA.scrapedAt)}). Die <a href="../kategorie/${cat.file}.html">Kategorieseite</a> listet alle mit offiziellen Marktplatz-Statistiken.`);
  add("Preise & Kosten", `Was kostet ein typisches ${cat.label}-Produkt?`, `Der Median-Listenpreis liegt bei <b>${money(med, "EUR")}</b>, Spanne von ${money(minP, "EUR")} bis ${money(maxP, "EUR")}. Der Median ist ehrlicher als der Durchschnitt — einige High-Ticket-Angebote ziehen den Schnitt nach oben.`);
  add("Preise & Kosten", `Warum variieren die Preise so stark?`, `Von ${money(minP, "EUR")} bis ${money(maxP, "EUR")}. Der Listenpreis ist oft nur der Einstieg: viele Funnels verkaufen nach dem Checkout Zusatzmodule oder Coaching. Beurteilen Sie Angebote anhand Stornoquote und Garantie, nicht am Preis-Schild.`);
  add("Preise & Kosten", `Gibt es versteckte Kosten?`, `Der Digistore24-Checkout zeigt den verbindlichen Preis vor der Zahlung; USt./VAT kommt je nach Land dazu. ${subsN} von ${n} Listings sind Abos — die laufen, bis man kündigt. Alles andere ist Einmalkauf zum Listenpreis.`);
  add("Preise & Kosten", `Was ist das günstigste ${cat.label}-Produkt?`, `${L(cheapest)} für <b>${money(cheapest.price, cheapest.currency)}</b>. Günstig heißt nicht sinnvoll — vor dem Kauf Stornoquote und Verkaufsseite prüfen.`);
  add("Preise & Kosten", `Sind Steuern im Preis enthalten?`, `Nein — der gelistete Preis ist der Netto-Preis des Anbieters. Digistore24 addiert im Checkout die gesetzliche Steuer Ihres Landes; dort sehen Sie immer den Endbetrag vor der Zahlung.`);
  add("Preise & Kosten", `Einmalkauf oder Abo?`, `${subsN} von ${n} Listings in dieser Kategorie sind Abos, der Rest Einmalkäufe. Die Abrechnungsart steht auf jedem Produktprofil und nochmal im Checkout.`);
  add("Preise & Kosten", `Ändern sich die Preise häufig?`, `Anbieterseits ja. Unser <a href="../price-watch.html">Preis-Monitor</a> vergleicht tägliche Snapshots des gesamten Marktplatzes — Änderungen ab 1% erscheinen dort automatisch.`);
  add("Preise & Kosten", `Ist teurer automatisch besser?`, `Nein. Preis misst Positionierung, nicht Qualität. Der Marktplatz veröffentlicht die Stornoquote — der Anteil rückabgewickelter Käufe — und teure Listings sind nicht systematisch besser. Nutzen Sie den <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Check</a>.`);
  add("Preise & Kosten", `Kann ich in Raten zahlen?`, `Manche Anbieter bieten Ratenpläne (eigenes Billing-Format auf der Verkaufsseite). Digistore24 verarbeitet, was der Anbieter konfiguriert hat — der Checkout zeigt Ihre Optionen vor der Verpflichtung.`);
  add("Rückerstattung & Garantie", `Gibt es Geld-zurück-Garantien bei ${cat.label}?`, `${gPct}% der von uns recherchierten Verkaufsseiten in dieser Kategorie nennen explizite Garantie-Formulierungen (Anbieteraussagen — nicht von uns geprüft). Digistore24 wickelt Rückerstattungen nach den Anbieter-Bedingungen ab; die Kassenseite ist bindend.`);
  add("Rückerstattung & Garantie", `Wie funktionieren Digistore24-Rückerstattungen?`, `Antrag über Digistore24 (Support-Portal oder Link in der Bestellmail), Abwicklung nach den Anbieter-Bedingungen, Auszahlung über die Plattform. Details: <a href="../digistore24-rueckerstattung.html">Rückerstattungen erklärt</a>.`);
  add("Rückerstattung & Garantie", `Wie lange habe ich Zeit für eine Rückerstattung?`, `Das legt je Produkt der Anbieter fest — viele Digistore24-Listings nennen 60 Tage, andere 14 oder 30. Verbindlich ist die Anzeige im Checkout, nicht die Verkaufsseite.`);
  add("Rückerstattung & Garantie", `Was ist die Stornoquote und warum ist sie wichtig?`, `Der Anteil abgeschlossener Käufe, die in Storno oder Rückerstattung enden. Median dieser Kategorie: ${medC != null ? "<b>" + pct(medC) + "</b>" : "nicht veröffentlicht"} (Anbieter-seitig, über den gesamten Traffic des Anbieters). Der beste Proxy für „Wie oft bereuen Käufer?".`);
  add("Rückerstattung & Garantie", `Welche ${cat.label}-Produkte haben die niedrigste Stornoquote?`, `Unter den Top-Verdienern aktuell ${L(lowC)} mit ${pct(lowC.cancelRate)}. Die ganze Tabelle: <a href="../kategorie/${cat.file}.html">Kategorieseite</a>.`);
  add("Rückerstattung & Garantie", `Was, wenn die Verkaufsseite offline ist?`, `${unreachable} Listing(s) dieser Kategorie haben aktuell nicht erreichbare Verkaufsseiten (tote Domains, Bot-Schutz). Die Profile weisen darauf hin. Nicht kaufen, was man nicht prüfen kann — die Rückerstattung braucht einen erreichbaren Anbieter.`);
  add("Rückerstattung & Garantie", `Wie funktioniert die Rückerstattung bei Abos?`, `Künftige Abbuchungen jederzeit über Digistore24 kündbaren; vergangene Perioden rückerstattet man nach dem Garantiezeitfenster des Anbieters. Die Kündigungsoption liegt im Digistore24-Kundenkonto.`);
  add("Rückerstattung & Garantie", `Chargeback oder Rückerstattung?`, `Zuerst immer die Digistore24-Rückerstattung: schneller, ohne Dispute-Gebühren der Bank, sauberer in der Historie. Chargeback ist die Rückfallebene, wenn der Prozess wirklich scheitert.`);
  add("Rückerstattung & Garantie", `Was, wenn ein Anbieter eine Rückerstattung ignoriert?`, `Der Digistore24-Käufersupport vermittelt — die Plattform hat die Zahlung abgewickelt und Instrumente gegenüber dem Anbieter. Kontakt über den Support-Link in der Bestellbestätigung, mit Bestellnummer.`);
  add("Rückerstattung & Garantie", `Gibt es Käuferschutz über die Garantie hinaus?`, `Die stärksten Hebel: nur über Digistore24 zahlen (nie Direktüberweisung), Garantiebedingungen im Checkout dokumentieren und innerhalb des Fensters entscheiden. Hintergrund: <a href="../ist-digistore24-sicher.html">Ist Digistore24 sicher?</a>`);
  add("Vertrauen & Sicherheit", `Ist der Kauf von ${cat.label} über Digistore24 sicher?`, `Digistore24 ist eine etablierte Zahlungsplattform — Checkout, Auslieferung und Rückerstattung laufen darüber, Ihre Kartendaten gehen an Digistore24, nicht an den Anbieter. Die Produktqualität ist eine Anbieter-Frage: beurteilen Sie jedes Listing mit den Marktplatz-Daten. Mehr: <a href="../ist-digistore24-sicher.html">Sicherheits-Überblick</a>.`);
  add("Vertrauen & Sicherheit", `Wer verkauft ${cat.label} auf Digistore24?`, `${vendors} verschiedene Anbieter listen aktuell in dieser Kategorie. Jedes Produktprofil nennt den Anbieter und (wo vorhanden) die übrigen Katalogeinträge im <a href="../hersteller/index.html">Anbieter-Hub</a>.`);
  add("Vertrauen & Sicherheit", `Wie erkenne ich unseriöse ${cat.label}-Listings?`, `Unsere Prüfpunkte: nicht erreichbare oder wiederverwertete Verkaufsseite, keine Garantie-Formulierung, Countdown-Dringlichkeit bei hoher Stornoquote, Anbieteridentitäten im Wochentakt. Keins davon ist ein Beweis — zusammen senkt es die Quote. Operationalisiert im <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Check</a>.`);
  add("Vertrauen & Sicherheit", `Werden die Verkaufsseiten-Aussagen geprüft?`, `Nein. Alles, was wir aus Verkaufsseiten zitieren, ist als <b>Anbieteraussagen, nicht von uns geprüft</b> markiert. Die Marktplatz-Statistiken (Preis, Provision, Konversion, Stornoquote) stammen aus dem offiziellen Digistore24-Datensatz.`);
  add("Vertrauen & Sicherheit", `Welche Zahlungsmethoden gibt es?`, `Gängig sind Kredit-/Debitkarten, PayPal und länderspezifische Verfahren — der Checkout zeigt genau, was für Ihr Land verfügbar ist. Wenn ein Anbieter Sie von der Plattform weg zu Direktzahlung drängt: abbrechen.`);
  add("Vertrauen & Sicherheit", `Wer betreibt diese Seite?`, `${SITE_NAME} ist ein unabhängiges Verzeichnis. Wir veröffentlichen Anbieter-seitige Marktplatz-Statistiken mit ihren Grenzen, kennzeichnen Zitate als Anbieteraussagen, zeigen Datenquellen und loggen jede Änderung im <a href="../changelog.html">Changelog</a>. Affiliate-Provisionen — auf jeder Seite offengelegt — verdienen wir schon; die Daten selbst sind nicht käuflich.`);
  add("Vertrauen & Sicherheit", `Haben Sie die Produkte selbst gekauft?`, `Nein. Unsere Profile sind <b>Datenprofile</b> (Marktplatz-Datensatz + wörtliche Auszüge aus der Verkaufsseite), keine Praxis-Tests. Wenn je ein Praxis-Test erscheint, steht das oben auf der Seite. Diese Ehrlichkeit ist der Punkt.`);
  add("Vertrauen & Sicherheit", `Warum fehlen manchen Profilen Konversions-/Stornozahlen?`, `Anbieter entscheiden, welche Statistiken Digistore24 zeigt. Fehlende Werte zeigen wir als „—" — auch das ist eine Information.`);
  add("Vertrauen & Sicherheit", `Wie aktuell sind die Daten?`, `Marktplatz-Snapshot: <b>${datemark(DATA.scrapedAt)}</b>; Verkaufsseiten-Recherche: ${datemark(DATA.researchedAt) || "—"}. Tägliches Rebuild, Änderungen im <a href="../changelog.html">Changelog</a>.`);
  add("Vertrauen & Sicherheit", `Kann ich die Rohdaten abrufen?`, `Ja — <a href="../llms-full.txt">llms-full.txt</a> (Top-500 in einer Datei), Produkt-Recherchen im öffentlichen GitHub-Repo, und jede Seite zeigt ihr Snapshot-Datum.`);
  add("Kaufberatung", `Was prüfe ich vor dem Kauf eines ${cat.label}-Produkts?`, `Sechs Zahlen, in dieser Reihenfolge: Preis vs. Median (${money(med, "EUR")} hier), Stornoquote vs. Median (${medC != null ? pct(medC) : "n/v"} hier), Garantiefenster im Checkout, Anbieter-Historie, Erreichbarkeit der Verkaufsseite, eigene Disziplin im Fenster. Vollständig: <a href="../blog/digistore24-zahlen-checkliste.html">der Zahlen-Check</a>.`);
  add("Kaufberatung", `Welches ${cat.label}-Produkt zahlt Affiliates am meisten?`, `${L(top)} führt mit <b>${money(top.earningsPerSale, top.currency)}</b> pro Verkauf bei ${pct(top.commission)} Provision (Anbieter-Daten). Hohe Ausschüttungen bedeuten meist High-Ticket-Funnels — vor der Bewerbung die Stornoquote lesen.`);
  add("Kaufberatung", `Welches Angebot konvertiert am besten?`, `${L(topConv)} meldet die höchste Warenkorb-Konversion der Kategorie (${pct(topConv.conversionRate)}). Konversion misst den Checkout-Funnel des Anbieters, nicht Ihre künftigen Ergebnisse.`);
  add("Kaufberatung", `Was ist das neueste ${cat.label}-Listing?`, `${L(newest)}, gelistet seit ${datemark(newest.createdAt).replace(/\.$/, "")}. Ganz neue Listings haben keine Track-Record — deren Stornoquoten sind bedeutungslos, bis Traffic sich sammelt. Neue Arrivals: <a href="../monthly-new.html">Monatsseite</a>.`);
  add("Kaufberatung", `Welches Listing gibt es am längsten?`, `${L(oldestL)}, auf dem Marktplatz seit ${datemark(oldestL.createdAt).replace(/\.$/, "")}. Langlebig ist nicht gleich gut — aber ein alteingesessenes Listing mit niedriger Stornoquote hat echte Käufer überlebt.`);
  add("Kaufberatung", `Welche Produkttypen dominieren?`, `${topTypes.map(([t, c]) => `${esc(t)} (${c})`).join(" und ")} führen diese Kategorie. Der Typ steht auf jedem Profil — er beeinflusst Auslieferung (sofortiger Download vs. Mitgliederbereich) und Rückerstattungsverhalten.`);
  add("Kaufberatung", `Sind High-Ticket-Angebote sinnvoll?`, `Können sie sein — wenn Sie auch zum doppelten Preis kaufen würden und das Produkt im Garantiefenster wirklich prüfen. Bis zu ${money(maxP, "EUR")} im teuersten Listing hier: die Garantiebedingungen zählen mehr als die Verkaufsseite.`);
  add("Kaufberatung", `Gibt es Rabatte oder Bundles?`, `Häufig — Verkaufsseiten werben mit Gutscheincodes, Bundles und durchgestrichenen Preisen (unsere Recherche erfasst diese Nennungen pro Produkt). Verbindlich ist der Checkout-Preis; Gutscheine, die dort nicht funktionieren, existieren nicht.`);
  add("Kaufberatung", `Ich suche Alternativen zu einem konkreten Produkt — wo?`, `Top-Angebote haben eigene Vergleichsseiten (<a href="../alternativen/index.html">Alternativen-Index</a>), und jedes Produktprofil verlinkt verwandte Angebote derselben Kategorie. Die komplette A–Z-Liste: <a href="../produkte/index.html">alle ${DATA.total} Produkte</a>.`);
  add("Kaufberatung", `Würden Sie persönlich ein ${cat.label}-Produkt empfehlen?`, `Nein — niemand kann ein ungenutztes Produkt empfehlen, und wir haben diese nicht genutzt. Was wir können: alle Marktplatz-Zahlen nebeneinander zeigen (<a href="../kategorie/${cat.file}.html">Kategorie-Tabelle</a>), damit Ihre Entscheidung auf Daten steht, nicht auf der lautesten Verkaufsseite.`);
  add("Daten & Methode", `Wie bewertet ${SITE_NAME} ${cat.label}-Produkte?`, `Mechanisch, aus offiziellen Marktplatz-Statistiken — keine Sponsorings, keine Praxis-Tests ohne Kennzeichnung. Der <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Zahlen-Check</a> ist die Methode hinter jeder Seite.`);
  add("Daten & Methode", `Was bedeutet „Verdienst pro Verkauf"?`, `Die durchschnittliche Affiliate-Ausschüttung pro abgeschlossenem Verkauf (Provision × Preis, bereinigt um Stornos). Anbieter-seitige Statistik. Für Käufer signalisiert sie, wie aggressiv das Angebot beworben wird.`);
  add("Daten & Methode", `Was bedeutet „Warenkorb-Konversion"?`, `Der Anteil der Leute, die das Bestellformular erreichen und den Kauf abschließen. Sie misst den Checkout-Funnel des Anbieters für dessen Traffic — keine Prognose für Ihr Erlebnis.`);
  add("Daten & Methode", `Ändert Ihre Affiliate-Provision meinen Preis?`, `Nein. Kaufen Sie über einen Link hier, zahlt der Anbieter die Provision aus seiner Marge; der Checkout-Preis ist identisch. Offenlegung: <a href="../about.html">Über-uns-Seite</a> und im Footer jeder Seite.`);
  add("Daten & Methode", `Wie oft aktualisiert sich dieser FAQ?`, `Die Zahlen in den Antworten aktualisieren sich mit dem täglichen Rebuild (Snapshot ${datemark(DATA.scrapedAt)}). Die Fragen selbst pflegen wir mit, Ergänzungen landen im <a href="../changelog.html">Changelog</a>.`);
  add("Daten & Methode", `Woher stammen die Statistiken?`, `Vom offiziellen Digistore24-Marktplatz, so wie registrierte Affiliates sie sehen: Preis, Provision, Warenkorb-Konversion, Stornoquote, Verdienst pro Verkauf, Listing-Daten. Alles Anbieter-seitig, Snapshot ${datemark(DATA.scrapedAt)}.`);
  add("Daten & Methode", `Wie bewerbe ich ${cat.label}-Produkte als Affiliate?`, `Als Digistore24-Affiliate (kostenlos) registrieren, Angebote mit der Verdienst÷Storno-Rechnung wählen, die Tracking-Links des Marktplatzes nutzen. Provisionen in dieser Kategorie: ${Math.round(Math.min(...items.map((p) => p.commission || 0)))}%–${Math.round(Math.max(...items.map((p) => p.commission || 0)))}% pro Verkauf.`);
  add("Daten & Methode", `Was ändert ein Affiliate-Link für mich als Käufer?`, `Nichts im Checkout — gleicher Preis, gleiche Bedingungen. Er schreibt den Verkauf dem Herausgeber zu. Beurteilen Sie das Produkt so oder so gleich.`);
  add("Daten & Methode", `Warum Marktplatz-Statistiken statt Reviews?`, `Reviews lassen sich nicht prüfen und veralten schnell. Der Marktplatz-Datensatz ist über alle ${n} Listings dieser Kategorie standardisiert — erst das macht den echten Vergleich möglich. Das ist die Kernidee dieser Seite.`);
  add("Daten & Methode", `Ich habe ein Problem mit einem Kauf — wo anfangen?`, `Digistore24-Käufersupport über den Link in Ihrer Bestellmail, mit Bestellnummer. Dann der Anbieter-Support für Produktfragen. Die Rückerstattungs-Mechanik: <a href="../digistore24-rueckerstattung.html">Rückerstattungen erklärt</a>.`);
  return out;
}

// FAQ-Querverweis (faq-hreflang-crosslink): EN-Gegenstück per catId
function faqEnCounterpart(catId) {
  if (!EN_DATA) return null;
  const c2 = EN_DATA.categories.find((c) => String(c.catId) === String(catId));
  if (!c2) return null;
  const mk = (cats) => { const cnt = {}; for (const c of cats) { const b = slug(c.label); cnt[b] = (cnt[b] || 0) + 1; } return (c) => (cnt[slug(c.label)] > 1 ? slug(c.section) + "-" + slug(c.label) : slug(c.label)); };
  const url = "https://vsyour-cmd.github.io/digistore-picks/faq/" + mk(EN_DATA.categories)(c2) + ".html";
  if (!fs.existsSync("G:/Digistore24/site/faq/" + mk(EN_DATA.categories)(c2) + ".html")) return null;
  return url;
}

function faqHubPagesDe() {
  const dir = outPath("faq");
  fs.mkdirSync(dir, { recursive: true });
  let built = 0;
  const eligible = DATA.categories.filter((c) => products.filter((p) => (p.categoryIds || []).includes(String(c.catId))).length >= 3);
  { const un = products.filter((p) => !(p.categoryIds || []).length).length;
    if (un >= 3) eligible.push({ catId: "uncat", labelDe: "Ohne Kategorie", sectionDe: "Digistore24-Marktplatz", file: "ohne-kategorie", count: un }); }
  for (let ci = 0; ci < eligible.length; ci++) {
    const c = eligible[ci];
    const items = products.filter((p) => (p.categoryIds || []).includes(String(c.catId)) || (c.catId === "uncat" && !(p.categoryIds || []).length));
    const qas = faqBankDe(c, items);
    const groups = [...new Set(qas.map((x) => x.g))];
    const best = [...items].sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0))[0];
    const med = (() => { const p = items.map((x) => x.price).filter((x) => x != null).sort((a, b) => a - b); return p.length ? p[Math.floor(p.length / 2)] : 0; })();
    const enFaqUrl = faqEnCounterpart(c.catId);
  const xrefHtml = enFaqUrl ? `<p class="sub">Dieses FAQ gibt es auch auf <a hreflang="en" href="${enFaqUrl}">Englisch</a>.</p>` : "";
  const faqHref = enFaqUrl ? `<link rel="alternate" hreflang="en" href="${enFaqUrl}"><link rel="alternate" hreflang="de" href="${SITE_URL}/faq/${c.file}.html">` : "";
  const ringHtml = `<p class="sub">Weitere Kategorie-FAQs: ${[1, 2, 3].map((k) => eligible[(ci + k) % eligible.length]).map((x) => `<a href="../faq/${x.file}.html">${esc(catName(x))}</a>`).join(" · ")}</p>`;
  const body = `
<h1>${esc(catName(c))} auf Digistore24: 50 Käuferfragen, beantwortet</h1>
<p class="sub">Kategorie-FAQ · Marktplatz-Daten ${datemark(DATA.scrapedAt)} · ${items.length} Angebote analysiert · Jede Zahl ist Anbieter-seitige Marktplatz-Daten oder als Anbieteraussage gekennzeichnet</p>
<div class="tldr"><b>Auf einen Blick:</b> <ul>
<li><b>${items.length} Angebote</b>, Median-Preis <b>${money(med, "EUR")}</b>, Spitzenreiter: <a href="../produkte/${best.slug}.html">${esc(best.label)}</a> (${money(best.earningsPerSale, best.currency)}/Verkauf).</li>
<li>Die 50 Fragen unten sind gruppiert: Kosten, Rückerstattung, Vertrauen, Kaufberatung, Daten &amp; Methode.</li>
<li>Jede Produktseite verlinkt hierher; die Zahlen aktualisieren sich täglich.</li>
</ul></div>
<table class="specs">
<tr><th>Snapshot</th><th>Wert</th></tr>
<tr><td>Angebote / Anbieter</td><td>${items.length} / ${new Set(items.map((p) => p.vendorName)).size}</td></tr>
<tr><td>Median / Spanne Listenpreis</td><td>${money(med, "EUR")} / ${money(Math.min(...items.map((p) => p.price || 0)), "EUR")}–${money(Math.max(...items.map((p) => p.price || 0)), "EUR")}</td></tr>
<tr><td>Median-Stornoquote</td><td>${(() => { const x = items.map((p) => p.cancelRate).filter((v) => v != null).sort((a, b) => a - b); return x.length ? pct(x[Math.floor(x.length / 2)]) : "nicht veröffentlicht"; })()}</td></tr>
<tr><td>Recherche-Basis</td><td>Offizielle Digistore24-Marktplatz-API (Snapshot ${datemark(DATA.scrapedAt)}); Verkaufsseiten-Recherche ${datemark(DATA.researchedAt) || "—"}</td></tr>
</table>
${groups.map((g) => `<h2>${esc(g)}</h2>
${qas.filter((x) => x.g === g).map((x) => `<h3>${esc(x.q)}</h3>\n<p>${x.a}</p>`).join("\n")}`).join("\n")}
<p class="sub">Wie wir bewerten: <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Zahlen-Check</a> · <a href="../about.html">${ringHtml}
${xrefHtml}
Recherche-Standards</a>. Beleg- &amp; Validierungsbedingungen: Statistiken aus der offiziellen Digistore24-Marktplatz-API (Snapshot ${datemark(DATA.scrapedAt)}); aus Verkaufsseiten zitierte Garantie- und Versprechens-Formulierungen sind als Anbieteraussage gekennzeichnet und nicht unsere Prüfung.</p>`;
  
  const jsonLd = [{
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: qas.slice(0, 10).map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a.replace(/<[^>]+>/g, "") } })),
    }];
    fs.writeFileSync(path.join(dir, c.file + ".html"), layout({
      title: `${catName(c)} auf Digistore24: 50 Käuferfragen beantwortet`,
      desc: `50 echte Käuferfragen zu ${catName(c)} auf Digistore24 — Preise, Rückerstattungen, Stornoquoten, Anbietern, beantwortet mit offiziellen Marktplatz-Daten. Stand ${datemark(DATA.scrapedAt)}.`,
      body, rel: "..", path: `faq/${c.file}.html`, jsonLd, hreflangLinks: faqHref,
      crumb: [{ label: "Start", href: "../index.html" }, { label: catName(c), href: `../kategorie/${c.file}.html` }, { label: "FAQ", href: `../faq/${c.file}.html` }],
    }));
    built++;
  }
  console.log(`faq hubs (DE): ${built} pages (50 Q&As each)`);
}

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
    a: `Wir bewerten keine Seriosität — wir veröffentlichen überprüfbare Zahlen: Anbieter <b>${p.vendorName}</b> (gelistet seit ${datemark(p.createdAt)}), mit der vollständigen Verkaufsseiten-Recherche archiviert auf dieser Seite (Anbieteraussagen als solche gekennzeichnet). Lesen Sie unsere <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Bewertungsmethode</a> und entscheiden Sie anhand der Zahlen — oder <a href="https://github.com/vsyour-cmd/digistore-picks-de/discussions?discussions_q=${q}" rel="noopener">diskutieren Sie ${esc(p.label)} auf GitHub</a>.`,
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
  qas.push({
    q: `Wie erhalte ich ${p.label} nach der Zahlung?`,
    a: `Der Checkout läuft über Digistore24: Nach der Zahlung erhalten Sie <b>${(p.billingTypes || []).join(" oder ").toLowerCase().includes("subscription") ? "Zugangsdaten und Ihr Abo-Dashboard" : "Ihren Zugang oder Download per E-Mail und in Ihrem Digistore24-Kundenkonto"}</b>. Lieferdetails für diesen Produkttyp: ${esc((TYPE_USAGE_DE[p.type] || "siehe Verkaufsseite des Anbieters").replace(/\.$/, ""))}. Bei Problemen kann der Digistore24-Käufersupport Ihre Bestellung wiederherstellen.`,
  });
  return qas;
}

function faqSection(p, qas) {
  return `<h2 id="faq">Häufige Fragen zu ${esc(p.label)}</h2>
<p class="sub">Antworten aus dem Marktplatz-Snapshot (${datemark(DATA.scrapedAt)}) und der Verkaufsseiten-Recherche (${datemark(DATA.researchedAt) || "—"}); Anbieteraussagen sind inline gekennzeichnet.</p>
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
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "adminstore",
    url: SITE_URL + "/",
    email: "admin@2bkf.com",
    description: "Unabhängiger Herausgeber von DigistorePicks DE, einem Verzeichnis von Digistore24-Marktplatz-Produkten mit überprüfbaren Marktplatz-Daten und gekennzeichneter Verkaufsseiten-Recherche.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Room 70, Unit 10B, 7/F, Tower B, New Mandarin Plaza, 14 Science Museum Road, Tsim Sha Tsui",
      addressLocality: "Kowloon",
      addressRegion: "Kowloon",
      postalCode: "999077",
      addressCountry: "HK",
    },
    sameAs: [
      "https://github.com/vsyour-cmd/digistore-picks-de",
      "https://vsyour-cmd.github.io/digistore-picks/",
    ],
  };
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

// ---------- Neu this month (monatliches neues Angebot) ----------
function monthlyNewPage() {
  const cutoff = Date.now() - 31 * 24 * 3600 * 1000;
  const fresh = products
    .filter((p) => p.createdAt && new Date(p.createdAt).getTime() >= cutoff)
    .sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0));
  const dateLabel = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const rows = fresh.slice(0, 50).map((p, i) => `<tr>
<td>${i + 1}</td>
<td><a href="produkte/${p.slug}.html">${esc(p.label)}</a></td>
<td>${esc(p.typeDe)}</td>
<td>${money(p.price, p.currency)}</td>
<td>${pct(p.commission)}</td>
<td><b>${money(p.earningsPerSale, p.currency)}</b></td>
<td>${datemark(p.createdAt)}</td>
</tr>`);
  const body = `<h1>Neu auf Digistore24 — ${dateLabel}</h1>
<p class="sub">${fresh.length} Angebote in den letzten 31 Tagen gelistet · sortiert nach Verdienst/Verkauf · Marktplatz-Daten ${datemark(DATA.scrapedAt)}</p>
<div class="tldr"><b>Kernaussagen:</b>
<ul>
<li><b>${fresh.length} neue Angebote</b> in den letzten 31 Tagen (Durchschnittspreis ${money(fresh.length ? fresh.reduce((a, p) => a + (p.price || 0), 0) / fresh.length : 0, "USD")}).</li>
<li>Höchster Verdienst/Verkauf unter den neuen Listings: <b>${esc(fresh[0] ? fresh[0].label : "—")}</b>${fresh[0] ? ` mit <b>${money(fresh[0].earningsPerSale, fresh[0].currency)}</b> (${pct(fresh[0].commission)} Provision)` : ""}.</li>
<li>Neue Listings sind unbewiesen — Anbieterhistorie und Stornoquote im jeweiligen Profil prüfen.</li>
</ul>
</div>
${fresh.length ? `<table class="specs">
<tr><th>#</th><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Verdienst/Verkauf</th><th>Gelistet</th></tr>
${rows.join("\n")}
</table>
<p class="sub">* Anbieter-seitige Marktplatz-Statistiken; keine Prognose. Vollständige Profile sind in jeder Zeile verlinkt.</p>` : "<p>Keine neuen Listings in den letzten 31 Tagen.</p>"}`;
  fs.writeFileSync(outPath("monthly-new.html"), layout({
    title: `Neue Digistore24-Angebote — ${dateLabel} (${fresh.length} gelistet)`,
    desc: `Alle ${fresh.length} Digistore24-Angebote der letzten 31 Tage, sortiert nach offiziellem Verdienst pro Verkauf. Stand ${datemark(DATA.scrapedAt)}.`,
    body, path: "monthly-new.html",
  }));
}

// ---------- Anbieter-Hub-Seiten (≥2 Produkte) ----------
function vendorHubs() {
  const vmap = new Map();
  for (const p of products) {
    const k = p.vendorName;
    if (!vmap.has(k)) vmap.set(k, []);
    vmap.get(k).push(p);
  }
  // Top-100-Auswahl gemeinsame Quelle mit HUB_SLUGS (TOP_VENDORS)
  const vendors = [...TOP_VENDORS.entries()]
    .map(([k]) => ({ name: k, items: (vmap.get(k) || []).sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0)) }));
  const dir = outPath("hersteller");
  fs.mkdirSync(dir, { recursive: true });
  for (const v of vendors) {
    const vslug = slug(v.name);
    const n = v.items.length;
    const totalEps = v.items.reduce((a, p) => a + (p.earningsPerSale || 0), 0);
    const earliest = datemark(v.items.map((x) => x.createdAt).sort()[0]);
    const rows = v.items.map((p) => `<tr><td><a href="../produkte/${p.slug}.html">${esc(p.label)}</a></td><td>${esc(p.typeDe)}</td><td>${money(p.price, p.currency)}</td><td>${pct(p.commission)}</td><td><b>${money(p.earningsPerSale, p.currency)}</b></td><td>${pct(p.cancelRate)}</td><td>${datemark(p.createdAt)}</td></tr>`).join("\n");
    const topCat = (v.items[0].categories || [])[0];
    const catObj = topCat ? DATA.categories.find((c) => c.label === topCat) : null;
    const body = `<h1>${esc(v.name)} — ${n} Produkte auf Digistore24</h1>
<p class="sub">Anbieter-Hub · Marktplatz-Daten ${datemark(DATA.scrapedAt)} · Aktiv seit ${earliest}</p>
<div class="tldr"><b>Auf einen Blick:</b> <ul><li><b>${n} Listings</b> dieses Anbieters, kombinierter Verdienst/Verkauf: <b>${money(totalEps, v.items[0].currency)}</b> (Summe, Anbieter-gemeldet).</li><li>Top-Listing: <a href="../produkte/${v.items[0].slug}.html">${esc(v.items[0].label)}</a>.</li><li>Alle Zahlen sind Anbieter-seitige Marktplatz-Statistiken — ein großes Katalog ist kein Qualitätsversprechen.</li></ul></div>
<h2>Alle Produkte von ${esc(v.name)}</h2>
<table class="specs"><tr><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Verdienst/Verkauf</th><th>Storno*</th><th>Gelistet</th></tr>
${rows}
</table>
<p class="sub">* Anbieter-seitige Marktplatz-Statistiken von Digistore24; abhängig von der Traffic-Qualität, keine Prognose. Preise und Garantien auf offiziellen Seiten prüfen.</p>
<h2>Weiterlesen</h2>
${catObj ? `<p>Primärkategorie: <a href="../kategorie/${catObj.file}.html">${esc(catName(catObj))}</a> (${catObj.count} Produkte) · Methode: <a href="../blog/digistore24-zahlen-checkliste.html">6-Punkte-Check</a>.</p>` : ""}
<p><a href="index.html">← Anbieter-Verzeichnis</a> — alle Top-Anbieter mit ihren Listings.</p>`;
    const jsonLd = [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${v.name} — alle Produkte auf Digistore24`,
      itemListElement: v.items.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/produkte/${x.slug}.html`, name: x.label })),
    }];
    fs.writeFileSync(path.join(dir, vslug + ".html"), layout({ title: `${v.name} — ${n} Produkte, Preise & Marktplatz-Daten`, desc: `Alle ${n} Digistore24-Produkte des Anbieters ${v.name}: Preise, Provisionen, Konversion und Stornoquoten. Offizielle Marktplatz-Daten, Stand ${datemark(DATA.scrapedAt)}.`, body, rel: "..", path: `hersteller/${vslug}.html`, jsonLd, crumb: [{ label: "Start", href: "../index.html" }, { label: v.name, href: `../hersteller/${vslug}.html` }] }));
  }
  // hub 页是生成物:清理不在当前集合里的过期 hub(厂商改名/掉出 Top100)
  const wantedHubs = new Set(vendors.map((v) => slug(v.name) + ".html"));
  let prunedHubs = 0;
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith(".html") && f !== "index.html" && !wantedHubs.has(f)) { fs.unlinkSync(path.join(dir, f)); prunedHubs++; }
  }
  const list = vendors.map((v) => `<li><a href="${slug(v.name)}.html">${esc(v.name)}</a> — ${v.items.length} Produkte</li>`).join("");
  const idxBody = `<h1>Anbieter auf Digistore24 (Top ${vendors.length} nach Kataloggröße)</h1><p class="sub">Anbieter-Hubs mit allen Listings und Marktplatz-Daten. Stand ${datemark(DATA.scrapedAt)}.</p><ul style="line-height:2">${list}</ul>`;
  fs.writeFileSync(path.join(dir, "index.html"), layout({ title: `Anbieter-Verzeichnis — ${SITE_NAME}`, desc: `Top Digistore24-Anbieter mit ihren Produkten und offiziellen Marktplatz-Statistiken.`, body: idxBody, rel: "..", path: "hersteller/index.html" }));
  console.log("vendor hubs:", vendors.length + (prunedHubs ? ", " + prunedHubs + " stale pruned" : ""));
}

function trustPages() {
  // 信任枢纽页(德语):事实仅来自官方页面+本站研究扫描,逐项标注来源与日期。
  const disclaimer = `<p class="sub"><b>Werbe-Hinweis:</b> ${SITE_NAME} enthält Affiliate-Links; kaufen Sie über einen Link, erhalten wir ggf. eine Provision vom Anbieter – für Sie keine Mehrkosten. ${SITE_NAME} ist ein unabhängiges Verzeichnis – nicht Digistore24 und darüber hinaus nur über das Affiliate-Programm verbunden.</p>`;

  const refundsBody = `
<h1>Digistore24 Rückerstattung: Ablauf, Fristen, offizielle Wege</h1>
<p class="sub">Wer für Rückerstattungen verantwortlich ist, wie der Ablauf funktioniert und wie Sie die Garantie <em>vor</em> dem Kauf prüfen.</p>
<div class="tldr"><b>Das Wichtigste</b>
<ul>
<li>Digistore24 verkauft Produkte <b>als Reseller im eigenen Namen</b> und übernimmt Kundensupport, Reklamationsbearbeitung und Rückgabeverwaltung – Rückerstattungsanfragen laufen also über Digistore24, nicht über den einzelnen Anbieter (offizielle Anbieterangabe, abgerufen 2026-10-10).</li>
<li>Die Garantie dauert <b>je Angebot unterschiedlich</b>, zentral geregelt ist sie nicht. In unserem Scan von 4.293 Verkaufsseiten nennen nur 10 % direkt Garantie-/Widerrufsformulierungen; wo Tage genannt werden, sind <b>90 Tage am häufigsten</b> (52 Angebote, dann 30/14/60 Tage).</li>
<li>Offizielle Wege: der Link in der Bestellbestätigungs-E-Mail oder das Digistore24-Helpcenter.</li>
<li>Wir sind ein unabhängiges Verzeichnis – wir verarbeiten keine Zahlungen und keine Rückerstattungen.</li>
</ul></div>
<h2>Wer über Ihr Geld – und Ihre Rückerstattung – wacht</h2>
<p>Laut offizieller Anbieter-Dokumentation verkauft Digistore24 Produkte „als Reseller im eigenen Namen“ und übernimmt Buchhaltung, Rechnungserstellung, Steuermanagement, Kundensupport, Reklamationsbearbeitung und Rückgabeverwaltung. Für Käufer bedeutet das: Der Zahlungsvertrag besteht mit Digistore24, und Rückerstattungen werden über Digistore24 abgewickelt – nicht über den einzelnen Anbieter.</p>
<p>Die offiziellen Käufer-Informationen von Digistore24 beschreiben zwei Wege für eine Rückerstattungsanfrage: über den Link in Ihrer <b>Bestellbestätigungs-E-Mail</b> („Do you have an urgent question about the product…“) oder über das Helpcenter unter <a href="https://help.digistore24.com" rel="noopener">help.digistore24.com</a>. Halten Sie Ihre Bestelldaten bereit (E-Mail-Adresse, Rechnungs- oder Transaktionsnummer).</p>
<h2>Wie lang ist die Garantie? Je Angebot unterschiedlich – unsere Daten</h2>
<p>Eine seitenweite Garantie gibt es nicht – <b>jeder Anbieter legt die Bedingungen für sein Angebot fest</b>. Für ein realistisches Bild haben wir die Verkaufsseiten von <b>4.293 Digistore24-Angeboten</b> in unserer Recherche-Datenbank ausgewertet (Stand 2026-10-10):</p>
<table class="specs">
<tr><th>Was die Anbieter-Verkaufsseiten zeigen</th><th>Angebote</th></tr>
<tr><td>Nennen Garantie-, Geld-zurück-, Widerrufs- oder Rückerstattungsformulierungen</td><td>431 von 4.293 (10 %)</td></tr>
<tr><td>Nennen eine explizite Tagesangabe</td><td>195</td></tr>
</table>
<p>Warum nur 10 %? Deutsche Anbieter verweisen das gesetzliche <b>Widerrufsrecht</b> oft in verlinkte AGB-/Impressum-Seiten statt auf die Verkaufsseite selbst. Dort, wo Tage genannt werden, ist das Bild klar:</p>
<table class="specs">
<tr><th>Genannte Garantiedauer (Anbieterangaben)</th><th>Angebote</th></tr>
<tr><td>90 Tage</td><td>52</td></tr>
<tr><td>30 Tage</td><td>49</td></tr>
<tr><td>14 Tage</td><td>46</td></tr>
<tr><td>60 Tage</td><td>24</td></tr>
<tr><td>Sonstige (7, 21 Tage…)</td><td>24</td></tr>
</table>
<p class="sub"><b>Anbieterangaben, nicht von uns geprüft.</b> Aus den Verkaufsseiten der Anbieter, abgerufen 2026-10-10; Bedingungen können sich jederzeit ändern. Bestätigen Sie die Garantie immer auf der Kassenseite – diese Version zählt.</p>
<h2>Garantie vor dem Kauf prüfen (2 Minuten)</h2>
<ol>
<li>Produktprofil auf dieser Seite öffnen – jedes Profil verlinkt die offizielle Verkaufsseite und zeigt die <b>Zahlungsart</b> (Einmalzahlung, Ratenkauf oder Abo).</li>
<li>Garantie-Formulierung auf der Verkaufsseite lesen.</li>
<li>An der Kasse bestätigen, dass dieselbe Garantie genannt wird.</li>
<li>Bei Abos: klären, wie die <b>Laufzeit-Kündigung</b> getrennt von der Geld-zurück-Frist funktioniert.</li>
<li>Kassenbedingungen als Screenshot sichern.</li>
</ol>
<h2>Falls etwas schiefgeht</h2>
<p>Rückerstattung über die offiziellen Digistore24-Kanäle beantragen (Bestätigungs-E-Mail oder Helpcenter). Wird eine zugesagte Garantie abgelehnt, sind Ihre Kassen-Screenshots die Dokumentation – eskalieren Sie über den Digistore24-Support, der als Reseller Rückgaben und Reklamationen verwaltet.</p>
<p>Unser Teil: Jedes Profil ist mit seiner Recherche-Methode gekennzeichnet, und wenn eine Verkaufsseite nicht erreichbar ist, sagen wir das offen. Siehe auch <a href="ist-digistore24-sicher.html">was wir über die Plattform prüfen können</a> und die <a href="sicher-kaufen.html">Checkliste vor dem Kauf</a>.</p>
<h2>Quellen &amp; Methode</h2>
<ul>
<li>Digistore24-Homepage (digistore24.com) – Reseller-Modell, Support- und Rückgabeverwaltung; abgerufen 2026-10-10.</li>
<li>Offizielle Käufer-Informationen von Digistore24 – Rückerstattungswege; abgerufen 2026-10-10.</li>
<li>${SITE_NAME} Verkaufsseiten-Scan – 4.293 recherchierte Angebote, Garantieformulierungen wörtlich extrahiert; Stand 2026-10-10. Anbieterangaben, nicht von uns geprüft.</li>
</ul>
${disclaimer}`;
  fs.writeFileSync(outPath("digistore24-rueckerstattung.html"), layout({
    title: "Digistore24 Rückerstattung: Ablauf, Fristen, offizielle Wege",
    desc: `Wer Rückerstattungen bei Digistore24 bearbeitet, wie Sie eine beantragen und was unser Scan von 4.293 Verkaufsseiten über Garantiefristen zeigt (90 Tage am häufigsten). Stand ${datemark(DATA.scrapedAt)}.`,
    body: refundsBody, path: "digistore24-rueckerstattung.html", hreflangLinks: HREF_HOME,
  }));

  const safeBody = `
<h1>Ist Digistore24 seriös und sicher? Was wir prüfen – und was nicht</h1>
<p class="sub">Ein unabhängiger Blick auf die Plattform selbst: Wer dahintersteckt, was sie tut – und was das für Käufer bedeutet.</p>
<div class="tldr"><b>Das Wichtigste</b>
<ul>
<li>Digistore24 verkauft digitale Produkte <b>als Reseller im eigenen Namen</b> – Buchhaltung, Rechnungen, Steuern, Kundensupport, Reklamationen und Rückgaben übernimmt die Plattform (offizielle Angabe, abgerufen 2026-10-10).</li>
<li>Die Plattform veröffentlicht live Kennzahlen auf der eigenen Homepage (87 % Kundenzufriedenheit, 22.701 gelöste Tickets in den letzten 30 Tagen, Stand 2026-10-10 – Anbieterangaben).</li>
<li>Plattform ≠ Produktqualität: Jeder Anbieter kann ein Angebot einstellen. Bewerten Sie jedes Produkt einzeln – genau dafür ist dieses Verzeichnis da.</li>
</ul></div>
<h2>Was Digistore24 ist (offizielle Fakten)</h2>
<ul>
<li><b>Reseller of Record:</b> Produkte werden im eigenen Namen von Digistore24 verkauft; die Plattform übernimmt Buchhaltung, Rechnungserstellung, Steuermanagement, Kundensupport, Reklamationsbearbeitung und Rückgabeverwaltung (offizielle Homepage, abgerufen 2026-10-10).</li>
<li><b>Gründer &amp; CEO:</b> Sven Platte (offizielle Homepage).</li>
<li><b>Infrastruktur (Anbieterangaben):</b> TÜV-zertifizierte IT-Infrastruktur, 30-köpfiges deutsches Inhouse-Entwicklerteam, AWS-Hosting.</li>
<li><b>Zahlungsarten (Anbieterangaben):</b> Kreditkarte, Rechnung, PayPal, Klarna inkl. Pay-Later; Ratenkauf und Abos werden unterstützt.</li>
<li><b>Skalierung (Anbieterangaben):</b> 3 Mrd. € Umsatz über Affiliates und Vendoren, 100+ Mio. verkaufte Produkte, 10.000+ aktive Affiliates, 8.000+ Angebote in 44+ Nischen.</li>
<li><b>Veröffentlichte Support-Kennzahlen:</b> 87 % Kundenzufriedenheit (letzte 30 Tage), 22.701 gelöste Tickets (letzte 30 Tage), 100,0 % Uptime (letzte 90 Tage) – angezeigt auf der offiziellen Homepage am 2026-10-10; Anbieterangaben, ändern sich laufend.</li>
</ul>
<h2>Was das für Sie als Käufer bedeutet</h2>
<p>Zahlungen laufen über die Plattform als Reseller, Rückerstattungsanfragen über Digistore24 (<a href="digistore24-rueckerstattung.html">siehe Rückerstattungs-Guide</a>). Aber die Plattform ist ein Marktplatz: <b>Die Angebotsqualität variiert, weil jeder Anbieter selbst entscheidet, was er verkauft und wie.</b> Eine sichere Kasse macht noch kein gutes Angebot – deshalb ist die Einzelduell-Prüfung wichtig.</p>
<h2>Was wir je Angebot prüfen – und wie</h2>
<ul>
<li><b>Offizielle Marktplatz-Kennzahlen:</b> Preis, Provision, Kassen-Konversion, Stornoquote, Verdienst pro Verkauf – gekennzeichnet als Anbieter-seitige Marktplatzdaten, nie als Prognosen.</li>
<li><b>Verkaufsseiten-Recherche:</b> wörtliche Auszüge markiert als „Anbieteraussagen, nicht von uns geprüft“.</li>
<li><b>Erreichbarkeit:</b> Tote Domains und abgelaufene Zertifikate werden offen ausgewiesen – das ist Information über den Angebotszustand.</li>
<li><b>Methoden-Kennzeichnung:</b> jede Seite sagt „Datenprofil“ oder „Praxis-Test“.</li>
<li><b>Keine bezahlten Platzierungen:</b> Wir nehmen kein Geld für Listenposition oder Bewertungen. Wir verdienen Affilate-Provisionen bei Kauf über Links – ohne Mehrkosten für Sie.</li>
</ul>
<h2>Warnsignale, die wir ausweisen statt verstecken</h2>
<p>Nicht erreichbare oder nur per JS gerenderte Verkaufsseiten, fehlende performance-Kennzahlen, Auffälligkeiten bei der Stornoquote – jedes Produktprofil zeigt, was Marktplatz und Verkaufsseite tatsächlich sagen, einschließlich der Lücken. Nutzen Sie die <a href="sicher-kaufen.html">Checkliste vor dem Kauf</a> als Routine.</p>
<h2>Quellen &amp; Methode</h2>
<ul>
<li>Digistore24-Homepage (digistore24.com) – Unternehmen, Reseller-Modell, Support-Kennzahlen; abgerufen 2026-10-10.</li>
<li>${SITE_NAME} Marktplatz-Snapshot von ${DATA.total} Angeboten und Verkaufsseiten-Recherche (${DATA.withResearch} recherchiert); Stand 2026-10-10.</li>
</ul>
${disclaimer}`;
  fs.writeFileSync(outPath("ist-digistore24-sicher.html"), layout({
    title: "Ist Digistore24 seriös und sicher? Was wir prüfen – und was nicht",
    desc: `Unabhängige Einschätzung von Digistore24: Reseller-Modell, Unternehmensfakten, veröffentlichte Support-Zahlen – und was Käufer je Angebot prüfen sollten. Stand ${datemark(DATA.scrapedAt)}.`,
    body: safeBody, path: "ist-digistore24-sicher.html", hreflangLinks: HREF_HOME,
  }));

  const checklistBody = `
<h1>Vor dem Kauf auf Digistore24: Checkliste in 5 Minuten</h1>
<p class="sub">Sechs Prüfungen, fünf Minuten – und die häufigsten Kaufreuegründe sind abgedeckt. Funktioniert für jedes Angebot der Plattform.</p>
<div class="tldr"><b>Die Checkliste</b>
<ol>
<li><b>Verkaufsseite des Anbieters lesen</b> – jedes Profil verlinkt sie. Ist eine Seite nicht erreichbar, sagt unser Profil das offen.</li>
<li><b>Garantie an der Kasse bestätigen</b> – wo eine Tagesangabe steht, sind 90 Tage am häufigsten (Anbieterangaben aus unserem Scan). Die Kassenseite ist die Version, die zählt.</li>
<li><b>Zahlungsart kennen</b> – Einmalzahlung, Ratenkauf oder Abo steht in jedem Profil. Abos brauchen eine separate Kündigung, getrennt von der Geld-zurück-Frist.</li>
<li><b>Anbieter &amp; Support-Kanäle notieren</b> – Profile nennen den Anbieternamen; Rückerstattungen laufen über Digistore24 (siehe Rückerstattungs-Guide).</li>
<li><b>Kassenbedingungen screenshoten</b> – das ist Ihre Dokumentation.</li>
<li><b>Bei Problemen den offiziellen Weg nutzen</b> – Bestellbestätigungs-E-Mail oder Digistore24-Helpcenter.</li>
</ol></div>
<h2>So lesen Sie unsere Produktprofile</h2>
<p>Jedes Profil zeigt die offiziellen Marktplatz-Zahlen (Preis, Provision, Kassen-Konversion, Stornoquote, Verdienst pro Verkauf – Anbieter-seitige Daten, keine Prognosen), wörtliche Auszüge aus der Verkaufsseite markiert als „Anbieteraussagen, nicht von uns geprüft“ und eine Methoden-Kennzeichnung: <b>Datenprofil</b> (Fakten aus Listing und öffentlicher Verkaufsseite) oder <b>Praxis-Test</b> (selbst gekauft und genutzt). Ist eine Verkaufsseite nicht erreichbar, steht das im Profil.</p>
<h2>Drei Zahlen mit doppeltem Blickwert</h2>
<ul>
<li><b>Stornoquote</b> – wie oft Käufer stornieren oder zurückgeben, laut Marktplatz für dieses Angebot. Hohe Werte verdienen Extra-Skepsis gegenüber den Versprechen der Verkaufsseite.</li>
<li><b>Kassen-Konversion</b> – hängt von der Traffic-Qualität des Anbieters ab; Funnel-Performance, kein Versprechen für Ihr Erlebnis.</li>
<li><b>Zahlungsarten</b> – ein „Einmalzahlung“-Angebot verhält sich nach Ablauf der Rückgabefrist sehr anders als ein Abo.</li>
</ul>
<h2>Quellen &amp; Methode</h2>
<ul>
<li>Offizielle Marktplatzdaten: Digistore24-Marktplatz, Stand ${datemark(DATA.scrapedAt)}.</li>
<li>Garantie-Scan: ${DATA.withResearch} recherchierte Verkaufsseiten, Stand 2026-10-10 – Anbieterangaben, nicht von uns geprüft.</li>
<li>Rückerstattungswege: offizielle Käufer-Informationen von Digistore24, abgerufen 2026-10-10.</li>
</ul>
${disclaimer}`;
  fs.writeFileSync(outPath("sicher-kaufen.html"), layout({
    title: "Vor dem Kauf auf Digistore24: Checkliste in 5 Minuten",
    desc: `Sechs Prüfungen vor der Zahlung auf Digistore24: Garantie an der Kasse, Zahlungsart, Anbieter und Support-Wege – mit Daten aus ${DATA.withResearch} recherchierten Verkaufsseiten.`,
    body: checklistBody, path: "sicher-kaufen.html", hreflangLinks: HREF_HOME,
  }));
  console.log("trust pages (DE): 3");
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


// ---------- Amazon.de 联盟区块(amazon-blocks-de.js 模块,tagDe 计佣) ----------
const AMAZON_PICKS = (() => { try { return JSON.parse(fs.readFileSync("G:/Digistore24/data/amazon-picks.json", "utf8")); } catch { return {}; } })();
const { amazonBlockDe, amazonPicksPageDe } = require("./amazon-blocks-de.js")({ fs, path, DATA, products, catName, esc, pct, money, datemark, outPath, layout, SITE_NAME, AMAZON_PICKS });
// ---------- Käufer-Longtail-Inhalte (Landing-Optimierung) ----------
// Vollständig aus echten Produktdaten/Anbieteroriginalen gespeist; keine Affiliate-Statistiken
function longTailContentDe(p) {
  const r = (p.research && !p.research.error) ? p.research : null;
  const cat = DATA.categories.find((c) => String(c.catId) === String((p.categoryIds || [])[0]));
  const catLabel = cat ? esc(catName(cat)) : "digitale Produkte";
  const mdFile = p.id + "-" + slug(p.label || ("produkt-" + p.id)) + ".md";
  const billing = (p.billingTypes || []).join(", ").toLowerCase() || "siehe Verkaufsseite";
  const delivery = TYPE_USAGE_DE[p.type] ? esc(TYPE_USAGE_DE[p.type]).replace(/\.$/, "") : "Lieferdetails kommen per E-Mail und in Ihrem Digistore24-Kundenkonto";
  const secs = [];
  secs.push(`<h2>Was ist ${esc(p.label)}?</h2>
<p>${esc(p.label)} ist ein/e ${esc((p.typeDe || p.type).toLowerCase())} in der Kategorie ${catLabel} des Digistore24-Marktplatzes, veröffentlicht von Anbieter <b>${esc(p.vendorName)}</b> und im Verkauf seit <b>${datemark(p.createdAt)}</b>.${p.description ? " Der Anbieter beschreibt es so: &quot;<i>" + esc(p.description.slice(0, 260)) + "</i>&quot; (Marktplatz-Beschreibung des Anbieters, leicht gekürzt)." : ""}</p>`);
  secs.push(`<h2>${esc(p.label)} Preis: was Sie zahlen</h2>
<p>Der Marktplatz listet ${esc(p.label)} zum <b>${money(p.price, p.currency)}</b> Preis (${esc(billing)}). Digistore24 fügt im Checkout die gesetzliche Steuer Ihres Landes hinzu — dort sehen Sie den Endbetrag vor der Zahlung.${r && r.priceMentions && r.priceMentions.length ? " Die Verkaufsseite selbst nennt: " + r.priceMentions.slice(0, 4).map((x) => "<b>" + esc(x) + "</b>").join(", ") + " (Anbieteraussagen — verbindlich ist der Checkout-Betrag)." : ""} Eine separate Plattformgebühr gibt es nicht; Anbieter können eigene Upsells nach dem Checkout anbieten.</p>`);
  secs.push(`<h2>${esc(p.label)} Rückerstattung und Geld-zurück-Garantie</h2>
<p>${r && r.guaranteeMention ? "Die Verkaufsseite wirbt mit: <b>&quot;" + esc(r.guaranteeMention) + "&quot;</b> (Anbieteraussage). " : "Wir haben keine standardisierte Garantie-Formulierung auf der Verkaufsseite gefunden. "}Rückerstattungen für Digistore24-Käufe laufen über die Plattform: Antrag über den Support-Link in Ihrer Bestell-E-Mail, innerhalb des Garantiezeitfensters, das im Checkout angezeigt wird. Praktischer Rat: Entscheiden Sie innerhalb des Fensters — wenn das Produkt unter den Erwartungen bleibt, erstatten lassen statt irren lassen.</p>
<p>Mechanik im Detail: <a href="../digistore24-rueckerstattung.html">So funktionieren Digistore24-Rückerstattungen</a>.</p>`);
  secs.push(`<h2>Für wen ist ${esc(p.label)} geeignet?</h2>
<p>Basierend auf der ${catLabel}-Einordnung${(p.billingTypes || []).length ? " und der " + esc(billing) + "-Abrechnung" : ""} richtet sich ${esc(p.label)} an Käufer, die ${catLabel.toLowerCase()}-Lösungen suchen${p.price >= 100 ? " und ein Budget für einen Premium-Kauf eingeplant haben" : p.price >= 30 ? " im mittleren Preisbereich" : " zum Einstiegspreis"}. Der ehrliche Test ist nicht die Kategorie, sondern Ihre eigene Situation: Werden Sie es realistisch innerhalb des Garantiefensters nutzen? Wenn ja, ist der Preis eine Investition; wenn nein, ist er Ballast — unabhängig von der Qualität.</p>`);
  secs.push(`<h2>Ist ${esc(p.label)} seriös? Was Sie vor dem Kauf prüfen</h2>
<p>Wir bewerten keine Seriosität — das kann niemand, ohne das Produkt zu nutzen. Prüfbare Punkte, alle auf dieser Seite: die Marktplatz-Historie des Anbieters (im Verkauf seit ${datemark(p.createdAt)}), die wörtlichen Verkaufsseiten-Auszüge unten (gekennzeichnet als <i>Anbieteraussagen</i> — deren Werbung, nicht unsere Empfehlung), die Garantiebedingungen im Checkout und die Auslieferungsart. Vorsichtsignale bei jedem Angebot: Countdown-Dringlichkeit gepaart mit vagen Rückerstattungsbedingungen, Testimonials ohne Datum und Anbieterseiten, die den Preis bis zum Checkout verstecken.</p>`);
  secs.push(`<h2>Wie kommen Sie nach dem Kauf an ${esc(p.label)}?</h2>
<p>Der Checkout läuft über Digistore24. Nach der Zahlung: ${delivery}. Bewahren Sie die Bestell-E-Mail auf — sie ist Ihr Schlüssel zum/d zur ${esc((p.typeDe || p.type).toLowerCase())}, zu Rückerstattungsanträgen und zum Digistore24-Käufersupport.</p>`);
  secs.push(`<h2>${esc(p.label)} Erfahrungen: so recherchieren Sie richtig</h2>
<p>Die meisten „Erfahrungsberichte" zu Marktplatz-Produkten sind Affiliate-Inhalte — einschließlich Seiten wie dieser, die an Käufen mitverdienen. Behandeln Sie jeden Bericht (auch unseren) als Ausgangspunkt und prüfen Sie gegen Primärquellen: die Verkaufsseite des Anbieters, die Digistore24-Rückerstattungsrichtlinie und — für ${catLabel.toLowerCase()} — unabhängige Communities außerhalb des Affiliate-Ökosystems. Auf dieser Seite sind die Verkaufsseiten-Auszüge unten wörtlich zitiert, damit Sie die Aussagen des Anbieters bewerten können, ohne wegzuklicken.</p>`);
  secs.push(`<h2>Wie Sie ${esc(p.label)} sicher kaufen</h2>
<ol>
<li>Öffnen Sie die <a href="${esc(p.promoLink)}" rel="nofollow sponsored noopener" target="_blank">offizielle Verkaufsseite</a> und lesen Sie das vollständige Angebot.</li>
<li>Bestätigen Sie Endpreis und Garantiezeitfenster auf der Digistore24-Kassenseite — sie ist bindend, kein Vergleichsportal.</li>
<li>Zahlen Sie innerhalb des Digistore24-Checkouts (niemals per Überweisung oder Off-Platform-Links).</li>
<li>Speichern Sie die Bestellbestätigung; notieren Sie die Rückerstattungsfrist im Kalender.</li>
<li>Prüfen Sie zügig. Der Digistore24-Käufersupport hilft, wenn der Anbieter nicht reagiert.</li>
</ol>`);
  secs.push(`<p class="sub">Vollständiges Recherche-Archiv für dieses Produkt (Markdown: kompletter Marktplatz-Datensatz + wörtliche Verkaufsseiten-Auszüge): <a href="../content/products/${mdFile}" download="${mdFile}">${esc(p.label)} — vollständiges Datenarchiv (Markdown-Datei: ${mdFile})</a>.</p>`);
  return secs.join("\n");
}


const altSlugs = computeAltSlugs();
homePage();
categoryPages();
profilePages(altSlugs);
const altCount = alternativesPages(altSlugs);
const bestCount = bestOfPages();
staticPages();
trustPages();
// ---------- Preis-Beobachtung (price-watch-page: History-Snapshots vs. aktueller Datensatz) ----------
// Unter 7 Tagen Snapshots trotzdem veröffentlichen: kumulierte Änderungen ehrlich zeigen,
// Hinweis wann das 7-Tage-Fenster greift; mit jedem täglichen Rebuild autom. aktueller
function priceWatchPage() {
  const histDir = "G:/Digistore24/data-de/history";
  const suffix = "-de.json";
  const snaps = fs.existsSync(histDir) ? fs.readdirSync(histDir).filter((f) => f.endsWith(suffix)).map((f) => f.slice(0, 10)).sort() : [];
  if (!snaps.length || !snaps[0]) { console.log("price-watch: keine History-Snapshots, übersprungen"); return; }
  const curIds = new Set(products.map((p) => String(p.id)));
  const oldest = JSON.parse(fs.readFileSync(path.join(histDir, snaps[0] + suffix), "utf8"));
  const oldestMap = new Map((oldest.products || []).map((p) => [String(p.id), p]));
  const pctChg = (a, b) => (a ? Math.round(((b - a) / a) * 1000) / 10 : null);
  const priceUp = [], priceDown = [], statChanges = [], newListings = [], delisted = [];
  for (const p of products) {
    const o = oldestMap.get(String(p.id));
    if (!o) { newListings.push(p); continue; }
    const pc = o.price ? pctChg(o.price, p.price) : null;
    if (pc != null && Math.abs(p.price - o.price) >= 0.5 && Math.abs(pc) >= 1) (pc > 0 ? priceUp : priceDown).push({ p, o, pc });
    const dc = o.cancelRate != null && p.cancelRate != null ? p.cancelRate - o.cancelRate : null;
    const dv = o.conversionRate != null && p.conversionRate != null ? p.conversionRate - o.conversionRate : null;
    const de = o.earningsPerSale ? ((p.earningsPerSale - o.earningsPerSale) / o.earningsPerSale) * 100 : null;
    if ((dc != null && Math.abs(dc) >= 0.5) || (dv != null && Math.abs(dv) >= 0.5) || (de != null && Math.abs(de) >= 5)) statChanges.push({ p, o, dc, dv, de });
  }
  for (const [id, o] of oldestMap) if (!curIds.has(id)) delisted.push(o);
  const byAbsPc = (a, b) => Math.abs(b.pc) - Math.abs(a.pc);
  priceUp.sort(byAbsPc); priceDown.sort(byAbsPc);
  statChanges.sort((a, b) => Math.abs(b.de || 0) - Math.abs(a.de || 0));
  newListings.sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0));
  const windowDays = Math.round((Date.now() - Date.parse(snaps[0])) / 86400000);
  const sevenDayFrom = new Date(Date.parse(snaps[0]) + 7 * 86400000).toISOString().slice(0, 10);
  const cap = (arr, n) => ({ rows: arr.slice(0, n), more: Math.max(arr.length - n, 0) });
  const pUp = cap(priceUp, 20), pDown = cap(priceDown, 20), st = cap(statChanges, 20), nl = cap(newListings, 20), dl = cap(delisted, 20);
  const row = (p, cells) => `<tr><td><a href="../produkte/${p.slug}.html">${esc(p.label)}</a></td>${cells}</tr>`;
  const body = `
<h1>Preis-Beobachtung: Was sich auf dem Digistore24-Marktplatz geändert hat</h1>
<p class="sub">Marktplatz-Daten ${datemark(DATA.scrapedAt)} · Historien-Fenster: ${snaps[0]} → ${snaps[snaps.length - 1]} (${windowDays} Tag${windowDays === 1 ? "" : "e"} Snapshots) · Vergleich: Snapshot ${snaps[0]} gegen den heutigen Datensatz</p>
<div class="tldr"><b>Auf einen Blick:</b> <ul>
<li><b>${DATA.total} Produkte beobachtet</b>; seit ${snaps[0]}: <b>${priceUp.length} Preiserhöhungen</b>, <b>${priceDown.length} Preissenkungen</b>, <b>${statChanges.length} wesentliche Kennzahlen-Änderungen</b> (Storno/Konversion/Verdienst).</li>
<li><b>${newListings.length} neue Listings</b> dazugekommen, <b>${delisted.length} Angebote</b> aus dem Marktplatz-Datensatz verschwunden.</li>
<li>Alle Zahlen Anbieter-seitige Marktplatz-Statistiken — Änderungen spiegeln die Neupreisung der Anbieter, keine Prognosen von uns.</li>
</ul></div>
${windowDays < 7 ? `<div class="notice"><b>Historie sammelt sich an.</b> Tägliche Snapshots beginnen am ${snaps[0]}; die rollierende 7-Tage-Sicht wird ab dem <b>${sevenDayFrom}</b> aussagekräftig. Unten: kumulierte Änderungen seit ${snaps[0]} — aktualisiert sich automatisch mit jedem täglichen Rebuild.</div>` : ""}
${priceUp.length || priceDown.length ? `<h2 id="preise">Preisänderungen seit ${snaps[0]}</h2>
${priceUp.length ? `<h3>Erhöht (${priceUp.length})</h3>
<table class="specs"><tr><th>Produkt</th><th>Alt</th><th>Neu</th><th>Änderung</th></tr>
${pUp.rows.map(({ p, o, pc }) => row(p, `<td>${money(o.price, p.currency)}</td><td><b>${money(p.price, p.currency)}</b></td><td>+${pc}%</td>`)).join("\n")}
</table>${pUp.more ? `<p class="sub">…und ${pUp.more} weitere Erhöhungen.</p>` : ""}` : ""}
${priceDown.length ? `<h3>Gesendet (${priceDown.length})</h3>
<table class="specs"><tr><th>Produkt</th><th>Alt</th><th>Neu</th><th>Änderung</th></tr>
${pDown.rows.map(({ p, o, pc }) => row(p, `<td>${money(o.price, p.currency)}</td><td><b>${money(p.price, p.currency)}</b></td><td>${pc}%</td>`)).join("\n")}
</table>${pDown.more ? `<p class="sub">…und ${pDown.more} weitere Senkungen.</p>` : ""}` : ""}
<p class="sub">Preise setzt der Anbieter; die Kassenseite ist immer maßgeblich. Eine Preisänderung kann auch ein Relaunch, geänderter Paketinhalt oder eine Währungsanpassung sein — vor Interpretationen das Produktprofil prüfen.</p>` : `<h2 id="preise">Preisänderungen seit ${snaps[0]}</h2><p>Kein Anbieter hat den Listenpreis seit ${snaps[0]} um ≥1% geändert.</p>`}
${statChanges.length ? `<h2 id="kennzahlen">Wesentliche Kennzahlen-Änderungen (Storno, Konversion, Verdienst/Verkauf)</h2>
<table class="specs"><tr><th>Produkt</th><th>Storno</th><th>Warenkorb-Konv.</th><th>Verdienst/Verkauf</th></tr>
${st.rows.map(({ p, o, dc, dv, de }) => row(p, `<td>${o.cancelRate != null && dc != null ? pct(o.cancelRate) + " → " + pct(p.cancelRate) + " (" + (dc > 0 ? "+" : "") + dc.toFixed(1) + "pp)" : "—"}</td><td>${o.conversionRate != null && dv != null ? pct(o.conversionRate) + " → " + pct(p.conversionRate) : "—"}</td><td>${o.earningsPerSale ? money(o.earningsPerSale, p.currency) + " → <b>" + money(p.earningsPerSale, p.currency) + "</b> (" + (de > 0 ? "+" : "") + de.toFixed(1) + "%)" : "—"}</td>`)).join("\n")}
</table>${st.more ? `<p class="sub">…und ${st.more} weitere.</p>` : ""}
<p class="sub">Angezeigt: Änderungen ≥0,5pp (Storno/Konversion) oder ≥5% (Verdienst/Verkauf). Diese Statistiken hängen vom Traffic des Anbieters ab — eine bewegliche Zahl ist kein Trend, zwei Punkte ergeben noch keine Linie.</p>` : ""}
${newListings.length ? `<h2 id="neu">Neue Listings seit ${snaps[0]} (${newListings.length})</h2>
<table class="specs"><tr><th>Produkt</th><th>Preis</th><th>Verdienst/Verkauf</th><th>Gelistet</th></tr>
${nl.rows.map((p) => row(p, `<td>${money(p.price, p.currency)}</td><td>${money(p.earningsPerSale, p.currency)}</td><td>${datemark(p.createdAt)}</td>`)).join("\n")}
</table>${nl.more ? `<p class="sub">…und ${nl.more} weitere — siehe <a href="monthly-new.html">die monatliche Neuheiten-Seite</a>.</p>` : ""}` : ""}
${delisted.length ? `<h2 id="weg">Nicht mehr im Marktplatz-Datensatz (${delisted.length})</h2>
<p>In Snapshot ${snaps[0]} vorhanden, heute fehlend: ${dl.rows.map((o) => "<b>" + esc(o.label) + "</b>").join(" · ")}${dl.more ? ` …und ${dl.more} weitere.` : "."} Die Profile bleiben mit Hinweis online, bis <a href="../about.html">unsere Aktualitäts-Politik</a> sie entfernt; über veraltete Seiten nicht kaufen.</p>` : ""}
<p class="sub">Methode: <a href="blog/digistore24-zahlen-checkliste.html">6-Punkte-Zahlen-Check</a> · <a href="about.html">Recherche-Standards</a>. Beleg- &amp; Validierungsbedingungen: tägliche Voll-Datensatz-Snapshots aus der offiziellen Digistore24-Marktplatz-API (Dateien vom ${snaps.join(", ")}); Änderungen mechanisch zwischen Snapshots berechnet, keine manuelle Kuratierung.</p>`;
  fs.writeFileSync(outPath("price-watch.html"), layout({
    title: "Preis-Beobachtung: Digistore24-Marktplatz Änderungen",
    desc: `Was sich auf dem Digistore24-Marktplatz ändert: Preiserhöhungen und -senkungen, Storno- und Konversions-Bewegungen, neue und verschwundene Angebote seit ${snaps[0]}. Anbieter-Daten, täglich aktualisiert.`,
    body, path: "price-watch.html",
  }));
  console.log(`price-watch: ${priceUp.length} hoch / ${priceDown.length} runter / ${statChanges.length} Kennzahl / ${newListings.length} neu / ${delisted.length} weg (Fenster ${snaps[0]} → jetzt, ${windowDays}d)`);
}

monthlyNewPage();
priceWatchPage();
faqHubPagesDe();
amazonPicksPageDe();
changelogPage();
vendorHubs();
console.log(`Built (DE): index, about, impressum, datenschutz, 404, categories (paginated), ${products.length} profiles, ${altCount} alternatives, ${bestCount} empfehlungen. Articles protected: ${articleIds.size}`);
