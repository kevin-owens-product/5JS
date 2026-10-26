import assert from 'node:assert/strict';
import test from 'node:test';
import type { BufferAttribute, Mesh } from 'three';
import type { FiveApp, FiveLayer } from '../src/index.js';
import { examples } from '../examples/catalog.js';
import { calculateUnitEconomics } from '../examples/business/unit-economics.js';
import { calculateBreakEvenGrid } from '../examples/business/break-even.js';
import { calculateCapacity } from '../examples/business/capacity-planning.js';
import { calculateProductPortfolio } from '../examples/business/product-portfolio.js';

test('unit break-even agrees with zero profit for decimal prices without adding a phantom unit', () => {
  const exact = calculateUnitEconomics({ volume: 500, price: 20, unitCost: 19.8, fixedCost: 100 });
  assert.equal(exact.profit, 0);
  assert.equal(exact.breakEvenUnits, 500);
  assert.ok(calculateUnitEconomics({ volume: 499, price: 20, unitCost: 19.8, fixedCost: 100 }).profit < 0);
  assert.ok(calculateUnitEconomics({ volume: 501, price: 20, unitCost: 19.8, fixedCost: 100 }).profit > 0);
  const small = calculateUnitEconomics({ volume: 3, price: .3, unitCost: .2, fixedCost: .3 });
  assert.equal(small.profit, 0);
  assert.equal(small.breakEvenUnits, 3);
  // Keep actual fractional boundaries: roundoff handling is not cent rounding.
  assert.equal(calculateUnitEconomics({ volume: 500, price: 20, unitCost: 19.8, fixedCost: 100.0001 }).breakEvenUnits, 501);
  assert.throws(() => calculateUnitEconomics({ volume: Number.MAX_VALUE, price: 20, unitCost: 19.8 }), /finite/);
  assert.throws(() => calculateUnitEconomics({ volume: 1, price: 1e-300, unitCost: 1e300, fixedCost: 0 }), /margin must remain finite/);
  assert.throws(() => calculateUnitEconomics({ volume: 1, price: 20, unitCost: 10, fixedCost: 1e308 }), /Break-even revenue and costs must remain finite/);
});

test('break-even terrain thresholds reconcile with decimal-cost grid intersections', () => {
  const result = calculateBreakEvenGrid({ fixedCost: 100, unitCost: 19.8 });
  assert.equal(result.rows.find(row => row.price === 20 && row.volume === 500)!.profit, 0);
  assert.deepEqual(result.thresholds.find(row => row.price === 20), { price: 20, exactUnits: 500, units: 500 });
  for (const costCents of [1001, 1849, 1950, 1975, 1980, 1990, 1995, 1999]) {
    const expected = Math.ceil(10_000 / (2_000 - costCents));
    const threshold = calculateBreakEvenGrid({ fixedCost: 100, unitCost: costCents / 100 }).thresholds.find(row => row.price === 20)!;
    assert.equal(threshold.units, expected, `integer-cent oracle for ${costCents}`);
    assert.equal(calculateUnitEconomics({ volume: expected, price: 20, unitCost: costCents / 100, fixedCost: 100 }).breakEvenUnits, expected);
  }
  assert.equal(calculateBreakEvenGrid({ fixedCost: 100.0001, unitCost: 19.8 }).thresholds.find(row => row.price === 20)!.units, 501);
  assert.throws(() => calculateBreakEvenGrid({ fixedCost: 100, unitCost: Number.MAX_VALUE }), /finite/);
  assert.throws(() => calculateBreakEvenGrid({ fixedCost: 1e308, unitCost: 10 }), /Break-even revenue and costs must remain finite/);
});

test('capacity rejects a denominator rounded to zero but supports positive small capacities', () => {
  assert.throws(() => calculateCapacity({ demand: 1, overtime: 0, downtime: .999999 }), /rounded capacity must remain positive/);
  const tiny = calculateCapacity({ demand: 1, overtime: 0, downtime: .9999 });
  assert.ok(tiny.rows.every(row => row.capacity > 0 && Number.isFinite(row.utilization)));
  assert.ok(Number.isFinite(tiny.weightedUtilization));
  assert.throws(() => calculateCapacity({ demand: Number.MAX_VALUE, overtime: 0, downtime: 0 }), /finite/);
});

test('portfolio rejects revenue rounded to zero before calculating margins', () => {
  assert.throws(() => calculateProductPortfolio({ marketShift: 0, priceChange: -.999999999, costInflation: 0 }), /Rounded product revenue must remain positive/);
  assert.throws(() => calculateProductPortfolio({ marketShift: -.9399999999, priceChange: 0, costInflation: 0 }), /Rounded product revenue must remain positive/);
  const small = calculateProductPortfolio({ marketShift: 0, priceChange: -.999999, costInflation: 0 });
  assert.ok(small.rows.every(row => row.revenue > 0 && Number.isFinite(row.margin)));
  assert.ok(Number.isFinite(small.weightedMargin));
  assert.throws(() => calculateProductPortfolio({ marketShift: Number.MAX_VALUE, priceChange: 0, costInflation: 0 }), /finite/);
});

// Combined middle states exercise selectors and interactions missed by isolated
// slider endpoints. Across the twenty-three recipes this covers 540 distinct states.
for (const recipe of examples.filter(example => example.category === 'Business' || example.category === 'Analytics')) {
  test(`${recipe.id}: combined min/middle/max states preserve finite data and geometry`, () => {
    const layers: FiveLayer<object>[] = [];
    const instance = recipe.setup({ add(layer: FiveLayer<object>) { layers.push(layer); return layer; } } as unknown as FiveApp);
    const controls = instance.controls ?? [];
    const choices = controls.map(control => [...new Set([control.min, control.min + Math.round((control.max - control.min) / control.step / 2) * control.step, control.max])]);
    let checked = 0;
    function visit(index: number) {
      if (index < controls.length) {
        for (const value of choices[index]) { controls[index].apply(value); visit(index + 1); }
        return;
      }
      const readout = instance.readout!();
      const snapshot = JSON.stringify(readout);
      assert.doesNotMatch(snapshot, /NaN|Infinity/);
      for (const row of readout.table.rows) {
        assert.equal(row.length, readout.table.columns.length);
        assert.ok(row.every(cell => typeof cell !== 'number' || Number.isFinite(cell)));
      }
      for (const layer of layers) {
        layer.update(1, .137);
        layer.object.traverse(object => {
          assert.ok([...object.position.toArray(), ...object.scale.toArray()].every(Number.isFinite));
          const position = (object as Mesh).geometry?.getAttribute('position') as BufferAttribute | undefined;
          if (position) assert.ok(Array.from(position.array).every(Number.isFinite));
        });
      }
      assert.equal(JSON.stringify(instance.readout!()), snapshot, 'Animation must not change financial/analytical data');
      checked++;
    }
    try {
      visit(0);
      assert.equal(checked, choices.reduce((count, choice) => count * choice.length, 1));
    } finally { instance.dispose?.(); layers.forEach(layer => layer.dispose()); }
  });
}
