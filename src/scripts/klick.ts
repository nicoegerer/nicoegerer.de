// Druckwelle vom Beruehrungspunkt. Auf Touch die einzige Rueckmeldung,
// dass der Tipper angekommen ist.

import { wenigerBewegung } from './basis';

const AUSWAHL = [
  '.btn', '.filter-btn', '.kopieren', '.burger', '.modus',
  '.sidebar-link-main', '.sidebar-link-sub', '.hoch', '.galerie-pfeil',
].join(',');

export function klickEffekteStarten() {
  if (wenigerBewegung()) return;

  document.addEventListener('pointerdown', ev => {
    const ziel = (ev.target as Element | null)?.closest?.(AUSWAHL) as HTMLElement | null;
    if (!ziel || ziel.hasAttribute('disabled')) return;

    const r = ziel.getBoundingClientRect();
    const x = (ev as PointerEvent).clientX - r.left;
    const y = (ev as PointerEvent).clientY - r.top;
    // Radius bis in die entfernteste Ecke, damit die Welle die Flaeche fuellt
    const radius = Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));

    const welle = document.createElement('span');
    welle.className = 'welle';
    welle.setAttribute('aria-hidden', 'true');
    welle.style.left = x + 'px';
    welle.style.top = y + 'px';
    welle.style.width = welle.style.height = radius * 2 + 'px';
    ziel.appendChild(welle);

    // animationend bleibt aus, wenn der Tab in den Hintergrund geht
    const weg = () => welle.remove();
    welle.addEventListener('animationend', weg, { once: true });
    setTimeout(weg, 900);
  }, { passive: true });
}
