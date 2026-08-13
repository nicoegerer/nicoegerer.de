// Zeiger-Effekte, gesteuert ueber Datenattribute im Markup:
//   data-magnet[="12"]  Element zieht zum Zeiger
//   data-neigen[="5"]   3D-Neigung ueber der Flaeche
//   data-glanz          Lichtfleck folgt dem Zeiger (--gx/--gy/--glanz)
//   data-naehe          --naehe 0..1 je nach Abstand
// Laeuft komplett ueber die Schleife aus basis.ts.

import {
  zeiger, anmelden, rechteckVon, rechteckBeobachten, rechteckVergessen,
  zeigerEffekteAn, klemmen, naehern, weich, starten,
} from './basis';

interface Stueck {
  el: HTMLElement;
  art: 'magnet' | 'neigen' | 'glanz' | 'naehe';
  staerke: number;
  // a/b/c sind die aktuellen Werte, zielA/B/C die angepeilten
  a: number; b: number; c: number;
  zielA: number; zielB: number; zielC: number;
  drin: boolean;
}

const stuecke: Stueck[] = [];

// Abstand in px, ab dem ein magnetisches Element reagiert
const FANG = 90;

// eigene Ebene statt ::before/::after — die sind an den Karten schon belegt
function glanzEbene(el: HTMLElement) {
  if (el.querySelector(':scope > .glanz-schicht')) return;
  const s = document.createElement('span');
  s.className = 'glanz-schicht';
  s.setAttribute('aria-hidden', 'true');
  el.prepend(s);
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
}

function anlegen(el: HTMLElement, art: Stueck['art'], vorgabe: number) {
  if (art === 'glanz') glanzEbene(el);
  const roh = el.dataset[art];
  const staerke = roh && !Number.isNaN(parseFloat(roh)) ? parseFloat(roh) : vorgabe;
  rechteckBeobachten(el);
  stuecke.push({
    el, art, staerke,
    a: 0, b: 0, c: 0, zielA: 0, zielB: 0, zielC: 0, drin: false,
  });
}

function schritt(): boolean {
  let weiter = false;
  const zx = zeiger.x, zy = zeiger.y, da = zeiger.da;

  // lesen
  for (const s of stuecke) {
    const r = rechteckVon(s.el);
    if (r.bottom < -200 || r.top > innerHeight + 200) {
      s.zielA = s.zielB = s.zielC = 0;
      s.drin = false;
      continue;
    }
    const mx = r.left + r.width / 2;
    const my = r.top + r.height / 2;

    if (!da) { s.zielA = s.zielB = s.zielC = 0; s.drin = false; continue; }

    if (s.art === 'magnet') {
      const dx = zx - mx, dy = zy - my;
      // Fangbereich waechst mit dem Element, sonst reagieren breite Buttons zu spaet
      const nx = dx / (r.width / 2 + FANG);
      const ny = dy / (r.height / 2 + FANG);
      const d = Math.hypot(nx, ny);
      if (d < 1) {
        const kraft = weich(1 - d);
        s.zielA = klemmen(dx * 0.32, -s.staerke, s.staerke) * kraft;
        s.zielB = klemmen(dy * 0.32, -s.staerke, s.staerke) * kraft;
        s.zielC = kraft;
        s.drin = true;
      } else {
        s.zielA = s.zielB = s.zielC = 0;
        s.drin = false;
      }
    } else {
      const innen = zx >= r.left && zx <= r.right && zy >= r.top && zy <= r.bottom;
      const px = klemmen((zx - r.left) / (r.width || 1));
      const py = klemmen((zy - r.top) / (r.height || 1));

      if (s.art === 'neigen') {
        s.drin = innen;
        s.zielA = innen ? (py - 0.5) * -2 * s.staerke : 0;
        s.zielB = innen ? (px - 0.5) *  2 * s.staerke : 0;
        s.zielC = innen ? 1 : 0;
      } else if (s.art === 'glanz') {
        // Position stehen lassen und nur ausblenden, sonst springt der Fleck
        if (innen) { s.zielA = px * 100; s.zielB = py * 100; }
        s.zielC = innen ? 1 : 0;
        s.drin = innen;
      } else {
        const dx = zx - mx, dy = zy - my;
        const d = Math.hypot(dx / (r.width / 2 + 160), dy / (r.height / 2 + 160));
        s.zielC = d < 1 ? weich(1 - d) : 0;
        s.drin = s.zielC > 0;
      }
    }
  }

  // schreiben
  for (const s of stuecke) {
    const t = s.drin ? 0.18 : 0.12;
    s.a = naehern(s.a, s.zielA, t);
    s.b = naehern(s.b, s.zielB, t);
    s.c = naehern(s.c, s.zielC, t);

    if (Math.abs(s.a - s.zielA) > 0.01
     || Math.abs(s.b - s.zielB) > 0.01
     || Math.abs(s.c - s.zielC) > 0.004) weiter = true;

    const st = s.el.style;
    if (s.art === 'magnet') {
      st.setProperty('--mx', s.a.toFixed(2) + 'px');
      st.setProperty('--my', s.b.toFixed(2) + 'px');
      st.setProperty('--naehe', s.c.toFixed(3));
    } else if (s.art === 'neigen') {
      st.setProperty('--kippx', s.a.toFixed(2) + 'deg');
      st.setProperty('--kippy', s.b.toFixed(2) + 'deg');
      st.setProperty('--naehe', s.c.toFixed(3));
      // einheitenlos fuer den Schatten in CSS, Vorzeichen entgegen der Neigung
      const n = s.staerke || 1;
      st.setProperty('--sx', (-s.b / n).toFixed(3));
      st.setProperty('--sy', ( s.a / n).toFixed(3));
    } else if (s.art === 'glanz') {
      st.setProperty('--gx', s.a.toFixed(1) + '%');
      st.setProperty('--gy', s.b.toFixed(1) + '%');
      st.setProperty('--glanz', s.c.toFixed(3));
    } else {
      st.setProperty('--naehe', s.c.toFixed(3));
    }
  }
  return weiter;
}

// nachtraeglich eingefuegte Elemente aufnehmen
export function zeigerEffekteErfassen(wurzel: ParentNode = document) {
  if (!zeigerEffekteAn()) return;
  const nimm = (wahl: string, art: Stueck['art'], vorgabe: number) => {
    wurzel.querySelectorAll<HTMLElement>(wahl).forEach(el => {
      if (stuecke.some(s => s.el === el && s.art === art)) return;
      anlegen(el, art, vorgabe);
    });
  };
  nimm('[data-magnet]', 'magnet', 12);
  nimm('[data-neigen]', 'neigen', 5);
  nimm('[data-glanz]',  'glanz',  0);
  nimm('[data-naehe]',  'naehe',  0);
  starten();
}

export function zeigerEffekteStarten() {
  if (!zeigerEffekteAn()) return;
  zeigerEffekteErfassen(document);
  if (!stuecke.length) return;
  anmelden(schritt);
  document.documentElement.classList.add('zeiger-fein');
}

export function zeigerEffektLoesen(el: HTMLElement) {
  for (let i = stuecke.length - 1; i >= 0; i--) {
    if (stuecke[i].el === el) stuecke.splice(i, 1);
  }
  rechteckVergessen(el);
}
