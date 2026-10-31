# Linkleaf

<a href="https://layerwise.app"><img src="https://layerwise.app/powered-by.png" alt="Powered by Layerwise" width="320" /></a>

Linkleaf is a link-in-bio app: everyone gets one fast, good-looking page at
`/<username>` for all their links. It's a complete template you can make your
own in minutes. It's a full-stack React app built with TanStack Start and
deployed to Cloudflare Workers, with Better Auth, a D1 database with Drizzle ORM,
Tailwind CSS, shadcn/ui, and Layerwise Storage.

## Make it yours

**Start with [`src/linkleaf.config.ts`](src/linkleaf.config.ts).** The product
name, brand colors, themes, fonts, reserved usernames, limits, and rate limits
all live in that one file, and the landing page, editor, public pages, and share
images follow it.

- **Words:** the landing page copy is in `src/routes/index.tsx`.
- **Share image and icons:** replace `public/og-image.png` and the icons in
  `public/`.
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
  reports, uploads, and share images. Past the click limit, the redirect still
  works and the click just isn't counted.
- **Avatars:** type is judged from the file's bytes on the server (JPG, PNG, or
  WebP, up to 5 MB). The browser first resizes them to 512×512, which also drops
  GPS data.
- **Reports:** "Report this page" stores reports in the `reports` table. There's
  no admin screen, so review them in the Database tab in Layerwise.

Avatars stay private in Storage and are served through `/media/`, because the
local preview can't make files public. This way the same code runs everywhere.

## Commands

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
pnpm release
```

`pnpm test` runs the unit tests in `tests/`, including one that applies every
migration to a real SQLite database. `pnpm test:e2e` runs the whole flow in
`e2e/` against a running dev server at desktop and phone widths, and creates test
accounts and files as it goes. Set `CHROME_PATH` to use your own Chromium build
instead of running `pnpm exec playwright install chromium`.

`db:migrate` applies generated Drizzle migrations to the local D1 database.
Layerwise applies the same migrations to the project's production D1 database
during publishing.

## Important files

- `src/linkleaf.config.ts`: product name, colors, themes, and reserved usernames
- `src/routes/`: TanStack Router file routes
- `src/lib/auth.ts`: Better Auth server configuration
- `src/lib/auth.functions.ts`, `src/lib/pages.functions.ts`,
  `src/lib/analytics.functions.ts`: client-callable server functions
- `src/db/schema.ts`: Drizzle schema
- `vite.config.ts`: Cloudflare, TanStack Start, React, Tailwind, and Layerwise
  plugins
- `wrangler.jsonc`: local Worker, D1, Storage, and Email bindings
- `src/lib/storage.ts`: Layerwise Storage types and helpers for `env.STORAGE`
- `src/lib/email.ts`: Layerwise Email types for `env.EMAIL`
- `src/lib/site.ts`: site name, share image, indexed address, and sitemap pages
- `src/utils/seo.ts`: `seo()` head tags for each route

## Storage

Server code stores files with `env.STORAGE` from `cloudflare:workers`. Files
are private by default; save keys (not URLs) in D1 and show private files with
`env.STORAGE.signedUrl(key)`. The local preview and the published app share the
project's one Storage, so files written while testing are real files.

## Search and sharing

Each route sets its head with `seo({ title, description, path })`, which adds
the canonical URL and the link-preview tags that Google, Instagram, iMessage,
and WhatsApp read. Signed-in and sign-in pages pass `noindex: true`.
`/robots.txt` and `/sitemap.xml` are generated from `src/lib/site.ts`; add each
public page to `sitemapPaths`. After connecting a custom domain, set `site.url`
to it so search engines index one address.

## Email

Server code sends transactional email with `env.EMAIL.send()` from
`cloudflare:workers`: one recipient per email, `html` and/or `text`, and an
optional `replyTo`. It returns `{ data, error }` and never throws for delivery
problems, so check `error.code`. The local preview never sends real email:
messages and sign-in codes appear under Email → Local in the Layerwise app.
Published apps send from the project's address after the first publish.

Keep secrets server-side. Variables prefixed with `VITE_` are included in the
browser bundle. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `AUTH_EMAIL_URL`
belong in the Worker environment.
