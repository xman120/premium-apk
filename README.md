# FormSnap Arcade & Apps

A high-craft, 100% static Android Game & App Storefront built with React, TypeScript, Vite, and Tailwind CSS. Designed for zero-backend deployment on Cloudflare Workers/Pages with a 3-step verified APK download funnel, no-login star ratings, client-side Traffic & Security Shield, and a hidden `#iamadmin` control panel.

## Hidden Admin Panel (`#iamadmin`)

- **Access URL**: Append `#iamadmin` or `/iamadmin` to your site URL (for example `https://your-site.workers.dev/#iamadmin`), or click the subtle **Admin** link in the footer.
- **Default Admin Password**: `Admin@2026`
- You can change the password or reset it to default inside **Tab 3 — Traffic, Queue & Shield Settings** once signed in. Passwords are stored and verified as SHA-256 hashes using Web Crypto.
- **Ad Safety**: Global Adsterra scripts (Popunder, Social Bar, Interstitial, Sticky Footer, and Banners) automatically pause whenever `#iamadmin` is open.

## Publishing Catalog & Ad Edits Globally

Because this storefront runs as a static SPA with `$0` database cost:
1. Edits in `#iamadmin` save immediately to `localStorage` so you can preview them live on your browser.
2. When ready to publish globally for all visitors, use **Export `apps.json`** / **Copy JSON** in Tab 1 (and **Export `ads.json`** in Tab 2) and commit the updated files to:
   - `public/config/apps.json`
   - `public/config/ads.json`

## Hosting Large 300MB+ APKs for Free (GitHub Releases Guide)

Cloudflare Workers/Pages static assets have per-file size limits (25 MiB). To host large 100MB–300MB+ `.apk` files reliably at zero cost:
1. Create a public GitHub repository dedicated to releases (e.g., `your-org/apk-releases`).
2. Create a new Release (tag `v2.4.1`) in the GitHub UI or via CLI:
   ```bash
   gh release create v2.4.1 ./my-game-v2.4.1.apk --title "My Game v2.4.1" --notes "Verified release"
   ```
3. GitHub Releases supports single release assets up to **2 GiB** with global CDN delivery.
4. Copy the direct asset download URL (`https://github.com/OWNER/REPO/releases/download/TAG/file.apk`) and paste it into the **Direct APK URL** field inside `#iamadmin`.

## Deploying to Cloudflare Workers / Pages ($0 Plan)

```bash
npm install
npm run build
npx wrangler deploy
```

`wrangler.jsonc` is pre-configured with `"assets": { "directory": "./dist", "not_found_handling": "single-page-application" }`.
