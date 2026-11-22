import { listIsoFiles } from './lib/iso.js';
import { buildPackage } from './pipeline.js?v=3';

async function fetchBytes(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

self.onmessage = async ({ data }) => {
  let output;
  try {
    const files = data.source.kind === 'iso'
      ? await listIsoFiles(data.source.file)
      : data.source.entries.map(({ path, file }) => ({
          path, size: file.size,
          read: async (offset, length) => new Uint8Array(await file.slice(offset, offset + length).arrayBuffer()),
        }));
    const [manifestBytes, toml, shaderCommon] = await Promise.all([
      fetchBytes('./manifest.json'), fetchBytes('./nfsmw.toml'), fetchBytes('./shader_common.h'),
    ]);
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    output = await data.handle.createWritable();
    const sink = {
      write: (chunk) => output.write(chunk),
      close: () => output.close(),
    };
    const result = await buildPackage({
      files, nro: data.nro, manifest, toml, shaderCommon, sink, update: data.update,
      log: (text) => self.postMessage({ type: 'log', text }),
      progress: (value) => self.postMessage({ type: 'progress', value }),
    });
    output = null;
    self.postMessage({ type: 'done', result });
  } catch (error) {
    if (output) {
      try { await output.abort(); } catch (abortError) {
        self.postMessage({ type: 'log', text: `Could not discard the unfinished file: ${abortError.message}` });
      }
    }
    self.postMessage({ type: 'error', text: error.message || String(error) });
  }
};
