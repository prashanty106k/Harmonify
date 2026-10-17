# Google Search Console setup

The website generates `/sitemap.xml` and `/robots.txt` during every build. Both use `site.domain` from `src/data.mjs`, currently `https://www.novatech-apps.com`. Every indexable HTML page has a matching canonical URL, title and description. The homepage includes Organization and WebSite structured data using the current public contact email.

App policy drafts and the 404 page deliberately use `noindex` and are omitted from the sitemap. Keep them excluded until their release disclosures have been approved. The sitemap uses `site.lastModified`; update that value when the actual content changes, rather than on every deployment. Website sections such as `/#studio` are part of the homepage and are not separate sitemap entries.

## Connect Google Search Console

1. Finish pointing the domain's DNS at GitHub Pages and verify that the new site and sitemap are publicly accessible over HTTPS. The private ChatGPT preview and localhost cannot be submitted as the public domain.
2. Open https://search.google.com/search-console and add a **Domain property** named `novatech-apps.com` (no scheme, path or `www`).
3. Google will provide a unique `google-site-verification=...` TXT value. Add that exact value to the root `@` TXT records in the domain's active DNS provider, then choose **Verify** in Search Console. Retain this verification record afterward. An existing TXT value for email is a separate record and must remain intact.
4. Open **Sitemaps** and submit `https://www.novatech-apps.com/sitemap.xml`.
5. Use **URL inspection** to test the public homepage, then request indexing. Monitor **Page indexing** and **Sitemaps** for crawl or validation errors.

No Google verification token has been supplied yet. There is no fabricated or placeholder verification tag in the output.

## Optional URL-prefix verification

If you choose the URL-prefix property `https://www.novatech-apps.com/` instead, select **HTML tag** verification and copy only its `content` value into `site.googleSiteVerification` in `src/data.mjs`. Rebuild and deploy; the homepage will emit that exact verification tag. This option verifies the URL-prefix property; a Domain property still requires DNS verification.

If Google instead gives you an HTML verification file, keep the exact filename and contents in `public/`, then rebuild and deploy. It will be copied unchanged to the website root.

Sitemaps and verification support discovery and reporting; they do not guarantee indexing, rich results, ranking, or a particular search appearance. Google Analytics, Tag Manager, meta keywords and a Google account's email address in source code are not required to verify Search Console ownership.

References: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Search Console properties and verification](https://support.google.com/webmasters/answer/34592), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization).
