#!/usr/bin/env node
// Extract every English/Chinese UI dictionary the installed DeepSeek Harness
// ships, straight out of app.asar and without unpacking the archive.
//
//   node tools/extract-dictionaries.mjs <path-to-app.asar> [dicts.json]
//
// The client bundles are lazy-CJS factories whose locale data lives in
// //#region ... //#endregion blocks of plain object literals. Each region is
// evaluated in isolation inside a permissive with() scope, so a region that runs
// real code (settings schemas, classes) fails alone without losing its
// neighbours. The result feeds the coverage audit in tools/build.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let originalFs;
try { originalFs = (await import('node:original-fs')).default; }
catch { originalFs = fs; }

const BACKTICK = String.fromCharCode(96);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASAR = process.argv[2] ?? process.env.DSH_ASAR;
const OUT = process.argv[3] ?? path.join(ROOT, 'dicts.json');

if (ASAR === undefined || ASAR === '') {
  console.error('usage: node tools/extract-dictionaries.mjs <path-to-app.asar> [dicts.json]');
  console.error('  on Windows the packaged application keeps it at');
  console.error('  <install dir>/resources/app.asar');
  process.exit(2);
}

const UNPACKED = ASAR.replace(/\.asar$/, '.asar.unpacked');

function readArchive(archive) {
  const fd = originalFs.openSync(archive, 'r');
  const head = Buffer.alloc(16);
  originalFs.readSync(fd, head, 0, 16, 0);
  const jsonLength = head.readUInt32LE(12);
  const json = Buffer.alloc(jsonLength);
  originalFs.readSync(fd, json, 0, jsonLength, 16);
  const header = JSON.parse(json.toString('utf8'));
  const files = [];
  (function walk(node, prefix) {
    for (const [name, value] of Object.entries(node.files ?? {})) {
      const full = prefix + '/' + name;
      if (value.files) walk(value, full);
      else files.push({ path: full, size: value.size, offset: value.offset });
    }
  })(header, '');
  return {
    files,
    read(file) {
      if (file.offset === undefined) return originalFs.readFileSync(UNPACKED + file.path, 'utf8');
      const buffer = Buffer.alloc(file.size);
      originalFs.readSync(fd, buffer, 0, file.size, 16 + jsonLength + Number(file.offset));
      return buffer.toString('utf8');
    },
    close() { originalFs.closeSync(fd); }
  };
}

function regionsOf(source) {
  const regions = [];
  const marker = /\/\/#region[^\n]*\n/g;
  let match;
  const starts = [];
  while ((match = marker.exec(source))) starts.push({ name: match[0].replace(/^\/\/#region\s*/, '').trim(), at: marker.lastIndex });
  for (const start of starts) {
    const end = source.indexOf('//#endregion', start.at);
    if (end < 0) continue;
    regions.push({ name: start.name, body: source.slice(start.at, end) });
  }
  return regions;
}

function permissiveDummy() {
  const callable = function () { return dummy; };
  const dummy = new Proxy(callable, {
    get(target, key) {
      if (key === Symbol.toPrimitive || key === 'toString') return () => '';
      if (key === Symbol.iterator || key === Symbol.unscopables || key === 'then') return undefined;
      return dummy;
    },
    apply() { return dummy; },
    construct() { return dummy; },
    has() { return true; }
  });
  return dummy;
}

function evaluateRegions(regions) {
  const dummy = permissiveDummy();
  const store = {};
  const scope = new Proxy(store, {
    has: () => true,
    get(target, key) {
      if (key === Symbol.unscopables) return undefined;
      return typeof key === 'string' && Object.prototype.hasOwnProperty.call(target, key) ? target[key] : dummy;
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  for (const region of regions) {
    if (/\.css/.test(region.name) || /__vite__css/.test(region.body)) continue;
    const names = new Set();
    for (const found of region.body.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) names.add(found[1]);
    try {
      const run = new Function('__scope', 'with(__scope){' + region.body + '\nreturn {' + [...names].join(',') + '};}');
      for (const [key, value] of Object.entries(run(scope))) if (value !== undefined) store[key] = value;
    } catch { /* a region that runs real code contributes no dictionaries */ }
  }
  return store;
}

function isQuote(character) {
  return character === '"' || character === "'" || character === BACKTICK;
}

function balanced(source, at) {
  let depth = 0, quote = null, escaped = false;
  for (let i = at; i < source.length; i++) {
    const character = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (isQuote(character)) { quote = character; continue; }
    if (character === '(' || character === '{' || character === '[') depth++;
    else if (character === ')' || character === '}' || character === ']') { depth--; if (depth === 0) return source.slice(at, i + 1); }
  }
  return null;
}

function splitArguments(inner) {
  const parts = [];
  let depth = 0, quote = null, escaped = false, current = '';
  for (const character of inner) {
    if (quote) {
      current += character;
      if (escaped) { escaped = false; continue; }
      if (character === '\\') { escaped = true; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (isQuote(character)) { quote = character; current += character; continue; }
    if (character === '(' || character === '{' || character === '[') depth++;
    if (character === ')' || character === '}' || character === ']') depth--;
    if (character === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += character;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const archive = readArchive(ASAR);
const dictionaries = {};
for (const file of archive.files) {
  if (!file.path.startsWith('/dsh/node_modules/@deepseek-ai/')) continue;
  if (!/\.js$/.test(file.path)) continue;
  if (/libreoffice|documentpreview/.test(file.path)) continue;
  let source;
  try { source = archive.read(file); } catch { continue; }
  if (!/locale\.register/.test(source)) continue;
  const rel = file.path.replace('/dsh/node_modules/@deepseek-ai/', '');
  const pkg = rel.split('/')[0];
  const constants = evaluateRegions(regionsOf(source));
  const literals = {};
  for (const found of source.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)) {
    try { literals[found[1]] = JSON.parse(found[2]); } catch { literals[found[1]] = found[2].slice(1, -1); }
  }
  for (const call of source.matchAll(/locale\.register\s*\(/g)) {
    const open = source.indexOf('(', call.index);
    const args = balanced(source, open);
    if (args === null) continue;
    const parts = splitArguments(args.slice(1, -1));
    if (parts.length < 2 || !/^\{/.test(parts[1])) continue;
    const namespace = /^["']/.test(parts[0]) ? JSON.parse(parts[0]) : literals[parts[0]];
    if (namespace === undefined) continue;
    const pairs = [];
    for (const entry of parts[1].matchAll(/([A-Za-z_$][\w$]*)\s*(?::\s*([A-Za-z_$][\w$]*))?\s*(?=[,}])/g)) {
      const locale = entry[1];
      const constant = entry[2] ?? entry[1];
      if (constants[constant] && typeof constants[constant] === 'object') pairs.push([locale, constants[constant]]);
    }
    for (const [locale, dictionary] of pairs) {
      dictionaries[namespace] ??= { en: {}, zh: {}, pkgs: [] };
      if (!dictionaries[namespace].pkgs.includes(pkg)) dictionaries[namespace].pkgs.push(pkg);
      for (const [key, value] of Object.entries(dictionary)) if (typeof value === 'string') dictionaries[namespace][locale][key] = value;
    }
  }
}
archive.close();

// The directory picker registers its two dictionaries inline through the
// per-locale form, which the generic scan above does not read.
dictionaries['directory-browser'] ??= {
  en: {
    'browser.title': 'Select Workspace Directory', 'browser.home': 'Home', 'browser.newFolder': 'New folder',
    'browser.folderName': 'Folder name', 'browser.createIn': 'New folder in "{name}"', 'browser.untitledFolder': 'Untitled folder',
    'browser.create': 'Create', 'browser.cancel': 'Cancel', 'browser.open': 'Open', 'browser.editPath': 'Edit path',
    'browser.loading': 'Loading…', 'browser.truncated': 'Too many folders to list; only the beginning is shown.',
    'browser.showHidden': 'Show hidden files'
  },
  zh: {},
  pkgs: ['dsh-client-ui-directory-picker-browse']
};

fs.writeFileSync(OUT, JSON.stringify(dictionaries, null, 1));
const namespaces = Object.keys(dictionaries).length;
const keys = Object.values(dictionaries).reduce((total, entry) => total + Object.keys(entry.en).length, 0);
console.log('wrote ' + OUT + ': ' + namespaces + ' namespaces, ' + keys + ' English keys');
