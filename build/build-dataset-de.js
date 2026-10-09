#!/usr/bin/env node
/**
 * build-dataset-de.js — 德语站数据集:合并 marketplace 抓取 + 销售页研究 → site-de/data/dataset.json
 * 输入: G:/Digistore24/data-de/{products-de,categories-de,research-de,promo-updates}.json
 * 分类带德语名(labelDe),站点 UI 全德语。
 */
const fs = require("fs");
const path = require("path");

const D = "G:/Digistore24/data-de";
const AFF = process.env.AFF_ID || "adminstore";
const read = (f) => {
  const p = path.join(D, f);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

const d = read("products-de.json");
const cats = read("categories-de.json");
const fixed = read("promo-fixed.json") || {};
const research = read("research-de.json") || {};
// 通知覆盖与英文站共用一份(按 productId,与语言无关)
const promoUpdates = (read("promo-updates.json") || { links: {} }).links
  || (JSON.parse(fs.readFileSync("G:/Digistore24/data/promo-updates.json", "utf8"))).links
  || {};

const LABEL_DE = {
  "Animals & Pets": "Tiere & Haustiere", "Betting Systems": "Wett-Systeme", "Business & Investment": "Business & Investment",
  "Computer & Internet": "Computer & Internet", "Dancing & Music": "Tanzen & Musik", "Dating, Relationships & Romance": "Flirt, Beziehungen & Romantik",
  "Education": "Bildung", "Email Marketing": "E-Mail-Marketing", "Family & Children": "Familie & Kinder",
  "Fashion": "Mode", "Fiction": "Belletristik", "Food & Drink": "Essen & Trinken", "Fun & Games": "Spaß & Spiele",
  "Green Products & Environmental Protection": "Umwelt & Nachhaltigkeit", "Health & Fitness": "Gesundheit & Fitness",
  "Hobby & Craft": "Hobby & Handwerk", "Home & Garden": "Haus & Garten", "Hotels & Gastronomy": "Hotels & Gastronomie",
  "Languages": "Sprachen", "Law & Justice": "Recht & Gerechtigkeit", "Online Marketing & E-Business": "Online-Marketing & E-Business",
  "Personal Development": "Persönlichkeitsentwicklung", "Photography & Film": "Fotografie & Film", "Politics & Economy": "Politik & Wirtschaft",
  "Profession & Job": "Beruf & Karriere", "Services": "Dienstleistungen", "Social Media": "Social Media",
  "Software": "Software", "Spirituality & Esotericism": "Spiritualität & Esoterik", "Sport": "Sport",
  "Survival": "Survival", "Trading Products": "Handelsprodukte", "Travel & Culture": "Reisen & Kultur",
  "Events & Seminars": "Veranstaltungen & Seminare", "Finances": "Finanzen", "Leadership & Management": "Führung & Management",
  "Office Organization": "Büroorganisation", "Online Marketing": "Online-Marketing", "Project Management": "Projektmanagement",
  "Real Estate": "Immobilien", "Sales Training": "Vertriebstraining", "Skin Care": "Hautpflege",
  "Food Supplements": "Nahrungsergänzung", "Marketing Services": "Marketing-Dienstleistungen",
};
const SECTION_DE = {
  "Digital Products": "Digitale Produkte", "Events & Seminars": "Veranstaltungen & Seminare",
  "Services": "Dienstleistungen", "Shipping Products": "Versandprodukte",
};
const TYPE_DE = {
  "E-books": "E-Book", "Downloads": "Download", "Member area and video courses": "Mitgliederbereich & Videokurs",
  "Supplements - health": "Nahrungsergänzung", "Software": "Software", "Deliverable": "Physisches Produkt",
  "Book (printed)": "Buch (gedruckt)", "Supplements - for slimming": "Abnehm-Präparat",
  "Remote service provided electronically": "Elektronische Dienstleistung", "Audio book (download)": "Hörbuch (Download)",
  "Online coaching": "Online-Coaching", "Webinar": "Webinar",
};

if (!d) { console.error("missing products-de.json"); process.exit(1); }

const id2cats = {};
if (cats) for (const c of cats.categories) {
  for (const pid of (c.ids || [])) {
    (id2cats[pid] = id2cats[pid] || []).push({ catId: c.catId, label: c.label });
  }
}

function promoLink(p) {
  if (promoUpdates[String(p.productId)]) return promoUpdates[String(p.productId)].promo;
  if (promoUpdates[String(p.id)]) return promoUpdates[String(p.id)].promo;
  const s = p.salesPageUrl || "";
  const canonical = `https://www.digistore24.com/redir/${p.productId}/${AFF}`;
  if (!s || /\[[A-Z]+\]/.test(s) || s.includes("#")) return canonical;
  if (fixed[p.id]) {
    const f = fixed[p.id];
    return /\[[A-Z]+\]/.test(f) ? canonical : f;
  }
  const q = s.includes("?") ? "&" : "?";
  if (/^https?:\/\/[^/]*(digistore24\.com|checkout-ds24\.com)/i.test(s)) {
    return `${s}${q}aff=${AFF}`;
  }
  return `${s}${q}aff=${AFF}#aff=${AFF}`;
}

const products = d.products.map((p) => {
  const img = p.imageUrl && p.imageUrl.startsWith("/pb/") ? "https://www.digistore24.com" + p.imageUrl : null;
  const r = research[p.id] || null;
  return {
    id: p.id, productId: p.productId, label: p.label,
    type: p.type, typeDe: TYPE_DE[p.type] || p.type,
    price: p.price, currency: p.currency, commission: p.commission,
    conversionRate: p.conversionRate, cancelRate: p.cancelRate,
    earningsPerSale: p.earningsPerSale, earningsPerClick: p.earningsPerOrderformClick,
    vendorName: p.vendorName, description: p.description,
    imageUrl: img, salesPageUrl: p.salesPageUrl,
    promoLink: promoLink(p),
    affiliateSupportPageUrl: p.affiliateSupportPageUrl,
    autoAccept: p.acceptsAffiliationsAutomatically,
    billingTypes: p.billingTypes, createdAt: p.createdAt,
    categories: (id2cats[p.id] || []).map((c) => c.label),
    categoryIds: (id2cats[p.id] || []).map((c) => c.catId),
    ...(r && !r.error ? { research: r } : {}),
  };
});

const categoryIndex = cats
  ? cats.categories.filter((c) => c.ids.length > 0).map((c) => ({
      catId: c.catId, section: c.section,
      sectionDe: SECTION_DE[c.section] || c.section,
      label: c.label, labelDe: LABEL_DE[c.label] || c.label,
      count: c.ids.length,
    }))
  : [];

const out = {
  affiliateId: AFF,
  language: "de",
  scrapedAt: d.scrapedAt,
  researchedAt: fs.existsSync(path.join(D, "research-de.json"))
    ? (JSON.parse(fs.readFileSync(path.join(D, "research-meta.json", ), "utf8")).researchedAt || null)
    : null,
  total: products.length,
  withResearch: products.filter((p) => p.research).length,
  categories: categoryIndex,
  products,
};

const dst = path.join(__dirname, "..", "data", "dataset.json");
fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.writeFileSync(dst, JSON.stringify(out));
console.log(`dataset-de: ${products.length} products, ${out.withResearch} with research, ${categoryIndex.length} categories → ${dst}`);
