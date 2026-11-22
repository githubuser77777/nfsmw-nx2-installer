import createHlsl from './wasm/hlsl.mjs';
import createDxc from './wasm/dxc_web.mjs';
import createPack from './wasm/pack.mjs';
import createLzx from './wasm/lzx.mjs';
import { createPackage, identifyGame, lzxStep } from './lib/installer.js';

export async function loadReleaseNro(build, file) {
  if (!file) throw new Error('Select the Switch 2 release NRO.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 20 || String.fromCharCode(...bytes.slice(16, 20)) !== 'NRO0') {
    throw new Error('The selected file is not an NRO.');
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hash !== build.nro_sha256) {
    throw new Error(`The selected NRO does not match the release (SHA-256: ${hash}).`);
  }
  return bytes;
}

export async function buildPackage({ files, manifest, toml, shaderCommon, sink, update, log, progress, nro }) {
  const quiet = () => ({ print: () => {}, printErr: () => {} });
  const lzx = await createLzx(quiet());
  const result = await identifyGame(files, manifest, { decompressLzx: lzxStep(lzx) });
  if (!result.build) {
    throw new Error('This game is not the supported USA edition, or its disc files do not match.');
  }
  log('USA edition detected. Checking Switch 2 NRO...');
  const nroBytes = await loadReleaseNro(result.build, nro);
  log('NRO verified. Loading shader tools...');
  const modules = {
    lzx,
    hlsl: await createHlsl(quiet()),
    dxc: await createDxc(quiet()),
    pack: await createPack(quiet()),
  };
  return createPackage(files, { manifest, nro: nroBytes, toml, shaderCommon }, modules, sink, log, progress, () => {}, { update });
}
