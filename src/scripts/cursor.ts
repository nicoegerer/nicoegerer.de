
import { zeiger, anmelden, zeigerEffekteAn, naehern, starten } from './basis';

const SCHLUESSEL = 'zeigerring';

export function ringAn(): boolean {
  try { return localStorage.getItem(SCHLUESSEL) === 'an'; }
  catch { return false; }
}

export function ringUmschalten(): boolean {
  const neu = !ringAn();
  try { localStorage.setItem(SCHLUESSEL, neu ? 'an' : 'aus'); } catch {}
  ringAnwenden();
  return neu;
}

export function ringAnwenden() {
  document.documentElement.classList.toggle('ohne-zeigerring', !ringAn());
  if (ringAn()) cursorStarten();
}

export function cursorStarten() {
  if (!zeigerEffekteAn()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (!ringAn()) return;
  if (document.querySelector('.zeiger-huelle')) return;

  const huelle = document.createElement('div');
  huelle.className = 'zeiger-huelle';
  huelle.setAttribute('aria-hidden', 'true');
  huelle.innerHTML = '<span class="zeiger-ring"></span><span class="zeiger-punkt"></span>';
  document.body.appendChild(huelle);

  const ring  = huelle.querySelector('.zeiger-ring')  as HTMLElement;
  const punkt = huelle.querySelector('.zeiger-punkt') as HTMLElement;

  let rx = -100, ry = -100, px = -100, py = -100;
  let sichtbar = false;

  anmelden(() => {
    if (!zeiger.da) {
      if (sichtbar) { sichtbar = false; huelle.classList.remove('an'); }
      return false;
    }
    if (!sichtbar) {
      sichtbar = true;
      huelle.classList.add('an');
      rx = px = zeiger.x; ry = py = zeiger.y;
    }
    px = zeiger.x; py = zeiger.y;
    rx = naehern(rx, zeiger.x, 0.19);
    ry = naehern(ry, zeiger.y, 0.19);

    punkt.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    ring.style.transform  = `translate3d(${rx}px, ${ry}px, 0)`;

    return Math.abs(rx - px) > 0.3 || Math.abs(ry - py) > 0.3;
  });

  const zustaende: [string, string][] = [
    ['img, .proj-img, .galerie-bild, [data-zeiger="bild"]', 'bild'],
    ['button, .btn, .filter-btn, .burger, .modus, [data-zeiger="knopf"]', 'knopf'],
    ['a, [data-zeiger="link"]', 'link'],
    ['input, textarea, [data-zeiger="text"]', 'text'],
  ];

  document.addEventListener('pointerover', ev => {
    const z = ev.target as Element | null;
    if (!z || !z.closest) return;
    let neu = '';
    for (const [wahl, name] of zustaende) {
      if (z.closest(wahl)) { neu = name; break; }
    }
    huelle.dataset.zustand = neu;
  }, { passive: true });

  document.addEventListener('pointerdown', () => huelle.classList.add('druck'), { passive: true });
  document.addEventListener('pointerup',   () => huelle.classList.remove('druck'), { passive: true });

  starten();
}
