import { createChartLayer, type ChartBuilder, type Position } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

const TAU = Math.PI * 2, RAD = Math.PI / 180;

/** A deliberately synthetic, bounded meander; no observed atmospheric data. */
export function jetLatitude(longitude: number, hemisphere: -1 | 1, center: number, amplitude: number): number {
  if (![longitude, center, amplitude].every(Number.isFinite) || ![-1, 1].includes(hemisphere) || center < 20 || center > 55 || amplitude < 2 || amplitude > 22) throw new RangeError('Invalid synthetic jet settings.');
  return hemisphere * center + amplitude * (.7 * Math.sin(3 * longitude + hemisphere * .6) + .3 * Math.sin(5 * longitude - .8));
}
export function globePosition(longitude: number, latitude: number, radius: number): Position {
  return [radius * Math.cos(latitude * RAD) * Math.cos(longitude), radius * Math.sin(latitude * RAD), radius * Math.cos(latitude * RAD) * Math.sin(longitude)];
}

const example: ExampleDefinition = {
  id: 'jet-stream', title: 'Jet-stream atlas', category: 'Climate',
  summary: 'Luminous atmospheric ribbons wrap a gridded globe in moving currents.',
  description: 'Two synthetic jet belts snake around a translucent globe. Multiple streamlines reveal each belt’s width and direction, while moving light traces the full path around the far hemisphere. Change the latitude and meander to reshape the circulation.',
  tags: ['Atmospheric ribbons', 'Spherical geometry', 'Flow'], difficulty: 'Advanced', accent: '#72dcf5',
  camera: [6.2, 4.2, 9.4], target: [0, 0, 0], bloom: .42,
  dataNote: 'Illustrative globe with no geographic or weather dataset. Latitude = signed center + amplitude × (0.7 sin(3 longitude + signed 0.6) + 0.3 sin(5 longitude − 0.8)); longitude is in radians, latitude in degrees. Bands share an invented eastward direction. Heights, belt width, opacity, colors, and particle density are presentation choices; playback cycles are not wind speed. This is not a weather forecast or atmospheric solver.',
  setup(app) {
    let center = 36, amplitude = 12, speed = .1;
    function draw(chart: ChartBuilder) {
      const globe = Array.from({ length: 25 }, (_, i) => Array.from({ length: 65 }, (_, j) => globePosition(j / 64 * TAU, -90 + i / 24 * 180, 2.75)));
      chart.surface(globe, globe.map((row, i) => row.map((_, j) => (i < 4 || i > 20) ? '#284a63' : j > 26 && j < 50 ? '#102d43' : '#17465a')), .37);
      for (const latitude of [-60, -30, 0, 30, 60]) {
        const path = Array.from({ length: 81 }, (_, j) => globePosition(j / 80 * TAU, latitude, 2.77));
        chart.line(path, latitude === 0 ? '#477b8c' : '#294b65', latitude === 0 ? .75 : .55);
      }
      for (let meridian = 0; meridian < 12; meridian++) chart.line(Array.from({ length: 49 }, (_, j) => globePosition(meridian / 12 * TAU, -90 + j / 48 * 180, 2.78)), '#2b4b65', .48);
      chart.ring([0, -3.1, 0], 3.55, '#25445f', .014);
      chart.line([[0, -3.2, 0], [0, 3.5, 0]], '#42627c', .55);
      chart.label('N', [0, 3.65, 0], .2, '#adcbd8');
      for (const hemisphere of [-1, 1] as const) {
        const color = hemisphere === 1 ? '#63e4e9' : '#b7a0ff';
        const pathAt = (offset: number, radius: number) => Array.from({ length: 121 }, (_, i) => {
          const longitude = i / 120 * TAU;
          return globePosition(longitude, jetLatitude(longitude, hemisphere, center, amplitude) + offset, radius);
        });
        const band = [pathAt(-3.5, 2.9), pathAt(3.5, 2.9)];
        chart.surface(band, band.map(row => row.map(() => color)), .19);
        chart.tube(pathAt(-3.5, 2.91), color, .012, .28);
        chart.tube(pathAt(3.5, 2.91), color, .012, .28);
        for (let lane = 0; lane < 9; lane++) {
          const offset = (lane - 4) * .72;
          const path = pathAt(offset, 2.96 + .025 * Math.cos(lane));
          chart.flow(path, { color, count: 150, speed: speed * (1 - Math.abs(lane - 4) * .035), size: .035, spread: .022, seed: lane + (hemisphere + 1) * 30 });
          if (lane === 4) chart.tube(path, color, .017, .6);
        }
      }
      chart.label('SYNTHETIC CIRCULATION', [0, -3.55, 0], .23, '#92b7cc');
    }
    const layer = createChartLayer(draw); app.add(layer);
    const refresh = () => layer.redraw(draw);
    return {
      controls: [
        { id: 'latitude', label: 'Belt latitude centers', min: 20, max: 55, step: 1, value: center, format: value => `±${value}°`, apply(value) { center = value; refresh(); } },
        { id: 'meander', label: 'Meander amplitude', min: 2, max: 22, step: 1, value: amplitude, format: value => `${value}°`, apply(value) { amplitude = value; refresh(); } },
        { id: 'flow', label: 'Tracer playback', min: .025, max: .25, step: .025, value: speed, format: value => `${value.toFixed(3)} cycles/s`, apply(value) { speed = value; refresh(); } },
      ],
      readout: () => ({
        metrics: [{ label: 'Belt centers', value: `±${center}°`, detail: 'Synthetic latitude reference' }, { label: 'Meander bound', value: `±${amplitude}°`, detail: 'Maximum bound on the two-wave sum' }, { label: 'Central tracer period', value: `${(1 / speed).toFixed(1)} s`, detail: 'Presentation time; not meteorological time' }],
        legend: [{ label: 'Northern belt', color: '#63e4e9' }, { label: 'Southern belt', color: '#b7a0ff' }],
        table: { caption: 'Synthetic centerline samples; both belts use the same longitude scale.', columns: ['Longitude deg', 'Northern latitude deg', 'Southern latitude deg'], rows: Array.from({ length: 12 }, (_, i) => [i * 30, +jetLatitude(i / 12 * TAU, 1, center, amplitude).toFixed(3), +jetLatitude(i / 12 * TAU, -1, center, amplitude).toFixed(3)]) },
      }),
    };
  },
};
export default example;
