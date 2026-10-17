# NovaTech Apps

A complete, dependency-free static studio site, app showcase, and pre-launch compliance hub. Semantic HTML, custom CSS, vanilla JavaScript. Node 20+ is needed only for generating and previewing files; no npm install is required.

Public support and privacy contact: **developer.novatechapps@gmail.com**. See [Google Search Console setup](docs/SEARCH-CONSOLE.md) for ownership verification and sitemap submission.

## Run

```sh
npm run build
npm run dev
```

Open http://127.0.0.1:4173. `npm test` validates generated routes, local links, metadata, anchors, duplicate IDs, and advertising-file syntax. Static HTML renders without JavaScript; demos and filters enhance it.

## Structure

```text
src/data.mjs          # Studio details, app catalog and launch configuration
src/icons.mjs         # Original inline SVG icon system
src/seo.mjs           # Sitemap, robots, structured data and optional Google verification
scripts/build.mjs     # Generates all 15 HTML routes and sitemap
scripts/serve.mjs     # Local preview with route redirects and real 404 responses
scripts/check.mjs     # Generated-site validation
scripts/check-seo.mjs # Sitemap/canonical/indexing and contact email consistency
scripts/social.ps1    # Windows-only social PNG regeneration (assets are committed)
public/assets/        # CSS, JS, favicons and social cards
public/.htaccess      # Apache configuration
public/_redirects     # Cloudflare Pages and Netlify redirects
public/_headers       # Static-host security and cache headers
deploy/nginx.conf     # Nginx example
netlify.toml          # Netlify build and redirect configuration
vercel.json           # Vercel build and redirect configuration
dist/                 # Generated deployable website (build output)
```

## Routes

`/`, `/legal/`, `/contact/`, `/privacy-policy/`, `/terms/`, `/404.html`, `/app-ads.txt`. Each of `/harmonify/`, `/cinemora/`, and `/chromagrade/` has its own landing page, `/privacy-policy/`, and `/terms/`. App-nested `app-ads.txt` requests redirect to the root file on configured hosts.

## Deploy

- **Netlify:** import this directory; `netlify.toml` supplies the build and output folder.
- **Vercel:** import with framework preset Other; settings are in `vercel.json`.
- **Cloudflare Pages:** use `npm run build`, output `dist`, Node 20+. `_redirects` and `_headers` are copied into output.
- **Apache:** upload the entire contents of `dist`, including `.htaccess`; enable `mod_rewrite` and `AllowOverride` as appropriate.
- **Nginx:** upload `dist`, adapt the included HTTPS server-block snippet, and configure your domain and certificate.

The existing GitHub Pages custom domain is `www.novatech-apps.com`; canonical metadata and the sitemap use that hostname. Preserve the existing domain and HTTPS settings. Do not configure an SPA catch-all: all routes are real directories and unknown URLs should return a 404. The local server is a development preview, not a production server.

## Before the apps launch

All three apps are deliberately labeled **Coming soon**. There are no invented ratings, install counts, production versions, app backend health checks, or developer-verification badges. Browser online status reports only `navigator.onLine`. App demonstrations and features are clearly described as concepts. Google Play buttons explain the pre-launch state until configured.

Update `src/data.mjs` with verified `playUrl`, `rating`, `version`, publisher ID, category, and actual features. Store links must point to the real Google Play listings; verified ratings should be maintained when displayed. The current developer panel explicitly states that Google Play verification is unconfirmed; update it only after verifying the business details and Console status. Add your responsible legal entity and address.

The requested `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0` is present in `/app-ads.txt` as an explicit placeholder. Replace `publisherId` with your real AdMob publisher ID and rebuild; the placeholder cannot verify a publisher. List the root developer website in your store listings and validate crawling in AdMob. Private preview URLs cannot serve as public Play policy or advertising-verification endpoints.

App privacy policies and terms are **pre-launch drafts**, visibly labeled and marked `noindex`. Before submission, audit each released app’s permission manifest, SDK versions/configurations, collection and sharing behavior, audience, regional consent, account/deletion requirements, retention and providers. Replace conditional text with accurate disclosures, finalize the legal entity, address, applicable law and effective date, and remove draft notices/noindex in `scripts/build.mjs` after approval. A website alone cannot establish legal compliance or Play Console verification. Website privacy text also identifies host logging and support retention details that the operator must confirm.

References used to prepare the policy structure: [Google Play User Data](https://support.google.com/googleplay/android-developer/answer/10144311), [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [AdMob data disclosures](https://developers.google.com/admob/android/privacy/play-data-disclosure), [Firebase privacy](https://firebase.google.com/support/privacy), and [app-ads.txt setup](https://support.google.com/admob/answer/9363762).

## Design and behavior

Cream, purple and lime visual system; coordinated dark theme; system theme detection with persisted choice; responsive CSS mockups; app filters; accessible arrow-key tabs; saved preview layouts; animation preference and volume controls; synthesized ambient audio after an explicit play click; pause on tab switch, navigation and backgrounding; contact email copying; printable legal pages. No microphone, account, analytics or advertising SDK runs on this website. Preferences are browser-local. The website has no backend to receive or store form messages; support links open the visitor’s email client.

DM Sans and Manrope are self-hosted WOFF2 fonts with their SIL Open Font Licenses included in `public/assets/fonts/`. The frontend makes no remote font, script, or image requests. Original CSS/SVG art requires no stock imagery. Route-specific favicons, PNG OpenGraph/Twitter cards and canonical URLs are generated/configured for the requested domain. A score of 100 in Lighthouse is a target, not a verified guarantee; run a production Lighthouse audit after configuring the actual host.

## Repository migration

The custom domain in public/CNAME and the existing AdMob publisher ID were carried over from the previous repository. The seller certification authority value uses the correct f08c47fec0942fa0 syntax. Confirm this publisher ID in AdMob before monetization. Google Play and app policy disclosures remain pre-launch drafts. The source in this branch builds into dist; deploy dist using the hosting instructions above.

## GitHub Pages deployment

The repository uses `.github/workflows/pages.yml` to build, validate, and publish `dist` after every push to `main`. The Pages publishing source must be GitHub Actions. The pre-existing custom domain is `www.novatech-apps.com`; its CNAME and HTTPS settings are preserved. No npm installation is needed.

Run `npm run build:pages` and `npm run test:pages` locally. The Pages build emits `.nojekyll` and matching app-ads.txt files under each app path because GitHub Pages cannot apply `_redirects`, `.htaccess`, custom response headers, or server-side rewrite rules. The root `/app-ads.txt` remains the canonical advertising file; nested paths serve identical plain text with HTTP 200 rather than an HTTP redirect. For server-side redirects and headers, use one of the other documented hosts.
