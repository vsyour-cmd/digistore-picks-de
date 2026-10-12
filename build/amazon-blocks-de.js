/**
 * amazon-blocks-de.js — 德语站 Amazon 联盟区块(amazon.de + tagDe 计佣)
 * 由 build-site.js require,ctx 注入共享工具与数据
 * 用法: const { amazonBlockDe, amazonPicksPageDe } = require("./amazon-blocks-de.js")(ctx);
 */
module.exports = function init(ctx) {
  const { fs, path, DATA, products, catName, esc, pct, money, datemark, outPath, layout, SITE_NAME, AMAZON_PICKS } = ctx;

  const AMAZON_KW_DE = [
    { re: /supplement|health|fitness|weight|diet|gesund|ernähr/i, kw: "Nahrungsergänzung" },
    { re: /software|computer|internet/i, kw: "Software" },
    { re: /marketing|business|vertrieb|unternehm/i, kw: "Marketing Bücher" },
    { re: /investment|trading|finance|crypto|finanz|immobilien/i, kw: "Investieren Bücher" },
    { re: /language|sprach/i, kw: "Sprachkurs" },
    { re: /home|garden|haus|garten/i, kw: "Gartenwerkzeug" },
    { re: /pet|animal|tier/i, kw: "Haustierbedarf" },
    { re: /photography|film|video|foto/i, kw: "Kamera Zubehör" },
    { re: /music|dancing|musik/i, kw: "Musik Equipment" },
    { re: /cooking|food|drink|koch|gastronom/i, kw: "Küchengeräte" },
    { re: /sport/i, kw: "Sportgeräte" },
    { re: /beauty|skin|fashion|mode|kosmetik/i, kw: "Hautpflege" },
    { re: /travel|reisen/i, kw: "Reisezubehör" },
    { re: /spiritua|esoteric|meditation/i, kw: "Meditation Bücher" },
  ];
  const amazonKwDeFor = (p) => {
    const lbl = (p.categories || []).join(" ");
    const hit = AMAZON_KW_DE.find((m) => m.re.test(lbl));
    return hit ? hit.kw : ((p.categories || [])[0] || "digitale Produkte");
  };

  function amazonBlockDe(p) {
    const tag = (AMAZON_PICKS && AMAZON_PICKS.tagDe) || "adminstorede-21";
    const catFile = (() => { const co = DATA.categories.find((c) => String(c.catId) === String((p.categoryIds || [])[0])); return co ? co.file : ""; })();
    const picks = ((AMAZON_PICKS.products || {})[String(p.id)] || (AMAZON_PICKS.categories || {})[catFile] || []).slice(0, 3);
    const items = picks.map((c) => '<li><a href="' + esc(c.url || ("https://www.amazon.de/dp/" + c.asin + "?tag=" + tag)) + '" rel="nofollow sponsored noopener" target="_blank">' + esc(c.title || c.asin) + "</a>" + (c.note ? " — " + esc(c.note) : "") + "</li>");
    const kw = amazonKwDeFor(p);
    if (!items.length) {
      items.push('<li><a href="https://www.amazon.de/s?k=' + encodeURIComponent(kw) + "&tag=" + tag + '" rel="nofollow sponsored noopener" target="_blank">' + esc(kw) + " auf Amazon.de</a> — Top-Ergebnisse, Amazon-Ranking.</li>");
      items.push('<li><a href="https://www.amazon.de/s?k=' + encodeURIComponent(kw + " Bestseller") + "&tag=" + tag + '" rel="nofollow sponsored noopener" target="_blank">Bestseller: ' + esc(kw) + "</a> — live Liste von Amazon, von uns nicht kuratiert.</li>");
    }
    return '<h2 id="amazon">Passendes auf Amazon.de</h2>\n<p>Physische Produkte und Zubehör, die häufig zusammen mit ' + esc(p.label) + ' gekauft werden:</p>\n<ul style="line-height:1.9">' + items.join("\n") + "</ul>" +
      '\n<p class="sub"><b>Werbung:</b> Als Amazon-Partner verdient ' + SITE_NAME + " an qualifizierten Käufen (Partner-tag <code>" + esc(tag) + "</code>). Amazon setzt eigene Preise und Provisionen (niedrige einstellige Prozente — weit unter den 30–75% der Digistore24-Anbieter). Amazon ist ein Convenience-Angebot für Sachprodukte, kein Ersatz für das digitale Produkt oben.</p>";
  }

  function amazonPicksPageDe() {
    const tag = (AMAZON_PICKS && AMAZON_PICKS.tagDe) || "adminstorede-21";
    const picks = (AMAZON_PICKS && AMAZON_PICKS.storefront) || [];
    const eligible = DATA.categories.filter((c) => c.count >= 10);
    const catLinks = eligible.map((c) => {
      const kw = amazonKwDeFor({ categories: [c.label] });
      return '<li><a href="https://www.amazon.de/s?k=' + encodeURIComponent(kw) + "&tag=" + tag + '" rel="nofollow sponsored noopener" target="_blank">' + esc(kw) + "</a> — live Amazon.de-Ergebnisse zur Kategorie " + '<a href="../kategorie/' + c.file + '.html">' + esc(catName(c)) + "</a> (" + c.count + " Angebote).</li>";
    }).join("\n");
    const picksHtml = picks.length
      ? '<h2>Amazon.com — internationale Picks (englischsprachig)</h2>\n<ul style="line-height:1.9">' + picks.map((c) => '<li><a href="' + esc(c.url) + '" rel="nofollow sponsored noopener" target="_blank">' + esc(c.title) + "</a>" + (c.note ? " — " + esc(c.note) : "") + "</li>").join("\n") + '</ul>\n<p class="sub">Unsere amzn.to-Links führen zu Amazon.com (US, Tag adminstore05-20). Die Suche unten bleibt auf amazon.de.</p>'
      : "";
    const body = "\n<h1>Unsere Amazon-Empfehlungen</h1>\n" +
      '<p class="sub">Redaktionelle Picks &amp; Kategorie-Shortcuts · amazon.de · Partner-tag <code>' + esc(tag) + "</code> · Stand " + datemark(DATA.scrapedAt) + "</p>\n" +
      '<div class="tldr"><b>Auf einen Blick:</b> <ul><li><b>' + DATA.total + " Angebote</b> im Verzeichnis; diese Seite deckt Sachprodukte und Streaming ab.</li><li>Als Amazon-Partner verdienen wir an qualifizierten Käufen — Ihr Preis bleibt identisch.</li><li>Digitale Produkte bleiben auf Digistore24.</li></ul></div>\n" +
      picksHtml + "\n" +
      '<h2>Kategorie-Shortcuts auf Amazon.de</h2>\n<p>Live-Suchen auf amazon.de — Amazon rankt die Ergebnisse, wir liefern die Suchbegriffe:</p>\n<ul style="line-height:1.9">' + catLinks + "</ul>\n" +
      '<p class="sub"><b>Werbung:</b> Als Amazon-Partner verdient ' + SITE_NAME + " an qualifizierten Käufen. Amazon-Provisionen (meist niedrige einstellige Prozente) liegen weit unter den 30–75% der Digistore24-Anbieter — Amazon dient der Bequemlichkeit bei Sachprodukten, kein Ersatz für die digitalen Angebote im <a href=\"index.html\">Verzeichnis</a>. Methode &amp; Standards: <a href=\"about.html\">Über-uns-Seite</a>.</p>";
    fs.writeFileSync(outPath("amazon-picks.html"), layout({
      title: "Unsere Amazon-Empfehlungen für Digistore24-Käufer",
      desc: "Redaktionell ausgewählte Amazon-Produkte und Kategorie-Such-Shortcuts passend zu den digitalen Angeboten unseres Digistore24-Verzeichnisses. Mit Partner-Disclosure. Stand " + datemark(DATA.scrapedAt) + ".",
      body, path: "amazon-picks.html",
    }));
    console.log("amazon-picks (DE): " + picks.length + " Picks, " + eligible.length + " Kategorie-Shortcuts");
  }

  return { amazonBlockDe, amazonPicksPageDe, amazonKwDeFor };
};
