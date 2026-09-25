// Turns Natural Earth's cities, airports and ports (data/*.geojson) into build/places.json:
// [lon, lat, kind, name, rank] with kind C capital, P city, A airport, M military airfield, S seaport.
//   node build/places.js
// Sources (public domain): github.com/nvkelso/natural-earth-vector/tree/master/geojson
//   ne_50m_populated_places_simple, ne_10m_airports, ne_10m_ports
const fs = require("fs");
const path = require("path");
const data = f => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", f + ".geojson"), "utf8")).features;
const r4 = x => Math.round(x * 1e4) / 1e4;
const out = [];
for (const f of data("ne_50m_populated_places_simple")) {
  const q = f.properties;
  if (/Scientific|Historic/.test(q.featurecla)) continue;
  out.push([r4(f.geometry.coordinates[0]), r4(f.geometry.coordinates[1]), q.featurecla === "Admin-0 capital" ? "C" : "P", q.name, q.pop_max || 0]);
}
for (const f of data("ne_10m_airports")) {
  const q = f.properties;
  if (q.type === "small" || q.type === "spaceport") continue;
  const name = (q.name_en || q.name || "").replace(/ International Airport| Airport/, "").trim();
  out.push([r4(f.geometry.coordinates[0]), r4(f.geometry.coordinates[1]), /military/.test(q.type) ? "M" : "A", name, /major/.test(q.type) ? 2 : 1]);
}
for (const f of data("ne_10m_ports")) {
  const q = f.properties;
  if (q.scalerank > 7) continue;
  out.push([r4(f.geometry.coordinates[0]), r4(f.geometry.coordinates[1]), "S", q.name, 9 - q.scalerank]);
}
fs.writeFileSync(path.join(__dirname, "places.json"), JSON.stringify(out));
console.log(`places.json: ${out.length} places`);
