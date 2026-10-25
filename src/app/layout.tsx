import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Game Shelf — a home for every game',
  description:
    'Your private tabletop library. Catalog your games, find the right fit for your table, and make room for one more round.',
  applicationName: 'Game Shelf',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Game Shelf' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f5ef' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
