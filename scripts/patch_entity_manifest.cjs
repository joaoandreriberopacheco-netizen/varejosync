const fs = require("fs");

function patch(path, oldStr, newStr) {
  let c = fs.readFileSync(path, "utf8");
  if (!c.includes(oldStr)) throw new Error("not found: " + path + " :: " + oldStr.slice(0, 80));
  c = c.replace(oldStr, newStr);
  fs.writeFileSync(path, c, "utf8");
  console.log("patched", path);
}

const oldDocs =
  '        {\r\n          "name": "unidades_alternativas",\r\n          "type": "array<object>",\r\n          "pg_type": "JSONB DEFAULT \'[]\'"\r\n        },\r\n        {\r\n          "name": "controla_serial"';
const newDocs =
  '        {\r\n          "name": "unidades_alternativas",\r\n          "type": "array<object>",\r\n          "pg_type": "JSONB DEFAULT \'[]\'"\r\n        },\r\n        {\r\n          "name": "unidade_apresentacao_default",\r\n          "type": "string",\r\n          "default": "",\r\n          "pg_type": "TEXT DEFAULT \'\'"\r\n        },\r\n        {\r\n          "name": "controla_serial"';

patch("docs/migration/ENTITIES_MANIFEST.json", oldDocs, newDocs);

const oldCompact =
  '        { "name": "unidades_alternativas", "type": "array<object>", "pg_type": "JSONB DEFAULT \'[]\'" },\r\n        { "name": "controla_serial"';
const newCompact =
  '        { "name": "unidades_alternativas", "type": "array<object>", "pg_type": "JSONB DEFAULT \'[]\'" },\r\n        { "name": "unidade_apresentacao_default", "type": "string", "default": "", "pg_type": "TEXT DEFAULT \'\'" },\r\n        { "name": "controla_serial"';

patch("src/docs/migration/ENTITIES_MANIFEST.json", oldCompact, newCompact);

let entry = fs.readFileSync("base44/functions/commitMigrationManifests/entry.ts", "utf8");
if (!entry.includes(oldCompact)) {
  const oldLf = oldCompact.replace(/\r\n/g, "\n");
  const newLf = newCompact.replace(/\r\n/g, "\n");
  if (!entry.includes(oldLf)) throw new Error("entry.ts pattern not found");
  entry = entry.replace(oldLf, newLf);
} else {
  entry = entry.replace(oldCompact, newCompact);
}
fs.writeFileSync("base44/functions/commitMigrationManifests/entry.ts", entry, "utf8");
console.log("patched base44/functions/commitMigrationManifests/entry.ts");
