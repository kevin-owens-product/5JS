import assert from 'node:assert/strict';
import test from 'node:test';
import type { BufferGeometry, Mesh } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import unit, { calculateUnitEconomics } from '../examples/business/unit-economics.js';
import demand, { calculateDemandScenarios, HISTORICAL_DEMAND } from '../examples/analytics/demand-scenarios.js';
import portfolio, { calculateProductPortfolio, PRODUCTS } from '../examples/business/product-portfolio.js';
import capacity, { calculateCapacity } from '../examples/business/capacity-planning.js';
import inventory, { calculateInventoryCoverage } from '../examples/business/inventory-coverage.js';
import breakEven, { calculateBreakEvenGrid } from '../examples/business/break-even.js';
import subscription from '../examples/business/subscription-bridge.js';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('unit economics reconciles signed expense steps, loss cases, and integer break-even', () => {
  const model = calculateUnitEconomics({ volume: 1_200, price: 55, unitCost: 24 });
  assert.equal(model.revenue, 66_000);
  assert.equal(model.variableCost, 28_800);
  assert.equal(model.profit, 12_200);
  assert.equal(model.breakEvenUnits, 807);
  assert.equal(model.waterfall.slice(0, 3).reduce((sum, row) => sum + row.value, 0), model.profit);
  assert.equal(model.waterfall[1].base, model.waterfall[0].end);
  assert.equal(model.waterfall[2].base, model.waterfall[1].end);
  assert.equal(model.waterfall[2].end, model.waterfall[3].end);
  near(model.margin!, 12_200 / 66_000);
  assert.equal(calculateUnitEconomics({ volume: 2_000, price: 30, unitCost: 45 }).profit, -55_000);
  assert.equal(calculateUnitEconomics({ volume: 1_000, price: 30, unitCost: 30 }).breakEvenUnits, null);
  assert.equal(calculateUnitEconomics({ volume: 0, price: 30, unitCost: 45, fixedCost: 0 }).breakEvenUnits, 0);
  assert.equal(calculateUnitEconomics({ volume: 0, price: 30, unitCost: 20 }).margin, null);
  assert.throws(() => calculateUnitEconomics({ volume: 1.5, price: 30, unitCost: 20 }));
});

test('demand scenarios preserve history and use explicit rounded what-if arithmetic', () => {
  const flat = calculateDemandScenarios({ growth: 0, seasonality: 0, spread: 0 });
  assert.equal(flat.history.length, 12); assert.equal(flat.future.length, 6);
  assert.deepEqual(flat.history.map(row => row.units), [...HISTORICAL_DEMAND]);
  assert.ok(flat.future.every(row => row.low === 1_300 && row.base === 1_300 && row.high === 1_300));
  assert.deepEqual(flat.totals, { low: 7_800, base: 7_800, high: 7_800 });
  const result = calculateDemandScenarios({ growth: .025, seasonality: .12, spread: .18 });
  const first = 1_300 * 1.025 * (1 + .12 * Math.sin(Math.PI / 6));
  assert.equal(result.future[0].base, Math.round(first));
  assert.equal(result.future[0].low, Math.round(first * (1 - .18 / 6)));
  assert.equal(result.future[0].high, Math.round(first * (1 + .18 / 6)));
  assert.equal(result.totals.base, result.future.reduce((sum, row) => sum + row.base, 0));
  assert.deepEqual(result.history, flat.history);
  assert.throws(() => calculateDemandScenarios({ growth: -1, seasonality: 0, spread: 0 }));
});

test('portfolio totals use revenue-weighted margin and preserve source assumptions', () => {
  const before = JSON.stringify(PRODUCTS);
  const model = calculateProductPortfolio({ marketShift: 0, priceChange: 0, costInflation: 0 });
  const atlas = model.rows[0];
  assert.equal(atlas.revenue, 566_400);
  assert.equal(atlas.cost, 362_496);
  assert.equal(atlas.grossProfit, 203_904);
  near(atlas.margin, .36); near(atlas.growth, .18);
  near(model.weightedMargin, model.grossProfit / model.revenue);
  assert.notEqual(model.weightedMargin, model.rows.reduce((sum, row) => sum + row.margin, 0) / model.rows.length);
  assert.equal(JSON.stringify(PRODUCTS), before);
  const higherPrice = calculateProductPortfolio({ marketShift: 0, priceChange: .1, costInflation: 0 });
  assert.ok(higherPrice.revenue > model.revenue && higherPrice.weightedMargin > model.weightedMargin);
  assert.throws(() => calculateProductPortfolio({ marketShift: 0, priceChange: -1, costInflation: 0 }));
});

test('capacity exposes local shortages even when aggregate utilization is below 100%', () => {
  const model = calculateCapacity({ demand: 1.1, overtime: 0, downtime: 0 });
  near(model.load, 753.5); near(model.capacity, 810);
  near(model.weightedUtilization, 753.5 / 810);
  assert.ok(model.weightedUtilization < 1);
  assert.equal(model.uncovered, 5);
  assert.equal(model.rows.find(row => row.name === 'Finishing')!.uncovered, 5);
  const withOvertime = calculateCapacity({ demand: 1.1, overtime: .1, downtime: .05 });
  near(withOvertime.capacity, 846.45);
  assert.equal(withOvertime.uncovered, 0);
  assert.throws(() => calculateCapacity({ demand: 1, overtime: 0, downtime: 1 }));
});

test('inventory coverage uses a weighted ratio and an explicit seven-day order-up-to policy', () => {
  const model = calculateInventoryCoverage({ demandMultiplier: 1, safetyDays: 7, stockMultiplier: 1 });
  assert.equal(model.stock, 2_310); assert.equal(model.dailyDemand, 125);
  near(model.portfolioCoverage, 18.48);
  assert.equal(model.atThreshold, 2);
  const c = model.rows.find(row => row.sku === 'C-03')!;
  assert.equal(c.coverageDays, 15); assert.equal(c.reorderPoint, 252);
  assert.equal(c.targetUnits, 336); assert.equal(c.suggestedUnits, 156);
  const e = model.rows.find(row => row.sku === 'E-05')!;
  assert.equal(e.stock, e.reorderPoint); assert.equal(e.reorder, true);
  assert.equal(e.suggestedUnits, 70);
  assert.equal(model.suggestedUnits, 226);
  assert.ok(model.rows.filter(row => !row.reorder).every(row => row.suggestedUnits === 0));
  assert.throws(() => calculateInventoryCoverage({ demandMultiplier: 0, safetyDays: 7, stockMultiplier: 1 }));
});

test('break-even grid reconciles costs and marks exact intersections before whole-unit rounding', () => {
  const model = calculateBreakEvenGrid({ fixedCost: 25_000, unitCost: 25 });
  assert.equal(model.rows.length, 36);
  for (const row of model.rows) assert.equal(row.profit, row.revenue - row.totalCost);
  assert.equal(model.rows.find(row => row.price === 50 && row.volume === 1_000)!.profit, 0);
  assert.equal(model.thresholds.find(row => row.price === 20)!.units, null);
  assert.equal(model.thresholds.find(row => row.price === 40)!.units, 1_667);
  for (const row of model.thresholds) if (row.exactUnits !== null) near(row.exactUnits * (row.price - model.unitCost), model.fixedCost);
  assert.equal(model.profitableCases, model.rows.filter(row => row.profit > 0).length);
  assert.throws(() => calculateBreakEvenGrid({ fixedCost: -1, unitCost: 25 }));
});

test('fixed chart domains contain every combination of control extremes', () => {
  for (const volume of [500, 2_000]) for (const price of [30, 70]) for (const unitCost of [10, 45]) {
    for (const row of calculateUnitEconomics({ volume, price, unitCost }).waterfall) {
      assert.ok(row.base >= -60_000 && row.base <= 150_000 && row.end >= -60_000 && row.end <= 150_000);
    }
  }
  for (const growth of [-.04, .08]) for (const seasonality of [0, .25]) for (const spread of [0, .4]) {
    for (const row of calculateDemandScenarios({ growth, seasonality, spread }).future) assert.ok(row.low >= 0 && row.low <= row.base && row.base <= row.high && row.high <= 3_000);
  }
  for (const marketShift of [-.15, .15]) for (const priceChange of [-.1, .2]) for (const costInflation of [0, .25]) {
    for (const row of calculateProductPortfolio({ marketShift, priceChange, costInflation }).rows) {
      assert.ok(row.growth >= -.3 && row.growth <= .7);
      assert.ok(row.margin >= -.25 && row.margin <= .65);
      assert.ok(row.revenue >= 0 && row.revenue <= 800_000);
    }
  }
  for (const demand of [.6, 1.5]) for (const overtime of [0, .4]) for (const downtime of [0, .25]) {
    for (const row of calculateCapacity({ demand, overtime, downtime }).rows) assert.ok(row.load >= 0 && row.load <= 300 && row.capacity > 0 && row.capacity <= 300);
  }
  for (const demandMultiplier of [.6, 1.8]) for (const safetyDays of [2, 12]) for (const stockMultiplier of [.5, 1.5]) {
    for (const row of calculateInventoryCoverage({ demandMultiplier, safetyDays, stockMultiplier }).rows) assert.ok(row.coverageDays >= 0 && row.coverageDays <= 60 && row.thresholdDays <= 60);
  }
  for (const fixedCost of [10_000, 45_000]) for (const unitCost of [10, 40]) {
    for (const row of calculateBreakEvenGrid({ fixedCost, unitCost }).rows) assert.ok(row.profit >= -105_000 && row.profit <= 150_000);
  }
});

for (const example of [unit, demand, portfolio, capacity, inventory, breakEven]) {
  test(`${example.id}: controls redraw, refresh exact readouts, and release replaced resources`, () => {
    const owned: FiveLayer<object>[] = [];
    const app = { add<P extends object>(layer: FiveLayer<P>) { owned.push(layer); return layer; } } as unknown as FiveApp;
    const instance = example.setup(app);
    assert.equal(owned.length, 1);
    assert.match(example.dataNote!, /^Synthetic/);
    assert.ok(instance.controls!.length >= 2 && instance.controls!.length <= 3);
    assert.ok(instance.readout);
    const original = instance.readout!();
    const oldGeometry = new Set<BufferGeometry>();
    owned[0].object.traverse(object => { if ((object as Mesh).geometry) oldGeometry.add((object as Mesh).geometry); });
    let releases = 0;
    oldGeometry.forEach(geometry => geometry.addEventListener('dispose', () => releases++));
    for (const control of instance.controls!) {
      assert.ok(control.value >= control.min && control.value <= control.max);
      near((control.value - control.min) / control.step, Math.round((control.value - control.min) / control.step));
      control.apply(control.min);
      const low = instance.readout!();
      control.apply(control.max);
      const high = instance.readout!();
      assert.notDeepEqual(low, high, `${control.id} must alter the displayed data`);
      assert.ok(!JSON.stringify(high).includes('NaN'));
      for (const row of high.table.rows) {
        assert.equal(row.length, high.table.columns.length);
        assert.ok(row.every(value => typeof value !== 'number' || Number.isFinite(value)));
      }
      control.apply(control.value);
    }
    assert.equal(releases, oldGeometry.size);
    assert.deepEqual(instance.readout!(), original, 'restoring controls restores the exact readout');
    const positions = owned[0].object.position.toArray();
    owned[0].update(500, 0);
    assert.deepEqual(owned[0].object.position.toArray(), positions);
    owned[0].dispose(); owned[0].dispose(); instance.dispose?.();
  });
}

for (const example of [unit, subscription, breakEven]) {
  test(`${example.id}: directional particles animate, pause, and leave financial data unchanged`, () => {
    const layers: FiveLayer<object>[] = [];
    const app = { add<P extends object>(layer: FiveLayer<P>) { layers.push(layer); return layer; } } as unknown as FiveApp;
    const instance = example.setup(app);
    const initial = instance.readout!();
    const flows: Float32Array[] = [];
    layers[0].object.traverse(object => {
      const points = object as any;
      if (points.isPoints && points.geometry.getAttribute('position').count > 1) flows.push(points.geometry.getAttribute('position').array);
    });
    assert.ok(flows.length > 0, 'the scene includes moving directional flows');
    const before = flows.map(array => [...array]);
    layers[0].update(.25, .25);
    assert.ok(flows.some((array, i) => array.some((value, j) => value !== before[i][j])), 'nonzero delta advances particles');
    const paused = flows.map(array => [...array]);
    layers[0].update(500, 0);
    flows.forEach((array, i) => assert.deepEqual([...array], paused[i], 'zero delta freezes every flow'));
    assert.deepEqual(instance.readout!(), initial, 'presentation motion cannot change financial metrics');
    layers[0].dispose(); instance.dispose?.();
  });
}

test('profit terrain vertices evaluate the same operating model as the sampled table', () => {
  const layers: FiveLayer<object>[] = [];
  const app = { add<P extends object>(layer: FiveLayer<P>) { layers.push(layer); return layer; } } as unknown as FiveApp;
  const instance = breakEven.setup(app);
  let terrain: any;
  layers[0].object.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.isMesh && mesh.geometry.getAttribute('position')?.count === 41 * 51) terrain = mesh;
  });
  assert.ok(terrain, 'the analytical terrain has a dense 41×51 grid');
  const positions = terrain.geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const volume = (positions.getX(i) + 4.5) / 9 * 2500;
    const price = 20 + (positions.getZ(i) + 2.5) / 5 * 50;
    const expected = (volume * (price - 25) - 25000) / 30000;
    assert.ok(Math.abs(positions.getY(i) - expected) < 1e-5, 'surface height follows exact profit, not decorative noise');
  }
  const snapshot = [...positions.array];
  layers[0].update(2, 2);
  assert.deepEqual([...positions.array], snapshot, 'contour animation leaves profit height unchanged');
  layers[0].dispose(); instance.dispose?.();
});
