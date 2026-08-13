// Bergszene in Three.js: geschichtete Grate, Sternenfeld, Nebel, Atmosphaere
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import './berg-szene.css';

type Refs = {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  composer: EffectComposer | null;
  sterne: THREE.Points[];
  nebel: THREE.Mesh | null;
  berge: THREE.Mesh[];
  atmosphaere: THREE.Mesh | null;
  bild: number | null;
  zielY: number;
  zielZ: number;
};

export default function BergSzene() {
  const halterRef = useRef<HTMLDivElement>(null);
  const leinwandRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const halter = halterRef.current;
    const leinwand = leinwandRef.current;
    if (!halter || !leinwand) return;

    // Ohne Bewegung wird gar nichts aufgebaut — der CSS-Verlauf dahinter traegt die Flaeche
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const r: Refs = {
      scene: null, camera: null, renderer: null, composer: null,
      sterne: [], nebel: null, berge: [], atmosphaere: null,
      bild: null, zielY: 26, zielZ: 150,
    };

    const weichY = { wert: 26 };
    const weichZ = { wert: 150 };
    let laeuft = false;
    let sichtbar = false;

    const breite = () => halter.clientWidth || 1;
    const hoehe = () => halter.clientHeight || 1;

    // Aufbau
    r.scene = new THREE.Scene();
    r.scene.fog = new THREE.FogExp2(0x0b1a24, 0.0009);

    r.camera = new THREE.PerspectiveCamera(70, breite() / hoehe(), 0.1, 2000);
    r.camera.position.set(0, 26, 150);

    r.renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: true, alpha: true });
    r.renderer.setSize(breite(), hoehe(), false);
    // Auf 1.75 gedeckelt: darueber steigen die Pixelkosten quadratisch, sichtbar wird es
    r.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    r.renderer.toneMappingExposure = 0.62;

    r.composer = new EffectComposer(r.renderer);
    r.composer.addPass(new RenderPass(r.scene, r.camera));
    // Bloom nur mit Zeiger und genug Kernen, sonst zu teuer
    const bloomLohnt =
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      (navigator.hardwareConcurrency ?? 4) >= 4;
    if (bloomLohnt) {
      r.composer.addPass(
        new UnrealBloomPass(new THREE.Vector2(breite(), hoehe()), 0.55, 0.5, 0.9)
      );
    }

    // Sterne: drei Tiefenebenen, zusammen 4.500 statt 15.000 Punkte.
    const sterneProEbene = 1500;
    for (let ebene = 0; ebene < 3; ebene++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(sterneProEbene * 3);
      const col = new Float32Array(sterneProEbene * 3);
      const gr = new Float32Array(sterneProEbene);

      for (let j = 0; j < sterneProEbene; j++) {
        const radius = 240 + Math.random() * 700;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        pos[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
        pos[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        pos[j * 3 + 2] = radius * Math.cos(phi);

        const c = new THREE.Color();
        const w = Math.random();
        if (w < 0.72) c.setHSL(0, 0, 0.82 + Math.random() * 0.18);
        else if (w < 0.9) c.setHSL(0.11, 0.45, 0.8);   // warmes Gold
        else c.setHSL(0.55, 0.45, 0.82);                // kuehles Blau
        col[j * 3] = c.r; col[j * 3 + 1] = c.g; col[j * 3 + 2] = c.b;
        gr[j] = Math.random() * 1.8 + 0.4;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(gr, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: { zeit: { value: 0 }, tiefe: { value: ebene } },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          uniform float zeit;
          uniform float tiefe;
          void main() {
            vColor = color;
            vec3 p = position;
            float w = zeit * 0.04 * (1.0 - tiefe * 0.3);
            mat2 rot = mat2(cos(w), -sin(w), sin(w), cos(w));
            p.xy = rot * p.xy;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = size * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, d));
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const punkte = new THREE.Points(geo, mat);
      r.scene.add(punkte);
      r.sterne.push(punkte);
    }

    // Nebel — Segmente von 100x100 auf 40x40 gesenkt, das reicht voellig.
    {
      const geo = new THREE.PlaneGeometry(6000, 3000, 40, 40);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          zeit: { value: 0 },
          farbe1: { value: new THREE.Color(0x2c5a6b) },
          farbe2: { value: new THREE.Color(0xe0a445) },
          staerke: { value: 0.22 },
        },
        vertexShader: `
          varying vec2 vUv; varying float vHoehe; uniform float zeit;
          void main() {
            vUv = uv; vec3 p = position;
            float h = sin(p.x * 0.01 + zeit) * cos(p.y * 0.01 + zeit) * 18.0;
            p.z += h; vHoehe = h;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 farbe1; uniform vec3 farbe2; uniform float staerke; uniform float zeit;
          varying vec2 vUv; varying float vHoehe;
          void main() {
            float m = sin(vUv.x * 9.0 + zeit) * cos(vUv.y * 9.0 + zeit);
            vec3 c = mix(farbe1, farbe2, m * 0.5 + 0.5);
            float a = staerke * (1.0 - length(vUv - 0.5) * 2.0);
            a *= 1.0 + vHoehe * 0.01;
            gl_FragColor = vec4(c, max(a, 0.0));
          }`,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      r.nebel = new THREE.Mesh(geo, mat);
      r.nebel.position.z = -900;
      r.scene.add(r.nebel);
    }

    // Bergketten — vier Ebenen, vorne dunkel, hinten hell und blass
    const bergEbenen = [
      { z: -60,  h: 34, farbe: 0x0e1820, deckung: 1.0 },
      { z: -120, h: 48, farbe: 0x1b2f3c, deckung: 0.92 },
      { z: -180, h: 62, farbe: 0x2c5468, deckung: 0.72 },
      { z: -240, h: 78, farbe: 0x437a94, deckung: 0.48 },
    ];

    bergEbenen.forEach((e, i) => {
      const punkte: THREE.Vector2[] = [];
      const abschnitte = 60;
      for (let s = 0; s <= abschnitte; s++) {
        const x = (s / abschnitte - 0.5) * 1200;
        // Der Grat schwingt um 0 statt um -90: bei einem flachen Ausschnitt (hier rund 3:1)
        const y =
          Math.sin(s * 0.1 + i) * e.h +
          Math.sin(s * 0.05 + i * 2) * e.h * 0.5 +
          Math.sin(s * 0.31 + i * 3) * e.h * 0.18;
        punkte.push(new THREE.Vector2(x, y));
      }
      // Fuss der Flaeche weit unter dem Bildrand, damit unten nichts durchscheint.
      punkte.push(new THREE.Vector2(4000, -900));
      punkte.push(new THREE.Vector2(-4000, -900));

      const geo = new THREE.ShapeGeometry(new THREE.Shape(punkte));
      const mat = new THREE.MeshBasicMaterial({
        color: e.farbe, transparent: true, opacity: e.deckung, side: THREE.DoubleSide,
      });
      // Hintere Ketten stehen hoeher — das erzeugt die Staffelung
      const basisY = -78 + i * 11;
      const berg = new THREE.Mesh(geo, mat);
      berg.position.z = e.z;
      berg.position.y = basisY;
      berg.userData = { basisZ: e.z, basisY, index: i };
      r.scene!.add(berg);
      r.berge.push(berg);
    });

    // Atmosphaere
    {
      const geo = new THREE.SphereGeometry(620, 24, 24);
      const mat = new THREE.ShaderMaterial({
        uniforms: { zeit: { value: 0 } },
        vertexShader: `
          varying vec3 vN;
          void main() { vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          varying vec3 vN; uniform float zeit;
          void main() {
            // Die Kamera sitzt INNERHALB dieser Kugel
            float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.0);
            vec3 a = vec3(0.20, 0.42, 0.60) * i;
            a *= sin(zeit * 1.6) * 0.08 + 0.92;
            gl_FragColor = vec4(a, i * 0.05);
          }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
      });
      r.atmosphaere = new THREE.Mesh(geo, mat);
      r.scene.add(r.atmosphaere);
    }

    // Schleife
    const schritt = () => {
      if (!laeuft) return;
      r.bild = requestAnimationFrame(schritt);
      const t = performance.now() * 0.001;

      for (const s of r.sterne) {
        const u = (s.material as THREE.ShaderMaterial).uniforms;
        if (u?.zeit) u.zeit.value = t;
      }
      if (r.nebel) {
        const u = (r.nebel.material as THREE.ShaderMaterial).uniforms;
        if (u?.zeit) u.zeit.value = t * 0.4;
      }
      if (r.atmosphaere) {
        const u = (r.atmosphaere.material as THREE.ShaderMaterial).uniforms;
        if (u?.zeit) u.zeit.value = t;
      }

      // Kamera laeuft dem Scrollziel weich nach und schwebt leicht.
      if (r.camera) {
        weichY.wert += (r.zielY - weichY.wert) * 0.05;
        weichZ.wert += (r.zielZ - weichZ.wert) * 0.05;
        r.camera.position.x = Math.sin(t * 0.09) * 2.2;
        r.camera.position.y = weichY.wert + Math.cos(t * 0.13) * 1.1;
        r.camera.position.z = weichZ.wert;
        // Leicht nach unten blicken: dadurch wandert der Horizont nach oben ins Bild
        r.camera.lookAt(0, -34, -500);
      }

      // Parallaxe der Grate
      r.berge.forEach((b, i) => {
        const f = 1 + i * 0.45;
        b.position.x = Math.sin(t * 0.08) * 2 * f;
        b.position.y = b.userData.basisY + Math.cos(t * 0.12) * f;
      });

      r.composer?.render();
    };

    const anhalten = () => {
      laeuft = false;
      if (r.bild !== null) { cancelAnimationFrame(r.bild); r.bild = null; }
    };
    const starten = () => {
      if (laeuft || !sichtbar || document.hidden) return;
      laeuft = true;
      r.bild = requestAnimationFrame(schritt);
    };

    // Ein Bild sofort, damit auch ohne laufende Schleife etwas dasteht.
    r.composer.render();

    // Ereignisse
    const beiScroll = () => {
      const k = halter.getBoundingClientRect();
      const weg = k.height + window.innerHeight;
      if (weg <= 0) return;
      const p = Math.min(Math.max((window.innerHeight - k.top) / weg, 0), 1);
      // Je weiter gescrollt, desto tiefer und naeher rueckt die Kamera.
      r.zielY = 26 + p * 26;
      r.zielZ = 150 - p * 190;
    };

    // Three.js rechnet fov senkrecht
    const fovFuer = (v: number) => Math.min(88, Math.max(58, 44 + v * 9));

    const messen = () => {
      if (!r.camera || !r.renderer || !r.composer) return;
      const v = breite() / hoehe();
      r.camera.aspect = v;
      r.camera.fov = fovFuer(v);
      r.camera.updateProjectionMatrix();
      r.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      r.renderer.setSize(breite(), hoehe(), false);
      r.composer.setSize(breite(), hoehe());
      if (!laeuft) r.composer.render();
    };

    window.addEventListener('scroll', beiScroll, { passive: true });
    window.addEventListener('resize', messen);
    document.addEventListener('visibilitychange', () => {
      document.hidden ? anhalten() : starten();
    });
    beiScroll();

    const beobachter = new IntersectionObserver(
      e => { sichtbar = e.some(x => x.isIntersecting); sichtbar ? starten() : anhalten(); },
      { rootMargin: '150px' }
    );
    beobachter.observe(halter);
    // Sicherheitsnetz, falls der Beobachter nicht ausloest
    const netz = setTimeout(() => { sichtbar = true; starten(); }, 1200);

    // Aufraeumen
    return () => {
      anhalten();
      clearTimeout(netz);
      beobachter.disconnect();
      window.removeEventListener('scroll', beiScroll);
      window.removeEventListener('resize', messen);

      const weg = (m: THREE.Mesh | THREE.Points) => {
        m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        Array.isArray(mat) ? mat.forEach(x => x.dispose()) : mat.dispose();
      };
      r.sterne.forEach(weg);
      r.berge.forEach(weg);
      if (r.nebel) weg(r.nebel);
      if (r.atmosphaere) weg(r.atmosphaere);
      r.composer?.dispose();
      r.renderer?.dispose();
    };
  }, []);

  return (
    <div ref={halterRef} className="bergszene" aria-hidden="true">
      <canvas ref={leinwandRef} className="bergszene-leinwand" />
    </div>
  );
}
