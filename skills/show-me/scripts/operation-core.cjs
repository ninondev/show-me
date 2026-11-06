/* The browser and CLI share these bounded, deterministic text operations. */
(function (root) {
  'use strict';
  const LIMITS = Object.freeze({rows: 1000, text: 4000, bytes: 2_000_000, examples: 20, recipeBytes: 64_000, planBytes: 12_000_000});
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const fail = message => { throw new Error(message); };
  const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => own(value, key));
  const string = value => typeof value === 'string' && value.length <= LIMITS.text && !value.includes('\0');

  function readRows(source, field = 'text') {
    if (typeof source !== 'string' || new TextEncoder().encode(source).length > LIMITS.bytes)
      fail('Use a JSON file smaller than 2 MB.');
    if (!string(field) || !field || ['id', '__proto__', 'constructor', 'prototype'].includes(field))
      fail('Choose a text field other than id.');
    const rows = JSON.parse(source);
    if (!Array.isArray(rows) || !rows.length || rows.length > LIMITS.rows) fail('Use 1 to 1000 records.');
    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || !own(row, 'id') ||
          !string(row.id) || !row.id || ids.has(row.id) || !own(row, field) || !string(row[field]))
        fail('Each record needs a unique string id and a string in the chosen field (up to 4000 characters).');
      ids.add(row.id);
    }
    textSpans(source, field);
    return rows;
  }

  // Locate the editable JSON strings without serializing unrelated values.
  function textSpans(source, field) {
    let at = 0;
    const space = () => { while (/\s/.test(source[at] ?? '') && at < source.length) at++; };
    function quoted() {
      const begin = at++;
      while (at < source.length) {
        if (source[at] === '\\') at += 2;
        else if (source[at++] === '"') break;
      }
      return JSON.parse(source.slice(begin, at));
    }
    function skip() {
      space();
      if (source[at] === '"') { quoted(); return; }
      if (source[at] === '[' || source[at] === '{') {
        const close = source[at++] === '[' ? ']' : '}';
        space();
        while (source[at] !== close) {
          if (source[at] === ',' || source[at] === ':') at++;
          else skip();
          space();
        }
        at++; return;
      }
      while (at < source.length && !/[\s,}\]]/.test(source[at])) at++;
    }
    space(); at++;
    const spans = [];
    space();
    while (source[at] !== ']') {
      at++; space();
      const keys = new Set(); let span;
      while (source[at] !== '}') {
        const key = quoted();
        if (keys.has(key)) fail('Duplicate record keys are not supported.');
        keys.add(key); space(); at++; space();
        const start = at; skip();
        if (key === field) span = {start, end: at};
        space(); if (source[at] === ',') { at++; space(); }
      }
      spans.push(span); at++; space(); if (source[at] === ',') { at++; space(); }
    }
    return spans;
  }

  function writeChanges(source, rows, field, changes) {
    const spans = textSpans(source, field);
    const replacements = new Map(changes.map(change => [change.id, change.after]));
    let output = '', previous = 0;
    for (const [index, row] of rows.entries()) {
      if (!replacements.has(row.id)) continue;
      const {start, end} = spans[index];
      output += source.slice(previous, start) + JSON.stringify(replacements.get(row.id));
      previous = end;
    }
    output += source.slice(previous);
    if (new TextEncoder().encode(output).length > LIMITS.bytes) fail('The result exceeds the 2 MB data limit.');
    return output;
  }

  const cases = ['keep', 'lower', 'upper', 'sentence', 'title'];
  function changeCase(value, mode) {
    if (mode === 'lower') return value.toLowerCase();
    if (mode === 'upper') return value.toUpperCase();
    if (mode === 'sentence') {
      const chars = Array.from(value.toLowerCase());
      return chars.length ? chars[0].toUpperCase() + chars.slice(1).join('') : '';
    }
    if (mode === 'title') return value.toLowerCase().replace(/(^|\s)(\S)/gu, (_, space, char) => space + char.toUpperCase());
    return value;
  }

  function validateRecipe(recipe) {
    if (!exactKeys(recipe, ['schema', 'field', 'operation']) || recipe.schema !== 1 ||
        !string(recipe.field) || !recipe.field || ['id', '__proto__', 'constructor', 'prototype'].includes(recipe.field))
      fail('Invalid recipe.');
    const op = recipe.operation;
    if (!op || typeof op !== 'object') fail('Invalid operation.');
    if (op.kind === 'replace') {
      if (!exactKeys(op, ['kind', 'find', 'with', 'at']) || !string(op.find) || !string(op.with) ||
          !['start', 'end', 'all'].includes(op.at) || (!op.find && op.at === 'all') || op.find === op.with)
        fail('Invalid literal replacement.');
    } else if (op.kind === 'case') {
      if (!exactKeys(op, ['kind', 'mode', 'trim']) || !cases.includes(op.mode) || typeof op.trim !== 'boolean')
        fail('Invalid case operation.');
    } else if (op.kind === 'tokens') {
      if (!exactKeys(op, ['kind', 'dropStart', 'dropEnd', 'join', 'mode']) ||
          !Number.isInteger(op.dropStart) || op.dropStart < 0 || op.dropStart > 8 ||
          !Number.isInteger(op.dropEnd) || op.dropEnd < 0 || op.dropEnd > 8 ||
          ![' ', '-', '_', '.', '/', ''].includes(op.join) || !cases.includes(op.mode))
        fail('Invalid word operation.');
    } else fail('Unknown operation.');
    return recipe;
  }

  function transform(value, operation) {
    const op = operation;
    if (op.kind === 'case') return changeCase(op.trim ? value.trim() : value, op.mode);
    if (op.kind === 'tokens') {
      const parts = value.split(/[\s/_.-]+/u).filter(Boolean);
      if (parts.length <= op.dropStart + op.dropEnd) return value;
      return changeCase(parts.slice(op.dropStart, parts.length - op.dropEnd).join(op.join), op.mode);
    }
    if (op.at === 'start') return value.startsWith(op.find) ? op.with + value.slice(op.find.length) : value;
    if (op.at === 'end') return value.endsWith(op.find) ? value.slice(0, value.length - op.find.length) + op.with : value;
    return value.split(op.find).join(op.with);
  }

  function suggest(rows, examples, field = 'text') {
    readRows(JSON.stringify(rows), field);
    if (!Array.isArray(examples) || examples.length > LIMITS.examples) fail('Use up to 20 example edits.');
    const seen = new Set();
    const pairs = examples.map(example => {
      if (!exactKeys(example, ['id', 'after']) || !string(example.after) || seen.has(example.id)) fail('Invalid example.');
      const row = rows.find(row => row.id === example.id);
      if (!row) fail('An example refers to a missing record.');
      seen.add(example.id);
      return {before: row[field], after: example.after};
    });
    const changed = pairs.find(pair => pair.before !== pair.after);
    if (!changed) return [];
    const candidates = [];
    const add = operation => candidates.push({schema: 1, field, operation});
    const a = Array.from(changed.before), b = Array.from(changed.after);
    let start = 0, end = 0;
    while (start < Math.min(a.length, b.length) && a[start] === b[start]) start++;
    while (end < Math.min(a.length, b.length) - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
    const find = a.slice(start, a.length - end).join('');
    const replacement = b.slice(start, b.length - end).join('');
    if (start === 0) add({kind: 'replace', find, with: replacement, at: 'start'});
    if (end === 0) add({kind: 'replace', find, with: replacement, at: 'end'});
    if (find) add({kind: 'replace', find, with: replacement, at: 'all'});
    for (const trim of [false, true]) for (const mode of cases) add({kind: 'case', mode, trim});
    const length = changed.before.split(/[\s/_.-]+/u).filter(Boolean).length;
    for (let dropStart = 0; dropStart <= Math.min(8, length - 1); dropStart++) {
      for (let dropEnd = 0; dropEnd <= Math.min(8, length - dropStart - 1); dropEnd++) {
        for (const join of [' ', '-', '_', '.', '/', '']) for (const mode of cases)
          add({kind: 'tokens', dropStart, dropEnd, join, mode});
      }
    }
    const keys = new Set();
    return candidates.filter(recipe => {
      const key = JSON.stringify(recipe);
      if (keys.has(key) || !pairs.every(pair => transform(pair.before, recipe.operation) === pair.after)) return false;
      keys.add(key);
      return true;
    }).sort((left, right) => Number(left.operation.kind === 'replace' && left.operation.find === changed.before) -
      Number(right.operation.kind === 'replace' && right.operation.find === changed.before));
  }

  function describe(recipe) {
    validateRecipe(recipe);
    const op = recipe.operation, quote = value => JSON.stringify(value);
    if (op.kind === 'replace') {
      if (!op.find) return `${op.at === 'start' ? 'Add prefix' : 'Add suffix'} ${quote(op.with)}`;
      return `Replace ${quote(op.find)} with ${quote(op.with)} ${op.at === 'all' ? 'everywhere' : 'at the ' + op.at}`;
    }
    const mode = {keep: 'keep case', lower: 'lowercase', upper: 'UPPERCASE', sentence: 'Sentence case', title: 'Title Case'}[op.mode];
    if (op.kind === 'case') return (op.trim ? 'Trim outer spaces; ' : '') + mode;
    return `Split on spaces / _ . -; drop ${op.dropStart} from start and ${op.dropEnd} from end; join with ${quote(op.join)}; ${mode}`;
  }

  function preview(rows, recipe, selected = null) {
    validateRecipe(recipe);
    readRows(JSON.stringify(rows), recipe.field);
    if (selected !== null && (!Array.isArray(selected) || new Set(selected).size !== selected.length ||
        selected.some(id => !rows.some(row => row.id === id)))) fail('Invalid record selection.');
    const ids = selected === null ? null : new Set(selected);
    return rows.map(row => {
      const before = row[recipe.field];
      const after = ids === null || ids.has(row.id) ? transform(before, recipe.operation) : before;
      if (!string(after)) fail('A result exceeds the 4000-character limit.');
      return {id: row.id, before, after};
    }).filter(change => change.before !== change.after);
  }

  async function hash(text) {
    const bytes = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function makePlan(source, recipe, selected = null) {
    validateRecipe(recipe);
    const rows = readRows(source, recipe.field);
    const changes = preview(rows, recipe, selected);
    if (!changes.length) fail('This operation changes no records.');
    writeChanges(source, rows, recipe.field, changes);
    const plan = {schema: 1, sourceHash: await hash(source), recipe, selected, changes};
    if (new TextEncoder().encode(JSON.stringify(plan, null, 2)).length > LIMITS.planBytes) fail('This plan exceeds the 12 MB plan limit.');
    return plan;
  }

  async function execute(source, plan) {
    if (!exactKeys(plan, ['schema', 'sourceHash', 'recipe', 'selected', 'changes']) || plan.schema !== 1)
      fail('Invalid plan.');
    if (await hash(source) !== plan.sourceHash) fail('The source changed. Preview the operation again.');
    const expected = await makePlan(source, plan.recipe, plan.selected);
    if (JSON.stringify(expected) !== JSON.stringify(plan)) fail('The plan changed. Preview the operation again.');
    const rows = readRows(source, plan.recipe.field);
    return writeChanges(source, rows, plan.recipe.field, plan.changes);
  }

  const api = {LIMITS, readRows, validateRecipe, suggest, describe, preview, hash, makePlan, execute};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShowMeOperations = api;
})(globalThis);
