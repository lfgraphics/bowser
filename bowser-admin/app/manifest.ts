import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ITPL Deisel Control System',
    short_name: 'ITPL DCS Admin',
    description: 'A Progressive Web App for managing wechicles fuel allocation',
    start_url: '/',
    display: 'standalone',
    background_color: '#0000',
    theme_color: '#000000',
    id: "https://itpl-bowser-admin.vercel.app",
    orientation: "portrait-primary",
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
    screenshots: [
      {
        src: "/screenshots/allocation-page.png",
        sizes: "503x921",
        type: "image/png",
        label: "Home screen showing main form for allcating fueling orders to the bowsers"
      },
      {
        src: "/screenshots/dispense-records.png",
        sizes: "1885x833",
        type: "image/png",
        form_factor: "wide",
        label: "Dispense recors screen showing the list of dispense/fueling records by the bowsers"
      },
      {
        src: "/screenshots/navigation-menu.png",
        sizes: "244x529",
        type: "image/png",
        label: "Navigation menu showing navigations of the app"
      }
    ],
    shortcuts: [
      {
        name: "Allocation",
        url: "/dashboard",
        "icons": [
          {
            "src": "/shortcuts/allocation.png",
            "sizes": "512x512"
          }
        ]
      },
      {
        name: "Dispense Records",
        url: "/dispense-records",
        "icons": [
          {
            "src": "/shortcuts/dispense.png",
            "sizes": "512x512"
          }
        ]
      },
      {
        name: "Trip Sheets",
        url: "/tripsheets",
        "icons": [
          {
            "src": "/shortcuts/sheets.png",
            "sizes": "512x512"
          }
        ]
      },
    ]
  }
}