import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export interface GridSettings { demand: number; solar: number; wind: number }
export function calculateDispatch(input: GridSettings) {
  if (![input.demand, input.solar, input.wind].every(Number.isFinite) || input.demand < 180 || input.demand > 480 || input.solar < .2 || input.solar > 1 || input.wind < .2 || input.wind > 1) throw new RangeError('Invalid dispatch scenario.');
  const sources = [{ name: 'Solar', available: 140 * input.solar, color: '#f6cd7b' }, { name: 'Wind', available: 180 * input.wind, color: '#78e6ca' }, { name: 'Hydro', available: 80, color: '#70b5fa' }];
  const available = sources.reduce((total, source) => total + source.available, 0);
  const served = Math.min(input.demand, available);
  const generators = sources.map(source => ({ ...source, dispatched: source.available * served / available }));
  const districts = [{ name: 'Central', share: .46 }, { name: 'Harbor', share: .32 }, { name: 'Research', share: .22 }].map(district => ({ ...district, demand: input.demand * district.share, served: served * district.share, unmet: (input.demand - served) * district.share }));
  return { available, served, unserved: input.demand - served, curtailment: available - served, generators, districts };
}

const example: ExampleDefinition = {
  id: 'grid-dispatch', title: 'Renewable dispatch network', category: 'Energy',
  summary: 'Route synthetic renewable power through a miniature illuminated grid.',
  description: 'Solar arrays, wind rotors, and a hydro station feed a central bus that serves three districts. Tube cross-sectional areas follow dispatched MW. Demand and renewable availability reshape the flows; amber demand rings expose shortfalls without inventing missing power.',
  tags: ['Energy network', 'Conservation', 'Scenario'], difficulty: 'Advanced', accent: '#8de6bf',
  camera: [7.8, 7.8, 12.2], target: [0, .5, 0], bloom: .4,
  dataNote: 'Synthetic instantaneous MW allocation. Available supply = 140×solar factor + 180×wind factor + 80 hydro. Served = min(demand, available). Each source dispatches proportionally to its available MW; districts receive fixed 46%/32%/22% shares. No transmission loss, storage, dispatch priority, line constraints, AC power-flow calculation, or real grid data. Tube radius = 0.24×sqrt(MW/180), so cross-sectional area is proportional to dispatched MW. District arcs show served/demand. Infrastructure geometry, rotor motion, and tracers are decorative; they do not estimate physical equipment output.',
  setup(app) {
    let input: GridSettings = { demand: 310, solar: .75, wind: .7 };
    let model = calculateDispatch(input);
    function draw(chart: ChartBuilder) {
      for (let x = -5; x <= 5; x++) chart.line([[x, -.2, -3.6], [x, -.2, 3.6]], '#18354a', .5);
      for (let z = -3; z <= 3; z++) chart.line([[-5.2, -.2, z], [5.2, -.2, z]], '#18354a', .5);
      chart.ring([0, .1, 0], .9, '#376979', .025);
      chart.ring([0, .55, 0], .7, '#85c9d7', .035);
      chart.ring([0, 1, 0], .45, '#a8e7de', .03);
      chart.glow([0, .6, 0], '#93f2dc', 1.4);
      chart.label(`${model.served.toFixed(0)} MW SERVED`, [0, 1.6, 0], .26, '#d1f1e3');
      chart.label(model.unserved > .01 ? `${model.unserved.toFixed(0)} MW UNMET` : `${model.curtailment.toFixed(0)} MW CURTAILED`, [0, 2.05, 0], .21, model.unserved > 0 ? '#ff9f85' : '#7da8ba');
      model.generators.forEach((source, index) => {
        const z = (index - 1) * 2.5, x = -4;
        chart.ring([x, -.1, z], .78, '#2b5366', .02);
        if (index === 0) {
          for (let panel = 0; panel < 6; panel++) {
            const px = x - .55 + panel % 3 * .55, pz = z - .4 + Math.floor(panel / 3) * .65;
            const sheet: Position[][] = [[[px - .22, .25, pz - .22], [px + .22, .25, pz - .22]], [[px - .22, .48, pz + .22], [px + .22, .48, pz + .22]]];
            chart.surface(sheet, [['#277eab', '#4b9ac1'], ['#1a405e', '#3076a0']], .85);
            chart.line([sheet[0][0], sheet[0][1], sheet[1][1], sheet[1][0], sheet[0][0]], '#89d8e2', .75);
          }
        } else if (index === 1) {
          chart.tube([[x, -.1, z], [x, 1.3, z]], '#7ba6b7', .045, .8);
          chart.point([x, 1.3, z], '#c8eee8', .1);
        } else {
          chart.surface([[[x - .65, 0, z - .2], [x + .65, 0, z - .2]], [[x - .65, .8, z + .15], [x + .65, .8, z + .15]]], [['#20455e', '#20455e'], ['#6492a7', '#6492a7']], .8);
          for (let chute = 0; chute < 4; chute++) {
            const water: Position[] = [[x - .45 + chute * .3, .8, z + .18], [x - .45 + chute * .3, .4, z + .4], [x - .45 + chute * .3, -.05, z + .6]];
            chart.flow(water, { color: '#8fc9ff', count: 60, speed: .3, size: .03, spread: .025, seed: 80 + chute });
          }
        }
        chart.label(source.name.toUpperCase(), [x, index === 1 ? 2.3 : 1.15, z], .24, source.color);
        chart.label(`${source.dispatched.toFixed(0)} / ${source.available.toFixed(0)} MW`, [x, index === 1 ? 1.98 : .88, z], .18, '#a5bcc9');
        const path: Position[] = [[x + .7, .25, z], [-2.2, .65, z], [-1.2, .9, z * .4], [0, .6, 0]];
        const radius = .24 * Math.sqrt(source.dispatched / 180);
        chart.tube(path, source.color, radius, .27);
        chart.flow(path, { color: source.color, count: 210, speed: .14, size: .045, spread: radius * .8, seed: 20 + index });
      });
      model.districts.forEach((district, index) => {
        const x = 4, z = (index - 1) * 2.5, ratio = district.served / district.demand;
        const color = district.unmet > .01 ? '#ffae79' : '#8de6bf';
        chart.ring([x, -.08, z], .85, '#734638', .025);
        chart.ring([x, -.07, z], .85, color, .034, 'y', ratio * Math.PI * 2);
        for (let block = 0; block < 6; block++) {
          const height = .25 + ((block * 3 + index * 2) % 7) * .1;
          chart.box({ x: x - .38 + block % 3 * .4, y: height / 2, z: z - .25 + Math.floor(block / 3) * .55, width: .23, height, depth: .3, color: '#29475c', opacity: .9 });
          chart.line([[x - .38 + block % 3 * .4, height, z - .4 + Math.floor(block / 3) * .55], [x - .38 + block % 3 * .4, height, z - .1 + Math.floor(block / 3) * .55]], color, .75);
        }
        const path: Position[] = [[0, .6, 0], [1.25, 1, z * .35], [2.3, .65, z], [x - .8, .2, z]];
        const radius = .24 * Math.sqrt(district.served / 180);
        chart.tube(path, '#7cddc0', radius, .3);
        chart.flow(path, { color: '#a4ffe3', count: 220, speed: .14, size: .04, spread: radius * .8, seed: 40 + index });
        chart.label(district.name.toUpperCase(), [x, 1.45, z], .23, color);
        chart.label(`${district.served.toFixed(0)} / ${district.demand.toFixed(0)} MW`, [x, 1.15, z], .18, '#bad3d3');
      });
    }
    const layer = createChartLayer(draw); app.add(layer);
    const rotor = createChartLayer(chart => {
      for (let blade = 0; blade < 3; blade++) {
        const a = blade / 3 * Math.PI * 2;
        const point = (radius: number, angle: number): Position => [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
        chart.surface([[point(.12, a - .15), point(.12, a + .15)], [point(.7, a - .08), point(.7, a + .025)]], [['#8cd9d5', '#8cd9d5'], ['#c3eee7', '#c3eee7']], .85);
      }
    });
    rotor.object.position.set(-4, 1.3, 0); rotor.object.rotation.z = .3;
    const update = rotor.update.bind(rotor), dispose = rotor.dispose.bind(rotor);
    let rotorDisposed = false;
    rotor.update = (time, delta) => { if (rotorDisposed) return; update(time, delta); if (Number.isFinite(delta) && delta > 0) rotor.object.rotation.z = (rotor.object.rotation.z + delta * input.wind * 2) % (Math.PI * 2); };
    rotor.dispose = () => { rotorDisposed = true; dispose(); };
    app.add(rotor);
    const change = (patch: Partial<GridSettings>) => { const next = { ...input, ...patch }; const result = calculateDispatch(next); input = next; model = result; layer.redraw(draw); };
    return {
      controls: [
        { id: 'demand', label: 'District demand', min: 180, max: 480, step: 10, value: input.demand, format: value => `${value} MW`, apply: value => change({ demand: value }) },
        { id: 'solar', label: 'Solar availability', min: .2, max: 1, step: .05, value: input.solar, format: value => `${(value * 100).toFixed(0)}%`, apply: value => change({ solar: value }) },
        { id: 'wind', label: 'Wind availability', min: .2, max: 1, step: .05, value: input.wind, format: value => `${(value * 100).toFixed(0)}%`, apply: value => change({ wind: value }) },
      ],
      readout: () => ({
        metrics: [{ label: 'Available generation', value: `${model.available.toFixed(1)} MW`, detail: `${model.curtailment.toFixed(1)} MW curtailed` }, { label: 'Served demand', value: `${model.served.toFixed(1)} MW`, detail: `${(model.served / input.demand * 100).toFixed(1)}% of requested demand` }, { label: 'Unserved demand', value: `${model.unserved.toFixed(1)} MW`, detail: 'No phantom supply added to the network' }],
        legend: [{ label: 'Solar', color: '#f6cd7b' }, { label: 'Wind', color: '#78e6ca' }, { label: 'Hydro', color: '#70b5fa' }, { label: 'District shortfall', color: '#ffae79' }],
        table: { caption: 'Synthetic instantaneous allocation, MW. Generator available = dispatched + curtailed; district requested = served + unmet.', columns: ['Node', 'Type', 'Available or requested MW', 'Dispatched or served MW', 'Curtailed or unmet MW'], rows: [...model.generators.map(row => [row.name, 'Generator', +row.available.toFixed(2), +row.dispatched.toFixed(2), +(row.available - row.dispatched).toFixed(2)]), ...model.districts.map(row => [row.name, 'District', +row.demand.toFixed(2), +row.served.toFixed(2), +row.unmet.toFixed(2)])] },
      }),
    };
  },
};
export default example;
