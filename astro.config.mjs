// @ts-check
import { defineConfig } from 'astro/config';

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

  build: {
    // Kleine Stylesheets wandern in den Kopf, grosse bleiben eigene Dateien.
    inlineStylesheets: 'auto',
  },

  // React dient ausschliesslich den Insel-Komponenten in src/components/ui/.
  // Alles andere ist reines Astro mit handgeschriebenem CSS — bewusst kein
  // Tailwind: die Utilities der Komponenten liegen in deren .css-Dateien,
  // damit die Seite nur ein Styling-System hat.
  integrations: [react()],
});
