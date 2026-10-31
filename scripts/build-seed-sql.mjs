// Builds the SQL for the seeded example pages. Migrations are immutable once
// published, so to change the examples: edit this data, run
// `pnpm exec drizzle-kit generate --custom --name update_examples`, and write
// this script's output to the new migration (replacing rows by page ID).
//
//   node scripts/build-seed-sql.mjs > drizzle/<migration>/migration.sql
//
// Everyone here is made up. Links point at example.com; the app intercepts them
// and shows a friendly "this is an example" page instead.

const theme = (preset) => ({
  preset,
  accent: null,
  background: null,
  buttonFill: null,
  buttonShape: null,
  font: null
});

const ex = (path) => `https://example.com/${path}`;

const examples = [
  {
    username: 'juniper-vale',
    displayName: 'Juniper Vale',
    bio: 'Wheel-thrown stoneware from a very small garage studio. New kiln drops on the first Sunday of the month.',
    avatar: '/examples/juniper-vale.svg',
    theme: 'broadside',
    socials: [['instagram', ex('juniper/instagram')], ['pinterest', ex('juniper/pinterest')], ['email', 'mailto:juniper@example.com']],
    links: [
      ['Shop the November kiln drop', ex('juniper/shop')],
      ['Book a Saturday wheel class', ex('juniper/classes')],
      ['Studio journal: glaze experiments', ex('juniper/journal')],
      ['Care guide for your new mug', ex('juniper/care')],
      ['Wholesale inquiries', 'mailto:juniper@example.com']
    ]
  },
  {
    username: 'sunday-soup-club',
    displayName: 'Marlo Finch',
    bio: 'One pot, one recipe, every Sunday. Feeding 40,000 imaginary neighbors and counting.',
    avatar: '/examples/sunday-soup-club.svg',
    theme: 'citrus-pop',
    socials: [['tiktok', ex('marlo/tiktok')], ['instagram', ex('marlo/instagram')], ['youtube', ex('marlo/youtube')]],
    links: [
      ['This week: smoky tomato and white bean', ex('marlo/this-week')],
      ['Get the Sunday recipe email', ex('marlo/newsletter')],
      ['The Soup Club cookbook', ex('marlo/cookbook')],
      ['My favorite pot, knife, and ladle', ex('marlo/kit')]
    ]
  },
  {
    username: 'nova-lune',
    displayName: 'Nova Lune',
    bio: 'Synth-pop for driving home after the party. New single “Glass Orbit” out now.',
    avatar: '/examples/nova-lune.svg',
    theme: 'afterhours',
    socials: [['spotify', ex('nova/spotify')], ['soundcloud', ex('nova/soundcloud')], ['instagram', ex('nova/instagram')], ['tiktok', ex('nova/tiktok')]],
    links: [
      ['Listen to “Glass Orbit”', ex('nova/glass-orbit')],
      ['Tickets: The Low Tide Tour', ex('nova/tour')],
      ['Vinyl and tour merch', ex('nova/merch')],
      ['Join the Moon Mail list', ex('nova/list')]
    ]
  },
  {
    username: 'tess-on-trails',
    displayName: 'Tess Holloway',
    bio: 'Trail running coach. I help road runners fall in love with mud, hills, and very long snack breaks.',
    avatar: '/examples/tess-on-trails.svg',
    theme: 'canopy',
    socials: [['instagram', ex('tess/instagram')], ['youtube', ex('tess/youtube')], ['substack', ex('tess/substack')]],
    links: [
      ['Free plan: your first 10K trail', ex('tess/first-10k')],
      ['Coaching for spring races', ex('tess/coaching')],
      ['Saturday group runs', ex('tess/group-runs')],
      ['The gear I actually use', ex('tess/gear')],
      ['Podcast: Long Way Up', ex('tess/podcast')]
    ]
  },
  {
    username: 'bram-builds',
    displayName: 'Bram Okoye',
    bio: 'Solo developer making Mossgrove, a cozy game about tending a very slow forest. Devlogs every Friday.',
    avatar: '/examples/bram-builds.svg',
    theme: 'terminal',
    socials: [['github', ex('bram/github')], ['youtube', ex('bram/youtube')], ['discord', ex('bram/discord')], ['bluesky', ex('bram/bluesky')]],
    links: [
      ['Wishlist Mossgrove', ex('bram/wishlist')],
      ['Play the free demo', ex('bram/demo')],
      ['Friday devlogs', ex('bram/devlogs')],
      ['Join the playtest Discord', ex('bram/playtest')]
    ]
  }
];

const CREATED_AT = 1790000000; // Seconds, like the `created_at` column.
const q = (value) => (value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`);

const statements = [];
examples.forEach((page, pageIndex) => {
  const pageId = `example-${page.username}`;
  const socials = page.socials.map(([network, url]) => ({ network, url }));
  statements.push(
    `INSERT INTO pages (id, user_id, username, display_name, bio, avatar, socials, theme, show_create_your_own, published, example_order, created_at, updated_at)\nVALUES (${[
      q(pageId), 'NULL', q(page.username), q(page.displayName), q(page.bio), q(page.avatar),
      q(JSON.stringify(socials)), q(JSON.stringify(theme(page.theme))), 1, 1, pageIndex, CREATED_AT, CREATED_AT
    ].join(', ')});`
  );
  page.links.forEach(([title, url], position) => {
    statements.push(
      `INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)\nVALUES (${[
        q(`${pageId}-link-${position + 1}`), q(pageId), q(title), q(url), position, 1, 'NULL', 'NULL'
      ].join(', ')});`
    );
  });
});

console.log('-- Seeded example pages. See scripts/build-seed-sql.mjs.');
console.log(statements.join('\n--> statement-breakpoint\n'));
