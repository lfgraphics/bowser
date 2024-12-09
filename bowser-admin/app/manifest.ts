import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ITPL Deisel Control System',
    short_name: 'ITPL DCS Admin',
    description: 'A Progressive Web App for managing wechicles fuel allocation',
    start_url: '/',
    display: 'standalone',
    background_color: '#00000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}