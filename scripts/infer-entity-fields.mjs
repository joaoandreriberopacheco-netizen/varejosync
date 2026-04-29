#!/usr/bin/env node
/**
 * Varre `src/**` com o parser do Babel e infere, para cada `base44.entities.<Nome>` ou
 * `p38.entities.<Nome>`, quais campos são usados em chamadas `.create / .update / .filter /
 * .bulkCreate` (objetos literais), além de campos que aparecem em order/limit.
 *
 * Saída: JSON ordenado em src/integrations/p38/inferred-entity-fields.json
 *   {
 *     "Cotacao": {
 *       "fields": ["status","itens","fornecedor_id",...],
 *       "writeFields": [...],
 *       "filterFields": ["status"],
 *       "files": [...]
 *     }, ...
 *   }
 *
 * Uso: node scripts/infer-entity-fields.mjs
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(process.cwd(), 'src');
const OUT = path.resolve(process.cwd(), 'scripts/.cache/inferred-entity-fields.json');
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs']);

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else if (exts.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function isEntitiesAccess(node) {
  // Detecta MemberExpression cujo "objeto" termina em `.entities` e o "objeto raiz" é
  // identificador `base44` ou `p38`.
  if (!node || node.type !== 'MemberExpression') return null;
  const obj = node.object;
  if (
    obj?.type === 'MemberExpression' &&
    obj.property?.type === 'Identifier' &&
    obj.property.name === 'entities' &&
    obj.object?.type === 'Identifier' &&
    (obj.object.name === 'base44' || obj.object.name === 'p38')
  ) {
    if (node.property?.type === 'Identifier') return node.property.name;
  }
  return null;
}

function extractKeysFromObjectExpression(node) {
  const out = [];
  if (!node || node.type !== 'ObjectExpression') return out;
  for (const prop of node.properties) {
    if (
      prop.type === 'ObjectProperty' &&
      !prop.computed &&
      (prop.key.type === 'Identifier' || prop.key.type === 'StringLiteral')
    ) {
      const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
      out.push(key);
    } else if (prop.type === 'SpreadElement') {
      // ignorar spread
    }
  }
  return out;
}

const acc = new Map(); // entityName -> { fields:Set, write:Set, filter:Set, files:Set }

function ensure(name) {
  if (!acc.has(name)) {
    acc.set(name, {
      fields: new Set(),
      write: new Set(),
      filter: new Set(),
      files: new Set()
    });
  }
  return acc.get(name);
}

async function processFile(file) {
  const code = await readFile(file, 'utf8');
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'topLevelAwait',
        'decorators-legacy',
        'objectRestSpread'
      ],
      errorRecovery: true
    });
  } catch (err) {
    console.warn(`[skip] ${path.relative(process.cwd(), file)}: parse fail (${err.message})`);
    return;
  }

  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (callee.type !== 'MemberExpression') return;
      const methodName = callee.property?.type === 'Identifier' ? callee.property.name : null;
      if (!methodName) return;

      const entityName = isEntitiesAccess(callee.object);
      if (!entityName) return;

      const bucket = ensure(entityName);
      bucket.files.add(path.relative(process.cwd(), file));

      const args = p.node.arguments || [];

      const collect = (objNode, target) => {
        const keys = extractKeysFromObjectExpression(objNode);
        for (const k of keys) {
          bucket.fields.add(k);
          if (target) target.add(k);
        }
      };

      switch (methodName) {
        case 'create':
        case 'bulkCreate': {
          if (args[0]?.type === 'ObjectExpression') {
            collect(args[0], bucket.write);
          } else if (args[0]?.type === 'ArrayExpression') {
            for (const el of args[0].elements) {
              if (el?.type === 'ObjectExpression') collect(el, bucket.write);
            }
          }
          break;
        }
        case 'update': {
          if (args[1]?.type === 'ObjectExpression') {
            collect(args[1], bucket.write);
          }
          break;
        }
        case 'filter': {
          if (args[0]?.type === 'ObjectExpression') {
            collect(args[0], bucket.filter);
          }
          break;
        }
        default:
          break;
      }
    }
  });
}

const files = await walk(ROOT);
for (const f of files) await processFile(f);

const result = {};
for (const [name, b] of [...acc.entries()].sort(([a], [c]) => a.localeCompare(c))) {
  result[name] = {
    fields: [...b.fields].sort(),
    writeFields: [...b.write].sort(),
    filterFields: [...b.filter].sort(),
    files: [...b.files].sort()
  };
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(result, null, 2));
console.log(`OK — ${Object.keys(result).length} entidades. Saída: ${path.relative(process.cwd(), OUT)}`);

// Resumo no stdout
for (const [name, info] of Object.entries(result)) {
  const fields = info.fields.length;
  const w = info.writeFields.length;
  const f = info.filterFields.length;
  console.log(`- ${name}: ${fields} campos (${w} writes, ${f} filters)`);
}
