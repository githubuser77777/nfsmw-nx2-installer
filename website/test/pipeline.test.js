import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildPackage, loadReleaseNro } from '../pipeline.js';

test('requires a selected NRO', async () => {
  await assert.rejects(loadReleaseNro({}, null), /Select the Switch 2 release NRO/);
});

test('rejects a selected NRO that does not match the release', async () => {
  const bytes = new Uint8Array(32);
  bytes.set([78, 82, 79, 48], 16);
  await assert.rejects(loadReleaseNro({ nro: 'test.nro', nro_sha256: 'wrong' }, new Blob([bytes])),
    /does not match the release/);
});

test('accepts a selected NRO with the expected hash', async () => {
  const bytes = new Uint8Array(32);
  bytes.set([78, 82, 79, 48], 16);
  const hash = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
  assert.deepEqual(await loadReleaseNro({ nro: 'test.nro', nro_sha256: hash }, new Blob([bytes])), bytes);
});

test('rejects a selected file that is not an NRO', async () => {
  await assert.rejects(loadReleaseNro({ nro: 'test.nro' }, new Blob(['not an NRO'])), /not an NRO/);
});

test('rejects an unsupported game before writing a package', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
  const files = [
    { path: 'default.xex', size: 1, read: async () => new Uint8Array([0]) },
    { path: 'NFS/data.bin', size: 1 },
    { path: 'Movies/movie.wmv', size: 1 },
  ];
  let written = false;
  await assert.rejects(buildPackage({
    files, manifest, log: () => {},
    sink: { write: () => { written = true; } },
  }), /not the supported USA edition/);
  assert.equal(written, false);
});
