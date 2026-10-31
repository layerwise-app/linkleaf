import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { config } from '~/linkleaf.config';
import { normalizeUsername, usernameProblem } from '~/lib/usernames';

describe('usernames', () => {
  it('normalizes what people type', () => {
    expect(normalizeUsername('  @MayaBakes ')).toBe('mayabakes');
  });

  it.each(['abc', 'maya-bakes', 'maya_bakes', 'maya123', 'a'.repeat(30)])('accepts %s', (name) => {
    expect(usernameProblem(name)).toBeNull();
  });

  it.each([
    'ab',
    'a'.repeat(31),
    '-maya',
    'maya-',
    '_maya',
    'ma ya',
    'ma.ya',
    'ma/ya',
    'maya%2f',
    'máya',
    '../etc',
    '<script>'
  ])('rejects %s', (name) => {
    expect(usernameProblem(name)?.kind).toBe('invalid');
  });

  it.each([...config.reservedUsernames].filter((name) => name.length >= 3))('reserves %s', (name) => {
    expect(usernameProblem(name)?.kind).toBe('reserved');
  });
});

describe('reserved usernames cover the app', () => {
  const reserved = new Set<string>(config.reservedUsernames);

  it('includes the first segment of every route', () => {
    const tree = readFileSync('src/routeTree.gen.ts', 'utf8');
    const block = /interface FileRoutesByFullPath \{([\s\S]*?)\n\}/.exec(tree)?.[1];
    expect(block, 'route tree format changed').toBeTruthy();
    const segments = [...block!.matchAll(/^\s*'\/([^/'$]+)[^']*':/gm)].map(
      (match) => match[1].replace(/\.[a-z]+$/, '')
    );
    expect(segments.length).toBeGreaterThan(5);
    for (const segment of new Set(segments)) {
      expect(reserved.has(segment), `route /${segment} isn't reserved`).toBe(true);
    }
  });

  it('includes every top-level file and folder in public/', () => {
    for (const entry of readdirSync('public')) {
      const name = entry.replace(/\.[^.]+$/, '').toLowerCase();
      // Names with dots can't be usernames; folders and bare names could be.
      if (!entry.includes('.')) {
        expect(reserved.has(name), `public/${entry} isn't reserved`).toBe(true);
      }
    }
  });
});
