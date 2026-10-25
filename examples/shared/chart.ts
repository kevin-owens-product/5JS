import {
  BoxGeometry, BufferGeometry, CanvasTexture, Group, Line, LineBasicMaterial,
  Mesh, MeshBasicMaterial, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace,
  Vector3, AdditiveBlending, BufferAttribute, CatmullRomCurve3, Color, DoubleSide,
  Points, ShaderMaterial, TorusGeometry, TubeGeometry,
} from 'three';
import type { Material, Object3D, Texture } from 'three';
import type { FiveLayer } from '../../src/index.js';

export type Position = [number, number, number];
export interface Tick { value: number; label: string }
export interface ChartFrame {
  x: [number, number]; y: [number, number]; z: [number, number];
  xTicks?: Tick[]; yTicks?: Tick[]; zTicks?: Tick[];
  xLabel?: string; yLabel?: string; zLabel?: string;
}
interface BoxOptions {
  x: number; y: number; z: number; width: number; height: number; depth: number;
  color: string; opacity?: number;
}
export interface ChartBuilder {
  /** A zero-based column, or signed contribution from base to base + value. */
  bar(options: { x: number; z: number; value: number; base?: number; width?: number; depth?: number; color: string; opacity?: number }): void;
  box(options: BoxOptions): void;
  point(position: Position, color: string, radius?: number): void;
  line(points: Position[], color: string, opacity?: number): void;
  label(text: string, position: Position, size?: number, color?: string): void;
  frame(options: ChartFrame): void;
  tube(points: Position[], color: string, radius?: number, opacity?: number): void;
  ribbon(points: Position[], width: number, color: string, opacity?: number): void;
  ring(center: Position, radius: number, color: string, tube?: number, axis?: 'x' | 'y' | 'z', arc?: number): void;
  surface(rows: Position[][], colors: string[][], opacity?: number): void;
  glow(position: Position, color: string, size?: number): void;
  flow(points: Position[], options: { color: string; count?: number; speed?: number; size?: number; spread?: number; seed?: number }): void;
}
export interface ChartLayer extends FiveLayer<Record<string, never>> {
  redraw(build: (chart: ChartBuilder) => void): void;
}

/** Release geometry, materials and label textures, including partially built charts. */
function release(group: Group) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  group.traverse(object => {
    const renderable = object as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
    if (renderable.geometry) geometries.add(renderable.geometry);
    for (const material of renderable.material ? [renderable.material].flat() : []) {
      materials.add(material);
      const map = (material as Material & { map?: Texture }).map;
      if (map) textures.add(map);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
  group.clear();
}

/** Small example utility, not a new public 5js layer API. Coordinates are world units. */
export function createChartLayer(build: (chart: ChartBuilder) => void): ChartLayer {
  const object = new Group(); object.name = 'example:analytical-chart';
  let content = new Group(), disposed = false, count = 0, elapsed = 0;
  let animations: ((time: number) => void)[] = [];
  object.add(content);

  function redraw(draw: (chart: ChartBuilder) => void) {
    if (disposed) throw new Error('Cannot redraw a disposed chart.');
    const next = new Group(); let nextCount = 0;
    const nextAnimations: ((time: number) => void)[] = [];
    let labelGeometry: BufferGeometry | undefined;
    function curveFor(points: Position[]) {
      if (points.length < 2 || points.some(point => !point.every(Number.isFinite))) throw new RangeError('A path needs at least two finite 3D points.');
      return new CatmullRomCurve3(points.map(point => new Vector3(...point)), false, 'centripetal');
    }
    function dots(positions: Float32Array, color: string, size: number, depthTest = true) {
      const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(positions, 3));
      const material = new ShaderMaterial({
        uniforms: { tint: { value: new Color(color).multiplyScalar(2) }, pointSize: { value: size * 800 } },
        transparent: true, depthWrite: false, depthTest, blending: AdditiveBlending,
        vertexShader: `uniform float pointSize; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(pointSize/max(.2,-p.z),1.0,200.0);}`,
        fragmentShader: `uniform vec3 tint; void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r,2.);gl_FragColor=vec4(tint,a);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
      });
      const points = new Points(geometry, material); points.frustumCulled = false; next.add(points); nextCount += positions.length / 3;
      return geometry.getAttribute('position') as BufferAttribute;
    }
    const chart: ChartBuilder = {
      tube(points, color, radius = .025, opacity = 1) {
        if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Tube radius must be positive.');
        const curve = curveFor(points);
        next.add(new Mesh(new TubeGeometry(curve, Math.min(160, Math.max(24, points.length * 8)), radius, 7, false), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.5), opacity, transparent: opacity < 1, depthWrite: opacity >= 1 })));
        nextCount++;
      },
      ribbon(points, width, color, opacity = .5) {
        if (!Number.isFinite(width) || width <= 0) throw new RangeError('Ribbon width must be positive.');
        const curve = curveFor(points), rows: Position[][] = [];
        const length = Math.min(120, Math.max(24, points.length * 8));
        for (let i = 0; i <= length; i++) {
          const center = curve.getPoint(i / length), tangent = curve.getTangent(i / length);
          const side = new Vector3(-tangent.z, 0, tangent.x);
          if (side.lengthSq() < .00001) side.set(1, 0, 0);
          side.normalize().multiplyScalar(width / 2);
          rows.push([center.clone().add(side).toArray(), center.clone().sub(side).toArray()] as Position[]);
        }
        chart.surface(rows, rows.map(() => [color, color]), opacity);
      },
      ring(center, radius, color, tube = .025, axis = 'y', arc = Math.PI * 2) {
        if (!center.every(Number.isFinite) || ![radius, tube, arc].every(Number.isFinite) || radius <= 0 || tube <= 0 || arc < 0 || arc > Math.PI * 2 + 1e-8) throw new RangeError('Invalid ring geometry.');
        if (arc === 0) return;
        const mesh = new Mesh(new TorusGeometry(radius, tube, 7, Math.max(12, Math.ceil(72 * arc / (Math.PI * 2))), Math.min(arc, Math.PI * 2)), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(1.5) }));
        mesh.position.fromArray(center);
        if (axis === 'y') mesh.rotation.x = Math.PI / 2;
        if (axis === 'x') mesh.rotation.y = Math.PI / 2;
        next.add(mesh); nextCount++;
      },
      surface(rows, colors, opacity = .65) {
        const columns = rows[0]?.length ?? 0;
        if (rows.length < 2 || columns < 2 || colors.length !== rows.length || rows.some((row, i) => row.length !== columns || colors[i]?.length !== columns || row.some(point => !point.every(Number.isFinite)))) throw new RangeError('Surface coordinates and colors must form matching finite grids.');
        const geometry = new BufferGeometry(), positions: number[] = [], rgb: number[] = [], indices: number[] = [];
        rows.forEach((row, i) => row.forEach((point, j) => { positions.push(...point); const color = new Color(colors[i][j]); rgb.push(color.r, color.g, color.b); }));
        for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < columns - 1; j++) { const a = i * columns + j, b = a + columns; indices.push(a,b,a+1,a+1,b,b+1); }
        geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
        geometry.setAttribute('color', new BufferAttribute(new Float32Array(rgb), 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
        next.add(new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })));
        nextCount++;
      },
      glow(position, color, size = 1) {
        if (!position.every(Number.isFinite) || !Number.isFinite(size) || size <= 0) throw new RangeError('Glow requires finite coordinates and a positive size.');
        dots(new Float32Array(position), color, size, false);
      },
      flow(points, { color, count: particles = 160, speed = .12, size = .045, spread = .06, seed = 17 }) {
        if (!Number.isInteger(particles) || particles < 0 || particles > 5000 || ![speed, size, spread, seed].every(Number.isFinite) || speed < 0 || size <= 0 || spread < 0) throw new RangeError('Invalid particle flow settings.');
        if (!particles) return;
        const curve = curveFor(points), path = curve.getPoints(256);
        const positions = new Float32Array(particles * 3);
        const attribute = dots(positions, color, size);
        let randomState = seed >>> 0;
        const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
        const offsets = Array.from({ length: particles }, (_, i) => ({ phase: (i + random()) / particles, x: (random() - .5) * spread, y: (random() - .5) * spread, z: (random() - .5) * spread }));
        const animate = (time: number) => {
          offsets.forEach((offset, i) => {
            const phase = ((offset.phase + time * speed) % 1) * 256;
            const index = Math.min(255, Math.floor(phase)), blend = phase - index;
            const a = path[index], b = path[index + 1];
            attribute.setXYZ(i, a.x + (b.x-a.x)*blend + offset.x, a.y + (b.y-a.y)*blend + offset.y, a.z + (b.z-a.z)*blend + offset.z);
          });
          attribute.needsUpdate = true;
        };
        animate(elapsed); nextAnimations.push(animate);
      },
      box({ x, y, z, width, height, depth, color, opacity = 1 }) {
        if (![x, y, z, width, height, depth, opacity].every(Number.isFinite) || width < 0 || height < 0 || depth < 0) throw new RangeError('Chart boxes require finite coordinates and nonnegative dimensions.');
        if (!width || !height || !depth) return;
        const mesh = new Mesh(new BoxGeometry(width, height, depth), new MeshBasicMaterial({ color, opacity, transparent: opacity < 1 }));
        mesh.position.set(x, y, z); next.add(mesh); nextCount++;
      },
      bar({ x, z, value, base = 0, width = .6, depth = .6, color, opacity = 1 }) {
        chart.box({ x, y: base + value / 2, z, width, height: Math.abs(value), depth, color, opacity });
      },
      point(position, color, radius = .06) {
        if (!position.every(Number.isFinite) || !Number.isFinite(radius) || radius <= 0) throw new RangeError('Chart points require finite coordinates and a positive radius.');
        const mesh = new Mesh(new SphereGeometry(radius, 10, 8), new MeshBasicMaterial({ color }));
        mesh.position.fromArray(position); next.add(mesh); nextCount++;
      },
      line(points, color, opacity = 1) {
        if (points.some(point => !point.every(Number.isFinite))) throw new RangeError('Chart lines require finite coordinates.');
        if (points.length < 2) return;
        next.add(new Line(new BufferGeometry().setFromPoints(points.map(point => new Vector3(...point))), new LineBasicMaterial({ color, opacity, transparent: opacity < 1 })));
        nextCount++;
      },
      label(text, position, size = .23, color = '#bacbd3') {
        // Node tests exercise data and geometry without requiring a DOM shim.
        if (typeof document === 'undefined') { const label = new Group(); label.name = text; label.position.fromArray(position); next.add(label); return; }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Labels require a 2D canvas.');
        ctx.font = '500 32px system-ui, sans-serif';
        canvas.width = Math.ceil(ctx.measureText(text).width) + 20; canvas.height = 50;
        ctx.font = '500 32px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(7,10,14,.82)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = color; ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
        const material = new SpriteMaterial({ map, depthTest: false, depthWrite: false, toneMapped: false });
        const sprite = new Sprite(material);
        // Sprite's default quad is global. Own one clone per chart so clearing a
        // preview cannot dispose the quad used by another live renderer.
        labelGeometry ??= sprite.geometry.clone(); sprite.geometry = labelGeometry;
        sprite.name = text; sprite.position.fromArray(position);
        sprite.scale.set(size * 1.45 * canvas.width / canvas.height, size * 1.45, 1); sprite.renderOrder = 10; next.add(sprite);
      },
      frame({ x, y, z, xTicks = [], yTicks = [], zTicks = [], xLabel, yLabel, zLabel }) {
        const grid = '#304350', axis = '#647b86';
        // Front-left origin, with a floor grid and a sparse back-plane Y guide.
        chart.line([[x[0],y[0],z[0]],[x[1],y[0],z[0]],[x[1],y[0],z[1]],[x[0],y[0],z[1]],[x[0],y[0],z[0]]], grid);
        chart.line([[x[0],y[0],z[1]],[x[1],y[0],z[1]]], axis);
        chart.line([[x[0],y[0],z[1]],[x[0],y[1],z[1]]], axis);
        for (const tick of xTicks) {
          chart.line([[tick.value,y[0],z[0]],[tick.value,y[0],z[1]]], grid, .65);
          chart.label(tick.label, [tick.value,y[0]-.3,z[1]+.2], .21);
        }
        for (const tick of yTicks) {
          chart.line([[x[0],tick.value,z[0]],[x[1],tick.value,z[0]]], grid, .65);
          chart.label(tick.label, [x[0]-.5,tick.value,z[1]], .21);
        }
        for (const tick of zTicks) {
          chart.line([[x[0],y[0],tick.value],[x[1],y[0],tick.value]], grid, .65);
          chart.label(tick.label, [x[1]+.6,y[0]-.05,tick.value], .21);
        }
        if (xLabel) chart.label(xLabel, [(x[0]+x[1])/2,y[0]-.8,z[1]+.3], .25, '#e1edf1');
        if (yLabel) chart.label(yLabel, [x[0],y[1]+.55,z[1]], .25, '#e1edf1');
        if (zLabel) chart.label(zLabel, [x[1]+.65,y[0]-.65,(z[0]+z[1])/2], .25, '#e1edf1');
      },
    };
    try { draw(chart); } catch (error) { release(next); throw error; }
    release(content); object.remove(content); content = next; object.add(content); count = nextCount; animations = nextAnimations;
  }
  redraw(build);
  return {
    object, kind: 'analyticalChart', get count() { return count; },
    update(_time, delta) { if (disposed || !Number.isFinite(delta) || delta <= 0) return; elapsed += delta; for (const animate of animations) animate(elapsed); }, set() {}, redraw,
    dispose() { if (disposed) return; disposed = true; animations = []; release(content); object.removeFromParent(); object.clear(); },
  };
}
