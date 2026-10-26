import { createFive, particleField, networkGraph, terrain, hypercube } from '../src/index';
import type { FiveLayer } from '../src/types';
import './style.css';

const icons = {
  arrow: '<path d="M4 12 12 4M4 4h8v8"/>',
  code: '<path d="m5 4-4 4 4 4m6-8 4 4-4 4M9 2 7 14"/>',
  settings: '<path d="M2 4h12M2 12h12M5 2v4m6 4v4"/>',
  pause: '<path d="M5 3v10M11 3v10" stroke-width="2.5"/>',
  play: '<path d="m5 3 8 5-8 5Z" fill="currentColor" stroke="none"/>',
  reset: '<path d="M3 5a6 6 0 1 1-1 5M3 1v4h4"/>',
  camera: '<path d="M2 5h3l1-2h4l1 2h3v8H2Z"/><circle cx="8" cy="9" r="2.5"/>',
  close: '<path d="m4 4 8 8m0-8-8 8"/>',
  copy: '<rect x="5" y="5" width="9" height="9" rx="1"/><path d="M11 5V2H2v9h3"/>',
  spark: '<path d="m8 1 1.5 5.5L15 8l-5.5 1.5L8 15 6.5 9.5 1 8l5.5-1.5Z"/>',
  info: '<circle cx="8" cy="8" r="6"/><path d="M8 7v4m0-7v1"/>',
  particles: '<circle cx="3" cy="5" r="1"/><circle cx="8" cy="2" r=".8"/><circle cx="13" cy="4" r="1"/><circle cx="5" cy="10" r="1.3"/><circle cx="12" cy="11" r="1.8"/><circle cx="3" cy="14" r=".6"/><circle cx="9" cy="7" r=".6"/>',
  network: '<path d="m3 4 5 4 5-5M8 8l4 6M8 8l-6 5"/><circle cx="3" cy="4" r="1.6"/><circle cx="8" cy="8" r="2"/><circle cx="13" cy="3" r="1.5"/><circle cx="12" cy="14" r="1"/><circle cx="2" cy="13" r="1"/>',
  terrain: '<path d="m1 12 4-7 3 4 3-7 4 10H1Zm4-7 1 7m2-3 1 3m2-10 1 10M3 9h3m4-3h3"/>',
  hypercube: '<path d="m8 1 6 3.5v7L8 15l-6-3.5v-7L8 1Zm0 4 3 1.5v3L8 11 5 9.5v-3L8 5Zm0-4v4m6-.5-3 2m3 5-3-2M8 15v-4m-6 .5 3-2m-3-5 3 2"/>',
};
type Icon = keyof typeof icons;
const svg = (name: Icon, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

type SceneId = 'particles' | 'network' | 'terrain' | 'hypercube';
const scenes: { id: SceneId; name: string; category: string; title: string; description: string; camera: [number, number, number]; target?: [number, number, number] }[] = [
  { id: 'particles', name: 'Particle field', category: 'Shader animation', title: 'Order in the chaos.', description: 'One hundred thousand points. A field of possibility. Shape the motion and find your own equilibrium.', camera: [0, 2, 12] },
  { id: 'network', name: 'Network atlas', category: 'Connected systems', title: 'Everything connects.', description: 'Discover the structure between the points. An interactive, spatial atlas of a synthetic network.', camera: [0, 2, 13] },
  { id: 'terrain', name: 'Procedural terrain', category: 'Generative landscapes', title: 'New worlds, in motion.', description: 'An evolving landscape shaped by layered waves. Adjust the elevation and follow the contours.', camera: [9, 7, 10] },
  { id: 'hypercube', name: '5D hypercube', category: 'Beyond three dimensions', title: 'A different dimension.', description: 'Thirty-two vertices. Five dimensions. Explore a rotating projection of geometry beyond our everyday space.', camera: [0, 1, 11], target: [0, -.7, 0] },
];
const palettes = [
  { name: 'Chlorophyll', a: '#c3f96b', b: '#138872', gradient: 'linear-gradient(100deg,#c3f96b,#138872)' },
  { name: 'Ultraviolet', a: '#b69aff', b: '#5a54ff', gradient: 'linear-gradient(100deg,#d0a2ff,#5145d4)' },
  { name: 'Solar flare', a: '#ffd397', b: '#e75938', gradient: 'linear-gradient(100deg,#ffe4a1,#d65b43)' },
  { name: 'Glacier', a: '#a3edff', b: '#2475cc', gradient: 'linear-gradient(100deg,#a3edff,#2475cc)' },
];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const particlePointSize = 2.8 * Math.min(window.devicePixelRatio || 1, 2) / 2;
const state = { scene: 'particles' as SceneId, palette: 0, speed: .7, bloom: .7, paused: reducedMotion, autoRotate: !reducedMotion, turbulence: .6, mode: 'vortex' as 'vortex' | 'galaxy' | 'wave', edgeOpacity: .2, height: 1.8, frequency: 1, wireframe: true, rotation: .65 };

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="app-shell" id="app-shell">
    <header class="topbar">
      <a class="brand" href="../" aria-label="Motif home"><div class="wordmark">motif<span>·</span></div><div class="brand-rule"></div><div class="brand-description">Connected data.<br>Better decisions.</div></a>
      <nav class="top-links" aria-label="Resources">
        <a class="text-link" href="../examples/">Example library ${svg('arrow', 12)}</a>
        <span class="build-badge"><span class="status-dot"></span>v0.1.0-alpha.1 · EXPERIMENTAL</span>
        <a class="text-link" href="https://threejs.org/" target="_blank" rel="noreferrer">Built on Three.js ${svg('arrow', 12)}</a>
        <button class="source-trigger" id="open-source">${svg('code', 13)} View code</button>
      </nav>
    </header>
    <div class="workspace-top"><div class="breadcrumb"><span>Playground</span><span class="breadcrumb-slash">/</span><strong id="breadcrumb-scene">Particle field</strong></div><span class="workspace-subtitle">Explore the extraordinary. Make it your own.</span></div>
    <main class="workspace">
      <aside class="sidebar" aria-label="Experiments">
        <div class="section-label">The experiments</div>
        <nav class="scene-list" aria-label="Choose a visualization">${scenes.map((scene, i) => `<button class="scene-button ${i === 0 ? 'active' : ''}" data-scene="${scene.id}" aria-pressed="${i === 0}"><span class="scene-icon">${svg(scene.id, 23)}</span><span class="scene-copy"><span class="scene-name">${scene.name}</span><span class="scene-kicker">${scene.category}</span></span><span class="scene-index">0${i + 1}</span></button>`).join('')}</nav>
        <div class="sidebar-note"><div class="sidebar-note-icon">${svg('spark', 20)}</div><p><strong>Less setup.<br>More imagination.</strong></p><p>Composable layers for ambitious visual ideas.</p><p class="tiny">Powered by Three.js.<br>Made to be built upon.</p></div>
      </aside>
      <section class="canvas-section" aria-label="Interactive visualization">
        <div class="viewport" id="viewport" aria-label="3D visualization. Drag to orbit; scroll to zoom."></div>
        <div class="canvas-heading"><span class="canvas-label"><span class="status-dot"></span>Live canvas <span id="canvas-index">/ 01</span></span><span class="render-pill">WEBGL2 <span aria-hidden="true">↗</span></span></div>
        <div class="interaction-hint">DRAG TO ORBIT · SCROLL TO EXPLORE</div>
        <div class="canvas-title" id="canvas-title"><div class="experiment-number" id="experiment-category">Experiment 01 — Shader animation</div><h1 id="scene-title">Order in the chaos.</h1><p id="scene-description">One hundred thousand points. A field of possibility. Shape the motion and find your own equilibrium.</p></div>
        <div class="canvas-bottom-rule"></div>
        <div class="viewport-toolbar"><div class="playback"><button class="play-button" id="play-toggle" aria-label="${state.paused ? 'Play animation' : 'Pause animation'}">${svg(state.paused ? 'play' : 'pause', 15)}</button><span class="timeline-time" id="elapsed">00:00.0</span></div><div class="canvas-actions"><button class="icon-button" id="reset-camera" title="Reset camera" aria-label="Reset camera">${svg('reset', 14)}</button><button class="icon-button export-button" id="capture" title="Save canvas as PNG" aria-label="Save canvas as PNG">${svg('camera', 14)}<span class="export-label">PNG</span></button></div></div>
      </section>
      <aside class="inspector" aria-label="Visualization controls"><div class="inspector-title"><h2>Make it yours</h2>${svg('settings', 15)}</div>
        <section class="control-section first" aria-labelledby="scene-controls-label"><div class="control-heading"><span class="section-label" id="scene-controls-label">Field settings</span></div><div id="scene-controls"></div></section>
        <section class="control-section" aria-labelledby="appearance-label"><div class="control-heading"><span class="section-label" id="appearance-label">Appearance</span></div><div class="control-line"><span>Color palette</span><span class="value" id="palette-number">01 / 04</span></div><div class="palette-options" role="group" aria-label="Color palette">${palettes.map((p, i) => `<button class="palette-button ${i === 0 ? 'active' : ''}" style="--swatch:${p.gradient}" data-palette="${i}" aria-label="${p.name}" aria-pressed="${i === 0}" title="${p.name}"></button>`).join('')}</div><div class="palette-name" id="palette-name">CHLOROPHYLL</div>${slider('bloom', 'Bloom intensity', 0, 2, .05, state.bloom, 'None', 'Radiant')}</section>
        <section class="control-section" aria-labelledby="motion-label"><div class="control-heading"><span class="section-label" id="motion-label">Motion</span></div>${slider('speed', 'Animation speed', 0, 2, .05, state.speed, 'Still', '2×')}<div class="toggle-line"><span id="orbit-label">Auto-orbit camera</span><button class="toggle" id="auto-orbit" role="switch" aria-checked="${state.autoRotate}" aria-labelledby="orbit-label"></button></div></section>
        <div class="inspector-footer">${svg('info', 12)}<span>Every parameter is live.<br>${reducedMotion ? 'Animation starts paused for reduced motion.' : 'A little curiosity goes a long way.'}</span></div>
      </aside>
    </main>
    <footer class="telemetry" aria-label="Live rendering statistics"><div class="metrics"><span class="metric"><span class="status-dot"></span><b id="stat-fps">—</b><span class="metric-label">FPS</span></span><span class="metric"><b id="stat-points">—</b><span class="metric-label">Points</span></span><span class="metric"><b id="stat-triangles">—</b><span class="metric-label">Triangles</span></span><span class="metric"><b id="stat-calls">—</b><span class="metric-label">Draw calls</span></span><span class="metric"><b id="stat-objects">—</b><span class="metric-label">Objects</span></span></div><span class="footer-signature">MOTIF · FIND THE PATTERN.</span></footer>
  </div>
  <div class="source-panel" id="source-panel" hidden><section class="source-card" role="dialog" aria-modal="true" aria-labelledby="source-title" tabindex="-1"><header class="source-header"><div><h2 id="source-title">Small API. Big possibilities.</h2><p>Your current experiment · TypeScript</p></div><div class="source-buttons"><button class="copy-button" id="copy-source">${svg('copy', 12)}<span>Copy</span></button><button class="icon-button" id="close-source" aria-label="Close code">${svg('close', 13)}</button></div></header><pre class="source-code" id="source-scroll" tabindex="0" aria-label="TypeScript example"><code id="source-code"></code></pre><div class="source-bottom">Add a <code>&lt;div id="canvas"&gt;</code> with a defined height to your page. This example uses the local <code>fivejs</code> package and its <code>three</code> peer dependency.<br>When you're done: <code>app.dispose()</code>.</div></section></div>
  <div class="toast" id="toast" role="status" hidden></div>`;

function element<T extends HTMLElement = HTMLElement>(id: string) { return document.getElementById(id) as T; }
function slider(id: string, name: string, min: number, max: number, step: number, value: number, low: string, high: string) {
  return `<div class="slider-control"><div class="control-line"><label for="${id}">${name}</label><output class="value" id="${id}-value" for="${id}">${formatSlider(id, value)}</output></div><input class="slider" id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" /><div class="slider-ends" aria-hidden="true"><span>${low}</span><span>${high}</span></div></div>`;
}
function formatSlider(id: string, value: number) { return `${value.toFixed(2)}${id === 'speed' ? '×' : ''}`; }
function paintSlider(input: HTMLInputElement) {
  const percent = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
  input.style.backgroundImage = `linear-gradient(to right,var(--lime) ${percent}%,#2b362d ${percent}%)`;
  element<HTMLOutputElement>(`${input.id}-value`).value = formatSlider(input.id, Number(input.value));
}
function bindSlider(id: string, update: (value: number) => void) {
  const input = element<HTMLInputElement>(id);
  paintSlider(input);
  input.addEventListener('input', () => { paintSlider(input); update(Number(input.value)); updateSource(); });
}

let studio: ReturnType<typeof createFive> | undefined;
let activeLayer: FiveLayer<object> | undefined;
let lastStatsUpdate = 0;
let sourceOpen = false;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let framingScale = 1;
let framingObserver: ResizeObserver | undefined;

function viewportFramingScale() {
  const bounds = element('viewport').getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0 ? Math.max(1, bounds.height / bounds.width) : 1;
}
function framedCamera(scene: typeof scenes[number], scale = viewportFramingScale()): [number, number, number] {
  return scene.camera.map((value, index) => {
    const target = scene.target?.[index] ?? 0;
    return target + (value - target) * scale;
  }) as [number, number, number];
}
function resetSceneCamera() {
  const scene = scenes.find(item => item.id === state.scene)!;
  framingScale = viewportFramingScale();
  studio?.resetCamera(framedCamera(scene, framingScale), scene.target);
}
function resizeFraming() {
  if (!studio) return;
  const nextScale = viewportFramingScale();
  if (Math.abs(nextScale - framingScale) < .001) return;
  const ratio = nextScale / framingScale;
  const target = scenes.find(item => item.id === state.scene)!.target ?? [0, 0, 0];
  const camera = studio.camera.position;
  // Adjust distance only. Preserve the user's orbit angle instead of resetting it.
  camera.set(
    target[0] + (camera.x - target[0]) * ratio,
    target[1] + (camera.y - target[1]) * ratio,
    target[2] + (camera.z - target[2]) * ratio,
  );
  framingScale = nextScale;
  updateSource();
}

function createLayer(): FiveLayer<object> {
  const palette = palettes[state.palette];
  switch (state.scene) {
    case 'particles': return particleField({ count: 100_000, mode: state.mode, radius: 4, turbulence: state.turbulence, pointSize: particlePointSize, colorA: palette.a, colorB: palette.b, seed: 42 });
    case 'network': return networkGraph({ nodeCount: 420, radius: 4.2, edgeOpacity: state.edgeOpacity, colorA: palette.a, colorB: palette.b, seed: 42 });
    case 'terrain': return terrain({ resolution: 160, size: 12, height: state.height, frequency: state.frequency, wireframe: state.wireframe, colorA: palette.a, colorB: palette.b, seed: 42 });
    case 'hypercube': return hypercube({ dimensions: 5, size: 2.4, speed: state.rotation, color: palette.a });
  }
}
function setLayer(options: object) { activeLayer?.set(options); }
function updateSceneControls() {
  const controls = element('scene-controls');
  const label = element('scene-controls-label');
  if (state.scene === 'particles') {
    label.textContent = 'Field settings';
    controls.innerHTML = `<div class="control-line"><span>Particle count</span><span class="value fixed-value">100,000</span></div><div class="control-line"><label for="field-mode">Motion field</label></div><select class="select-control" id="field-mode"><option value="vortex">Vortex flow</option><option value="galaxy">Spiral galaxy</option><option value="wave">Wave interference</option></select>${slider('turbulence', 'Turbulence', 0, 2, .05, state.turbulence, 'Calm', 'Wild')}`;
    element<HTMLSelectElement>('field-mode').value = state.mode;
    element<HTMLSelectElement>('field-mode').addEventListener('change', (event) => { state.mode = (event.target as HTMLSelectElement).value as typeof state.mode; setLayer({ mode: state.mode }); updateSource(); });
    bindSlider('turbulence', value => { state.turbulence = value; setLayer({ turbulence: value }); });
  } else if (state.scene === 'network') {
    label.textContent = 'Network settings';
    controls.innerHTML = `<div class="control-line"><span>Nodes</span><span class="value fixed-value">420</span></div><div class="info-row">${svg('info', 11)}SYNTHETIC DEMO DATA</div>${slider('edge-opacity', 'Connection opacity', 0, 1, .025, state.edgeOpacity, 'Subtle', 'Solid')}`;
    bindSlider('edge-opacity', value => { state.edgeOpacity = value; setLayer({ edgeOpacity: value }); });
  } else if (state.scene === 'terrain') {
    label.textContent = 'Terrain settings';
    controls.innerHTML = `<div class="control-line"><span>Grid segments</span><span class="value fixed-value">160 × 160</span></div>${slider('height', 'Elevation', .1, 4, .1, state.height, 'Low', 'High')}${slider('frequency', 'Wave frequency', .2, 3, .05, state.frequency, 'Broad', 'Fine')}<div class="toggle-line"><span id="wireframe-label">Wireframe</span><button class="toggle" id="wireframe" role="switch" aria-checked="${state.wireframe}" aria-labelledby="wireframe-label"></button></div>`;
    bindSlider('height', value => { state.height = value; setLayer({ height: value }); });
    bindSlider('frequency', value => { state.frequency = value; setLayer({ frequency: value }); });
    element('wireframe').addEventListener('click', () => { state.wireframe = !state.wireframe; element('wireframe').setAttribute('aria-checked', String(state.wireframe)); setLayer({ wireframe: state.wireframe }); updateSource(); });
  } else {
    label.textContent = 'Geometry settings';
    controls.innerHTML = `<div class="control-line"><span>Dimensions</span><span class="value fixed-value">5D → 3D</span></div><div class="control-line"><span>Vertices / edges</span><span class="value">32 / 80</span></div>${slider('rotation', 'Rotation rate', 0, 2, .05, state.rotation, 'Still', 'Fast')}<div class="info-row">PERSPECTIVE PROJECTION</div>`;
    bindSlider('rotation', value => { state.rotation = value; setLayer({ speed: value }); });
  }
}
function selectScene(id: SceneId) {
  if (!studio) return;
  const scene = scenes.find(item => item.id === id)!;
  state.scene = id;
  const index = scenes.indexOf(scene) + 1;
  studio.clear();
  activeLayer = createLayer();
  studio.add(activeLayer);
  resetSceneCamera();
  document.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach(button => { const active = button.dataset.scene === id; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  element('breadcrumb-scene').textContent = scene.name;
  element('scene-title').textContent = scene.title;
  element('scene-description').textContent = scene.description;
  element('experiment-category').textContent = `Experiment 0${index} — ${scene.category}`;
  element('canvas-index').textContent = `/ 0${index}`;
  element('canvas-title').classList.remove('scene-fade');
  void element('canvas-title').offsetWidth;
  element('canvas-title').classList.add('scene-fade');
  updateSceneControls();
  updateSource();
}
function notify(message: string) {
  clearTimeout(toastTimer);
  element('toast').textContent = message;
  element('toast').hidden = false;
  toastTimer = setTimeout(() => { element('toast').hidden = true; }, 3200);
}
function codeForScene() {
  const p = palettes[state.palette];
  switch (state.scene) {
    case 'particles': return `particleField({\n  count: 100_000,\n  mode: '${state.mode}',\n  radius: 4,\n  turbulence: ${state.turbulence},\n  pointSize: ${particlePointSize},\n  colorA: '${p.a}',\n  colorB: '${p.b}',\n  seed: 42,\n})`;
    case 'network': return `networkGraph({\n  nodeCount: 420, // Seeded demo network\n  radius: 4.2,\n  edgeOpacity: ${state.edgeOpacity},\n  colorA: '${p.a}',\n  colorB: '${p.b}',\n  seed: 42,\n  // For your own network, replace nodeCount with:\n  // data: { nodes, edges }\n})`;
    case 'terrain': return `terrain({\n  resolution: 160,\n  size: 12,\n  height: ${state.height},\n  frequency: ${state.frequency},\n  wireframe: ${state.wireframe},\n  colorA: '${p.a}',\n  colorB: '${p.b}',\n  seed: 42,\n})`;
    case 'hypercube': return `hypercube({\n  dimensions: 5,\n  size: 2.4,\n  speed: ${state.rotation},\n  color: '${p.a}',\n})`;
  }
}
function updateSource() {
  const factory = { particles: 'particleField', network: 'networkGraph', terrain: 'terrain', hypercube: 'hypercube' }[state.scene];
  const scene = scenes.find(scene => scene.id === state.scene)!;
  const camera = framedCamera(scene).map(value => Number(value.toFixed(3))).join(', ');
  const target = scene.target ? `, [${scene.target.join(', ')}]` : '';
  element('source-code').textContent = `import { createFive, ${factory} } from 'fivejs';\n\nconst app = createFive({\n  container: document.querySelector<HTMLElement>('#canvas')!,\n  background: '#070c0b',\n  bloom: ${state.bloom},\n  autoRotate: ${state.autoRotate},\n});\n\nconst layer = ${codeForScene()};\n\napp.add(layer);\napp.setSpeed(${state.speed});\napp.setPaused(${state.paused});\napp.resetCamera([${camera}]${target});`;
}
function openSource() { updateSource(); sourceOpen = true; element('source-panel').hidden = false; element('app-shell').inert = true; document.body.style.overflow = 'hidden'; element('close-source').focus(); }
function closeSource() { sourceOpen = false; element('source-panel').hidden = true; element('app-shell').inert = false; document.body.style.overflow = ''; element('open-source').focus(); }

updateSceneControls();
bindSlider('bloom', value => { state.bloom = value; studio?.setBloom(value); });
bindSlider('speed', value => { state.speed = value; studio?.setSpeed(value); });
document.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach(button => button.addEventListener('click', () => selectScene(button.dataset.scene as SceneId)));
document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(button => button.addEventListener('click', () => {
  state.palette = Number(button.dataset.palette);
  const p = palettes[state.palette];
  setLayer({ colorA: p.a, colorB: p.b, color: p.a });
  document.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); });
  element('palette-name').textContent = p.name.toUpperCase();
  element('palette-number').textContent = `0${state.palette + 1} / 04`;
  updateSource();
}));
element('auto-orbit').addEventListener('click', () => { state.autoRotate = !state.autoRotate; element('auto-orbit').setAttribute('aria-checked', String(state.autoRotate)); studio?.setAutoRotate(state.autoRotate); updateSource(); });
element('play-toggle').addEventListener('click', () => { state.paused = !state.paused; studio?.setPaused(state.paused); element('play-toggle').innerHTML = svg(state.paused ? 'play' : 'pause', 15); element('play-toggle').setAttribute('aria-label', state.paused ? 'Play animation' : 'Pause animation'); updateSource(); });
element('reset-camera').addEventListener('click', () => { resetSceneCamera(); notify('Camera reset'); });
element<HTMLButtonElement>('capture').addEventListener('click', async () => {
  if (!studio) return;
  const button = element<HTMLButtonElement>('capture');
  button.disabled = true;
  try {
    const blob = await studio.capture();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `motif-${state.scene}-${Date.now()}.png`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    notify('Canvas exported as PNG');
  } catch { notify('Unable to export this canvas. Please try again.'); }
  finally { button.disabled = false; }
});
element('open-source').addEventListener('click', openSource);
element('close-source').addEventListener('click', closeSource);
element('source-panel').addEventListener('click', event => { if (event.target === element('source-panel')) closeSource(); });
element('copy-source').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(element('source-code').textContent || ''); notify('Code copied to clipboard'); }
  catch { const selection = window.getSelection(); const range = document.createRange(); range.selectNodeContents(element('source-code')); selection?.removeAllRanges(); selection?.addRange(range); notify('Code selected. Press Ctrl+C or ⌘C to copy.'); }
});
document.addEventListener('keydown', event => {
  if (!sourceOpen) return;
  if (event.key === 'Escape') { closeSource(); return; }
  if (event.key === 'Tab') {
    const first = element('copy-source'), last = element('source-scroll');
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

try {
  studio = createFive({ container: element('viewport'), background: '#070c0b', bloom: state.bloom, autoRotate: state.autoRotate });
  studio.setSpeed(state.speed);
  studio.setPaused(state.paused);
  selectScene('particles');
  framingObserver = new ResizeObserver(resizeFraming);
  framingObserver.observe(element('viewport'));
  studio.onFrame(() => {
    const now = performance.now();
    if (!studio || now - lastStatsUpdate < 250) return;
    lastStatsUpdate = now;
    const stats = studio.stats;
    element('stat-fps').textContent = String(Math.round(stats.fps));
    element('stat-points').textContent = stats.points.toLocaleString('en-US');
    element('stat-triangles').textContent = stats.triangles.toLocaleString('en-US');
    element('stat-calls').textContent = String(stats.drawCalls);
    element('stat-objects').textContent = String(stats.objects);
    const seconds = Math.max(0, stats.time);
    element('elapsed').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}.${Math.floor(seconds * 10) % 10}`;
  });
  studio.renderer.domElement.addEventListener('webglcontextlost', () => notify('The graphics context was interrupted. Reload to restart.'));
} catch (error) {
  const panel = document.createElement('div'); panel.className = 'error-panel';
  const heading = document.createElement('h2'); heading.textContent = 'A little more graphics power.';
  const message = document.createElement('p'); message.textContent = 'This playground needs WebGL2. Enable hardware acceleration in your browser, then reload the page.';
  panel.append(heading, message); element('viewport').append(panel);
  console.error('Motif could not initialize:', error);
}
window.addEventListener('pagehide', event => { if (!event.persisted) { framingObserver?.disconnect(); studio?.dispose(); } });
