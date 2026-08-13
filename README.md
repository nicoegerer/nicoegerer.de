# nicoegerer.de

Persönliche Website — Astro 5, statisch gebaut, ohne CSS-Framework.

## Entwickeln

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # nach dist/
npm run preview  # gebaute Seite ansehen
```

## Aufbau

```
src/
  pages/       eine Datei pro Route
  layouts/     MainLayout: Kopf, Nav, Footer, globale Skripte
  components/  Astro-Komponenten; ui/ enthält die React-Inseln
  scripts/     Zeiger-, Scroll- und Texteffekte (ein rAF-Loop für alles)
  styles/      global.css mit allen Farb- und Abstandsvariablen
  assets/      Fotos, die Astro optimiert (galerie/ füllt den Bilderfächer)
public/        Dateien, die unverändert ausgeliefert werden
```

Nur drei Komponenten laufen im Browser als Insel: der Bilderfächer
(`client:visible`), die Bergszene (`client:media`, damit Three.js gar nicht
erst aufs Handy kommt) und das Codefeld auf der Projektseite.

### Bilder

Alles unter `src/assets` läuft durch Astros `<Image />` bzw. `getImage()` und
wird beim Bauen in mehrere Breiten als WebP gerendert. Für die Galerie reicht
es, eine Datei nach `src/assets/galerie/` zu legen — `FaecherGalerie.astro`
liest den Ordner selbst aus und sortiert nach der Zahl im Dateinamen.
Bildbeschreibungen stehen dort in `texte`.

### Bewegung

Alle Effekte respektieren `prefers-reduced-motion`. Der Ring um den Mauszeiger
ist standardmäßig aus und lässt sich in der Seitenleiste einschalten
(gespeichert unter `zeigerring` im localStorage).

## Veröffentlichen

Ein Push auf `main` baut die Seite und legt sie über
`.github/workflows/deploy.yml` auf GitHub Pages ab. Die Domain steht in
`public/CNAME`.
