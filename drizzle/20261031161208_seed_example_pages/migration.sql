-- Seeded example pages. See scripts/build-seed-sql.mjs.
INSERT INTO pages (id, user_id, username, display_name, bio, avatar, socials, theme, show_create_your_own, published, example_order, created_at, updated_at)
VALUES ('example-juniper-vale', NULL, 'juniper-vale', 'Juniper Vale', 'Wheel-thrown stoneware from a very small garage studio. New kiln drops on the first Sunday of the month.', '/examples/juniper-vale.svg', '[{"network":"instagram","url":"https://example.com/juniper/instagram"},{"network":"pinterest","url":"https://example.com/juniper/pinterest"},{"network":"email","url":"mailto:juniper@example.com"}]', '{"preset":"broadside","accent":null,"background":null,"buttonFill":null,"buttonShape":null,"font":null}', 1, 1, 0, 1790000000, 1790000000);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-juniper-vale-link-1', 'example-juniper-vale', 'Shop the November kiln drop', 'https://example.com/juniper/shop', 0, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-juniper-vale-link-2', 'example-juniper-vale', 'Book a Saturday wheel class', 'https://example.com/juniper/classes', 1, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-juniper-vale-link-3', 'example-juniper-vale', 'Studio journal: glaze experiments', 'https://example.com/juniper/journal', 2, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-juniper-vale-link-4', 'example-juniper-vale', 'Care guide for your new mug', 'https://example.com/juniper/care', 3, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-juniper-vale-link-5', 'example-juniper-vale', 'Wholesale inquiries', 'mailto:juniper@example.com', 4, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO pages (id, user_id, username, display_name, bio, avatar, socials, theme, show_create_your_own, published, example_order, created_at, updated_at)
VALUES ('example-sunday-soup-club', NULL, 'sunday-soup-club', 'Marlo Finch', 'One pot, one recipe, every Sunday. Feeding 40,000 imaginary neighbors and counting.', '/examples/sunday-soup-club.svg', '[{"network":"tiktok","url":"https://example.com/marlo/tiktok"},{"network":"instagram","url":"https://example.com/marlo/instagram"},{"network":"youtube","url":"https://example.com/marlo/youtube"}]', '{"preset":"citrus-pop","accent":null,"background":null,"buttonFill":null,"buttonShape":null,"font":null}', 1, 1, 1, 1790000000, 1790000000);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-sunday-soup-club-link-1', 'example-sunday-soup-club', 'This week: smoky tomato and white bean', 'https://example.com/marlo/this-week', 0, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-sunday-soup-club-link-2', 'example-sunday-soup-club', 'Get the Sunday recipe email', 'https://example.com/marlo/newsletter', 1, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-sunday-soup-club-link-3', 'example-sunday-soup-club', 'The Soup Club cookbook', 'https://example.com/marlo/cookbook', 2, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-sunday-soup-club-link-4', 'example-sunday-soup-club', 'My favorite pot, knife, and ladle', 'https://example.com/marlo/kit', 3, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO pages (id, user_id, username, display_name, bio, avatar, socials, theme, show_create_your_own, published, example_order, created_at, updated_at)
VALUES ('example-nova-lune', NULL, 'nova-lune', 'Nova Lune', 'Synth-pop for driving home after the party. New single “Glass Orbit” out now.', '/examples/nova-lune.svg', '[{"network":"spotify","url":"https://example.com/nova/spotify"},{"network":"soundcloud","url":"https://example.com/nova/soundcloud"},{"network":"instagram","url":"https://example.com/nova/instagram"},{"network":"tiktok","url":"https://example.com/nova/tiktok"}]', '{"preset":"afterhours","accent":null,"background":null,"buttonFill":null,"buttonShape":null,"font":null}', 1, 1, 2, 1790000000, 1790000000);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-nova-lune-link-1', 'example-nova-lune', 'Listen to “Glass Orbit”', 'https://example.com/nova/glass-orbit', 0, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-nova-lune-link-2', 'example-nova-lune', 'Tickets: The Low Tide Tour', 'https://example.com/nova/tour', 1, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-nova-lune-link-3', 'example-nova-lune', 'Vinyl and tour merch', 'https://example.com/nova/merch', 2, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-nova-lune-link-4', 'example-nova-lune', 'Join the Moon Mail list', 'https://example.com/nova/list', 3, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO pages (id, user_id, username, display_name, bio, avatar, socials, theme, show_create_your_own, published, example_order, created_at, updated_at)
VALUES ('example-tess-on-trails', NULL, 'tess-on-trails', 'Tess Holloway', 'Trail running coach. I help road runners fall in love with mud, hills, and very long snack breaks.', '/examples/tess-on-trails.svg', '[{"network":"instagram","url":"https://example.com/tess/instagram"},{"network":"youtube","url":"https://example.com/tess/youtube"},{"network":"substack","url":"https://example.com/tess/substack"}]', '{"preset":"canopy","accent":null,"background":null,"buttonFill":null,"buttonShape":null,"font":null}', 1, 1, 3, 1790000000, 1790000000);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-tess-on-trails-link-1', 'example-tess-on-trails', 'Free plan: your first 10K trail', 'https://example.com/tess/first-10k', 0, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-tess-on-trails-link-2', 'example-tess-on-trails', 'Coaching for spring races', 'https://example.com/tess/coaching', 1, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-tess-on-trails-link-3', 'example-tess-on-trails', 'Saturday group runs', 'https://example.com/tess/group-runs', 2, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-tess-on-trails-link-4', 'example-tess-on-trails', 'The gear I actually use', 'https://example.com/tess/gear', 3, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-tess-on-trails-link-5', 'example-tess-on-trails', 'Podcast: Long Way Up', 'https://example.com/tess/podcast', 4, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO pages (id, user_id, username, display_name, bio, avatar, socials, theme, show_create_your_own, published, example_order, created_at, updated_at)
VALUES ('example-bram-builds', NULL, 'bram-builds', 'Bram Okoye', 'Solo developer making Mossgrove, a cozy game about tending a very slow forest. Devlogs every Friday.', '/examples/bram-builds.svg', '[{"network":"github","url":"https://example.com/bram/github"},{"network":"youtube","url":"https://example.com/bram/youtube"},{"network":"discord","url":"https://example.com/bram/discord"},{"network":"bluesky","url":"https://example.com/bram/bluesky"}]', '{"preset":"terminal","accent":null,"background":null,"buttonFill":null,"buttonShape":null,"font":null}', 1, 1, 4, 1790000000, 1790000000);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-bram-builds-link-1', 'example-bram-builds', 'Wishlist Mossgrove', 'https://example.com/bram/wishlist', 0, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-bram-builds-link-2', 'example-bram-builds', 'Play the free demo', 'https://example.com/bram/demo', 1, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-bram-builds-link-3', 'example-bram-builds', 'Friday devlogs', 'https://example.com/bram/devlogs', 2, 1, NULL, NULL);
--> statement-breakpoint
INSERT INTO links (id, page_id, title, url, position, enabled, starts_at, ends_at)
VALUES ('example-bram-builds-link-4', 'example-bram-builds', 'Join the playtest Discord', 'https://example.com/bram/playtest', 3, 1, NULL, NULL);
