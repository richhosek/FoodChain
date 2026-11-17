import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkload, WORKLOAD_IDS } from '../../experiments/animation-spike/src/fixtures.ts';

test('exports exactly the three specified workload identifiers', () => {
  assert.deepEqual(WORKLOAD_IDS, ['dense-paramecium', 'dense-amoeba', 'mixed']);
});

test('creates stable 64-cell row-major paramecium and amoeba workloads', async () => {
  const paramecia = await createWorkload('dense-paramecium', 0x011);
  const amoebae = await createWorkload('dense-amoeba', 0x011);

  for (const [workload, level] of [[paramecia, 0], [amoebae, 1]] as const) {
    assert.equal(workload.cells.length, 64);
    assert.deepEqual(workload.cells.map(cell => cell.position), Array.from(
      { length: 64 },
      (_, index) => ({ row: Math.floor(index / 8), col: index % 8 }),
    ));
    assert.ok(workload.cells.every(cell => cell.creature.level === level));
    assert.equal(new Set(workload.cells.map(cell => cell.creature.id)).size, 64);
    assert.equal(workload.seed, 0x011);
    assert.match(workload.checksum, /^[a-f0-9]{64}$/);
  }
});

test('creates the specified mixed workload counts with a reproducible checksum', async () => {
  const first = await createWorkload('mixed', 0x011);
  const second = await createWorkload('mixed', 0x011);
  const counts = [0, 1, 2, 3, 4].map(level => first.cells.filter(cell => cell.creature.level === level).length);

  assert.deepEqual(counts, [16, 16, 11, 11, 10]);
  assert.equal(first.cells.length, 64);
  assert.deepEqual(first.cells, second.cells);
  assert.equal(first.checksum, second.checksum);
  assert.notEqual(first.checksum, (await createWorkload('mixed', 0x012)).checksum);
});

test('rejects unknown workloads and invalid seeds', async () => {
  await assert.rejects(createWorkload('unknown' as never, 1), RangeError);
  await assert.rejects(createWorkload('mixed', -1), RangeError);
  await assert.rejects(createWorkload('mixed', 1.5), RangeError);
});
