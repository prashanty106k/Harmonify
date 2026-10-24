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
src/aura-page.mjs     # Dedicated Aura landing page and interactive studio markup
src/aura-data.mjs     # Aura features, vibes, widgets and FAQs
src/aura-legal.mjs    # Safe rendering of the supplied Aura legal documents
src/content/          # Original supplied Aura privacy, terms and feature text
src/redirects.mjs     # Legacy Harmonify route mapping
src/icons.mjs         # Original inline SVG icon system
src/seo.mjs           # Sitemap, robots, structured data and optional Google verification
scripts/build.mjs     # Generates all 24 HTML routes and sitemap
scripts/serve.mjs     # Local preview with route redirects and real 404 responses
scripts/check.mjs     # Generated-site validation
scripts/check-seo.mjs # Sitemap/canonical/indexing and contact email consistency
scripts/check-aura.mjs # Aura controls, legal section coverage and legacy routes
scripts/check-learning.mjs # Learning content, legal sections and clock calculations
src/learning-page.mjs # DnyanVedh landing page, original SVG teaching clocks
src/learning-data.mjs # Educational features, topics and FAQs
src/learning-legal.mjs # Rendering of the supplied DnyanVedh policies
src/chromagrade-page.mjs # Custom ChromaGrade landing page and editor shell
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

`/`, `/legal/`, `/contact/`, `/privacy-policy/`, `/terms/`, `/404.html`, `/app-ads.txt`. Each of `/aura-music-player/`, `/learning-app/`, `/cinematic-pro/`, and `/chromagrade/` has its own landing page, `/privacy-policy/`, and `/terms/`. App-nested `app-ads.txt` requests redirect to the root file on configured hosts. The former `/harmonify/` and `/cinemora/` pages redirect to their Aura and Cinematic Pro equivalents; GitHub Pages uses immediate HTML redirects with canonical targets and accessible fallback links.

## Cinematic Pro privacy policy

Cinematic Pro replaces the Cinemora name and canonical route. Its general video-editor privacy policy is maintained in `src/content/cinematic-pro-privacy.md` and rendered by `src/cinematic-privacy.mjs`. It is published with an effective date of October 18, 2026, without a draft notice or `noindex`, and is included in the sitemap. The app's terms remain a pre-launch draft. Old Cinemora URLs and asset filenames remain compatible.

The owner requested general policy wording and supplied an Android manifest fragment, recorded in `src/content/cinematic-pro-permissions.txt`. The policy names the declared media, camera, microphone, notification, vibration, internet and foreground media-processing permissions, the API 32 cap for legacy storage, and optional camera hardware. This does not establish actual runtime data flows or dependency-added permissions. Google AdMob and Firebase processing remain expressly conditional on the service being included in the installed version. No particular SDK integration, account system, cloud processing feature or offline-only architecture has been verified. Match these general disclosures to the actual released build and Play Console Data safety entries before store submission; publication is not a compliance certification.

## ChromaGrade showcase

The custom `/chromagrade/` landing page is rendered from `src/chromagrade-page.mjs`. Its CSS and three JavaScript assets load only on that landing route: `chromagrade.css`, `chromagrade-data.js`, `chromagrade-engine.js` and `chromagrade.js`. The supplied editor includes a WebGL 2 grading preview, locally embedded sample image and preset LUTs, before/after comparison, undo/redo, grading tabs and a guided tour. The file picker is designed to read local images, videos and `.cube` LUTs in the browser; there is no upload endpoint. The export sheet explains the app's export features and does not save files from this demo. Unsupported browsers receive a WebGL message. Shared navigation, theme controls, existing privacy and terms routes, metadata and Google Play availability remain integrated with the studio site.

## DnyanVedh (Learning App)

The education showcase is named **DnyanVedh** and retains `/learning-app/` so existing links continue to work. It covers English and Marathi picture matching, fifteen English topics, 25-question tests, rupee counting, place value, clock learning/practice, local result history and PDF reporting. An Education filter, fourth app card, trust-center entry, app icon and social card are included. The landing page has an illustrative clock activity with plus/minus controls, English/Marathi time names, three target difficulties, answer checking and keyboard-accessible Play/Layouts/Setup tabs. It does not save learner results or export reports; the report illustration explains the Android app's supplied features.

The owner’s replacement text is preserved verbatim in `src/content/dnyanvedh-supplied.txt`. Its privacy policy and terms are organised into readable sections in `src/content/learning-privacy.md` and `src/content/learning-terms.md`; all supplied paragraphs are retained. The known NovaTech Apps operator name and public support email replace placeholders, with an effective date of October 20, 2026. Both documents are published without draft notices or `noindex` and are included in the sitemap. The current Android app is described as offline with no accounts, ads, analytics or developer-operated server connection. Android backup/device transfer and user-chosen report exports are explicitly disclosed; saved/shared copies must be managed separately. Full Marathi app localisation and individual-result deletion are not implemented. No Google advertising or Firebase SDK disclosure is borrowed from another app.

## Aura Music Player

Aura replaces Harmonify throughout the catalog, metadata, sitemap, icons and social cards. Its landing page presents offline playback, 8D/16D spatial sound, a 10-band equalizer, 25 app presets, ten vibes, five widgets, library tools, lyrics, Android integrations and customization. The browser studio has four demonstration EQ presets plus manual band adjustment, ten vibe controls and spatial panning. Its sound is synthesized locally after pressing Play; the widget and library illustrations are CSS mockups. The supplied feature description is retained in `src/content/aura-features.md` for release review.

The Aura privacy and terms pages render the supplied Markdown in `src/content/aura-privacy.md` and `src/content/aura-terms.md`. Template author notes are omitted; the support email and brand are substituted. The supplied GPL licensing and source-offer clauses are preserved. Effective date, full legal publisher identity, postal address and governing jurisdiction remain visibly pending until supplied. Confirm those details and the released app's behavior before removing the pre-release notice or `noindex` setting. Aura's policy describes AdMob advertising and local playback; it does not claim Firebase integration.

## Deploy

- **Netlify:** import this directory; `netlify.toml` supplies the build and output folder.
- **Vercel:** import with framework preset Other; settings are in `vercel.json`.
- **Cloudflare Pages:** use `npm run build`, output `dist`, Node 20+. `_redirects` and `_headers` are copied into output.
- **Apache:** upload the entire contents of `dist`, including `.htaccess`; enable `mod_rewrite` and `AllowOverride` as appropriate.
- **Nginx:** upload `dist`, adapt the included HTTPS server-block snippet, and configure your domain and certificate.

The existing GitHub Pages custom domain is `www.novatech-apps.com`; canonical metadata and the sitemap use that hostname. Preserve the existing domain and HTTPS settings. Do not configure an SPA catch-all: all routes are real directories and unknown URLs should return a 404. The local server is a development preview, not a production server.

## Before the apps launch

All four apps are deliberately labeled **Coming soon**. There are no invented ratings, install counts, production versions, app backend health checks, or developer-verification badges. Browser online status reports only `navigator.onLine`. Browser demonstrations and reports are illustrative; Aura and DnyanVedh feature descriptions follow the supplied app content. Google Play buttons explain the pre-launch state until configured.

Update `src/data.mjs` with verified `playUrl`, `rating`, `version`, publisher ID, category, and actual features. Store links must point to the real Google Play listings; verified ratings should be maintained when displayed. The current developer panel explicitly states that Google Play verification is unconfirmed; update it only after verifying the business details and Console status. Add your responsible legal entity and address.

The existing publisher ID `pub-5447768257052428` is retained in `/app-ads.txt` with the Google seller certification value `f08c47fec0942fa0`. Confirm it against your AdMob account before monetization. List the root developer website in your store listings and validate crawling in AdMob. Private preview URLs cannot serve as public Play policy or advertising-verification endpoints.

Except for DnyanVedh’s supplied privacy policy and terms and Cinematic Pro’s published general privacy policy, app privacy policies and terms are **pre-launch drafts**, visibly labeled and marked `noindex`. Before submission, audit each released app’s permission manifest, SDK versions/configurations, collection and sharing behavior, audience, regional consent, account/deletion requirements, retention and providers. Replace conditional text with accurate disclosures, finalize required legal details, and remove remaining draft notices/noindex in `scripts/build.mjs` after approval. A website alone cannot establish legal compliance or Play Console verification. Website privacy text also identifies host logging and support retention details that the operator must confirm.

References used to prepare the policy structure: [Google Play User Data](https://support.google.com/googleplay/android-developer/answer/10144311), [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [AdMob data disclosures](https://developers.google.com/admob/android/privacy/play-data-disclosure), [Firebase privacy](https://firebase.google.com/support/privacy), and [app-ads.txt setup](https://support.google.com/admob/answer/9363762).

## Design and behavior

Cream, purple and lime visual system; coordinated dark theme; system theme detection with persisted choice; responsive CSS mockups; app filters; accessible arrow-key tabs; saved preview layouts; animation preference and volume controls; synthesized ambient audio after an explicit play click; pause on tab switch, navigation and backgrounding; contact email copying; printable legal pages. No microphone, account, analytics or advertising SDK runs on this website. Preferences are browser-local. The website has no backend to receive or store form messages; support links open the visitor’s email client.

DM Sans and Manrope are self-hosted WOFF2 fonts with their SIL Open Font Licenses included in `public/assets/fonts/`. The frontend makes no remote font, script, or image requests. Original CSS/SVG art requires no stock imagery. Route-specific favicons, PNG OpenGraph/Twitter cards and canonical URLs are generated/configured for the requested domain. A score of 100 in Lighthouse is a target, not a verified guarantee; run a production Lighthouse audit after configuring the actual host.

## Repository migration

The custom domain in public/CNAME and the existing AdMob publisher ID were carried over from the previous repository. The seller certification authority value uses the correct f08c47fec0942fa0 syntax. Confirm this publisher ID in AdMob before monetization. App publication does not establish Google Play verification; policy status is described above. The source in this branch builds into dist; deploy dist using the hosting instructions above.

## GitHub Pages deployment

The repository uses `.github/workflows/pages.yml` to build, validate, and publish `dist` after every push to `main`. The Pages publishing source must be GitHub Actions. The pre-existing custom domain is `www.novatech-apps.com`; its CNAME and HTTPS settings are preserved. No npm installation is needed.

Run `npm run build:pages` and `npm run test:pages` locally. The Pages build emits `.nojekyll` and matching app-ads.txt files under each app path because GitHub Pages cannot apply `_redirects`, `.htaccess`, custom response headers, or server-side rewrite rules. The root `/app-ads.txt` remains the canonical advertising file; nested paths serve identical plain text with HTTP 200 rather than an HTTP redirect. For server-side redirects and headers, use one of the other documented hosts.
