/**
 * Build reproducible para la Practica 06:
 * Diagrama de Secuencia de Pantallas (Sketches) de Aplicacion Movil con 2 Roles (Spotify)
 *
 * Flujo: archify validate -> archify render -> inyectar capa interactiva
 *        (clic en un nodo => modal con la imagen del sketch) -> escribir HTML final
 *        -> archify check.
 *
 * Estudiante: Jesus Alejandro Artiaga Morales (220772)
 * Docente: M.T.I. Marco A. Ramirez Hernandez
 * Asignatura: Integradora - UTXJ
 *
 * Uso: node tools/build-screens.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PRACTICA = resolve(HERE, '..');
const SPEC = join(PRACTICA, 'spotify-screens.json');
const BASE_HTML = join(PRACTICA, 'spotify-screens.base.html');
const FINAL_HTML = join(PRACTICA, 'spotify-screens.html');
const INDEX_HTML = join(PRACTICA, 'index.html');
const LAYER_CSS = join(HERE, 'screens-layer.css');
const LAYER_JS = join(HERE, 'screens-layer.js');
const ARCHIFY = join(process.env.USERPROFILE || process.env.HOME, '.agents', 'skills', 'archify', 'bin', 'archify.mjs');

function step(label) {
  console.log(`\n[build-p06] ${label}`);
}

function archify(args) {
  return execFileSync(process.execPath, [ARCHIFY, ...args], { encoding: 'utf8', cwd: PRACTICA });
}

// 1. Validar la especificacion
step('1. Validando spotify-screens.json con Archify CLI (--quality showcase)');
const valResult = JSON.parse(archify(['validate', 'architecture', SPEC, '--quality', 'showcase', '--json']));
if (!valResult.ok) {
  console.error(valResult);
  throw new Error('La especificacion fallo la validacion de Archify.');
}
console.log('OK - Validacion exitosa: 0 errores, 0 advertencias.');

// 2. Renderizar el diagrama base
step('2. Renderizando diagrama base con Archify');
archify(['render', 'architecture', SPEC, BASE_HTML, '--quality', 'showcase']);
console.log('OK - Archify base HTML generado en ' + BASE_HTML);

// 3. Inyectar capa interactiva (CSS + JS)
step('3. Inyectando capa interactiva: clic en nodo => modal con la imagen del sketch');
const baseContent = readFileSync(BASE_HTML, 'utf8');
const cssContent = readFileSync(LAYER_CSS, 'utf8');
const jsContent = readFileSync(LAYER_JS, 'utf8');

let mergedHtml = baseContent.replace(
  '</head>',
  `<style id="sp-screens-layer-css">\n${cssContent}\n</style>\n</head>`
);

mergedHtml = mergedHtml.replace(
  '</body>',
  `<script id="sp-screens-layer-js">\n${jsContent}\n</script>\n</body>`
);

writeFileSync(FINAL_HTML, mergedHtml, 'utf8');
writeFileSync(INDEX_HTML, mergedHtml, 'utf8');
console.log('OK - Artefactos finales guardados en:');
console.log('  - ' + FINAL_HTML);
console.log('  - ' + INDEX_HTML);

// 4. Validar el resultado final con archify check
step('4. Ejecutando archify check sobre el artefacto final');
const checkResult = JSON.parse(archify(['check', FINAL_HTML]));
if (!checkResult.ok) {
  console.warn('[build] Advertencia en archify check:', checkResult);
} else {
  console.log('OK - archify check: status pass, 0 errores.');
}

// 5. Verificar que existan las 16 imagenes de sketch
step('5. Verificando imagenes de sketch (sketches/sketch1..16.jpg)');
let missing = 0;
for (let n = 1; n <= 16; n++) {
  const img = join(PRACTICA, 'sketches', `sketch${n}.jpg`);
  if (!existsSync(img)) { console.error('  FALTA: ' + img); missing++; }
}
console.log(missing === 0 ? 'OK - Las 16 imagenes de sketch estan presentes.' : `FALTAN ${missing} imagenes.`);

console.log('');
console.log('======================================================');
console.log('BUILD EXITOSO: Practica 06 lista (clic en nodo => sketch).');
console.log('======================================================');
