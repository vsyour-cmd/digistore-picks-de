#!/usr/bin/env node
/** patch-evidence-de.js — DE: 证据盒/FAQ来源标注/首页TL;DR(德语) */
const fs = require("fs");
const f = "G:/Digistore24/site-de/build/build-site.js";
let s = fs.readFileSync(f, "utf8");

if (!s.includes("function evidenceBox")) {
  const fn = [
    "// Belegbasis & Validierungsbedingungen: jede Aussage → Quelle → Datum → Prüfweg",
    "function evidenceBox(p) {",
    "  const res = p.research && !p.research.error;",
    "  const srcPage = res ? (p.research.finalUrl || p.salesPageUrl) : p.salesPageUrl;",
    "  const method = res && p.research.method === \"browser-render\" ? \"im Browser gerendert\" : \"rohes HTML\";",
    "  return `<div class=\"tldr\"><b>Belegbasis & Validierungsbedingungen</b>",
    "<ul>",
    "<li><b>Marktplatz-Zahlen</b> (Preis, Provision, Konversion, Stornoquote) — Quelle: offizielle Digistore24-Marktplatz-API (Affiliate-Sicht), Stand <b>${datemark(DATA.scrapedAt)}</b>. Gegenprüfung: Marktplatz-Suche nach Produkt-ID ${p.productId}.</li>",
    "<li><b>Verkaufsseiten-Zitate</b> — Quelle: ${esc(srcPage || \"offizielle Verkaufsseite\")}, abgerufen <b>${datemark(DATA.researchedAt) || \"—\"}</b> (Methode: ${method}). Verify: offizielle Seite öffnen.</li>",
    "<li><b>Garantie / Rückgabe</b> — vom Anbieter festgelegt; vor dem Kauf auf der Verkaufsseite bestätigen.</li>",
    "<li><b>Nicht von uns geprüft:</b> Produktqualität, Ergebnisse, Testimonials — kein Praxistest für dieses Listing durchgeführt.</li>",
    "</ul></div>`;",
    "}",
    "",
  ].join("\n");
  s = s.replace("function faqData(p, altData) {", fn + "\nfunction faqData(p, altData) {");
  s = s.replace("${cautionSection(p)}\n\n${faqBlock}", "${cautionSection(p)}\n\n${evidenceBox(p)}\n\n${faqBlock}");
}

if (!s.includes("Antworten aus dem Marktplatz-Snapshot")) {
  s = s.replace(
    'return `<h2 id="faq">Häufige Fragen zu ${esc(p.label)}</h2>',
    'return `<h2 id="faq">Häufige Fragen zu ${esc(p.label)}</h2>\n<p class="sub">Antworten aus dem Marktplatz-Snapshot (${datemark(DATA.scrapedAt)}) und der Verkaufsseiten-Recherche (${datemark(DATA.researchedAt) || "—"}); Anbieteraussagen sind inline gekennzeichnet.</p>'
  );
}

if (!s.includes("Auf einen Blick</b> (Daten vom")) {
  s = s.replace(
    "<h2>Top-Angebote nach Verdienst pro Verkauf</h2>",
    `<div class="tldr"><b>Auf einen Blick</b> (Daten vom ${"${datemark(DATA.scrapedAt)}"}):
<ul>
<li>${"${DATA.total}"} deutschsprachige Digistore24-Angebote in ${"${DATA.categories.length}"} Kategorien im Blick.</li>
<li>Jede Seite kennzeichnet ihre Belege: offizielle Marktplatz-Statistiken vs. Anbieteraussagen.</li>
<li>Einstieg: Top-Liste unten oder die <a href="blog/digistore24-zahlen-checkliste.html">6-Punkte-Bewertungsmethode</a>.</li>
</ul></div>
<h2>Top-Angebote nach Verdienst pro Verkauf</h2>`
  );
}

fs.writeFileSync(f, s);
console.log("DE:", {
  evidenceBox: s.includes("function evidenceBox"),
  evidenceCall: s.includes("${evidenceBox(p)}"),
  faqNote: s.includes("Antworten aus dem Marktplatz-Snapshot"),
  homeTldr: s.includes("Auf einen Blick</b> (Daten vom"),
});
