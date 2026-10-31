/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type * as React from 'react';
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary';
import { NotFound } from '~/components/NotFound';
import { site } from '~/lib/site';
import { config } from '~/linkleaf.config';
import { seo } from '~/utils/seo';
import '~/styles/app.css';

// The brand colors in `linkleaf.config.ts` drive the app's design tokens.
const { brand } = config;
const brandStyles = `:root:root{--background:${brand.background};--foreground:${brand.foreground};--card:${brand.card};--card-foreground:${brand.foreground};--popover:${brand.card};--popover-foreground:${brand.foreground};--primary:${brand.primary};--primary-foreground:${brand.primaryForeground};--secondary:${brand.muted};--secondary-foreground:${brand.foreground};--muted:${brand.muted};--muted-foreground:${brand.mutedForeground};--accent:${brand.muted};--accent-foreground:${brand.foreground};--destructive:${brand.destructive};--border:${brand.border};--input:${brand.border};--ring:${brand.ring};--highlight:${brand.highlight};--highlight-foreground:${brand.highlightForeground};--chart-1:${brand.chartViews};--chart-2:${brand.chartClicks};}`;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  // Site-wide defaults; each page's `seo()` overrides tags with the same name.
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover'
      },
      ...(site.googleSiteVerification
        ? [
            {
              name: 'google-site-verification',
              content: site.googleSiteVerification
            }
          ]
        : []),
      ...seo({ title: site.name, description: site.description }).meta
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' }
    ],
    styles: [{ children: brandStyles }]
  }),
  errorComponent: (props) => (
    <RootDocument>
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => <NotFound />,
  component: RootComponent
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
