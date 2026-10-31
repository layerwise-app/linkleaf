import { deflateSync } from 'node:zlib';
import { expect, test } from '@playwright/test';
import type { Browser, BrowserContextOptions, Page } from '@playwright/test';

const INSTAGRAM_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0';

/** A real PNG, so the browser's actual image pipeline runs on the upload. */
function makePng(width: number, height: number) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (data: Buffer) => {
    let c = 0xffffffff;
    for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const check = Buffer.alloc(4);
    check.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, check]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8 bits per channel
  header[9] = 2; // RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = 200;
    row[2 + x * 3] = (x * 255) / width;
    row[3 + x * 3] = 90;
  }
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const PNG = makePng(600, 400);

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

/** Each test looks like a new visitor, so rate limits don't carry over between runs. */
const fakeIp = () =>
  `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

async function expectNoSideScroll(page: Page, label: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(scrollWidth, `${label} scrolls sideways`).toBeLessThanOrEqual(innerWidth);
}

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

async function signUp(page: Page, email: string) {
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();
  await page.getByLabel('Name', { exact: true }).fill('Casey Test');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Confirm password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Claim your name' })).toBeVisible();
}

async function claim(page: Page, username: string) {
  const field = page.getByLabel('Username');
  await field.fill(username);
  await expect(page.getByText('That name is available.')).toBeVisible();
  await page.getByRole('button', { name: 'Claim and continue' }).click();
  await expect(page.getByRole('heading', { name: 'Your links' })).toBeVisible();
}

async function addLink(page: Page, title: string, url: string) {
  await page.getByRole('button', { name: 'Add link' }).first().click();
  await page.getByLabel('Title', { exact: true }).first().fill(title);
  await page.getByLabel('Link', { exact: true }).first().fill(url);
  await page.locator('form').getByRole('button', { name: 'Add link' }).click();
}

const saved = (page: Page) =>
  expect(page.getByRole('status').filter({ hasText: /saved/i }).first()).toBeVisible();

async function linkTitles(page: Page) {
  return page.locator('[data-testid=link-row] span.truncate.font-medium').allTextContents();
}

function newVisitor(browser: Browser, options: BrowserContextOptions = {}) {
  return browser.newContext({
    ...options,
    extraHTTPHeaders: { 'cf-connecting-ip': fakeIp() }
  });
}

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ 'cf-connecting-ip': fakeIp() });
});

test('landing page shows the examples and leads to sign-up', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('One link');
  const examples = page.locator('#examples > ul > li');
  await expect(examples).toHaveCount(5);
  await expectNoSideScroll(page, 'landing');

  await page.locator('#claim-hero').fill('Some-Name');
  await expect(page.locator('#claim-hero')).toHaveValue('some-name');
  await expect(page.getByText('Good news: /some-name is available.')).toBeVisible();
  await page.getByRole('button', { name: 'Claim your page' }).first().click();
  await expect(page).toHaveURL(/\/sign-up\?username=some-name/);

  // The name waits through sign-up.
  await signUp(page, `wanted-${unique()}@example.com`);
  await expect(page.getByLabel('Username')).toHaveValue('some-name');
  expect(errors).toEqual([]);
});

test('example pages are complete and their links explain themselves', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/juniper-vale');
  await expect(page.getByRole('heading', { name: 'Juniper Vale' })).toBeVisible();
  await expect(page.getByText('Fictional example page')).toBeVisible();
  await expect(page.locator('.ll-link')).toHaveCount(5);
  await expect(page.locator('.ll-social')).toHaveCount(3);
  await expect(page.getByRole('link', { name: /Create your own/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Report this page' })).toBeVisible();
  await expectNoSideScroll(page, 'example page');

  await page.locator('.ll-link').first().click();
  await expect(page).toHaveURL(/\/example-link/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('just an example');
  expect(errors).toEqual([]);
});

test('public page has its own head tags, and private pages stay out of search', async ({ page }) => {
  await page.goto('/nova-lune');
  await expect(page).toHaveTitle(/Nova Lune/);
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(og).toMatch(/\/og\/nova-lune\.png\?v=/);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/nova-lune$/);
  const image = await page.request.get(og!);
  expect(image.status()).toBe(200);
  expect(image.headers()['content-type']).toBe('image/png');

  for (const path of ['/try', '/sign-in', '/sign-up']) {
    await page.goto(path);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', 'noindex');
  }

  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/nova-lune<');
  expect(sitemap).not.toContain('/dashboard');
});

test('reserved and malformed usernames are refused', async ({ page }) => {
  await page.goto('/sign-up');
  await signUp(page, `reserved-${unique()}@example.com`);
  const field = page.getByLabel('Username');
  for (const name of ['dashboard', 'sign-in', 'api', 'try', 'media', 'report']) {
    await field.fill(name);
    await expect(page.getByText('That name is reserved. Try another.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Claim and continue' })).toBeDisabled();
  }
  await field.fill('ab');
  await expect(page.getByText(/at least 3 characters/)).toBeVisible();
  await field.fill('juniper-vale');
  await expect(page.getByText(/That name is taken/)).toBeVisible();
});

test('whole flow: sign up, edit, upload, publish, click, analytics', async ({ browser, page }, testInfo) => {
  const errors = watchErrors(page);
  const isPhone = testInfo.project.name === 'phone';
  const id = unique();
  const username = `casey-${id}`;

  // Sign up and claim
  await page.goto('/sign-up');
  await signUp(page, `casey-${id}@example.com`);
  await claim(page, username);
  await expectNoSideScroll(page, 'editor');

  // Unsafe links are refused in the form
  await page.getByRole('button', { name: 'Add link' }).first().click();
  await page.getByLabel('Title', { exact: true }).first().fill('Bad');
  await page.getByLabel('Link', { exact: true }).first().fill('javascript:alert(1)');
  await page.locator('form').getByRole('button', { name: 'Add link' }).click();
  await expect(page.getByRole('alert').first()).toContainText('https://');
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Add links (each goes on top)
  await addLink(page, 'Third', 'https://example.com/third');
  await addLink(page, 'Second', 'example.com/second');
  await addLink(page, 'First', 'https://example.com/first');
  await addLink(page, 'Hidden one', 'https://secret.example.com/hidden');
  await addLink(page, 'Future one', 'https://secret.example.com/future');
  await addLink(page, 'Doomed', 'https://example.com/doomed');
  await saved(page);
  expect(await linkTitles(page)).toEqual(['Doomed', 'Future one', 'Hidden one', 'First', 'Second', 'Third']);

  // Delete, undo, delete again
  await page.getByRole('button', { name: 'Delete Doomed' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Delete Doomed' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Doomed' }).click();

  // Hide
  await page.getByRole('button', { name: 'Hide Hidden one' }).click();
  await expect(page.locator('[data-testid=link-row]', { hasText: 'Hidden one' }).getByText('Hidden', { exact: true })).toBeVisible();

  // Schedule for the future
  await page.locator('[data-testid=link-row]', { hasText: 'Future one' }).locator('button[aria-expanded]').click();
  const row = page.locator('[data-testid=link-row]', { hasText: 'Future one' });
  await row.getByLabel('Show from').fill('2099-01-01T09:00');
  await expect(row.getByText('Scheduled')).toBeVisible();
  // An end before the start is refused
  await row.getByLabel('Hide after').fill('2098-01-01T09:00');
  await expect(row.getByRole('alert')).toContainText('after the start');
  await row.locator('button[aria-expanded]').click();

  // Reorder with the keyboard: move "First" to the top
  const handle = page.getByRole('button', { name: 'Reorder First' });
  await handle.focus();
  await page.keyboard.press('Space');
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(250);
  }
  await page.keyboard.press('Space');
  await expect.poll(() => linkTitles(page)).toEqual(['First', 'Future one', 'Hidden one', 'Second', 'Third']);

  // On a phone, drag with a finger: move "Third" above "Second"
  if (isPhone) {
    const preview = page.getByRole('tab', { name: 'Preview' });
    const box = await preview.boundingBox();
    expect(box!.x + box!.width, 'Preview tab fits on screen').toBeLessThanOrEqual(390);

    const from = await page.getByRole('button', { name: 'Reorder Third' }).boundingBox();
    const to = await page.getByRole('button', { name: 'Reorder Second' }).boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: string, x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type: type as 'touchStart',
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }]
      });
    const x = from!.x + from!.width / 2;
    const startY = from!.y + from!.height / 2;
    await touch('touchStart', x, startY);
    for (let step = 1; step <= 10; step++) {
      await touch('touchMove', x, startY + ((to!.y + 4 - startY) * step) / 10);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(250);
    await touch('touchEnd', x, to!.y + 4);
    await expect.poll(() => linkTitles(page)).toEqual(['First', 'Future one', 'Hidden one', 'Third', 'Second']);
  }

  // Reorder by dragging: move "Third" above "Second"
  if (!isPhone) {
    const from = await page.getByRole('button', { name: 'Reorder Third' }).boundingBox();
    const to = await page.getByRole('button', { name: 'Reorder Second' }).boundingBox();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + from!.width / 2, from!.y - 10, { steps: 8 });
    await page.mouse.move(to!.x + to!.width / 2, to!.y + 4, { steps: 8 });
    await page.waitForTimeout(250);
    await page.mouse.up();
    await expect.poll(() => linkTitles(page)).toEqual(['First', 'Future one', 'Hidden one', 'Third', 'Second']);
  }
  await saved(page);

  // Leaving and coming back never brings stale data into the editor
  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  await page.getByRole('link', { name: 'Editor' }).hover();
  await page.getByRole('link', { name: 'Editor' }).click();
  await expect.poll(() => linkTitles(page)).toEqual(['First', 'Future one', 'Hidden one', 'Third', 'Second']);

  // Changes made right before leaving are saved on the way out
  await page.getByRole('button', { name: 'Show Hidden one' }).click();
  await page.getByRole('link', { name: 'Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  await page.getByRole('link', { name: 'Editor' }).click();
  await expect(page.getByRole('button', { name: 'Hide Hidden one' })).toBeVisible();
  await page.getByRole('button', { name: 'Hide Hidden one' }).click();
  await saved(page);

  // Profile and avatar
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Casey Rivers');
  await page.getByLabel('Bio').fill('Testing every button so you don’t have to.');
  const input = page.getByTestId('avatar-input');

  await input.setInputFiles({ name: 'evil.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg onload="alert(1)"/>') });
  await expect(page.getByRole('alert').first()).toContainText('JPG, PNG, or WebP');
  await input.setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await expect(page.getByRole('alert').first()).toContainText('under 5 MB');
  await input.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: 'Change photo' })).toBeVisible();
  const avatar = page.getByRole('img', { name: 'Your avatar' });
  await expect(avatar).toHaveAttribute('src', /^\/media\/avatars\//);
  await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await saved(page);

  // Social icon
  await page.getByLabel('Choose a social network').selectOption('instagram');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Instagram address').fill('https://example.com/casey');
  await saved(page);

  // Design
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('button', { name: /^Terminal/ }).click();
  await page.getByRole('button', { name: 'Filled' }).click();
  await page.getByRole('button', { name: 'Rounded' }).click();
  await page.getByRole('button', { name: 'Fraunces' }).click();
  await page.getByLabel('Accent color', { exact: true }).fill('#E2632B');
  await saved(page);
  await expectNoSideScroll(page, 'design tab');

  // Preview: beside the form on desktop, its own tab on a phone
  const liveTitles = ['First', 'Third', 'Second'];
  const phone = page.locator('#panel-preview .ll-phone');
  if (isPhone) {
    await expect(phone).toBeHidden();
    await page.getByRole('tab', { name: 'Preview' }).click();
    await expect(page.locator('#panel-design')).toBeHidden();
  } else {
    await expect(page.getByRole('tab', { name: 'Preview' })).toBeHidden();
  }
  await expect(phone).toBeVisible();
  await expect(phone.getByText('Casey Rivers')).toBeVisible();
  await expect(phone.locator('.ll-link')).toHaveText(liveTitles);
  await expectNoSideScroll(page, 'preview');

  // The public page, as an anonymous visitor arriving from Instagram
  const visitor = await newVisitor(browser, {
    userAgent: INSTAGRAM_UA,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const publicPage = await visitor.newPage();
  const response = await publicPage.goto(`/${username}`);
  expect(response!.status()).toBe(200);
  const html = await response!.text();
  await expect(publicPage.getByRole('heading', { name: 'Casey Rivers' })).toBeVisible();
  await expect(publicPage.locator('.ll-link')).toHaveText(liveTitles);
  await expect(publicPage).toHaveTitle(`Casey Rivers (@${username}) | Linkleaf`);
  await expectNoSideScroll(publicPage, 'public page');

  // Links that shouldn't be live never reach the browser
  expect(html).not.toContain('Hidden one');
  expect(html).not.toContain('Future one');
  expect(html).not.toContain('secret.example.com');

  // The avatar really loads for a stranger
  const publicAvatar = publicPage.locator('img.ll-avatar');
  await expect.poll(() => publicAvatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  // The share image includes this page
  const shareUrl = await publicPage.locator('meta[property="og:image"]').getAttribute('content');
  // No redirect: the fallback image would redirect, so this one was really drawn.
  const share = await visitor.request.get(shareUrl!, { maxRedirects: 0 });
  expect(share.status()).toBe(200);
  expect(share.headers()['content-type']).toBe('image/png');

  // Click through; the view beacon has told the links their source by now
  await expect.poll(() => publicPage.locator('.ll-link').first().getAttribute('href')).toContain('?s=instagram');
  const goUrl = (await publicPage.locator('.ll-link').first().getAttribute('href'))!;
  await publicPage.locator('.ll-link').first().click();
  await expect(publicPage).toHaveURL('https://example.com/first');
  await visitor.close();

  // Crawlers and link previews reach the destination but don't count
  const bot = await browser.newContext({ userAgent: 'facebookexternalhit/1.1', extraHTTPHeaders: { 'cf-connecting-ip': fakeIp() } });
  const botClick = await bot.request.get(goUrl, { maxRedirects: 0 });
  expect(botClick.status()).toBe(302);
  expect(botClick.headers().location).toBe('https://example.com/first');
  await bot.close();
  const peek = await newVisitor(browser, { userAgent: INSTAGRAM_UA });
  await peek.request.head(goUrl, { maxRedirects: 0 });
  await peek.request.get(goUrl, { maxRedirects: 0, headers: { 'sec-purpose': 'prefetch' } });
  await peek.close();

  // Analytics
  await page.goto('/dashboard/analytics');
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
  const tile = (label: string) => page.getByRole('group', { name: label }).getByTestId('stat-value');
  await expect(tile('Page views')).toHaveText('1');
  await expect(tile('Link clicks')).toHaveText('1');
  await expect(tile('Click-through rate')).toHaveText('100%');
  const topLinks = page.getByRole('heading', { name: 'Top links' }).locator('..').locator('..');
  await expect(topLinks.locator('li').first()).toContainText('First');
  await expect(topLinks.locator('li').first()).toContainText('1');
  await expect(topLinks).not.toContainText('NaN');
  await expect(page.getByRole('heading', { name: 'Top sources' }).locator('..').locator('..')).toContainText('Instagram');
  await expectNoSideScroll(page, 'analytics');

  await page.getByRole('link', { name: '30 days' }).click();
  await expect(page).toHaveURL(/range=30/);
  await expect(tile('Page views')).toHaveText('1');
  await page.getByText('Show as a table').click();
  await expect(page.locator('details tbody tr')).toHaveCount(30);

  // Turning off "Create your own" and unpublishing take effect for visitors
  await page.goto('/dashboard');
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /Create your own/ }).click();
  await saved(page);
  const second = await newVisitor(browser);
  const check = await second.newPage();
  await check.goto(`/${username}`);
  await expect(check.getByRole('heading', { name: 'Casey Rivers' })).toBeVisible();
  await expect(check.getByRole('link', { name: /Create your own/ })).toHaveCount(0);
  await expect(check.getByRole('link', { name: 'Report this page' })).toBeVisible();

  // Report this page
  await check.getByRole('link', { name: 'Report this page' }).click();
  await expect(check).toHaveURL(new RegExp(`/report/${username}`));
  await check.getByRole('radio', { name: 'Scam or phishing' }).check();
  await check.getByLabel('Anything else').fill('Automated test report.');
  await check.getByRole('button', { name: 'Send report' }).click();
  await expect(check.getByRole('heading', { name: 'Thanks for telling us' })).toBeVisible();

  await page.getByRole('switch', { name: 'Publish my page' }).click();
  await saved(page);
  const gone = await check.goto(`/${username}`);
  expect(gone!.status()).toBe(404);
  const sitemap = await (await check.request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain(username);
  await second.close();

  // Sign out, then back in with the password
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByRole('button', { name: 'Sign in with password' }).click();
  await page.locator('#password-email').fill(`casey-${id}@example.com`);
  await page.locator('#password').fill('correct-horse-battery');
  await page.locator('form').getByRole('button', { name: 'Sign in with password' }).click();
  await expect(page.getByRole('heading', { name: 'Your links' })).toBeVisible();
  // Everything was saved
  expect(await linkTitles(page)).toEqual(['First', 'Future one', 'Hidden one', 'Third', 'Second']);

  expect(errors).toEqual([]);
});

test('the server refuses what the browser would have blocked', async ({ page }) => {
  await page.goto('/sign-up');
  await signUp(page, `attacker-${unique()}@example.com`);
  await claim(page, `attacker-${unique()}`);
  await addLink(page, 'Mine', 'https://good.example.com/');
  await saved(page);

  const rewriteSaves = async (from: RegExp | string, to: string) => {
    await page.unroute('**/_serverFn/**').catch(() => {});
    await page.route('**/_serverFn/**', async (route) => {
      const body = route.request().postData();
      if (route.request().method() === 'POST' && body?.match(from)) {
        await route.continue({ postData: body.replace(from, to) });
      } else {
        await route.continue();
      }
    });
  };
  const edit = async (title: string) => {
    await page.locator('[data-testid=link-row] button[aria-expanded]').first().click();
    await page.locator('[data-testid=link-row]').first().getByLabel('Title').fill(title);
    await page.locator('[data-testid=link-row] button[aria-expanded]').first().click();
  };

  // javascript: and data: URLs, sent straight to the server
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi']) {
    await rewriteSaves('https://good.example.com/', bad);
    await edit(`Try ${bad.slice(0, 4)}`);
    await expect(page.getByRole('alert').filter({ hasText: /starts with https/ }).first()).toBeVisible();
  }

  // Overwriting someone else's link by its public ID
  await page.unroute('**/_serverFn/**');
  await page.reload();
  await expect(page.locator('[data-testid=link-row]')).toHaveCount(1);
  await page.route('**/_serverFn/**', async (route) => {
    const body = route.request().postData() ?? '';
    const stolen = body.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, 'example-juniper-vale-link-1');
    await route.continue(route.request().method() === 'POST' ? { postData: stolen } : undefined);
  });
  await edit('Hijack');
  await expect(page.getByRole('alert').filter({ hasText: 'your own links' }).first()).toBeVisible();

  const victim = await page.request.get('/juniper-vale');
  expect(await victim.text()).toContain('Shop the November kiln drop');
  expect(await victim.text()).not.toContain('Hijack');
});

test('the server judges uploads by their bytes and size', async ({ page }) => {
  await page.goto('/sign-up');
  await signUp(page, `uploader-${unique()}@example.com`);
  await claim(page, `uploader-${unique()}`);
  await page.getByRole('tab', { name: 'Profile' }).click();
  const input = page.getByTestId('avatar-input');

  // What the browser sends is altered after its own checks have passed.
  const JPEG_START = Buffer.from([0xff, 0xd8, 0xff]);
  await page.route('**/_serverFn/**', async (route) => {
    const body = route.request().postDataBuffer();
    const at = body?.indexOf(JPEG_START) ?? -1;
    if (body && at >= 0) {
      Buffer.from('<sv').copy(body, at);
      await route.continue({ postData: body });
    } else {
      await route.continue();
    }
  });
  await input.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('alert').first()).toContainText('JPG, PNG, or WebP');
  await page.unroute('**/_serverFn/**');

  await page.route('**/_serverFn/**', async (route) => {
    const body = route.request().postDataBuffer();
    const at = body?.indexOf(JPEG_START) ?? -1;
    if (body && at >= 0) {
      const padded = Buffer.concat([body.subarray(0, at), Buffer.alloc(5 * 1024 * 1024 + 10, 0xff), body.subarray(at)]);
      await route.continue({ postData: padded });
    } else {
      await route.continue();
    }
  });
  await input.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('alert').first()).toContainText('under 5 MB');
  await expect(page.getByRole('img', { name: 'Your avatar' })).toHaveCount(0);
});

test('sign-up is rate limited per visitor, and the form says so', async ({ browser }) => {
  const visitor = await newVisitor(browser);
  let status = 0;
  for (let i = 0; i < 17 && status !== 429; i++) {
    const response = await visitor.request.post('/api/auth/sign-up/email', {
      headers: { origin: 'http://127.0.0.1' },
      data: { name: 'x', email: `limit-${unique()}@example.com`, password: 'correct-horse-battery' }
    });
    status = response.status();
  }
  expect(status).toBe(429);

  const page = await visitor.newPage();
  await page.goto('/sign-up');
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();
  await page.getByLabel('Name', { exact: true }).fill('Blocked');
  await page.getByLabel('Email').fill(`limit-${unique()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery');
  await page.getByLabel('Confirm password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(/Too many attempts/)).toBeVisible();
  await visitor.close();
});

test('a draft doesn’t overwrite an existing page unless the owner says so', async ({ page }) => {
  await page.goto('/sign-up');
  await signUp(page, `owner-${unique()}@example.com`);
  await claim(page, `owner-${unique()}`);
  await addLink(page, 'Keep me', 'https://example.com/keep');
  await saved(page);

  await page.goto('/try');
  await page.waitForLoadState('networkidle');
  await addLink(page, 'From the draft', 'https://example.com/draft');
  await saved(page);

  await page.goto('/dashboard');
  await expect(page.getByText(/You have a draft from Try mode/)).toBeVisible();
  await expect(page.locator('[data-testid=link-row]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Replace my page' }).click();
  await expect(page.locator('[data-testid=link-row]').first()).toContainText('From the draft');
  await expect(page.getByText(/You have a draft from Try mode/)).toHaveCount(0);
  await expect(page.locator('[data-testid=link-row]')).toHaveCount(5);
});

test('an expired or hidden link falls back to the page instead of its destination', async ({ browser, page }) => {
  await page.goto('/sign-up');
  await signUp(page, `sched-${unique()}@example.com`);
  const username = `sched-${unique()}`;
  await claim(page, username);
  await addLink(page, 'Short lived', 'https://example.com/short');
  await saved(page);

  const visitor = await newVisitor(browser);
  const open = await visitor.newPage();
  await open.goto(`/${username}`);
  const href = await open.locator('.ll-link').first().getAttribute('href');
  expect(href).toMatch(/^\/go\//);
  // A stale tab can still hold this URL after the owner changes things.
  const goPath = href!.split('?')[0];
  expect((await visitor.request.get(goPath, { maxRedirects: 0 })).headers().location).toBe('https://example.com/short');

  const row = page.locator('[data-testid=link-row]').first();
  await row.locator('button[aria-expanded]').click();
  await row.getByLabel('Hide after').fill('2020-01-01T09:00');
  await expect(row.getByText('Ended')).toBeVisible();
  await saved(page);
  const after = await visitor.request.get(goPath, { maxRedirects: 0 });
  expect(after.status()).toBe(302);
  expect(after.headers().location).toMatch(new RegExp(`/${username}$`));
  await open.reload();
  await expect(open.locator('.ll-link')).toHaveCount(0);
  await expect(open.getByText('No links here right now')).toBeVisible();

  await row.getByRole('button', { name: 'Clear' }).click();
  await page.getByRole('button', { name: 'Hide Short lived' }).click();
  await saved(page);
  expect((await visitor.request.get(goPath, { maxRedirects: 0 })).headers().location).toMatch(new RegExp(`/${username}$`));
  await visitor.close();
});

test('signed-out visitors can’t reach the editor', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto('/dashboard/analytics');
  await expect(page).toHaveURL(/\/sign-in/);
});

test('rate limits: username checks stop, redirects keep working', async ({ browser }) => {
  const visitor = await newVisitor(browser);
  const page = await visitor.newPage();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const input = page.locator('#claim-hero');
  // Hammer the check through the app's own server function.
  let limited = false;
  for (let i = 0; i < 45 && !limited; i++) {
    await input.fill(`name-check-${i}`);
    const message = page.getByText(/lot of checks|is available/);
    await expect(message).toBeVisible();
    limited = (await message.textContent())?.includes('lot of checks') ?? false;
  }
  expect(limited).toBe(true);
  await visitor.close();

});

test('past the click limit, visitors still get through but stop being counted', async ({ browser, page }) => {
  await page.goto('/sign-up');
  await signUp(page, `limit-${unique()}@example.com`);
  const username = `limit-${unique()}`;
  await claim(page, username);
  await addLink(page, 'Popular', 'https://example.com/popular');
  await saved(page);

  const visitor = await newVisitor(browser, { userAgent: INSTAGRAM_UA });
  const open = await visitor.newPage();
  await open.goto(`/${username}`);
  const href = (await open.locator('.ll-link').first().getAttribute('href'))!.split('?')[0];
  for (let i = 0; i < 65; i++) {
    const response = await visitor.request.get(href, { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toBe('https://example.com/popular');
  }
  await visitor.close();

  await page.goto('/dashboard/analytics');
  const clicks = page.getByRole('group', { name: 'Link clicks' }).getByTestId('stat-value');
  await expect.poll(async () => {
    await page.reload();
    return clicks.textContent();
  }).toBe('60');
});

test('renaming moves the page to its new address', async ({ browser, page }) => {
  await page.goto('/sign-up');
  await signUp(page, `rename-${unique()}@example.com`);
  const before = `before-${unique()}`;
  const after = `after-${unique()}`;
  await claim(page, before);
  await page.getByRole('tab', { name: 'Settings' }).click();
  const field = page.getByLabel('Username');
  await field.fill('juniper-vale');
  await expect(page.getByText(/That name is taken/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Change username' })).toBeDisabled();
  await field.fill(after);
  await expect(page.getByText('That name is available.')).toBeVisible();
  await page.getByRole('button', { name: 'Change username' }).click();
  await expect(page.getByRole('button', { name: 'Change username' })).toHaveCount(0);

  const visitor = await newVisitor(browser);
  const open = await visitor.newPage();
  expect((await open.goto(`/${after}`))!.status()).toBe(200);
  expect((await open.goto(`/${before}`))!.status()).toBe(404);
  await visitor.close();
});

test('Try mode: edits stay in the browser and the draft survives sign-up', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/try');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Try mode: your changes save in this browser only.')).toBeVisible();
  await expect(page.locator('[data-testid=link-row]')).toHaveCount(4);
  await expectNoSideScroll(page, 'try');

  await addLink(page, 'My draft link', 'https://example.com/draft');
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Dana Draft');
  await page.getByTestId('avatar-input').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('img', { name: 'Your avatar' })).toHaveAttribute('src', /^data:image\/jpeg/);
  await page.getByRole('tab', { name: 'Design' }).click();
  await page.getByRole('button', { name: /^Atelier/ }).click();
  await saved(page);

  // Survives a reload
  await page.reload();
  await expect(page.locator('[data-testid=link-row]').first()).toContainText('My draft link');

  // Sample analytics, clearly labeled
  await page.getByRole('button', { name: 'Analytics' }).click();
  await expect(page.getByText(/Sample numbers/)).toBeVisible();
  await page.getByRole('button', { name: 'Editor' }).click();

  // Sign up and bring it along
  await page.getByRole('link', { name: /Sign up and keep this draft/ }).click();
  await expect(page.getByText(/Your draft from Try mode is safe/)).toBeVisible();
  const id = unique();
  await signUp(page, `dana-${id}@example.com`);
  await expect(page.getByText(/Your draft comes with you: 5 links/)).toBeVisible();
  await claim(page, `dana-${id}`);
  await expect(page.locator('[data-testid=link-row]')).toHaveCount(5);
  await expect(page.locator('[data-testid=link-row]').first()).toContainText('My draft link');

  const response = await page.request.get(`/dana-${id}`);
  const html = await response.text();
  expect(html).toContain('Dana Draft');
  expect(html).toContain('/media/avatars/');
  expect(html).toContain('My draft link');

  // The draft is gone from the browser now that it's safe on the server.
  expect(await page.evaluate(() => localStorage.getItem('linkleaf:draft:v1'))).toBeNull();
  expect(errors).toEqual([]);
});

for (const width of [320, 390, 768, 1280]) {
  test(`nothing scrolls sideways at ${width}px`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Width is set by this test.');
    const context = await newVisitor(browser, { viewport: { width, height: 800 } });
    const page = await context.newPage();
    for (const path of ['/', '/juniper-vale', '/bram-builds', '/try', '/sign-in', '/sign-up', '/report/juniper-vale', '/example-link', '/nobody-lives-here']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoSideScroll(page, `${path} at ${width}px`);
    }
    await context.close();
  });
}
