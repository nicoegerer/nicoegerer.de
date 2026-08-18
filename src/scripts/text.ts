
import { zeigerEffekteAn, klemmen } from './basis';

function zerlegen(el: HTMLElement, art: 'zeichen' | 'wort') {
  const text = el.textContent ?? '';
  if (!text.trim()) return [];
  el.setAttribute('aria-label', text.trim());

  const stuecke: HTMLElement[] = [];

  const durchlaufen = (knoten: Node) => {
    for (const kind of [...knoten.childNodes]) {
      if (kind.nodeType === Node.TEXT_NODE) {
        const roh = kind.nodeValue ?? '';
        if (!roh.trim()) continue;
        const teile = art === 'zeichen' ? [...roh] : roh.split(/(\s+)/);
        const bruch = document.createDocumentFragment();
        for (const t of teile) {
          if (!t) continue;
          if (/^\s+$/.test(t)) { bruch.appendChild(document.createTextNode(t)); continue; }
          const s = document.createElement('span');
          s.className = art;
          s.textContent = t;
          bruch.appendChild(s);
          stuecke.push(s);
        }
        kind.parentNode?.replaceChild(bruch, kind);
      } else if (kind.nodeType === Node.ELEMENT_NODE) {
        const e = kind as HTMLElement;
        if (e.matches('.scramble, .zp, .kontur') || /^(svg|img|br)$/i.test(e.tagName)) continue;
        durchlaufen(e);
      }
    }
  };
  durchlaufen(el);

  for (const s of stuecke) s.setAttribute('aria-hidden', 'true');
  return stuecke;
}

const UEBERSCHRIFTEN = [
  '.section-heading', '.page-hero-title',
  '.hp-titel', '.proj-title', '.project-title', '.tl-title',
  '.wg-rolle', '.contact-info-title', '.profile-name',
  '.value-card h3', '.hobby-card h4', '.kn-block h3',
].join(',');

function automatischErfassen() {
  document.querySelectorAll<HTMLElement>(UEBERSCHRIFTEN).forEach(el => {
    if (el.dataset.buchstaben !== undefined || el.dataset.woerter !== undefined) return;
    if (el.closest('.kontur, .zp, .scramble')) return;
    if (el.querySelector('.kontur, .zp, .scramble')) return;
    const text = (el.textContent ?? '').trim();
    if (!text) return;
    if (text.length > 34) el.dataset.woerter = '';
    else el.dataset.buchstaben = '';
  });
}

export function textEffekteStarten() {
  automatischErfassen();

  const felder: { el: HTMLElement; art: 'zeichen' | 'wort' }[] = [
    ...[...document.querySelectorAll<HTMLElement>('[data-buchstaben]:not([data-buchstaben="aus"])')]
      .map(el => ({ el, art: 'zeichen' as const })),
    ...[...document.querySelectorAll<HTMLElement>('[data-woerter]:not([data-woerter="aus"])')]
      .map(el => ({ el, art: 'wort' as const })),
  ];

  for (const { el, art } of felder) {
    const stuecke = zerlegen(el, art);
    if (!stuecke.length || !zeigerEffekteAn()) continue;

    let kasten: { x: number; b: number }[] = [];
    const messen = () => {
      kasten = stuecke.map(s => {
        const r = s.getBoundingClientRect();
        return { x: r.left + r.width / 2, b: r.width };
      });
    };

    el.addEventListener('pointerenter', () => { messen(); el.classList.add('text-wach'); });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('text-wach');
      for (const s of stuecke) s.style.setProperty('--nah', '0');
    });
    el.addEventListener('pointermove', ev => {
      if (!kasten.length) return;
      const zx = (ev as PointerEvent).clientX;
      for (let i = 0; i < stuecke.length; i++) {
        const d = Math.abs(zx - kasten[i].x);
        const reichweite = Math.max(46, kasten[i].b * 3);
        const nah = klemmen(1 - d / reichweite);
        stuecke[i].style.setProperty('--nah', (nah * nah).toFixed(3));
      }
    }, { passive: true });
  }
}
