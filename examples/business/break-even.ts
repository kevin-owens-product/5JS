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
  summary: 'A continuous profit terrain exposes the boundary between growth and loss.',
  description: 'Explore a continuous operating-profit landscape. Cyan ridges rise above zero; magenta valleys fall below it. Gold particles trace the exact break-even contour, while moving contour lights reveal the shape without changing any values. Change costs and watch the entire boundary move.',
  tags: ['Profit terrain', 'Zero contour', 'Sensitivity'], difficulty: 'Advanced', accent: '#7ce8d7',
  camera: [10, 8, 14], target: [0, .65, 0], bloom: .5, previewTime: 4,
  dataNote: 'Synthetic USD/month and units/month. At each price/volume pair: profit = volume × (price−unit cost) − fixed cost. Prices are $20…$70 and volumes 0…2,500. Gold markers use the exact continuous break-even volume; readout rounds required units upward. Prices ≤ unit cost have no positive-volume break-even when fixed cost is positive. The dense surface evaluates this same formula between the 36 table samples; it is a sensitivity surface, not a demand forecast. Cyan/magenta indicate positive/negative profit. Moving contour particles are presentation only; their speed and density do not encode profitability or likelihood.',
  setup(app) {
    let input: BreakEvenInput = { fixedCost: 25_000, unitCost: 25 };
    let model = calculateBreakEvenGrid(input);
    const x = (volume: number) => -4.5 + volume / 2_500 * 9;
    const y = (profit: number) => profit / 30_000;
    const z = (price: number) => -2.5 + (price - 20) / 50 * 5;
    const color = (profit: number) => profit > 0 ? '#55ebcd' : profit < 0 ? '#ed6bb5' : '#ffe293';
    function draw(chart: ChartBuilder) {
      type P = [number, number, number];
      chart.frame({ x: [-4.5, 4.5], y: [-3.5, 5], z: [-2.5, 2.5],
        xTicks: [0, 1_000, 2_000, 2_500].map(value => ({ value: x(value), label: value.toLocaleString('en-US') })),
        yTicks: [-90_000, 0, 90_000, 150_000].map(value => ({ value: y(value), label: `$${value / 1_000}k` })),
        zTicks: [20, 40, 70].map(value => ({ value: z(value), label: `$${value}` })),
        xLabel: 'Units / month', yLabel: 'Operating profit USD', zLabel: 'Unit price' });
      const profitAt = (price: number, volume: number) => volume * (price - input.unitCost) - input.fixedCost;
      const rows: P[][] = [], colors: string[][] = [];
      const low = new Color('#3d1a65'), loss = new Color('#ee64a8');
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
      chart.surface(rows, colors, .82);
      // Fine wire isolines emphasize the analytic surface rather than isolated columns.
      for (let p = 0; p <= 40; p += 4) chart.line(rows[p].map(point => [point[0], point[1] + .008, point[2]]), '#89dbdd', .2);
      for (let v = 0; v <= 50; v += 5) chart.line(rows.map(row => [row[v][0], row[v][1] + .008, row[v][2]]), '#89dbdd', .2);
      for (const volume of [0, 500, 1000, 1500, 2000, 2500]) chart.line([[x(volume), 0, -2.5], [x(volume), 0, 2.5]], '#a5b5c9', .14);
      chart.surface([[[-4.5, 0, -2.5], [4.5, 0, -2.5]], [[-4.5, 0, 2.5], [4.5, 0, 2.5]]], [['#5d7a8d', '#5d7a8d'], ['#5d7a8d', '#5d7a8d']], .045);
      // Contours solve volume = (profit + fixed cost) / (price - unit cost).
      // Split at undefined / out-of-domain points to avoid crossing an asymptote.
      for (const contour of [-60000, -30000, 0, 30000, 60000, 90000, 120000]) {
        let segment: P[] = [];
        const flush = () => {
          if (segment.length >= 2) {
            const gold = contour === 0, hue = gold ? '#ffe293' : color(contour);
            chart.tube(segment, hue, gold ? .035 : .009, gold ? .95 : .55);
            chart.flow(segment, { color: hue, count: gold ? 280 : 75, speed: gold ? .09 : .045, size: gold ? .045 : .025, spread: gold ? .025 : .008, seed: contour + 60037 });
          }
          segment = [];
        };
        for (let i = 0; i <= 240; i++) {
          const price = 20 + i / 240 * 50;
          const volume = (contour + input.fixedCost) / (price - input.unitCost);
          if (!Number.isFinite(volume) || volume < 0 || volume > 2500) { flush(); continue; }
          segment.push([x(volume), y(contour) + .025, z(price)]);
        }
        flush();
      }
      for (const row of model.thresholds) if (row.exactUnits !== null && row.exactUnits <= 2500) {
        const p: P = [x(row.exactUnits), .045, z(row.price)];
        chart.glow(p, '#ffe293', .38); chart.point(p, '#fff0b7', .055);
      }
      chart.label('BREAK-EVEN CONTOUR', [-1.2, .35, -3.1], .25, '#ffe293');
      chart.label('LOSS', [-3.1, -2.5, 2.4], .26, '#ed6bb5');
      chart.label('PROFIT', [3.45, 3.5, -2.8], .26, '#6bf2d3');
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
