import { useEffect, useState } from 'react';
import {
  createFileRoute,
  Link,
  useHydrated,
  useNavigate
} from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '~/lib/auth-client';
import { loadDraft, saveWantedUsername } from '~/lib/draft';
import { Logo } from '~/components/brand/Logo';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { normalizeUsername, usernameProblem } from '~/lib/usernames';
import { seo } from '~/utils/seo';

type Search = { username?: string };

/** Only a name someone could actually claim gets carried through sign-up. */
function cleanUsername(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const username = normalizeUsername(value);
  return usernameProblem(username) ? undefined : username;
}

export const Route = createFileRoute('/sign-up')({
  validateSearch: (search: Record<string, unknown>): Search => ({
    username: cleanUsername(search.username)
  }),
  head: () => seo({ title: 'Create an account', noindex: true }),
  component: SignUpPage
});

function SignUpPage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMatch = password === confirmPassword;
  const { username } = Route.useSearch();
  const [hasDraft, setHasDraft] = useState(false);

  // The name and draft wait in this browser, so they survive however the
  // person ends up signing in.
  useEffect(() => {
    if (username) saveWantedUsername(username);
    setHasDraft(loadDraft() !== null);
  }, [username]);

  const signUp = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password
      });
      if (error) throw new Error(error.message ?? 'Failed to create account');
    },
    onSuccess: () => navigate({ to: '/dashboard' })
  });

  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4'>
      <Logo />
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            {username
              ? `Next, we’ll set you up with /${username}.`
              : 'Sign up with your email and password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasDraft ? (
            <p className='mb-4 rounded-lg bg-muted p-3 text-sm'>
              Your draft from Try mode is safe in this browser. It’ll be on your
              page as soon as you pick a username.
            </p>
          ) : null}
          <form
            method='post'
            className='flex flex-col gap-4'
            onSubmit={(event) => {
              event.preventDefault();
              if (!passwordsMatch) return;
              signUp.mutate();
            }}
          >
            <div className='flex flex-col gap-2'>
              <Label htmlFor='name'>Name</Label>
              <Input
                id='name'
                autoComplete='name'
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                autoComplete='email'
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                autoComplete='new-password'
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor='confirm-password'>Confirm password</Label>
              <Input
                id='confirm-password'
                type='password'
                autoComplete='new-password'
                minLength={8}
                required
                aria-invalid={confirmPassword ? !passwordsMatch : undefined}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              {confirmPassword && !passwordsMatch ? (
                <p className='text-sm text-destructive'>
                  Passwords do not match.
                </p>
              ) : null}
            </div>
            {signUp.error ? (
              <p className='text-sm text-destructive'>{signUp.error.message}</p>
            ) : null}
            <Button
              type='submit'
              disabled={!hydrated || !passwordsMatch || signUp.isPending}
            >
              {signUp.isPending ? 'Creating account…' : 'Create account'}
            </Button>
            <p className='text-center text-sm text-muted-foreground'>
              Already have an account?{' '}
              <Link to='/sign-in' className='underline'>
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
