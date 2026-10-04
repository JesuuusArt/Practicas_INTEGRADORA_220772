/**
 * Build reproducible del Business Model Canvas de Spotify.
 *
 * Flujo: validate -> render -> postprocesado -> check.
 *
 * Archify entrega un HTML autocontenido. La paleta de marca de Spotify y la
 * ficha ampliada por bloque no forman parte del esquema, asi que se aplican
 * como una capa explicita sobre el artefacto generado y se vuelve a ejecutar
 * `archify check` sobre el resultado final para comprobar que la geometria y
 * las interacciones nativas siguen intactas.
 *
 * Uso: node tools/build-canvas.mjs
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PRACTICA = resolve(HERE, '..');
const SPEC = join(PRACTICA, 'spotify-canvas.json');
const PALETTE = join(PRACTICA, 'spotify-canvas.paleta.json');
const DETAIL = join(PRACTICA, 'spotify-canvas.detalle.json');
const OUTPUT = join(PRACTICA, 'spotify-canvas.html');
const RECEIPT = join(PRACTICA, 'spotify-canvas.build.json');
const BUILD_DIR = join(PRACTICA, '.build');
const BASE = join(BUILD_DIR, 'spotify-canvas.base.html');
const ARCHIFY = join(process.env.USERPROFILE || process.env.HOME, '.agents', 'skills', 'archify', 'bin', 'archify.mjs');
const LAYER_CSS = join(HERE, 'spotify-layer.css');
const LAYER_JS = join(HERE, 'spotify-layer.js');

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

function step(label) {
  process.stdout.write(`\n[build] ${label}\n`);
}

function archify(args) {
  try {
    return execFileSync(process.execPath, [ARCHIFY, ...args], { encoding: 'utf8', cwd: PRACTICA });
  } catch (error) {
    const raw = error.stdout || '';
    try {
      const parsed = JSON.parse(raw);
      process.stderr.write(`\n[build] archify ${args[0]} fallo:\n${parsed.error || raw}\n`);
      for (const item of parsed.diagnostics || []) {
        process.stderr.write(`  - ${item.message}\n`);
      }
    } catch {
      process.stderr.write(`\n[build] archify ${args[0]} fallo:\n${raw || error.message}\n`);
    }
    throw new Error(`archify ${args[0]} devolvio codigo ${error.status}`);
  }
}

/* ------------------------------------------------------------------ */
/* 1. Validar la especificacion antes de tocar nada                    */
/* ------------------------------------------------------------------ */

step('validate spotify-canvas.json (quality showcase)');
const validation = JSON.parse(archify(['validate', 'architecture', SPEC, '--quality', 'showcase', '--json']));
if (validation.ok !== true) {
  throw new Error('La especificacion no pasa validate; no se genera el HTML.');
}
step(`validate ok — ${validation.checks ? validation.checks.length : 0} checks`);

/* ------------------------------------------------------------------ */
/* 2. Datos de la ficha ampliada y de la paleta                        */
/* ------------------------------------------------------------------ */

const palette = readJson(PALETTE);
const detail = readJson(DETAIL);
const spec = readJson(SPEC);

const nodeTitles = {};
for (const node of spec.components || []) {
  if (node && node.id) nodeTitles[node.id] = node.label || node.title || node.id;
}

const relations = {};
for (const id of Object.keys(detail.bloques)) {
  relations[id] = { entrantes: [], salientes: [] };
}
for (const edge of spec.connections || []) {
  const from = edge.from;
  const to = edge.to;
  if (!relations[from] || !relations[to]) continue;
  relations[to].entrantes.push({
    dir: 'in',
    id: from,
    title: nodeTitles[from] || from,
    label: edge.label ? edge.label : ''
  });
  relations[from].salientes.push({
    dir: 'out',
    id: to,
    title: nodeTitles[to] || to,
    label: edge.label ? edge.label : ''
  });
}

const payload = {
  meta: detail.meta,
  paleta: Object.fromEntries(
    Object.entries(palette.bloques).map(([id, value]) => [id, value.dark])
  ),
  bloques: detail.bloques,
  tarjetas: detail.tarjetas || [],
  relaciones: relations
};

/* ------------------------------------------------------------------ */
/* 3. Variables de tema Spotify                                        */
/* ------------------------------------------------------------------ */

function themeVars(scope, theme) {
  const vars = palette.tema[theme];
  const comp = palette.componentes[theme];
  const lines = [`${scope} {`];
  for (const [key, value] of Object.entries(vars)) {
    lines.push(`  --${key}: ${value};`);
  }
  for (const [kind, pair] of Object.entries(comp)) {
    lines.push(`  --${kind}-fill: ${pair.fill};`);
    lines.push(`  --${kind}-stroke: ${pair.stroke};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function nodeBlock(id, kind, theme) {
  const node = palette.bloques[id];
  if (!node) return '';
  const scope = `html[data-theme="${theme}"] #node-${id} > rect.c-${kind}`;
  const rules = [`fill: ${node[theme].fill};`, `stroke: ${node[theme].stroke};`];
  if (node[theme].glow) rules.push(`filter: drop-shadow(0 0 7px ${node[theme].stroke}66);`);
  return `${scope} {\n  ${rules.join('\n  ')}\n}`;
}

function kindByNode(id, archifySpec) {
  const node = (archifySpec.components || []).find((item) => item && item.id === id);
  return (node && node.type) || 'external';
}

const themeCss = [
  '/* Paleta Spotify — capa generada por tools/build-canvas.mjs. */',
  '/* Se declara despues del <style> de Archify y con mas especificidad,',
  '   asi que gana tanto en orden de documento como sobre los presets. */',
  themeVars('html[data-theme="dark"]', 'dark'),
  themeVars('html[data-preset][data-theme="dark"]', 'dark'),
  themeVars('html[data-theme="light"]', 'light'),
  themeVars('html[data-preset][data-theme="light"]', 'light')
].join('\n\n');

const nodeCss = ['dark', 'light']
  .map((theme) =>
    Object.entries(palette.bloques)
      .map(([id]) => nodeBlock(id, kindByNode(id, spec), theme))
      .filter(Boolean)
      .join('\n\n')
  )
  .join('\n\n');

/* ------------------------------------------------------------------ */
/* 4. Renderizar la base con Archify                                   */
/* ------------------------------------------------------------------ */

step('render base con archify');
rmSync(BUILD_DIR, { recursive: true, force: true });
mkdirSync(BUILD_DIR, { recursive: true });
archify(['render', 'architecture', SPEC, BASE, '--quality', 'showcase']);
const baseHtml = readFileSync(BASE, 'utf8');

/* ------------------------------------------------------------------ */
/* 5. Inyectar la capa Spotify                                          */
/* ------------------------------------------------------------------ */

step('inyectar paleta y ficha ampliada');
const layerCss = readFileSync(LAYER_CSS, 'utf8');
const layerJs = readFileSync(LAYER_JS, 'utf8');

const modal = [
  '<div class="scx-overlay" id="scx-overlay" hidden>',
  '  <section class="scx-sheet" id="scx-sheet" role="dialog" aria-modal="true" aria-labelledby="scx-title" aria-describedby="scx-desc">',
  '    <header class="scx-head">',
  '      <div class="scx-badge" id="scx-num" aria-hidden="true"></div>',
  '      <div class="scx-heading">',
  '        <h2 id="scx-title"></h2>',
  '        <p class="scx-sub" id="scx-sub"></p>',
  '        <p class="scx-tag" id="scx-tag"></p>',
  '      </div>',
  '      <div class="scx-tools">',
  '        <button class="scx-btn" id="scx-prev" type="button" aria-label="Bloque anterior">&larr;</button>',
  '        <span class="scx-pos" id="scx-pos" aria-live="polite"></span>',
  '        <button class="scx-btn" id="scx-next" type="button" aria-label="Bloque siguiente">&rarr;</button>',
  '        <button class="scx-btn scx-btn-close" id="scx-close" type="button" aria-label="Cerrar ficha">&times;</button>',
  '      </div>',
  '    </header>',
  '    <div class="scx-body">',
  '      <div class="scx-panel"><h3>Descripcion</h3><p id="scx-desc"></p></div>',
  '      <div class="scx-panel"><h3>Elementos clave</h3><ul id="scx-items"></ul></div>',
  '      <div class="scx-cols">',
  '        <div class="scx-panel"><h3>Que aporta al modelo</h3><ul id="scx-aporta"></ul></div>',
  '        <div class="scx-panel"><h3>Riesgos y dependencias</h3><ul id="scx-riesgos"></ul></div>',
  '      </div>',
  '      <div class="scx-panel"><h3>Relaciones en el lienzo</h3><div class="scx-rel" id="scx-rel"></div></div>',
  '      <div class="scx-panel"><h3>Lecturas clave del modelo</h3><div class="scx-readings" id="scx-readings"></div></div>',
  '    </div>',
  '    <footer class="scx-foot">',
  '      <div class="scx-index" id="scx-index"></div>',
  '      <p class="scx-hint"><kbd>Esc</kbd> cierra &middot; <kbd>&larr;</kbd> <kbd>&rarr;</kbd> recorren los bloques</p>',
  '    </footer>',
  '  </section>',
  '</div>'
].join('\n');

const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');

const headInjection = [
  '<style id="spotify-theme">',
  themeCss,
  nodeCss,
  '</style>',
  '<style id="spotify-layer-ui">',
  layerCss,
  '</style>'
].join('\n');

const bodyInjection = [
  modal,
  `<script id="spotify-canvas-detail" type="application/json">${safeJson}<` + '/script>',
  '<script id="spotify-layer-runtime">',
  layerJs,
  '<' + '/script>'
].join('\n');

const HEAD_ANCHOR = '</head>';
const BODY_ANCHOR = '</body>';
/* El indice no se inyecta en el flujo de la pagina a proposito.
   Archify.readerLayout mide unicamente .header, .guided-views y .cards para
   encajar el SVG en la ventana; cualquier bloque hermano o hermano de esos
   queda fuera de ese presupuesto y su alto no se descuenta, por lo que
   settleOverflow() reduce el ancho, measure() lo restaura y el lazo no
   converge. El indice vive dentro de la ficha ampliada, que es overlay. */

const SHELL_ANCHOR = '<script id="archify-guided-views-data"';
if (!baseHtml.includes(HEAD_ANCHOR) || !baseHtml.includes(BODY_ANCHOR) || !baseHtml.includes(SHELL_ANCHOR)) {
  throw new Error('La base generada cambio de estructura; se aborta el postprocesado.');
}

const finalHtml = baseHtml
  .replace(HEAD_ANCHOR, `${headInjection}\n${HEAD_ANCHOR}`)
  .replace(BODY_ANCHOR, `${bodyInjection}\n${BODY_ANCHOR}`);

writeFileSync(OUTPUT, finalHtml, 'utf8');
step(`escrito ${OUTPUT}`);

/* ------------------------------------------------------------------ */
/* 6. Comprobar el artefacto final                                     */
/* ------------------------------------------------------------------ */

step('check del HTML final');
const check = JSON.parse(archify(['check', OUTPUT]));

/* ------------------------------------------------------------------ */
/* 7. Recibo reproducible                                               */
/* ------------------------------------------------------------------ */

const receipt = {
  herramienta: 'tools/build-canvas.mjs',
  generado: new Date().toISOString(),
  flujo: ['validate', 'render', 'postprocesado', 'check'],
  spec: { path: 'spotify-canvas.json', sha256: sha256(readFileSync(SPEC, 'utf8')) },
  paleta: { path: 'spotify-canvas.paleta.json', sha256: sha256(readFileSync(PALETTE, 'utf8')) },
  detalle: { path: 'spotify-canvas.detalle.json', sha256: sha256(readFileSync(DETAIL, 'utf8')) },
  base: { path: '.build/spotify-canvas.base.html', sha256: sha256(baseHtml) },
  artifact: { path: 'spotify-canvas.html', sha256: sha256(finalHtml) },
  validate: { ok: validation.ok, checks: (validation.checks || []).map((c) => c.id || c.name) },
  check: { ok: check.ok, checks: (check.checks || []).map((c) => c.id || c.name) }
};
writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + '\n', 'utf8');

process.stdout.write(`\n[build] validate ok=${validation.ok}  check ok=${check.ok}\n`);
process.stdout.write(`[build] recibo -> ${RECEIPT}\n`);
if (check.ok !== true) process.exitCode = 1;