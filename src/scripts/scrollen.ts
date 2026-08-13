// Scroll-Effekte ueber Datenattribute:
//   data-parallax="0.18"   Element wandert langsamer als die Seite
//   data-auf="maske"       Aufdecken: maske|schieben|skalieren|unschaerfe|kippen|seite
//   data-auf-verzug="120"  Verzoegerung in ms
//   data-staffel           Kinder nacheinander aufdecken
//   data-zaehler="1240"    Zahl zaehlt beim Erscheinen hoch
//
// Kein IntersectionObserver: der feuert in gedrosselten Tabs nicht und
// der Inhalt bliebe unsichtbar. Stattdessen Scroll-Event plus ein
// synchroner Durchlauf beim Laden.

import {
  anmelden, klemmen, rechteckeVerwerfen, starten, wenigerBewegung, selbstheilung,
} from './basis';

interface Aufdecker { el: HTMLElement; verzug: number; offen: boolean; klasse: string; }
const aufdecker: Aufdecker[] = [];

function aufdeckenPruefen() {
  const h = window.innerHeight;
  for (const a of aufdecker) {
    if (a.offen) continue;
    const r = a.el.getBoundingClientRect();
    if (r.top >= h * 0.88 || r.bottom <= 0) continue;
    a.offen = true;
    if (a.verzug) setTimeout(() => a.el.classList.add(a.klasse), a.verzug);
    else a.el.classList.add(a.klasse);
    zaehlerStarten(a.el);
  }
}

// exportiert, weil das Hoehenprofil seine Zahlen erst startet,
// wenn die gezeichnete Linie die Marke erreicht
export function zaehlerStarten(wurzel: HTMLElement) {
  const felder = wurzel.matches('[data-zaehler]')
    ? [wurzel]
    : [...wurzel.querySelectorAll<HTMLElement>('[data-zaehler]')];

  for (const f of felder) {
    if (f.dataset.gezaehlt) continue;
    f.dataset.gezaehlt = 'ja';
    const ziel = parseFloat(f.dataset.zaehler || '0');
    const nachkomma = (f.dataset.zaehler || '').includes('.') ? 1 : 0;
    const anhang = f.dataset.zaehlerAnhang || '';
    if (wenigerBewegung()) { f.textContent = ziel.toFixed(nachkomma) + anhang; continue; }

    const dauer = 1100;
    const start = performance.now();
    const lauf = () => {
      const t = klemmen((performance.now() - start) / dauer);
      const e = 1 - Math.pow(1 - t, 3);
      f.textContent = (ziel * e).toFixed(nachkomma) + anhang;
      if (t < 1) requestAnimationFrame(lauf);
      else f.textContent = ziel.toFixed(nachkomma) + anhang;
    };
    requestAnimationFrame(lauf);
    // falls keine Frames kommen, steht der Endwert trotzdem
    setTimeout(() => { if (!f.textContent) f.textContent = ziel.toFixed(nachkomma) + anhang; }, dauer + 400);
  }
}

interface Schicht { el: HTMLElement; faktor: number; }
const schichten: Schicht[] = [];

function parallaxeSchritt() {
  const h = window.innerHeight;
  for (const s of schichten) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -300 || r.top > h + 300) continue;
    // 0 in der Bildmitte, ±1 an den Raendern
    const mitte = (r.top + r.height / 2 - h / 2) / h;
    s.el.style.setProperty('--py', (mitte * s.faktor * -100).toFixed(2) + 'px');
  }
}

let letzteHoehe = 0;
let versteckt = false;

function kopfUndFortschritt() {
  const y = window.scrollY;
  const gesamt = document.documentElement.scrollHeight - window.innerHeight;
  const anteil = gesamt > 0 ? klemmen(y / gesamt) : 0;
  document.documentElement.style.setProperty('--scroll-fortschritt', anteil.toFixed(4));

  const nav = document.getElementById('nav');
  if (!nav) return;

  // beim Runterscrollen ausblenden, beim Hochscrollen sofort zurueck
  const menueOffen = document.getElementById('sidebar')?.classList.contains('open');
  const runter = y > letzteHoehe;
  if (Math.abs(y - letzteHoehe) > 6 && !menueOffen) {
    if (runter && y > 240 && !versteckt) { versteckt = true; nav.classList.add('nav-weg'); }
    else if (!runter && versteckt)       { versteckt = false; nav.classList.remove('nav-weg'); }
  }
  if (y <= 240 && versteckt) { versteckt = false; nav.classList.remove('nav-weg'); }
  letzteHoehe = y;
}

let gebuendelt = false;
let seit = 0;

function beiScroll() {
  const jetzt = performance.now();
  if (gebuendelt) {
    if (jetzt - seit > 150) { gebuendelt = false; zeichnen(); }
    return;
  }
  gebuendelt = true;
  seit = jetzt;
  requestAnimationFrame(zeichnen);
}

function zeichnen() {
  gebuendelt = false;
  kopfUndFortschritt();
  aufdeckenPruefen();
  parallaxeSchritt();
  selbstheilung();
}

export function scrollEffekteStarten() {
  // Gruppen zuerst: die setzen data-auf an ihren Kindern
  document.querySelectorAll<HTMLElement>('[data-staffel]').forEach(gruppe => {
    const art = gruppe.dataset.staffel || 'schieben';
    const schritt = parseInt(gruppe.dataset.staffelSchritt || '90', 10);
    [...gruppe.children].forEach((kind, i) => {
      const k = kind as HTMLElement;
      if (k.dataset.auf) return;
      k.dataset.auf = art;
      k.dataset.aufVerzug = String(i * schritt);
    });
  });

  document.querySelectorAll<HTMLElement>('[data-auf]').forEach(el => {
    aufdecker.push({
      el,
      verzug: parseInt(el.dataset.aufVerzug || '0', 10) || 0,
      offen: false,
      klasse: 'auf-sichtbar',
    });
  });

  // aeltere Aufdeck-Mechanik mit eigenen Klassennamen
  document.querySelectorAll<HTMLElement>('.section-heading, .page-hero-title')
    .forEach(el => aufdecker.push({ el, verzug: 0, offen: false, klasse: 'aufgedeckt' }));
  document.querySelectorAll<HTMLElement>('.reveal')
    .forEach(el => aufdecker.push({ el, verzug: 0, offen: false, klasse: 'visible' }));

  if (!wenigerBewegung()) {
    document.querySelectorAll<HTMLElement>('[data-parallax]').forEach(el => {
      schichten.push({ el, faktor: parseFloat(el.dataset.parallax || '0.15') || 0.15 });
    });
  }

  window.addEventListener('scroll', beiScroll, { passive: true });
  window.addEventListener('resize', () => { rechteckeVerwerfen(); beiScroll(); });

  // synchron, damit sichtbarer Inhalt auch ohne Frames aufgedeckt wird
  zeichnen();
  window.addEventListener('load', () => { rechteckeVerwerfen(); zeichnen(); });
  setTimeout(zeichnen, 300);

  anmelden(() => { parallaxeSchritt(); return false; });
  starten();
}
