import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Game Shelf — Your tabletop library',
    short_name: 'Game Shelf',
    description: 'A private home for your physical board game collection.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f5ef',
    theme_color: '#f7f5ef',
    lang: 'en',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
