import { useEffect, useRef } from "react";
import "./code-feld.css";

const ZEICHEN = "{}[]()<>/+-=*;:_|&%$#@!?01".split("");

export interface CodeFeldProps {
  raster?: number;
  radius?: number;
}

export default function CodeFeld({ raster = 26, radius = 150 }: CodeFeldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sanft = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const grob = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (sanft || grob) return;

    let breite = 0, hoehe = 0, dpr = 1;
    let spalten = 0, zeilen = 0;
    let zellen: string[] = [];
    let zx = -9999, zy = -9999;
    let offen = false;

    const messen = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      breite = r.width; hoehe = r.height;
      canvas.width = Math.round(breite * dpr);
      canvas.height = Math.round(hoehe * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spalten = Math.ceil(breite / raster);
      zeilen = Math.ceil(hoehe / raster);
      zellen = Array.from({ length: spalten * zeilen }, () =>
        ZEICHEN[Math.floor(Math.random() * ZEICHEN.length)]
      );
      zeichne();
    };

    const zeichne = () => {
      offen = false;
      ctx.clearRect(0, 0, breite, hoehe);
      ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let s = 0; s < spalten; s++) {
        for (let z = 0; z < zeilen; z++) {
          const x = s * raster + raster / 2;
          const y = z * raster + raster / 2;
          const d = Math.hypot(x - zx, y - zy);
          if (d > radius) {
            ctx.fillStyle = "rgba(152,213,235,0.07)";
            ctx.fillText("·", x, y);
          } else {
            const naehe = 1 - d / radius;
            ctx.fillStyle = `rgba(152,213,235,${(0.12 + naehe * 0.75).toFixed(3)})`;
            ctx.fillText(zellen[z * spalten + s], x, y);
          }
        }
      }
    };

    const anfordern = () => {
      if (offen) return;
      offen = true;
      requestAnimationFrame(zeichne);
    };

    const bewegen = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      zx = ev.clientX - r.left;
      zy = ev.clientY - r.top;
      anfordern();
    };
    const verlassen = () => { zx = zy = -9999; anfordern(); };

    const eltern = canvas.parentElement ?? canvas;
    messen();
    eltern.addEventListener("pointermove", bewegen);
    eltern.addEventListener("pointerleave", verlassen);
    window.addEventListener("resize", messen);

    return () => {
      eltern.removeEventListener("pointermove", bewegen);
      eltern.removeEventListener("pointerleave", verlassen);
      window.removeEventListener("resize", messen);
    };
  }, [raster, radius]);

  return <canvas ref={ref} className="code-feld" aria-hidden="true" />;
}
