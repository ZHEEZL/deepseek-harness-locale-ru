#!/usr/bin/env node
// Build, audit and validate the Russian language pack.
//
//   node tools/build.mjs                  render lib/client.js, then validate it
//   node tools/build.mjs --check           fail when lib/client.js is stale (CI)
//   node tools/build.mjs --dicts dicts.json
//                                           audit against the application's own
//                                           English copy (see tools/extract-dictionaries.mjs)
//
// translations/ru.json is the source of truth. lib/client.js is generated from it
// and committed, so the pack installs and runs without a build step.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRANSLATIONS = path.join(ROOT, 'translations', 'ru.json');
const TARGET = path.join(ROOT, 'lib', 'client.js');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const LANGUAGE = { id: 'ru', label: 'Русский', fallback: 'en' };

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const dictsAt = argv.indexOf('--dicts');
const DICTS = dictsAt === -1 ? path.join(ROOT, 'dicts.json') : path.resolve(argv[dictsAt + 1]);

/** Read and shape-check the translation source. */
function readTranslations() {
  const parsed = JSON.parse(fs.readFileSync(TRANSLATIONS, 'utf8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('translations/ru.json must be a JSON object');
  const problems = [];
  for (const [namespace, dictionary] of Object.entries(parsed)) {
    if (dictionary === null || typeof dictionary !== 'object' || Array.isArray(dictionary)) { problems.push(namespace + ': not a key/value object'); continue; }
    for (const [key, value] of Object.entries(dictionary)) {
      if (typeof value !== 'string') problems.push(namespace + '/' + key + ': value is not a string');
      else if (value === '') problems.push(namespace + '/' + key + ': value is empty');
    }
  }
  return { translations: parsed, problems };
}

/** Compare translations against the application's English dictionaries when available. */
function audit(translations) {
  if (!fs.existsSync(DICTS)) return { available: false, missingNamespaces: [], missingKeys: [], extraNamespaces: [], extraKeys: [], placeholderMismatch: [] };
  const source = JSON.parse(fs.readFileSync(DICTS, 'utf8'));
  const missingNamespaces = [];
  const missingKeys = [];
  const extraNamespaces = [];
  const extraKeys = [];
  const placeholderMismatch = [];
  for (const namespace of Object.keys(source)) {
    const english = source[namespace].en || {};
    const target = translations[namespace];
    if (target === undefined) { missingNamespaces.push(namespace); continue; }
    for (const key of Object.keys(english)) {
      // A structurally empty English string carries no text to translate, and the
      // ru -> en fallback already reproduces it exactly.
      if (english[key] === '') continue;
      const value = target[key];
      if (value === undefined) { missingKeys.push(namespace + '/' + key); continue; }
      const from = (english[key].match(/\{(\w+)\}/g) || []).sort().join(',');
      const to = (value.match(/\{(\w+)\}/g) || []).sort().join(',');
      if (from !== to) placeholderMismatch.push(namespace + '/' + key + ': {' + from + '} -> {' + to + '}');
    }
    for (const key of Object.keys(target)) if (english[key] === undefined) extraKeys.push(namespace + '/' + key);
  }
  for (const namespace of Object.keys(translations)) if (source[namespace] === undefined) extraNamespaces.push(namespace);
  return { available: true, missingNamespaces, missingKeys, extraNamespaces, extraKeys, placeholderMismatch };
}

/** Render the browser half the module loader expects. */
function render(translations) {
  const dictionaries = JSON.stringify(translations, null, '\t').split('\n').join('\n\t\t');
  return [
    '// Russian language pack for the DeepSeek Harness web GUI.',
    '//',
    '// Generated from translations/ru.json by tools/build.mjs - do not edit by hand.',
    '//',
    '// A client plugin: it adds the "ru" language to the shared locale catalog and',
    '// registers one Russian dictionary per locale namespace the built-in client',
    '// plugins own. Lookup walks ru -> en, so any key absent here falls back to the',
    '// shipped English copy instead of showing a raw key.',
    'window.__ModuleLoader__.load({',
    '\tid: ' + JSON.stringify(MANIFEST.name) + ',',
    '\tfactory: (require) => {',
    '\t\tvar module = { exports: {} };',
    '\t\tvar exports = module.exports;',
    '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
    '\t\t/** The catalog entry this pack contributes; its fallback is the shipped English locale. */',
    '\t\tconst LANGUAGE = ' + JSON.stringify(LANGUAGE) + ';',
    '\t\t/** One Russian dictionary per locale namespace, keyed exactly like the built-in ones. */',
    '\t\tconst dictionaries = ' + dictionaries + ';',
    '\t\t/** Required service: the locale registry this pack extends. */',
    '\t\tconst inject = ["locale"];',
    '\t\t/**',
    '\t\t * Register the language and every dictionary as owned effects, so unloading',
    '\t\t * the pack removes them from the catalog and the language selector.',
    '\t\t * @param ctx - the browser plugin context.',
    '\t\t */',
    '\t\tfunction apply(ctx) {',
    '\t\t\tctx.effect(() => ctx.locale.addLanguage(LANGUAGE), "locale-ru: language definition");',
    '\t\t\tfor (const [ns, dict] of Object.entries(dictionaries)) {',
    '\t\t\t\tctx.effect(() => ctx.locale.register(ns, LANGUAGE.id, dict), "locale-ru: " + ns);',
    '\t\t\t}',
    '\t\t}',
    '\t\texports.LANGUAGE = LANGUAGE;',
    '\t\texports.apply = apply;',
    '\t\texports.dictionaries = dictionaries;',
    '\t\texports.inject = inject;',
    '\t\treturn module.exports;',
    '\t}',
    '});',
    ''
  ].join('\n');
}

/** Execute a bundle the way the browser does, then apply() it against a recording locale service. */
function exercise(source) {
  let registration;
  const sandbox = { window: { __ModuleLoader__: { load: (value) => { registration = value; } } }, console };
  vm.runInContext(source, vm.createContext(sandbox), { filename: 'lib/client.js' });
  if (registration === undefined) throw new Error('the bundle never called window.__ModuleLoader__.load');
  const exported = registration.factory((id) => { throw new Error('unexpected require: ' + id); });
  const languages = [];
  const dictionaries = [];
  const mock = {
    effect: (fn) => { const dispose = fn(); return typeof dispose === 'function' ? dispose : () => {}; },
    locale: {
      addLanguage: (input) => { languages.push(input); return () => {}; },
      register: (ns, locale, dict) => { dictionaries.push({ ns, locale, dict }); return () => {}; }
    }
  };
  exported.apply(mock);
  return { id: registration.id, languages, dictionaries };
}

// --- main -------------------------------------------------------------------
const { translations, problems } = readTranslations();
const coverage = audit(translations);
const rendered = render(translations);
const exercised = exercise(rendered);

const namespaces = Object.keys(translations).length;
const keys = Object.values(translations).reduce((total, dictionary) => total + Object.keys(dictionary).length, 0);
const failures = [...problems];
if (coverage.available) {
  failures.push(...coverage.missingNamespaces.map((ns) => 'missing namespace: ' + ns));
  failures.push(...coverage.missingKeys.map((key) => 'missing key: ' + key));
  failures.push(...coverage.placeholderMismatch.map((entry) => 'placeholder mismatch: ' + entry));
  failures.push(...coverage.extraNamespaces.map((ns) => 'unknown namespace: ' + ns));
}
if (exercised.languages.length !== 1 || exercised.languages[0].id !== LANGUAGE.id) failures.push('the bundle did not register exactly the ' + LANGUAGE.id + ' language');
if (exercised.dictionaries.length !== namespaces) failures.push('registered ' + exercised.dictionaries.length + ' dictionaries for ' + namespaces + ' namespaces');
for (const entry of exercised.dictionaries) if (entry.locale !== LANGUAGE.id) failures.push(entry.ns + ' registered for ' + entry.locale);

console.log(JSON.stringify({
  namespaces,
  keys,
  auditedAgainstApplication: coverage.available,
  missingNamespaces: coverage.missingNamespaces,
  missingKeys: coverage.missingKeys,
  placeholderMismatch: coverage.placeholderMismatch,
  extraNamespaces: coverage.extraNamespaces,
  extraKeys: coverage.extraKeys,
  registeredDictionaries: exercised.dictionaries.length
}, null, 1));

if (failures.length > 0) {
  for (const failure of failures) console.error('error: ' + failure);
  process.exit(1);
}

const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, 'utf8') : undefined;
if (check) {
  if (current !== rendered) {
    console.error('error: lib/client.js is stale; run `node tools/build.mjs` and commit the result');
    process.exit(1);
  }
  console.log('lib/client.js is up to date');
} else if (current === rendered) {
  console.log('lib/client.js is up to date');
} else {
  fs.mkdirSync(path.dirname(TARGET), { recursive: true });
  fs.writeFileSync(TARGET, rendered);
  console.log('wrote lib/client.js (' + Buffer.byteLength(rendered) + ' bytes)');
}
if (!coverage.available) console.log('note: ' + path.relative(ROOT, DICTS) + ' is absent, so coverage against the application was not audited');
