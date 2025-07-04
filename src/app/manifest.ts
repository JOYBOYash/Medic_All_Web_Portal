
import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MedicAll',
    short_name: 'medic-all',
    description: 'Unified Medical Record and Patieent management System',
    start_url: '/',
    display: 'standalone',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}