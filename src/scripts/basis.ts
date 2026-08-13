// Gemeinsame Basis fuer alle Zeiger- und Scroll-Effekte:
// ein pointermove-Listener, eine Frame-Schleife, ein Rect-Cache.
// Effekte lesen im Frame erst alle Werte und schreiben danach.

const mFein  = window.matchMedia('(hover: hover) and (pointer: fine)');
const mSanft = window.matchMedia('(prefers-reduced-motion: reduce)');

export const feinerZeiger = () => mFein.matches;
export const wenigerBewegung = () => mSanft.matches;
export const zeigerEffekteAn = () => mFein.matches && !mSanft.matches;

export function beiUmgebungswechsel(fn: () => void) {
  mFein.addEventListener?.('change', fn);
  mSanft.addEventListener?.('change', fn);
}

export const zeiger = { x: -9999, y: -9999, da: false };

// Rueckgabe true = Aufgabe braucht weitere Frames
type Aufgabe = () => boolean;

const aufgaben = new Set<Aufgabe>();
let laeuft = false;
let letzterLauf = 0;

function schleife() {
  laeuft = false;
  letzterLauf = performance.now();
  if (rechteckeAlt) neuVermessen();

  let weiter = false;
  for (const a of aufgaben) {
    try { if (a()) weiter = true; }
    catch { /* ein kaputter Effekt darf die anderen nicht stoppen */ }
  }
  if (weiter) starten();
}

export function starten() {
  if (laeuft) return;
  laeuft = true;
  requestAnimationFrame(schleife);
}

export function anmelden(a: Aufgabe) { aufgaben.add(a); starten(); }
export function abmelden(a: Aufgabe) { aufgaben.delete(a); }

// Fallback fuer Tabs, in denen requestAnimationFrame nicht feuert
export function selbstheilung(grenze = 400) {
  const jetzt = performance.now();
  if (laeuft && jetzt - letzterLauf > grenze) { laeuft = false; schleife(); }
}

const gemessen = new Map<Element, DOMRect>();
let rechteckeAlt = true;

export function rechteckeVerwerfen() { rechteckeAlt = true; }

// alle Rects am Stueck lesen, damit nur ein Layout entsteht
function neuVermessen() {
  for (const el of gemessen.keys()) gemessen.set(el, el.getBoundingClientRect());
  rechteckeAlt = false;
}

export function rechteckVon(el: Element): DOMRect {
  let r = gemessen.get(el);
  if (!r || rechteckeAlt) {
    r = el.getBoundingClientRect();
    gemessen.set(el, r);
  }
  return r;
}

export function rechteckBeobachten(el: Element) {
  if (!gemessen.has(el)) gemessen.set(el, el.getBoundingClientRect());
}

export function rechteckVergessen(el: Element) { gemessen.delete(el); }

export const klemmen = (v: number, min = 0, max = 1) => v < min ? min : v > max ? max : v;
export const naehern = (ist: number, ziel: number, anteil: number) => ist + (ziel - ist) * anteil;
export const weich = (t: number) => t * t * (3 - 2 * t);

let bereit = false;

export function fundamentStarten() {
  if (bereit) return;
  bereit = true;

  window.addEventListener('pointermove', ev => {
    zeiger.x = ev.clientX;
    zeiger.y = ev.clientY;
    zeiger.da = true;
    starten();
    selbstheilung(120);
  }, { passive: true });

  window.addEventListener('pointerdown', ev => {
    zeiger.x = ev.clientX;
    zeiger.y = ev.clientY;
    zeiger.da = true;
    starten();
  }, { passive: true });

  document.addEventListener('pointerleave', () => { zeiger.da = false; starten(); });

  const verwerfen = () => { rechteckeVerwerfen(); starten(); };
  window.addEventListener('scroll', verwerfen, { passive: true });
  window.addEventListener('resize', verwerfen);

  // Schriften laden nach und verschieben das Layout
  (document as any).fonts?.ready?.then?.(verwerfen);
}
