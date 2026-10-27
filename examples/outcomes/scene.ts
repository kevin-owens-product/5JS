import { BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, Float32BufferAttribute, Group, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, Points, PointsMaterial, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Vector3 } from 'three';
import type { FiveLayer } from '../../src/types.js';
import { conversionModel, palette, productModel, retentionModel, type Decision, type OutcomeDataset, type Segment } from './model.js';

export interface DecisionScene extends FiveLayer {
  configure(decision: Decision, segment: Segment, scenario: number): void;
  select(id: string): void;
  readonly targets: readonly Mesh[];
}
/** Spatial views retain exact data in the adjacent accessible readouts. */
export function createDecisionScene(data: OutcomeDataset, initial: Decision = 'conversion'): DecisionScene {
  const object = new Group(), owned = new Set<{ dispose(): void }>();
  let targets: Mesh[] = [], tracks: { object: Mesh; curve: CatmullRomCurve3; offset: number }[] = [], selected = '', decision = initial, segment: Segment = 'All accounts', scenario = initial === 'conversion' ? 25 : initial === 'retention' ? 100 : 3, disposed = false;
  let phase = 0, tracerPositions: Float32BufferAttribute | undefined;
  const own = <T extends { dispose(): void }>(resource: T): T => { owned.add(resource); return resource; };
  const vector = (x: number, y: number, z: number) => new Vector3(x, y, z);
  function label(text: string, position: Vector3, color = '#c6d9cd', size = .24) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 72;
    const context = canvas.getContext('2d'); if (!context) return;
    context.font = '26px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = color; context.fillText(text, 320, 36);
    const texture = own(new CanvasTexture(canvas)); texture.colorSpace = SRGBColorSpace;
    const sprite = new Sprite(own(new SpriteMaterial({ map: texture, transparent: true, depthTest: false })));
    // Sprite defaults to a global geometry; own a clone so teardown releases every uploaded buffer.
    sprite.geometry = own(sprite.geometry.clone()); sprite.position.copy(position); sprite.scale.set(size * 640 / 26, size * 72 / 26, 1); object.add(sprite);
  }
  function line(points: Vector3[], color: string, opacity = 1) {
    const geometry = own(new BufferGeometry().setFromPoints(points)), material = own(new LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
    const path = new Line(geometry, material); object.add(path); return path;
  }
  function bead(position: Vector3, color: string, id: string, radius = .075) {
    const mesh = new Mesh(own(new SphereGeometry(radius, 10, 8)), own(new MeshBasicMaterial({ color })));
    mesh.position.copy(position); mesh.userData.recordId = id; mesh.userData.baseColor = color; mesh.userData.baseRadius = radius; object.add(mesh); targets.push(mesh); return mesh;
  }
  function draw() {
    if (disposed) throw new Error('The decision scene is disposed.');
    object.clear(); owned.forEach(item => item.dispose()); owned.clear(); targets = []; tracks = []; tracerPositions = undefined;
    const accent = palette[decision];
    for (let x = -8; x <= 8; x++) line([vector(x, -1.9, -5), vector(x, -1.9, 5)], '#30414a', .23);
    for (let z = -5; z <= 5; z++) line([vector(-8, -1.9, z), vector(8, -1.9, z)], '#30414a', .23);
    const dust = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) { dust[i * 3] = Math.sin(i * 3.71) * 12; dust[i * 3 + 1] = Math.cos(i * 1.93) * 6; dust[i * 3 + 2] = Math.sin(i * 7.17) * 8 - 5; }
    const dustGeometry = own(new BufferGeometry()); dustGeometry.setAttribute('position', new Float32BufferAttribute(dust, 3));
    object.add(new Points(dustGeometry, own(new PointsMaterial({ color: '#708a94', size: .022, transparent: true, opacity: .35 }))));
    if (decision === 'conversion') {
      const model = conversionModel(data, segment, scenario), sessionMap = new Map(data.sessions.map(row => [row.id, row]));
      model.stages.forEach((count, stage) => {
        const radius = Math.sqrt(count / Math.max(1, model.attempts.length)) * 2.05, x = -6 + stage * 4;
        for (let ring = 0; ring < 3; ring++) line(Array.from({ length: 97 }, (_, i) => vector(x + ring * .06, Math.cos(i / 96 * Math.PI * 2) * radius, Math.sin(i / 96 * Math.PI * 2) * radius)), accent, ring === 0 ? .65 : .16);
        line([vector(x, -2.15, -2.3), vector(x, -2.15, 2.3)], accent, .35);
        label(`${count} ${['STARTED', 'ADDRESS', 'PAYMENT', 'COMPLETE'][stage]}`, vector(x, 2.9, 0), accent, .17);
      });
      model.attempts.forEach((attempt, index) => {
        const angle = index / model.attempts.length * Math.PI * 2, accountId = sessionMap.get(attempt.sessionId)!.accountId;
        const positions = Array.from({ length: attempt.stage + 2 }, (_, k) => { const stage = Math.min(k, attempt.stage), radius = Math.sqrt(model.stages[stage] / Math.max(1, model.attempts.length)) * (1.35 + (index % 5) * .1); return vector(-6 + stage * 4 + (k > attempt.stage ? .3 : 0), Math.cos(angle) * radius, Math.sin(angle) * radius); });
        if (attempt.stage < 3) positions.push(vector(-6 + attempt.stage * 4 + 1.1, -2.8 - index % 3 * .12, Math.sin(angle) * .8));
        const curve = new CatmullRomCurve3(positions), color = attempt.stage === 3 ? accent : palette.negative;
        line(curve.getPoints(36), color, .10);
        bead(curve.getPoint(1), color, accountId, attempt.stage === 3 ? .052 : .065);
        const point = bead(curve.getPoint(.5), color, accountId, .04); tracks.push({ object: point, curve, offset: index * .073 });
      });
    } else if (decision === 'retention') {
      const model = retentionModel(data, segment, scenario);
      model.cohorts.forEach((cohort, index) => {
        const z = -3 + index * 3, color = ['#b6a5ff', '#8ac9ed', '#a2dec9'][index];
        const points = cohort.counts.map((count, week) => vector(-6 + week * 4, -1.6 + count / Math.max(1, cohort.members.length) * 5.2, z));
        line(points, color, .95);
        label(`${cohort.name.toUpperCase()} / ${cohort.counts[3]} OF ${cohort.members.length} ACTIVE`, vector(1, 4.4, z), color, .17);
        for (let i = 0; i < 6; i++) {
          const marker = new Mesh(own(new SphereGeometry(.055, 8, 6)), own(new MeshBasicMaterial({ color })));
          object.add(marker); tracks.push({ object: marker, curve: new CatmullRomCurve3(points, false, 'catmullrom', 0), offset: i / 6 + index * .07 });
        }
        for (let k = 0; k < 3; k++) {
          const a = points[k], b = points[k + 1], vertices = [a.x, -1.6, z, a.x, a.y, z, b.x, b.y, z, a.x, -1.6, z, b.x, b.y, z, b.x, -1.6, z];
          const geometry = own(new BufferGeometry()); geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
          object.add(new Mesh(geometry, own(new MeshBasicMaterial({ color, transparent: true, opacity: .075, side: 2, depthWrite: false }))));
        }
        points.forEach(point => { const marker = new Mesh(own(new SphereGeometry(.085, 12, 8)), own(new MeshBasicMaterial({ color }))); marker.position.copy(point); object.add(marker); line([vector(point.x, -1.7, z), point], color, .25); });
        cohort.members.forEach((account, i) => {
          const inQueue = model.queue.some(row => row.id === account.id), active = data.usage.find(row => row.accountId === account.id && row.week === 12)!.active;
          bead(vector(-5.5 + i * 11 / Math.max(1, cohort.members.length - 1), -1.68, z), inQueue ? '#f7c27c' : active ? color : '#e797a2', account.id, inQueue ? .13 : .085);
        });
      });
    } else {
      const model = productModel(data, segment, scenario), maxCustomers = Math.max(1, ...model.initiatives.map(row => row.customers));
      model.initiatives.forEach((feature, i) => {
        const center = vector(-6 + feature.customers / maxCustomers * 12, -1.1 + feature.effort * 1.1, (i - 1) * 4), color = ['#f6b98a', '#b6a5ff', '#8fd9d0'][i];
        bead(center, color, feature.id, .28);
        label(feature.name.toUpperCase(), center.clone().add(vector(0, 1.55, 0)), color, .19);
        label(`${feature.customers} ACCOUNTS / ${feature.effort} WEEKS`, center.clone().add(vector(0, 1.18, 0)), '#a2b8b4', .12);
        line([vector(center.x, -1.8, center.z), center], color, .28);
        const ring = Array.from({ length: 65 }, (_, k) => center.clone().add(vector(Math.cos(k / 64 * Math.PI * 2) * 1.2, Math.sin(k / 64 * Math.PI * 2) * .4, Math.sin(k / 64 * Math.PI * 2) * .9)));
        line(ring, color, feature.feasible ? .5 : .15);
        feature.evidence.forEach((item, index) => {
          const angle = index / Math.max(1, feature.evidence.length) * Math.PI * 2, radius = 1.1 + index % 3 * .16;
          const location = center.clone().add(vector(Math.cos(angle) * radius, Math.sin(angle) * .75, Math.sin(angle) * .9));
          const stanceColor = item.stance === 'contradicts' ? palette.negative : item.stance === 'mixed' ? '#d8cda7' : color;
          line([center, location], stanceColor, .2); const point = bead(location, stanceColor, item.accountId, .065);
          point.userData.featureId = feature.id; point.userData.interviewId = item.id;
          const tracer = bead(location, stanceColor, item.accountId, .045); tracer.userData.featureId = feature.id; tracer.userData.interviewId = item.id;
          tracks.push({ object: tracer, curve: new CatmullRomCurve3([location, center], false, 'catmullrom', 0), offset: index * .137 });
        });
        const disk = new Mesh(own(new CylinderGeometry(.6, .6, .015, 40)), own(new MeshBasicMaterial({ color, transparent: true, opacity: .12 }))); disk.position.set(center.x, -1.8, center.z); object.add(disk);
      });
      line([vector(-6, -1.8, 0), vector(6, -1.8, 0)], accent, .5);
      line([vector(-6, -1.8, 0), vector(-6, 5.2, 0)], accent, .5);
      label('DISTINCT INTERVIEWED ACCOUNTS', vector(0, -2.45, 0), '#9fb7ae', .16);
      for (const fraction of [0, .5, 1]) label(String(Number((maxCustomers * fraction).toFixed(1))), vector(-6 + fraction * 12, -2, 0), '#9fb7ae', .16);
      label('DISCOVERY / WEEKS', vector(-6, 6.1, 0), '#9fb7ae', .16);
      for (const weeks of [2, 4, 6]) { const y = -1.1 + weeks * 1.1; line([vector(-6.15,y,0),vector(-5.85,y,0)],accent,.5);label(String(weeks),vector(-6.55,y,0),'#9fb7ae',.16); }
    }
    if (tracks.length) {
      tracerPositions = new Float32BufferAttribute(new Float32Array(tracks.length * 3), 3);
      const colors = new Float32Array(tracks.length * 3);
      tracks.forEach((track, i) => { track.object.position.copy(track.curve.getPoint((phase + track.offset) % 1)); tracerPositions!.setXYZ(i, track.object.position.x, track.object.position.y, track.object.position.z); (track.object.material as MeshBasicMaterial).color.toArray(colors, i * 3); });
      const geometry = own(new BufferGeometry()); geometry.setAttribute('position', tracerPositions); geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
      object.add(new Points(geometry, own(new PointsMaterial({ size: .055, vertexColors: true, transparent: true, opacity: .8 }))));
    }
    select(selected);
  }
  function select(id: string) {
    selected = id;
    for (const target of targets) { const match = target.userData.recordId === id; target.scale.setScalar(match ? 1.9 : 1); (target.material as MeshBasicMaterial).color.copy(new Color(match ? '#ffffff' : target.userData.baseColor)); }
  }
  draw();
  return {
    object, kind: 'motif-decision', get count() { return targets.length; }, get targets() { return targets; },
    update(_time, delta) {
      if (disposed || !Number.isFinite(delta) || delta <= 0) return;
      phase = (phase + Math.min(delta, 1) * .075) % 1;
      tracks.forEach((item, i) => { item.object.position.copy(item.curve.getPoint((phase + item.offset) % 1)); tracerPositions?.setXYZ(i, item.object.position.x, item.object.position.y, item.object.position.z); });
      if (tracerPositions) tracerPositions.needsUpdate = true;
    },
    set() {}, select,
    configure(next, filter, assumption) { decision = next; segment = filter; scenario = assumption; draw(); },
    dispose() { if (disposed) return; disposed = true; object.clear(); owned.forEach(item => item.dispose()); owned.clear(); targets = []; tracks = []; },
  };
}
