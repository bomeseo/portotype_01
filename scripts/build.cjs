/* Build only public assets. Development tools and fixtures outside the entry graph stay private. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
fs.mkdirSync(output, { recursive: true });
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => !p.startsWith("#") && !/^https?:/.test(p));
for (const file of ["index.html", ...assets]) {
  const source = path.resolve(root, file);
  if (!source.startsWith(root + path.sep))
    throw new Error("Asset outside project: " + file);
  if (!fs.existsSync(source)) throw new Error("Missing asset: " + file);
  if (file.endsWith(".js"))
    new vm.Script(fs.readFileSync(source, "utf8"), { filename: file });
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}
console.log(
  "Built " + (assets.length + 1) + " validated public assets to dist.",
);
