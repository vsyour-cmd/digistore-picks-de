#!/usr/bin/env node
/**
 * build-blog.js (DE) — datengetriebene Artikel für die deutsche Site
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "dataset.json"), "utf8"));
const SITE_NAME = "DigistorePicks DE";
const SITE_URL = "https://vsyour-cmd.github.io/digistore-picks-de";
const UPDATED = DATA.scrapedAt.slice(0, 10);
const jsonSafe = (o) => JSON.stringify(o).replace(/</g, "\\u003c");

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const money = (n, cur) => (cur === "EUR" ? "€" : "$") + (n == null ? "—" : Number(n).toFixed(2));
const pct = (n) => (n == null ? "—" : Number(n).toFixed(2).replace(/\.?0+$/, "") + " %");
{
  const cnt = {};
  for (const c of DATA.categories) { const b = slug(c.label); cnt[b] = (cnt[b] || 0) + 1; }
  for (const c of DATA.categories) { const b = slug(c.label); c.file = cnt[b] > 1 ? slug(c.section) + "-" + b : b; }
}
const catName = (c) => c.labelDe || c.label;
const products = DATA.products.map((p) => ({ ...p, slug: slug(p.label) + "-" + p.id }));
const GOATCOUNTER = '<script data-goatcounter="https://vsyour.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>';

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

function layout({ title, desc, body, rel = "..", file = "" }) {
  const canonical = SITE_URL + "/blog/" + file;
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title.replace(` — ${SITE_NAME}`, ""),
    description: desc,
    datePublished: UPDATED,
    dateModified: UPDATED,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL + "/about.html" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL + "/" },
    mainEntityOfPage: canonical,
  };
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(capTitle(title))}</title>
<meta name="description" content="${esc(capDesc(desc))}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(capTitle(title))}">
<meta property="og:description" content="${esc(capDesc(desc))}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="${rel}/assets/style.css">
<script type="application/ld+json">${jsonSafe(article)}</script>
</head>
<body>
<header class="site"><div class="wrap">
  <a class="brand" href="${rel}/index.html">${SITE_NAME}</a>
  <nav class="cats">
    <a href="${rel}/index.html">Alle Kategorien</a>
    <a href="${rel}/produkte/index.html">Alle Produkte</a>
    <a href="index.html">Blog</a>
    <a href="${rel}/impressum.html">Impressum</a>
    <a href="${rel}/datenschutz.html">Datenschutz</a>
  </nav>
</div></header>
<main class="wrap">
<nav class="crumbs"><a href="../index.html">Start</a> <span class="sep">›</span> <a href="index.html">Blog</a> <span class="sep">›</span> <span>${esc(title.replace(` — ${SITE_NAME}`, "").slice(0, 60))}</span></nav>
${body}
</main>
<footer class="site"><div class="wrap">
  <div class="disclosure"><b>Werbe-Hinweis:</b> ${SITE_NAME} enthält Affiliate-Links. Ranglisten auf dieser Seite werden aus offiziellen Digistore24-Marktplatz-Statistiken berechnet und sind keine Prognose oder Empfehlung von Ergebnissen.</div>
  <div>© ${new Date().getFullYear()} ${SITE_NAME} · Produktdaten: Digistore24-Marktplatz (Stand ${UPDATED}) · <a href="${rel}/impressum.html">Impressum</a> · <a href="${rel}/datenschutz.html">Datenschutz</a></div>
</div></footer>
${GOATCOUNTER}
</body>
</html>`;
}

function tableRows(list) {
  return list
    .map(
      (p, i) => `<tr>
<td>${i + 1}</td>
<td><a href="../produkte/${p.slug}.html">${esc(p.label)}</a></td>
<td>${esc(p.typeDe)}</td>
<td><b>${money(p.price, p.currency)}</b></td>
<td>${pct(p.commission)}</td>
<td><b>${money(p.earningsPerSale, p.currency)}</b></td>
<td>${pct(p.conversionRate)}</td>
</tr>`
    )
    .join("\n");
}

// ---------- Top 20 DE ----------
function top20() {
  const list = [...products].sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0)).slice(0, 20);
  const medianConv = [...list].sort((a, b) => (a.conversionRate || 0) - (b.conversionRate || 0))[Math.floor(list.length / 2)].conversionRate;
  const body = `
<article class="review">
<h1>Die 20 Digistore24-Produkte mit dem höchsten Verdienst (nach Zahlen)</h1>
<p class="sub">Von ${SITE_NAME} · Datenstand ${UPDATED} · 5 Min. Lesezeit</p>

<div class="notice"><b>Wie diese Liste entstand:</b> wir haben alle ${DATA.total} deutschsprachigen Angebote im Digistore24-Marktplatz nach dem <b>Verdienst pro Verkauf</b> sortiert — der Provision pro Durchschnittsbestellung, wie der offizielle Marktplatz sie meldet. Keine Meinungen, keine bezahlten Plätze. Verdienstzahlen beschreiben den Traffic des Anbieters, nicht Ihr Ergebnis.</div>

<div class="tldr"><b>Kernaussagen</b> (Datenstand ${UPDATED}):
<ul>
<li>Höchster Verdienst/Verkauf aktuell: <b>${esc(list[0].label)}</b> mit <b>${money(list[0].earningsPerSale, list[0].currency)}</b> (${pct(list[0].commission)} Provision bei ${money(list[0].price, list[0].currency)}).</li>
<li>Top 3: ${list.slice(0, 3).map((p, i) => `<b>${i + 1}. ${esc(p.label)}</b> (${money(p.earningsPerSale, p.currency)})`).join(", ")}.</li>
<li>Median der Checkout-Konversion in den Top 20: <b>${pct(medianConv)}</b> — Anbieter-seitige Zahlen, keine Prognosen.</li>
</ul>
</div>

<p>Der Digistore24-Marktplatz listet ${DATA.total} deutschsprachige Produkte in ${DATA.categories.length} Kategorien — von E-Books und Videokursen bis Software. Wer als Affiliate bewirbt (oder als Käufer prüft), filtert am schnellsten mit den Zahlen des Marktplatzes selbst: Preis, Provision, Checkout-Konversion und Stornoquote.</p>

<h2>Top 20 nach Verdienst/Verkauf</h2>
<table class="specs">
<tr><th>#</th><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Verdienst/Verkauf</th><th>Checkout-CR*</th></tr>
${tableRows(list)}
</table>
<p class="sub">* Checkout-Konversion = Anteil der Bestellformular-Besucher, die kaufen (von Digistore24 über den Traffic der Anbieter gemeldet). Hängt stark von der Traffic-Qualität ab, keine Prognose.</p>

<h2>Wie man diese Zahlen liest</h2>
<p><b>Hoher Verdienst/Verkauf ≠ einfaches Geld.</b> Ein Produkt mit 100 € Verdienst und 2 % Konversion kann weniger bringen als ein 30-€-Produkt mit 10 % — entscheidend ist die Passung Ihres Traffics. Vor der Bewerbung:</p>
<ul>
<li><b>Stornoquote prüfen.</b> Hohe Provision plus hohe Stornoquote bedeutet oft aggressive Werbung und kaufreue Kunden. Jedes Profil auf dieser Seite listet sie.</li>
<li><b>Verkaufsseite selbst lesen.</b> Preis, Garantie und Boni ändern sich; die offizielle Seite ist die einzige verlässliche Quelle.</li>
<li><b>Passung schlägt Zahlen.</b> Oben dominieren High-Ticket-und Nahrungsergänzungs-Angebote. Angebote in einer Nische, die Sie wirklich kennen, konvertieren am Anfang oft besser.</li>
</ul>
<p><a class="cta" href="../index.html">Alle ${DATA.categories.length} Kategorien durchsuchen</a></p>
</article>`;
  fs.writeFileSync(path.join(ROOT, "blog", "top-20-hoechster-verdienst-digistore24-produkte.html"), layout({
    title: `Die 20 Digistore24-Produkte mit dem höchsten Verdienst (datengestützt) — ${SITE_NAME}`,
    desc: `Alle ${DATA.total} deutschen Digistore24-Angebote, sortiert nach offiziellem Verdienst pro Verkauf. Aktualisiert ${UPDATED}.`,
    body, rel: "..", file: "top-20-hoechster-verdienst-digistore24-produkte.html",
  }));
}

// ---------- Checkliste ----------
function checklist() {
  const body = `
<article class="review">
<h1>Digistore24-Produkt kaufen oder bewerben? Der 6-Punkte-Zahlen-Check</h1>
<p class="sub">Von ${SITE_NAME} · Aktualisiert ${UPDATED}</p>

<p>Jede Woche erscheinen neue Angebote im Digistore24-Marktplatz — aktuell <b>${DATA.total} deutschsprachige Produkte</b>. Die meisten wirken auf ihrer Verkaufsseite überzeugend. Die Zahlen des Marktplatzes, die jeder registrierte Affiliate sehen kann, sind der schnellere und ehrlichere Filter. Das ist die Prüfung, die wir vor jedem Profil auf dieser Seite durchlaufen.</p>

<h2>1. Preis × Provision = was Sie wirklich bekommen</h2>
<p>Die Provisionsrate ist ohne Preis bedeutungslos: 75 % von 9 € sind weniger als 35 % von 199 €. Rechnen Sie immer den Eurobetrag pro Verkauf aus — wir veröffentlichen ihn als <b>Verdienst/Verkauf</b> in jedem Profil.</p>

<h2>2. Checkout-Konversion — die Ehrlichkeits-Kennzahl</h2>
<p>Sie misst, wie viele Besucher des Bestellformulars tatsächlich kaufen, über den gesamten Traffic des Anbieters. Sehr niedrige Konversion bei hohem Traffic kann auf überzogene Versprechen hindeuten; sehr hohe Konversion mit hoher Stornoquote auf Drucktaktiken.</p>

<h2>3. Stornoquote — der Schatten der Rückgaben</h2>
<p>Eine hohe Stornoquote heißt: Käufer bereuen. Für Affiliates sind das Chargeback-Risiken und zurückgeforderte Provisionen; für Käufer eine Gemeinschaft von Menschen, die ihr Geld zurückwollten.</p>

<h2>4. Track Record und Listungsalter</h2>
<p>Eine Listung von letzten Monat mit spektakulären Zahlen ist unbewiesen; eine Listung von 2021 mit stabilen Zahlen hat echte Käufer überlebt. Wir zeigen das Listungsdatum in jedem Profil.</p>

<h2>5. Garantie — auf der offiziellen Seite lesen</h2>
<p>Viele Digistore24-Angebote werben mit 60 Tagen Geld-zurück, aber das Fenster legt jeder Anbieter selbst fest. Verlässliche Quelle ist nur die offizielle Verkaufsseite im Moment des Kaufs.</p>

<h2>6. Wer erzählt Ihnen davon?</h2>
<p>Die Marktplatz-Zahlen darf jeder zitieren — auch wir. Nicht fälschen kann man echten Eigengebrauch. Deshalb trägt jede Seite hier eine Forschungskennzeichnung: <b>Datenprofil</b> oder <b>Praxis-Test</b>. Wer nicht sagt, welches Sie lesen, will Ihnen etwas verkaufen.</p>
<p><a class="cta" href="../index.html">Zum kompletten Verzeichnis</a></p>
</article>`;
  fs.writeFileSync(path.join(ROOT, "blog", "digistore24-zahlen-checkliste.html"), layout({
    title: `Digistore24-Produkt beurteilen: der 6-Punkte-Zahlen-Check — ${SITE_NAME}`,
    desc: "So bewerten Sie Digistore24-Angebote mit offiziellen Marktplatz-Zahlen: Verdienst, Konversion, Stornoquote, Anbieteralter, Garantie.",
    body, rel: "..", file: "digistore24-zahlen-checkliste.html",
  }));
}

// ---------- Kategorie-Guides ----------
// ---------- Kategorie-Guides ----------
const EN_GUIDE_SLUGS = {
  "Health & Fitness": "health-fitness",
  "Personal Development": "personal-development",
  "Business & Investment": "business-investment",
  "Education": "education",
  "Online Marketing & E-Business": "online-marketing-e-business",
  "Computer & Internet": "computer-internet",
  "Family & Children": "family-children",
  "Dating, Relationships & Romance": "dating-relationships-romance",
  "Software": "software",
  "Social Media": "social-media",
};

function categoryGuides() {
  const majors = ["Health & Fitness", "Personal Development", "Business & Investment", "Education", "Online Marketing & E-Business", "Computer & Internet", "Family & Children", "Dating, Relationships & Romance", "Software", "Social Media"];
  for (const label of majors) {
    const cat = DATA.categories.find((c) => c.label === label);
    if (!cat) continue;
    const items = products.filter((p) => (p.categoryIds || []).includes(String(cat.catId)));
    if (!items.length) continue;
    const top = [...items].sort((a, b) => (b.earningsPerSale || 0) - (a.earningsPerSale || 0)).slice(0, 15);
    const avgPrice = items.reduce((a, p) => a + (p.price || 0), 0) / items.length;
    const types = {};
    for (const p of items) types[p.typeDe] = (types[p.typeDe] || 0) + 1;
    const topTypes = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, n]) => `${esc(t)} (${n})`).join(", ");
    const minP = Math.min(...items.map((p) => p.price || 0));
    const maxP = Math.max(...items.map((p) => p.price || 0));
    const newest = new Date(Math.max(...items.map((p) => new Date(p.createdAt).getTime()))).toISOString().slice(0, 10);
    const body = `
<article class="review">
<h1>${esc(catName(cat))} auf Digistore24: der Daten-Guide</h1>
<p class="sub">Von ${SITE_NAME} · Datenstand ${UPDATED} · ${items.length} Angebote analysiert</p>

<div class="notice"><b>Recherche-Methode:</b> dieser Guide wird aus dem offiziellen Digistore24-Marktplatz-Eintrag jedes <b>deutschsprachigen</b> Angebots dieser Kategorie berechnet — Preise, Provisionen, Konversions- und Stornoquoten, wie sie Affiliates gemeldet werden. Keine Praxis-Behauptungen zu Produkten.</div>

<div class="tldr"><b>Kernaussagen</b> (Datenstand ${UPDATED}):
<ul>
<li>Das Regal <b>${esc(catName(cat))}</b> hält aktuell <b>${items.length} deutschsprachige Angebote</b> (Bereich: ${esc(cat.sectionDe || cat.section)}). Durchschnittspreis: <b>${money(avgPrice, "USD")}</b>.</li>
<li>Spannbreite der Listenpreise: <b>${money(minP, "USD")}</b> bis <b>${money(maxP, "USD")}</b>; Provisionen von <b>${pct(Math.min(...items.map((p) => p.commission || 0)))}</b> bis <b>${pct(Math.max(...items.map((p) => p.commission || 0)))}</b>.</li>
<li>Häufigste Produkttypen: ${topTypes}. Neueste Listung: <b>${newest}</b>.</li>
</ul>
</div>

<p>Wer in <b>${esc(catName(cat).toLowerCase())}</b> auf Digistore24 kaufen oder als Affiliate bewerben will, findet hier die 15 größten Angebote nach Verdienst pro Verkauf — mit allen Marktplatz-Zahlen auf einen Blick.</p>

<h2>Die 15 größten Angebote nach Verdienst/Verkauf</h2>
<table class="specs">
<tr><th>#</th><th>Produkt</th><th>Typ</th><th>Preis</th><th>Provision</th><th>Verdienst/Verkauf</th><th>Checkout-CR*</th></tr>
${tableRows(top)}
</table>
<p class="sub">* Checkout-Konversion = Anbieter-seitige Marktplatz-Daten, abhängig von der Traffic-Qualität — keine Prognose Ihrer Ergebnisse.</p>

<p>Jedes Produkt verlinkt auf ein vollständiges Profil mit Stornoquote, Anbieter und Listungsalter. Ganze Kategorie: <a href="../kategorie/${cat.file}.html">alle ${items.length} Angebote in ${esc(catName(cat))}</a>. Kurzentschlossene: <a href="../empfehlungen/beste-${cat.file}.html">die rechnerischen Top-Empfehlungen</a>.</p>
${EN_GUIDE_SLUGS[label] ? `<p class="sub">Dieser Guide ist auch auf <a href="https://vsyour-cmd.github.io/digistore-picks/blog/guide-${EN_GUIDE_SLUGS[label]}.html" hreflang="en">Englisch verfügbar</a>.</p>` : ""}
</article>`;
    fs.writeFileSync(path.join(ROOT, "blog", `guide-${slug(catName(cat))}.html`), layout({
      title: `${catName(cat)} auf Digistore24: ${items.length} Angebote analysiert — ${SITE_NAME}`,
      desc: `Daten-Guide zu ${items.length} ${catName(cat)}-Produkten auf Digistore24: Preise, Provisionen, Konversion. Stand ${UPDATED}.`,
      body, rel: "..", file: `guide-${slug(catName(cat))}.html`,
    }));
  }
}

// ---------- Blog-Index ----------
function blogIndex() {
  const files = [
    ["top-20-hoechster-verdienst-digistore24-produkte.html", `Die 20 Digistore24-Produkte mit dem höchsten Verdienst`, `Alle ${DATA.total} deutschen Angebote nach offiziellem Verdienst pro Verkauf. Automatisch aktualisiert.`],
    ["digistore24-zahlen-checkliste.html", "Kaufen oder bewerben? Der 6-Punkte-Zahlen-Check", "Die Methode hinter jedem Profil dieser Website — auf jedes Angebot anwendbar."],
  ];
  // Kategorie-Guides ergänzen (bereits generierte Dateien)
  const majors = ["Health & Fitness", "Personal Development", "Business & Investment", "Education", "Online Marketing & E-Business", "Computer & Internet", "Family & Children", "Dating, Relationships & Romance", "Software", "Social Media"];
  for (const label of majors) {
    const cat = DATA.categories.find((c) => c.label === label);
    if (!cat) continue;
    const f = `guide-${slug(catName(cat))}.html`;
    if (fs.existsSync(path.join(ROOT, "blog", f))) {
      files.push([f, `${catName(cat)} auf Digistore24: der Daten-Guide`, `${cat.count} Angebote analysiert: Preis-/Provisionsspannen, Top-Angebote, Aktualität.`]);
    }
  }
  const bestOf = DATA.categories.filter((c) => c.count >= 8).sort((a, b) => b.count - a.count).slice(0, 10);
  const body = `
<h1>Blog</h1>
<p class="sub">Datengetriebene Guides zum Digistore24-Marktplatz. Jede Zahl stammt aus dem offiziellen Marktplatz-Eintrag; jede Seite zeigt ihren Datenstand.</p>
<h2>Top-Empfehlungen (rechnerisch ermittelt)</h2>
<ul style="line-height:2.1;max-width:760px">
${bestOf.map((c) => `<li><a href="../empfehlungen/beste-${c.file}.html"><b>Beste ${esc(catName(c))}-Produkte auf Digistore24</b></a><br><span class="sub">${c.count} Angebote analysiert, Auswahl aus offiziellen Statistiken berechnet.</span></li>`).join("\n")}
</ul>
<h2>Guides &amp; Ranglisten</h2>
<ul style="line-height:2.1;max-width:760px">
${files.map(([f, t, d]) => `<li><a href="${f}"><b>${esc(t)}</b></a><br><span class="sub">${esc(d)}</span></li>`).join("\n")}
</ul>`;
  fs.writeFileSync(path.join(ROOT, "blog", "index.html"), layout({
    title: `Blog — ${SITE_NAME}`,
    desc: "Datengetriebene Guides zu Digistore24-Produkten und Marktplatz-Statistiken.",
    body, rel: "..", file: "index.html",
  }));
}

fs.mkdirSync(path.join(ROOT, "blog"), { recursive: true });
top20();
checklist();
categoryGuides();
blogIndex();
console.log("blog (DE) built: " + fs.readdirSync(path.join(ROOT, "blog")).length + " pages");
