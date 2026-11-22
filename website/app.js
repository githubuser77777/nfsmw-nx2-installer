const $ = (id) => document.getElementById(id);
const iso = $('iso'), folder = $('folder'), nro = $('nro');
const create = $('create'), update = $('update'), progress = $('progress'), log = $('log');
let source = null;
let program = null;
let busy = false;

function refresh() {
  const enabled = !busy && source && program && typeof window.showSaveFilePicker === 'function';
  create.disabled = !enabled;
  update.disabled = !enabled;
  iso.disabled = busy;
  folder.disabled = busy;
  nro.disabled = busy;
}

function message(text, error = false) {
  const line = document.createElement('div');
  line.textContent = text;
  if (error) line.className = 'error';
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

iso.addEventListener('change', () => {
  const file = iso.files[0];
  if (!file) return;
  source = { kind: 'iso', file };
  $('game-status').textContent = `Selected ISO: ${file.name}. Edition will be checked when building.`;
  folder.value = '';
  refresh();
});

folder.addEventListener('change', () => {
  const files = [...folder.files];
  if (!files.length) return;
  const root = files[0].webkitRelativePath.split('/')[0] + '/';
  const entries = files.map((file) => ({ path: file.webkitRelativePath.slice(root.length), file }));
  source = { kind: 'folder', entries };
  $('game-status').textContent = `Selected folder: ${root.slice(0, -1)} (${files.length} files). Edition will be checked when building.`;
  iso.value = '';
  refresh();
});

nro.addEventListener('change', () => {
  program = nro.files[0] || null;
  $('nro-status').textContent = program ? `Selected: ${program.name}. Its hash will be checked when building.` : 'No NRO selected.';
  refresh();
});

async function makePackage(onlyUpdate) {
  if (busy || !source || !program) return;
  let handle;
  try {
    handle = await window.showSaveFilePicker({
      suggestedName: onlyUpdate ? 'nfsmw-nx-switch2-update.zip' : 'nfsmw-nx-switch2.zip',
      types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }],
    });
  } catch (error) {
    if (error.name !== 'AbortError') message(`Could not select an output file: ${error.message}`, true);
    return;
  }
  busy = true;
  refresh();
  log.textContent = '';
  progress.hidden = false;
  progress.value = 0;
  message('Reading game and preparing shaders. This can take several minutes.');
  const worker = new Worker('./worker.js?v=3', { type: 'module' });
  const finish = () => { busy = false; worker.terminate(); refresh(); };
  worker.onmessage = ({ data }) => {
    if (data.type === 'log') message(data.text);
    else if (data.type === 'progress') progress.value = data.value;
    else if (data.type === 'done') {
      progress.value = 1;
      message('Package saved. Extract it into sdmc:/switch/.');
      finish();
    } else if (data.type === 'error') {
      message(`Could not create package: ${data.text}`, true);
      finish();
    }
  };
  worker.onerror = (event) => {
    message(`Installer error: ${event.message}`, true);
    finish();
  };
  try {
    worker.postMessage({ source, nro: program, handle, update: onlyUpdate });
  } catch (error) {
    message(`Could not start installer: ${error.message}`, true);
    finish();
  }
}
create.addEventListener('click', () => makePackage(false));
update.addEventListener('click', () => makePackage(true));
if (typeof window.showSaveFilePicker !== 'function') {
  message('This browser cannot save streamed ZIPs. Open this site in a current desktop Chrome or Edge over HTTPS or localhost.', true);
}
refresh();
