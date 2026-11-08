# Portable deployment and technical SEO

The site is static HTML/CSS/JavaScript. It needs no GitHub API, account, repository,
Actions workflow, server runtime or runtime template service. Images, fonts and
GSAP are local. The optional language detection request uses the already approved
`https://api.country.is/`; timeout falls back to English. No IP is stored by this site.

## Build for any account, repository or web server

1. Install build-only Python dependencies: `python3 -m pip install -r tools/requirements.txt`.
2. After copy edits, run `python3 tools/build-locales.py`.
3. Run `python3 tools/seo.py --site-url https://YOUR-DOMAIN/OPTIONAL-PATH/ --output dist`.
   Replace the URL with the actual public HTTPS base, including a repository/subdirectory
   prefix if applicable. Alternatively set `site_url` in `seo.config.json`.
4. Upload the **contents** of `dist/` to that exact location. The output directory must
   be new; the builder refuses to overwrite existing files. Rebuild to a fresh directory
   for later deploys or remove only your known previous generated output yourself.

No source replacement of a GitHub user/repository is needed. Resources and browser
navigation are relative; canonical, hreflang, sitemap, JSON-LD and share-image URLs
are generated statically from the public base. Source files deliberately contain
portable relative metadata. **Deploy generated output for complete absolute metadata
and sitemap; do not mistake the source preview for the production SEO build.**

## Entrances and languages

- `/` (index.html): latest black B design, neutral entry with IP/manual-preference routing.
- `motion-b.html`: stable Simplified Chinese; no IP redirect.
- `motion-b-zh-hant.html`: stable Traditional Chinese; no IP redirect.
- `motion-b-en.html`: stable English; no IP redirect.
- `motion-b-ja.html`: stable Japanese; no IP redirect.

Explicit `?lang=` selection still works; manual choices are remembered. Hash anchors
are retained when changing language. Without JavaScript, the default Chinese content
and plain links to all four languages remain available. No bot user-agent detection.

Each language canonicalizes to itself without query strings; the duplicate home entry
canonicalizes to Chinese, and `x-default` points to the neutral entry. Use server 301
redirects for `/index.html` → `/` and old-domain → matching new-domain paths when the
host supports it. Do not redirect all old language URLs to the homepage.

## Production scope and robots

The deploy builder includes only the current five HTML entry files, local assets,
stylesheets and the three runtime JS files. Historical previews (including the saved
`legacy-index.html`) remain in source with `noindex, follow`, and are omitted from the
production bundle. Do not block their crawl if relying on noindex for an existing host.

For domain-root deployment, generated `robots.txt` and `sitemap.xml` work as shipped.
For deployment under a path, the crawler reads **domain-root `/robots.txt`**, so the
host owner must add the generated absolute Sitemap line to that root file. A repository
cannot control another site's host-root robots file. No Disallow rules are necessary
for the current public pages.

## Structured data and sharing

Organization/WebSite/WebPage/Product JSON-LD uses only existing name, description,
model and brand. No price, offer, aggregate rating or review is invented. This basic
Product entity is not a claim of eligibility for Google shopping/product rich results;
add genuine public offer/review information only when available. Open Graph/Twitter
metadata uses the existing black ring render (not claimed as a product photograph).

## Release validation

- Check the built source has absolute URLs under the new public base, with no previous
  account/repository host, and no test domain or placeholder left in the deployed HTML.
- Confirm all five HTML URLs and referenced local resources return 200 over HTTPS.
- Check noindex is absent on the current pages, reciprocal hreflang, correct canonical,
  sitemap and JavaScript-disabled language navigation.
- Validate schema and test actual mobile speed. No current performance score or ranking
  improvement is claimed merely from adding tags.
- Verify the new domain in Google Search Console/Bing Webmaster Tools and submit its
  sitemap using the domain owner's accounts. Verification tokens are not committed here.
- On a domain migration, configure old-to-new redirects and update the search properties.
  GitHub Pages preview retirement/noindex is a host-specific release decision, not automatic.

References:
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet
