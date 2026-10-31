import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Toaster } from '~/components/ui/sonner';
import { getAuthSession } from '~/lib/auth.functions';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getAuthSession();
    if (!session) throw redirect({ to: '/sign-in' });
    return { user: session.user };
  },
  head: () => seo({ title: 'Your page', noindex: true }),
  component: DashboardLayout
});

function DashboardLayout() {
  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <Outlet />
      <Toaster position='bottom-center' />
    </div>
  );
}
