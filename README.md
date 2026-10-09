# DigistorePicks DE

German-language directory & research site for Digistore24 marketplace products (language = DE).

**Website: <https://vsyour-cmd.github.io/digistore-picks-de/>**

## Site map

| Page | URL |
|------|-----|
| Home (product directory) | <https://vsyour-cmd.github.io/digistore-picks-de/> |
| All product profiles (A–Z) | <https://vsyour-cmd.github.io/digistore-picks-de/produkte/index.html> |
| Blog | <https://vsyour-cmd.github.io/digistore-picks-de/blog/index.html> |
| Best picks (computed) | <https://vsyour-cmd.github.io/digistore-picks-de/empfehlungen/> |
| Alternatives comparisons | `…/alternativen/{slug}.html` |
| Categories (paginated) | `…/kategorie/{slug}.html` |
| Product profiles (all 4271) | `…/produkte/{slug}-{id}.html` |
| Product research files (Markdown) | [`content/products/`](content/products/) |
| Impressum | <https://vsyour-cmd.github.io/digistore-picks-de/impressum.html> |
| Datenschutz | <https://vsyour-cmd.github.io/digistore-picks-de/datenschutz.html> |

## IMPORTANT: legal pages contain placeholders

`impressum.html` and `datenschutz.html` are generated with **placeholder values** (`[Vor- und Nachname]`, `[ihre-e-mail@example.com]`, …). Under German law (§ 5 DDG) a real Impressum with the operator's identity is mandatory before serious operation. Edit `site-de/build/build-site.js` → `staticPages()` with real data, then rebuild.

## Repository structure

Same pipeline as the English site ([digistore-picks](https://github.com/vsyour-cmd/digistore-picks)); builders emit German UI, German category names, Impressum/Datenschutz, and use `/kategorie/`, `/produkte/`, `/alternativen/`, `/empfehlungen/` paths.

```
data/dataset.json      Combined DE dataset (marketplace + research + promo links)
build/build-dataset-de.js  Merge scrape + research → dataset.json (DE labels via translation map)
build/fetch-research.js    Sales-page research (defaults to data-de/)
content/products/      One Markdown archive per product (4271 files)
```

## Data sources

- Marketplace data: `G:/Digistore24/data-de/` (products-de.json, categories-de.json) — scraped from the official Digistore24 marketplace API (logged-in affiliate view, `language[]=de`).
- Research: `research-de.json` — verbatim extracts from each vendor's sales page, labeled as vendor claims.
- Promo-link overrides: shared `G:/Digistore24/data/promo-updates.json` (from Digistore24 vendor notifications; highest priority).

## Editorial rules

Identical to the English site: research-method labels on every page (Datenprofil / Praxis-Test), vendor claims marked as unverified, no invented numbers, FTC/§ 5 UWG-conform advertising disclosure (Werbe-Hinweis) on every page.
