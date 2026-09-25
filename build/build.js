// Bakes the map and board into one self-contained page: src/game.html -> index.html.
// board.json (who borders whom) comes from the Borderline project's build/analyse.js.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const topo = JSON.parse(fs.readFileSync(path.join(root, "countries-110m.json"), "utf8"));
const board = JSON.parse(fs.readFileSync(path.join(__dirname, "board.json"), "utf8"));
const DROP = new Set(["Antarctica", "Fr. S. Antarctic Lands"]);

topo.objects.countries.geometries = topo.objects.countries.geometries.filter(g => !DROP.has(g.properties.name));
delete topo.objects.land;

// The game looks countries up by position, so the map and the board must list them in the same order.
const names = topo.objects.countries.geometries.map(g => g.properties.name);
names.forEach((n, i) => {
  if (board.countries[i].name !== n) throw new Error(`Map and board disagree at ${i}: ${n} vs ${board.countries[i].name}`);
});
const links = board.countries.map(c => c.links);

// Land borders = neighbours you could march an army across: every link that isn't a sea crossing.
// board.seaLinks lists the pairs joined only by water ([a, b, coastA, coastB]); the rest are dry land.
const key = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
const sea = new Set((board.seaLinks || []).map(s => key(s[0], s[1])));
const landLinks = links.map((ns, i) => ns.filter(j => !sea.has(key(i, j))));
// Sanity: land borders must be symmetric (a borders b iff b borders a), or the front logic lies.
landLinks.forEach((ns, i) => ns.forEach(j => {
  if (!landLinks[j].includes(i)) throw new Error(`Land border not symmetric: ${names[i]} -> ${names[j]}`);
}));
const landCount = landLinks.reduce((s, ns) => s + ns.length, 0);
const islands = landLinks.filter(ns => ns.length === 0).length;

const page = fs.readFileSync(path.join(root, "src", "game.html"), "utf8")
  .replace("/*TOPO*/null", () => JSON.stringify(topo))
  .replace("/*LINKS*/null", () => JSON.stringify(links))
  .replace("/*LANDLINKS*/null", () => JSON.stringify(landLinks))
  .replace("/*PLACES*/null", () => fs.readFileSync(path.join(__dirname, "places.json"), "utf8"));
fs.writeFileSync(path.join(root, "index.html"), page);
console.log(`index.html: ${names.length} countries, ${(page.length / 1024).toFixed(0)} KB · ${landCount} land-border ends, ${islands} countries with no land border`);
