import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const functionsRoot = resolve('base44/functions');
const canonicalSharedRoot = resolve('base44/shared');
const errors = [];

function relativeImports(source) {
  const imports = [];
  const pattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["'](\.[^"']+)["']/g;
  for (const match of source.matchAll(pattern)) imports.push(match[1]);
  return imports;
}

function inspectModule(file, functionRoot, visited) {
  if (visited.has(file)) return;
  visited.add(file);
  const source = readFileSync(file, 'utf8');
  for (const specifier of relativeImports(source)) {
    const target = resolve(dirname(file), specifier);
    const rel = relative(functionRoot, target);
    if (rel === '..' || rel.startsWith(`..${sep}`)) {
      errors.push(`${relative('.', file)} imports outside its function bundle: ${specifier}`);
      continue;
    }
    if (!existsSync(target)) {
      errors.push(`${relative('.', file)} imports missing local module: ${specifier}`);
      continue;
    }
    inspectModule(target, functionRoot, visited);
  }
}

for (const entry of readdirSync(functionsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const functionRoot = join(functionsRoot, entry.name);
  const config = join(functionRoot, 'function.jsonc');
  if (!existsSync(config)) continue;
  inspectModule(join(functionRoot, 'entry.ts'), functionRoot, new Set());

  const localizedShared = join(functionRoot, 'shared');
  if (!existsSync(localizedShared)) {
    errors.push(`${relative('.', functionRoot)} is configured for automation but has no localized shared modules`);
    continue;
  }
  for (const sharedFile of readdirSync(localizedShared)) {
    if (!sharedFile.endsWith('.ts')) continue;
    const localized = join(localizedShared, sharedFile);
    const canonical = join(canonicalSharedRoot, sharedFile);
    if (!existsSync(canonical)) {
      errors.push(`${relative('.', localized)} has no canonical source`);
    } else if (readFileSync(localized, 'utf8') !== readFileSync(canonical, 'utf8')) {
      errors.push(`${relative('.', localized)} differs from ${relative('.', canonical)}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Automation function bundles are self-contained and synchronized.');
