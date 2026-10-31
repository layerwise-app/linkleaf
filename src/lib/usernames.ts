import { config } from '~/linkleaf.config';

const { usernameMin, usernameMax } = config.limits;
const USERNAME = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
const RESERVED: ReadonlySet<string> = new Set(config.reservedUsernames);

export type UsernameProblem = { kind: 'invalid' | 'reserved'; message: string };

export const normalizeUsername = (raw: string) =>
  raw.trim().replace(/^@/, '').toLowerCase();

/** Format and reserved-word rules. Whether it's taken needs the database. */
export function usernameProblem(username: string): UsernameProblem | null {
  if (username.length < usernameMin) {
    return {
      kind: 'invalid',
      message: `Use at least ${usernameMin} characters.`
    };
  }
  if (username.length > usernameMax) {
    return {
      kind: 'invalid',
      message: `Use ${usernameMax} characters or fewer.`
    };
  }
  if (!USERNAME.test(username)) {
    return {
      kind: 'invalid',
      message:
        'Use lowercase letters, numbers, hyphens, and underscores. Start and end with a letter or number.'
    };
  }
  if (RESERVED.has(username)) {
    return { kind: 'reserved', message: 'That name is reserved. Try another.' };
  }
  return null;
}

/** Whether a path segment could be someone's page at all. */
export const couldBeUsername = (segment: string) =>
  usernameProblem(normalizeUsername(segment)) === null;
