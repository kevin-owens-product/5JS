import { Color } from 'three';
import { createChartLayer, type ChartBuilder } from '../shared/chart.js';
import type { ExampleDefinition } from '../types.js';

export const BREAK_EVEN_PRICES = Object.freeze([20, 30, 40, 50, 60, 70]);
export const BREAK_EVEN_VOLUMES = Object.freeze([0, 500, 1_000, 1_500, 2_000, 2_500]);
export interface BreakEvenInput { fixedCost: number; unitCost: number }
function operatingProfit(price: number, volume: number, unitCost: number, fixedCost: number) {
  const revenue = price * volume, variableCost = unitCost * volume;
  const profit = revenue - variableCost - fixedCost;
  const roundoff = Number.EPSILON * 4 * Math.max(Math.abs(revenue), Math.abs(variableCost), Math.abs(fixedCost));
  return Math.abs(profit) <= roundoff ? 0 : profit;
}
export function calculateBreakEvenGrid(input: BreakEvenInput) {
  if (![input.fixedCost, input.unitCost].every(value => Number.isFinite(value) && value >= 0)) throw new RangeError('Fixed cost and unit cost must be finite and nonnegative.');
  const rows = BREAK_EVEN_PRICES.flatMap(price => BREAK_EVEN_VOLUMES.map(volume => {
    const revenue = price * volume;
    const totalCost = input.fixedCost + input.unitCost * volume;
    if (!Number.isFinite(totalCost)) throw new RangeError('Modeled total cost must remain finite.');
    return { price, volume, revenue, totalCost, profit: operatingProfit(price, volume, input.unitCost, input.fixedCost) };
  }));
  const thresholds = BREAK_EVEN_PRICES.map(price => {
    let exactUnits: number | null = input.fixedCost === 0 ? 0 : null;
    if (input.fixedCost > 0 && price > input.unitCost) {
      exactUnits = input.fixedCost / (price - input.unitCost);
      if (!Number.isFinite(exactUnits)) throw new RangeError('Break-even volume exceeds the finite numeric range.');
      const upper = Math.ceil(exactUnits);
      if (![upper * price, upper * input.unitCost, upper * input.unitCost + input.fixedCost].every(Number.isFinite)) throw new RangeError('Break-even revenue and costs must remain finite.');
      const nearest = Math.round(exactUnits);
      // Do not ceil a floating-point cancellation artifact into an extra unit.
      if (operatingProfit(price, nearest, input.unitCost, input.fixedCost) === 0) exactUnits = nearest;
    }
    return { price, exactUnits, units: exactUnits === null ? null : Math.ceil(exactUnits) };
  });
  return { ...input, rows, thresholds, profitableCases: rows.filter(row => row.profit > 0).length, zeroCases: rows.filter(row => row.profit === 0).length };
}
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const example: ExampleDefinition = {
  id: 'break-even', title: 'Break-even landscape', category: 'Business',
  summary: 'Cut through a profit landscape with exact break-even walls and reference slices.',
  description: 'Explore a cutaway operating-profit landscape. Cyan and magenta terrain rises above or drops below a visible zero plane, with all 36 tabulated scenarios marked on the surface. A gold curtain follows the break-even boundary; $50-price and 1,500-unit cross-sections expose the slopes. Change costs to reshape the terrain while light guides trace exact profit contours.',
  tags: ['Profit terrain', 'Zero contour', 'Sensitivity'], difficulty: 'Advanced', accent: '#7ce8d7',
  camera: [10.2, 6.5, 12.2], target: [0, 0, 0], bloom: .38, previewTime: 4,
  dataNote: 'Synthetic USD/month and units/month. At each price/volume pair: profit = volume × (price−unit cost) − fixed cost. Prices are $20…$70 and volumes 0…2,500. Gold markers use the exact continuous break-even volume; readout rounds required units upward. Prices ≤ unit cost have no positive-volume break-even when fixed cost is positive. The dense surface evaluates this same formula between the 36 marked table samples; height uses a fixed $30,000 per world unit. Cyan/magenta indicate positive/negative profit. Side walls and the $50-price / 1,500-unit slice curtains span from zero to the modeled profit. The gold curtain projects the exact zero-profit boundary to the reference floor; its depth is a layout choice, not a loss amount. The terrain is a sensitivity surface, not a demand forecast. Moving contour particles are presentation only; their speed and density do not encode profitability or likelihood.',
  setup(app) {
    let input: BreakEvenInput = { fixedCost: 25_000, unitCost: 25 };
    let model = calculateBreakEvenGrid(input);
    const x = (volume: number) => -4.5 + volume / 2_500 * 9;
    const y = (profit: number) => profit / 30_000;
    const z = (price: number) => -2.5 + (price - 20) / 50 * 5;
    const color = (profit: number) => profit > 0 ? '#55ebcd' : profit < 0 ? '#ed6bb5' : '#ffe293';
    function draw(chart: ChartBuilder) {
      type P = [number, number, number];
      const floor = -3.5;
      chart.frame({ x: [-4.5, 4.5], y: [floor, 5], z: [-2.5, 2.5],
        xTicks: [0, 500, 1_000, 1_500, 2_000, 2_500].map(value => ({ value: x(value), label: value.toLocaleString('en-US') })),
        yTicks: [-90_000, -30_000, 0, 60_000, 120_000, 150_000].map(value => ({ value: y(value), label: `$${value / 1_000}k` })),
        zTicks: [20, 40, 50, 70].map(value => ({ value: z(value), label: `$${value}` })),
        xLabel: 'Units / month', yLabel: 'Operating profit USD', zLabel: 'Unit price' });
      const profitAt = (price: number, volume: number) => volume * (price - input.unitCost) - input.fixedCost;
      const rows: P[][] = [], colors: string[][] = [];
      const low = new Color('#5d205f'), loss = new Color('#f36cb4');
      const zero = new Color('#153c50'), gain = new Color('#49d9c4'), peak = new Color('#b5f5b0');
      for (let p = 0; p <= 40; p++) {
        const price = 20 + p / 40 * 50;
        const positions: P[] = [], shades: string[] = [];
        for (let v = 0; v <= 50; v++) {
          const volume = v / 50 * 2500, profit = profitAt(price, volume);
          positions.push([x(volume), y(profit), z(price)]);
          const shade = profit < 0 ? low.clone().lerp(loss, Math.min(1, -profit / 80000))
            : profit < 60000 ? zero.clone().lerp(gain, profit / 60000) : gain.clone().lerp(peak, Math.min(1, (profit - 60000) / 90000));
          shades.push(`#${shade.getHexString()}`);
        }
        rows.push(positions); colors.push(shades);
      }
      // Keep the exact 41 × 51 analytical mesh; the surrounding walls expose its height.
      chart.surface(rows, colors, .72);
      const zeroPlane: P[][] = [[[-4.5, 0, -2.5], [4.5, 0, -2.5]], [[-4.5, 0, 2.5], [4.5, 0, 2.5]]];
      chart.surface(zeroPlane, [['#426379', '#426379'], ['#426379', '#426379']], .065);
      chart.line([[-4.5, 0, -2.5], [4.5, 0, -2.5], [4.5, 0, 2.5], [-4.5, 0, 2.5], [-4.5, 0, -2.5]], '#9bb8c5', .55);
      for (const volume of BREAK_EVEN_VOLUMES) chart.line([[x(volume), 0, -2.5], [x(volume), 0, 2.5]], '#8faab8', .18);
      for (const price of BREAK_EVEN_PRICES) chart.line([[-4.5, 0, z(price)], [4.5, 0, z(price)]], '#8faab8', .18);
      chart.label('ZERO PROFIT PLANE', [-3.05, .2, -2.85], .2, '#c2d4dd');

      // Perimeter curtains show the signed distance from zero, without a fictitious solid base.
      for (const boundary of [rows[0], rows[40], rows.map(row => row[0]), rows.map(row => row[50])]) {
        const wall: P[][] = boundary.map(point => [[point[0], 0, point[2]], point]);
        chart.surface(wall, boundary.map(point => [color(point[1]), color(point[1])]), .16);
        chart.line(boundary, '#b9d4e3', .44);
      }
      for (let p = 0; p <= 40; p += 4) chart.line(rows[p].map(point => [point[0], point[1] + .008, point[2]]), '#b2d5df', .23);
      for (let v = 0; v <= 50; v += 5) chart.line(rows.map(row => [row[v][0], row[v][1] + .008, row[v][2]]), '#b2d5df', .23);

      // Two fixed reference cross-sections use points on the same formula and zero plane.
      const priceSlice: P[] = Array.from({ length: 51 }, (_, i) => [x(i * 50), y(profitAt(50, i * 50)), z(50)]);
      const volumeSlice: P[] = Array.from({ length: 41 }, (_, i) => [x(1500), y(profitAt(20 + i * 1.25, 1500)), z(20 + i * 1.25)]);
      for (const section of [priceSlice, volumeSlice]) {
        const fabric: P[][] = section.map(point => [[point[0], 0, point[2]], point]);
        chart.surface(fabric, fabric.map(() => ['#384c7b', '#b4c8ff']), .18);
        chart.tube(section, '#bfd2ff', .022, .85);
        chart.flow(section, { color: '#d7e1ff', count: 60, speed: .055, size: .026, spread: 0, seed: section === priceSlice ? 69 : 93 });
      }
      chart.label('$50 PRICE SLICE', [4.8, priceSlice.at(-1)![1] + .28, z(50)], .17, '#d4deff');
      chart.label('1,500 UNITS SLICE', [x(1500), volumeSlice.at(-1)![1] + .32, 2.85], .17, '#d4deff');

      // All 36 exported grid cases have an exact surface anchor and a zero-plane projection.
      for (const row of model.rows) {
        const anchor: P = [x(row.volume), y(row.profit), z(row.price)];
        const reference = row.price === 50 || row.volume === 1500;
        chart.line([[anchor[0], 0, anchor[2]], anchor], color(row.profit), reference ? .42 : .2);
        chart.point(anchor, reference ? '#e2eaff' : color(row.profit), reference ? .045 : .031);
        chart.point([anchor[0], 0, anchor[2]], '#8faab8', .018);
      }

      // Isolines solve volume = (profit + fixed cost) / (price - unit cost).
      // Split at undefined / out-of-domain points to avoid crossing an asymptote.
      for (let contour = -90000; contour <= 150000; contour += 15000) {
        let segment: P[] = [];
        const flush = () => {
          if (segment.length >= 2) {
            const gold = contour === 0, hue = gold ? '#ffe293' : color(contour);
            if (gold) {
              const curtain: P[][] = segment.map(point => [[point[0], floor, point[2]], [point[0], 0, point[2]]]);
              chart.surface(curtain, curtain.map(() => ['#674d27', '#ffd387']), .13);
              chart.line(segment.map(point => [point[0], floor + .01, point[2]]), '#d5aa65', .42);
            }
            chart.tube(segment, hue, gold ? .042 : .012, gold ? .95 : .62);
            chart.flow(segment, { color: hue, count: gold ? 180 : 60, speed: gold ? .08 : .045, size: gold ? .036 : .025, spread: 0, seed: contour + 90037 });
          }
          segment = [];
        };
        for (let i = 0; i <= 240; i++) {
          const price = 20 + i / 240 * 50;
          const volume = (contour + input.fixedCost) / (price - input.unitCost);
          if (!Number.isFinite(volume) || volume < 0 || volume > 2500) { flush(); continue; }
          segment.push([x(volume), y(contour), z(price)]);
        }
        flush();
        // At this level the isoline also crosses the entire zero-margin price slice.
        if (contour === -input.fixedCost && input.unitCost >= 20 && input.unitCost <= 70) {
          chart.line([[-4.5, y(contour), z(input.unitCost)], [4.5, y(contour), z(input.unitCost)]], color(contour), .62);
        }
      }
      for (const row of model.thresholds) if (row.exactUnits !== null && row.exactUnits <= 2500) {
        const point: P = [x(row.exactUnits), 0, z(row.price)];
        chart.line([[point[0], floor, point[2]], point], '#d4a75f', .5);
        chart.glow(point, '#ffe293', .16); chart.point(point, '#fff0b7', .06);
        chart.point([point[0], floor, point[2]], '#bc8e4e', .025);
      }
      chart.label('EXACT BREAK-EVEN BOUNDARY', [1.1, floor + .35, -.35], .23, '#ffe293');
      chart.label('LOSS', [-4.6, y(-input.fixedCost) - .35, -2.7], .23, '#ed6bb5');
      chart.label('PROFIT', [4.15, y(profitAt(70, 2500)) + .32, 2.75], .23, '#6bf2d3');
    }
    const layer = createChartLayer(draw); app.add(layer);
    function change(patch: Partial<BreakEvenInput>) { const next = { ...input, ...patch }; const result = calculateBreakEvenGrid(next); input = next; model = result; layer.redraw(draw); }
    return {
      controls: [
        { id: 'fixed-cost', label: 'Monthly fixed cost', min: 10_000, max: 45_000, step: 2_500, value: 25_000, format: usd, apply: value => change({ fixedCost: value }) },
        { id: 'unit-cost', label: 'Variable cost / unit', min: 10, max: 40, step: 1, value: 25, format: usd, apply: value => change({ unitCost: value }) },
      ],
      readout: () => {
        const reference = model.thresholds.find(row => row.price === 50)!;
        return {
          metrics: [
            { label: 'Monthly fixed cost', value: usd(model.fixedCost), detail: `${usd(model.unitCost)} variable cost per unit` },
            { label: 'Break-even at $50', value: reference.units === null ? 'No finite volume' : `${reference.units.toLocaleString('en-US')} units`, detail: reference.units !== null && reference.units > 2_500 ? 'Beyond the displayed volume domain' : 'Whole units required at the reference selling price' },
            { label: 'Profitable grid cases', value: `${model.profitableCases} / ${model.rows.length}`, detail: `${model.zeroCases} cases exactly break even; counts are not probabilities` },
          ],
          legend: [{ label: 'Positive profit surface', color: '#55ebcd' }, { label: 'Loss surface', color: '#ed6bb5' }, { label: 'Exact break-even contour', color: '#ffe293' }],
          table: { caption: 'Synthetic price × volume scenarios. Exact monthly USD values; grid-case counts do not represent likelihood.', columns: ['Selling price USD', 'Monthly units', 'Revenue USD', 'Total cost USD', 'Operating profit USD'], rows: model.rows.map(row => [row.price, row.volume, row.revenue, row.totalCost, row.profit]) },
        };
      },
    };
  },
};
export default example;
