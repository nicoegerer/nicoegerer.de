// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://nicoegerer.de',

  // /profiles ist in /contact aufgegangen — alte Links sollen nicht ins Leere laufen.
  redirects: {
    '/profiles': '/contact',
  },

  // Links im Sichtfeld werden im Leerlauf vorgeladen — der Wechsel zwischen
  // den Seiten fuehlt sich dadurch sofort an.
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },

  experimental: {
    // Vorgeladene Seiten werden gleich mitgerendert, statt nur im Cache zu liegen.
    clientPrerender: true,
  },

  build: {
    // Kleine Stylesheets wandern in den Kopf, grosse bleiben eigene Dateien.
    inlineStylesheets: 'auto',
  },

  // Schriften liegen mitgebaut auf der eigenen Domain statt bei Google. Spart zwei
  // fremde Verbindungen und das blockierende Stylesheet im Kopf.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Manrope',
      cssVariable: '--schrift-text',
      weights: [300, 400, 500, 600, 700, 800],
      subsets: ['latin', 'latin-ext'],
    },
    {
      provider: fontProviders.google(),
      name: 'Playfair Display',
      cssVariable: '--schrift-titel',
      weights: [400, 500, 600],
      subsets: ['latin', 'latin-ext'],
    },
    {
      provider: fontProviders.google(),
      name: 'Dancing Script',
      cssVariable: '--schrift-hand',
      weights: [500, 700],
      subsets: ['latin', 'latin-ext'],
    },
  ],

  // React dient ausschliesslich den Insel-Komponenten in src/components/ui/.
  // Alles andere ist reines Astro mit handgeschriebenem CSS — bewusst kein
  // Tailwind: die Utilities der Komponenten liegen in deren .css-Dateien,
  // damit die Seite nur ein Styling-System hat.
  integrations: [react()],
});
