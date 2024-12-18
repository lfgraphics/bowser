import type { MetadataRoute } from 'next'

type ExtendedIcon = {
  src: string;
  sizes: string;
  type?: string;
  form_factor?: string;
  label?: string;
};

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ITPL Deisel Control System',
    short_name: 'ITPL DCS Admin',
    description: 'A Progressive Web App for managing wechicles fuel allocation',
    start_url: '/',
    scope: '/',
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
        sizes: "1080x1920",
        type: "image/png",
        label: "Home screen showing main form for allcating fueling orders to the bowsers"
      } as ExtendedIcon,
      {
        src: "/screenshots/dispenses_phone.png",
        sizes: "1080x1920",
        type: "image/png",
        label: "Dispense recors screen showing the list of dispense/fueling records by the bowsers"
      },
      {
        src: "/screenshots/tripsheets_phone.png",
        sizes: "1080x1920",
        type: "image/png",
        label: "Trips sheets screen showing all time created trips of bowsers"
      },
      {
        src: "/screenshots/tripsheet.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Trips sheets screen showing all time created trips of bowsers"
      },
      {
        src: "/screenshots/desktop-allocation.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Allocation screen to allocate/order fueling requirments"
      },
      {
        src: "/screenshots/dispense-records.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "Dispense recors screen showing the list of dispense/fueling records by the bowsers"
      },
      {
        src: "/screenshots/navigation-menu.png",
        sizes: "1080x1920",
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
            "sizes": "1024x1024"
          }
        ]
      },
      {
        name: "Dispenses",
        url: "/dispense-records",
        "icons": [
          {
            "src": "/shortcuts/dispense.png",
            "sizes": "1024x1024"
          }
        ]
      },
      {
        name: "Trip Sheets",
        url: "/tripsheets",
        "icons": [
          {
            "src": "/shortcuts/sheets.png",
            "sizes": "1024x1024"
          }
        ]
      },
    ],
    prefer_related_applications: true,
    related_applications: [
      {
        platform: "webapp",
        url: "https://itpl-bowser-admin.vercel.app/manifest.json"
      }
    ]
  }
}