<a href="https://layerwise.app"><picture><source media="(prefers-color-scheme: dark)" srcset="https://layerwise.app/powered-by-dark.png"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="174" height="28"></picture></a>

# Linkleaf

Linkleaf is a link-in-bio app: everyone who signs up claims a name and gets one
fast, good-looking page at `/<username>` for all their links, ready to paste
into an Instagram or TikTok bio. It's a template for anyone who wants to run
their own link-in-bio service, for a community, a brand, or a group of
creators. Visitors can browse example pages, try the editor with sample data
and no account, then sign up to publish a page, pick a theme, schedule links,
and see which links people tap. See the live demo at
https://linkleaf.layerwise.site/.

Linkleaf was built with [Layerwise](https://layerwise.app), and you can open it
in Layerwise to make your own version.

It's a full-stack React app built with TanStack Start and deployed to
Cloudflare Workers, with Better Auth, a D1 database with Drizzle ORM, Tailwind
CSS, shadcn/ui, and Layerwise Storage.

## Make it yours

**Start with [`src/linkleaf.config.ts`](src/linkleaf.config.ts).** The product
name, tagline, description, footer note, brand colors, themes, fonts, reserved
usernames, limits, rate limits, and report reasons all live in that one file,
and the landing page, editor, public pages, and share images follow it.

- **Words:** the landing page copy is in `src/routes/index.tsx`. The tagline,
  description, and footer note come from `src/linkleaf.config.ts`.
- **Colors:** `brand` in `src/linkleaf.config.ts` sets the app's colors.
  Public pages use their own theme instead.
- **Themes:** to add one, add an entry to `themes` in
  `src/linkleaf.config.ts` with an `id`, `name`, `description`, `background`,
  `text`, `accent`, button fill and shape, `font`, and `pattern`. The first
  theme is the default for new pages. The editor, the landing page, and the
  server's checks pick it up, and `pnpm test` checks that its text stays
  readable.
- **Share image and icons:** replace `public/og-image.png` and the icons in
  `public/`. Each public page also gets its own share image at
  `/og/<username>.png`.
- **Example pages:** they're seeded by a migration from
  `scripts/build-seed-sql.mjs`, and their avatars are in `public/examples/`. To
  change them, see the note at the top of that script.
- **Search:** after connecting a custom domain, set `site.url` in
  `src/lib/site.ts`.

If you add a route with a new first path segment, add that segment to
`reservedUsernames`. A test fails until you do, so nobody can claim a name that
collides with your app.

## What's inside

- **Public pages** (`src/routes/$username.tsx`): server-rendered with big tap
  targets and no pop-ups, for in-app browsers. Links work before JavaScript loads.
- **Editor** (`src/components/editor/`): two columns with a live phone preview,
  or a Preview tab on a phone. Autosaves as you type.
- **Try mode** (`src/routes/try.tsx`): the same editor with sample data, saved in
  the browser only. The draft comes along on sign-up.
- **Themes** (`src/lib/theme.ts`): every color on a page comes from
  `resolveTheme`, which keeps text at 4.5:1 contrast or better for presets and
  custom colors alike. If a custom gradient can't reach that, it adjusts the
  colors and tells the owner. A test checks this against random colors.
- **Analytics** (`src/routes/go.$linkId.ts`, `src/routes/api/track/view.ts`):
  clicks go through a server redirect and views are counted after the page loads.
  Only daily counters per link and source are stored.
- **Share images** (`src/routes/og.$file.ts`): drawn per page on first request in
  that page's theme, then kept in Storage until its look changes. The embedded
  fonts cover Latin text; other scripts fall back to the username.

## Safety

- **Links:** only `http`, `https`, and `mailto` are allowed. `src/lib/url-safety.ts`
  runs on every server write and again at redirect time.
- **Ownership:** server functions find the page from the session and never accept
  a page or user ID from the browser (`src/lib/owner-middleware.ts`). Requests
  started by other sites are refused.
- **Privacy:** raw IP addresses are never stored. Rate limits use a salted hash,
  and Better Auth's IP tracking is off.
- **Rate limits:** sign-up, sign-in, username checks, click and view tracking,
  saves, reports, uploads, and share images. Past the click limit, the redirect
  still works and the click just isn't counted.
- **Avatars:** type is judged from the file's bytes on the server (JPG, PNG, or
  WebP, up to 5 MB). The browser first resizes them to 512×512, which also drops
  GPS data.
- **Reports:** "Report this page" stores reports in the `reports` table. There's
  no admin screen, so review them in the Database tab in Layerwise.

## Storage

Avatars and share images are kept in Layerwise Storage through `env.STORAGE`.
Files stay private: avatars are saved under `avatars/` and served through
`/media/` (`src/routes/media.$.ts`), and share images are saved under `og/` and
served through `/og/<username>.png`. The local preview can't make files public,
so this way the same code runs everywhere. The local preview and the published
app share the project's one Storage, so files written while testing are real
files.

## Search and sharing

Each route sets its head with `seo({ title, description, path })` from
`src/utils/seo.ts`, which adds the canonical URL and the link-preview tags that
Google, Instagram, iMessage, and WhatsApp read. Signed-in and sign-in pages pass
`noindex: true`. `/robots.txt` and `/sitemap.xml` are generated from
`src/lib/site.ts`; the sitemap lists `sitemapPaths` plus every published page.
After connecting a custom domain, set `site.url` to it so search engines index
one address.

## Sign-in email

Linkleaf signs people in with a password or a 6-digit email code, and also
emails codes for password resets. `src/lib/auth-email.ts` posts each code to
`AUTH_EMAIL_URL`; without it, the code is printed to the server log. The local
preview never sends real email: sign-in codes appear under Email → Local in the
Layerwise app.

Keep secrets server-side. Variables prefixed with `VITE_` are included in the
browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL`
belong in the Worker environment.

## Commands

Layerwise runs the dev server for you. Outside Layerwise, start it with
`pnpm dev`.

```bash
pnpm dev
pnpm check-types
pnpm build
pnpm test
E2E_BASE_URL=http://127.0.0.1:<port> pnpm test:e2e
pnpm auth:generate
pnpm db:generate --name <migration_name>
pnpm db:migrate
pnpm cf-typegen
```

`pnpm build` runs the type check and then the production build. `pnpm test`
runs the unit tests in `tests/`, including one that applies every migration to
a real SQLite database. `pnpm test:e2e` runs the whole flow in `e2e/` against a
running dev server at desktop and phone widths, and creates test accounts and
files as it goes. Set `CHROME_PATH` to use your own Chromium build instead of
running `pnpm exec playwright install chromium`.

`db:generate` creates a Drizzle migration from `src/db/schema.ts`, and
`db:migrate` applies migrations to the local D1 database. Layerwise applies the
same migrations to the project's production D1 database during publishing.

## Important files

- `src/linkleaf.config.ts`: product name, copy, colors, themes, reserved
  usernames, and limits
- `src/routes/`: TanStack Router file routes
- `src/components/page/PageView.tsx`: the public page design, also used in the
  editor preview and the landing page mockups
- `src/styles/app.css`: app styles and the public page styles
- `src/lib/auth.ts`: Better Auth server configuration
- `src/lib/auth.functions.ts`, `src/lib/pages.functions.ts`,
  `src/lib/analytics.functions.ts`: client-callable server functions
- `src/db/schema.ts`: Drizzle schema
- `scripts/build-seed-sql.mjs`: the example pages
- `vite.config.ts`: Cloudflare, TanStack Start, React, Tailwind, and Layerwise
  plugins
- `wrangler.jsonc`: local Worker, D1, Storage, and Email bindings
- `src/lib/site.ts`: site name, share image, indexed address, and sitemap pages
- `src/utils/seo.ts`: `seo()` head tags for each route
