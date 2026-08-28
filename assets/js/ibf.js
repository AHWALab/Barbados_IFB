/* Impact-based forecast viewer, Barbados Saint Thomas, per forecast cycle.
   All data is inlined by assets/data/ibf_cycles.js. Leaflet, no build step. */

"use strict";

var D = window.IBF_DATA;
var CY = D.cycles;
var LEVELS = ["VERY LOW", "LOW", "MEDIUM", "HIGH"];
var LCOL = ["#63BE5F", "#FFD500", "#F58220", "#DA291C"];

var idx = CY.length - 1, minClass = 1, showAdmin = true, showBld = true, showRds = true;
var map, adminLayer, bldLayer, rdLayer;
var adminById = {};

function readHash() {
  var h = new URLSearchParams(location.hash.slice(1));
  var c = h.get("c");
  if (c) { var i = CY.findIndex(function (x) { return x.cycle === c; }); if (i >= 0) idx = i; }
  var m = parseInt(h.get("m"), 10);
  if (m >= 0 && m <= 3) minClass = m;
}
function writeHash() {
  var h = new URLSearchParams();
  h.set("c", CY[idx].cycle); h.set("m", minClass);
  history.replaceState(null, "", "#" + h.toString());
}

function buildMap() {
  map = L.map("map", { zoomControl: true });
  map.attributionControl.setPrefix("");
  var street = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19, attribution: "OpenStreetMap contributors, CARTO" }).addTo(map);
  var sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "Esri World Imagery" });
  L.control.layers({ "Street map": street, "Satellite": sat }, {},
    { position: "topleft", collapsed: true }).addTo(map);
  map.fitBounds(D.bounds, { padding: [10, 10] });

  var lg = L.control({ position: "bottomright" });
  lg.onAdd = function () {
    var d = L.DomUtil.create("div", "map-legend");
    d.innerHTML = "<b>Warning level, flood risk matrix</b>" +
      LEVELS.map(function (n, i) {
        return "<div><i style='background:" + LCOL[i] + "'></i>" + n + "</div>"; }).join("") +
      "<div style='margin-top:4px;color:#5b6770'>Districts filled, buildings as dots," +
      "<br>roads as lines</div>";
    return d;
  };
  lg.addTo(map);
}

function pct(v) { return (v === null || v === undefined) ? "-" : Math.round(v * 100) + "%"; }

function bldPopup(p) {
  return "<b>Building</b><table>" +
    "<tr><td style='color:#5b6770'>Warning level</td><td><b>" + p.risk_level + "</b></td></tr>" +
    "<tr><td style='color:#5b6770'>Likelihood band</td><td>" + p.likelihood + "</td></tr>" +
    "<tr><td style='color:#5b6770'>P(depth at or above 0.10 m)</td><td>" + pct(p.p_ge_10cm) + "</td></tr>" +
    "<tr><td style='color:#5b6770'>P(depth at or above 0.30 m)</td><td>" + pct(p.p_ge_30cm) + "</td></tr>" +
    "<tr><td style='color:#5b6770'>P(depth at or above 0.70 m)</td><td>" + pct(p.p_ge_70cm) + "</td></tr>" +
    "<tr><td style='color:#5b6770'>People in this building</td><td>" +
      (p.population_per_building === null ? "-" : p.population_per_building) + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Use</td><td>" + (p.subtype || "not recorded") +
      (p.critical ? ", critical facility" : "") + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Enumeration district</td><td>" + p.ED_CODE + "</td></tr>" +
    "</table>";
}
function rdPopup(p) {
  return "<b>Road segment</b><table>" +
    "<tr><td style='color:#5b6770'>Warning level</td><td><b>" + p.risk_level + "</b></td></tr>" +
    "<tr><td style='color:#5b6770'>Class</td><td>" + p.road_class + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Length</td><td>" + Math.round(p.road_length_m) + " m</td></tr>" +
    "<tr><td style='color:#5b6770'>P(depth at or above 0.10 m)</td><td>" + pct(p.p_ge_10cm) + "</td></tr>" +
    "<tr><td style='color:#5b6770'>P(depth at or above 0.30 m)</td><td>" + pct(p.p_ge_30cm) + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Likelihood band</td><td>" + p.likelihood + "</td></tr>" +
    "</table>";
}
function adPopup(a) {
  return "<b>Enumeration district " + a.ED_CODE + "</b><table>" +
    "<tr><td style='color:#5b6770'>Overall risk</td><td><b>" + a.risk_level + "</b></td></tr>" +
    "<tr><td style='color:#5b6770'>Census population</td><td>" + Math.round(a.population).toLocaleString() + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Buildings</td><td>" + a.bldg_count.toLocaleString() + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Road length</td><td>" + (a.rd_len_m / 1000).toFixed(1) + " km</td></tr>" +
    "<tr><td style='color:#5b6770'>People at or above the reporting cut</td><td>" +
      Math.round(a.IWF_Pop).toLocaleString() + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Buildings at or above the cut</td><td>" +
      a.IWF_bld_cnt.toLocaleString() + "</td></tr>" +
    "<tr><td style='color:#5b6770'>Road at or above the cut</td><td>" +
      Math.round(a.IWF_roads_m) + " m</td></tr>" +
    "</table>";
}

function draw() {
  var c = CY[idx];
  document.getElementById("cycsel").value = idx;
  document.getElementById("cyctitle").textContent = "Cycle " + c.cycle;
  adminById = {};
  c.admin.forEach(function (a) { adminById[a.ED_CODE] = a; });

  [adminLayer, bldLayer, rdLayer].forEach(function (l) { if (l) map.removeLayer(l); });

  adminLayer = L.geoJSON(D.admin_geom, {
    style: function (f) {
      var a = adminById[f.properties.ED_CODE];
      return { color: "#8a97a3", weight: 0.7, fillColor: a ? a.risk_color : "#eeeeee",
               fillOpacity: a && a.risk_class > 0 ? 0.55 : 0.18 };
    },
    onEachFeature: function (f, l) {
      var a = adminById[f.properties.ED_CODE];
      if (a) l.bindPopup(adPopup(a));
    }
  });
  if (showAdmin) adminLayer.addTo(map);

  rdLayer = L.geoJSON(c.roads, {
    filter: function (f) { return f.properties.risk_class >= minClass; },
    style: function (f) { return { color: f.properties.risk_color, weight: 3.5, opacity: 0.95 }; },
    onEachFeature: function (f, l) { l.bindPopup(rdPopup(f.properties)); }
  });
  if (showRds) rdLayer.addTo(map);

  bldLayer = L.geoJSON(c.buildings, {
    filter: function (f) { return f.properties.risk_class >= minClass; },
    pointToLayer: function (f, ll) {
      return L.circleMarker(ll, { radius: f.properties.risk_class >= 2 ? 5 : 3.6,
        fillColor: f.properties.risk_color, color: "#33414d", weight: 0.7, fillOpacity: 0.95 });
    },
    onEachFeature: function (f, l) { l.bindPopup(bldPopup(f.properties)); }
  });
  if (showBld) bldLayer.addTo(map);

  var s = c.summary;
  var kv = document.getElementById("kv");
  kv.innerHTML = [
    ["Buildings in window", Object.keys(s.buildings).reduce(function (t, k) {
      return t + s.buildings[k]; }, 0).toLocaleString()],
    ["Road segments in window", Object.keys(s.roads).reduce(function (t, k) {
      return t + s.roads[k]; }, 0).toLocaleString()],
    ["Enumeration districts", c.admin.length],
    ["People at yellow or worse", Math.round(s.pop_yellow_plus).toLocaleString()]
  ].map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");

  var tb = document.getElementById("sttable");
  var h = "<tr><th>Warning level</th><th>Buildings</th><th>Roads</th><th>Districts</th></tr>";
  LEVELS.forEach(function (n, i) {
    h += "<tr" + (i >= minClass ? " class='on'" : "") + "><td><span style='display:inline-block;" +
      "width:10px;height:10px;border-radius:2px;margin-right:6px;background:" + LCOL[i] + "'></span>" +
      n + "</td><td>" + (s.buildings[n] || 0).toLocaleString() + "</td><td>" +
      (s.roads[n] || 0).toLocaleString() + "</td><td>" + (s.admin[n] || 0) + "</td></tr>";
  });
  tb.innerHTML = h;
  writeHash();
}

/* controls */
var sel = document.getElementById("cycsel");
CY.forEach(function (c, i) {
  var o = document.createElement("option"); o.value = i; o.textContent = c.label + " UTC";
  sel.appendChild(o);
});
sel.onchange = function () { idx = parseInt(sel.value, 10); draw(); };
document.querySelectorAll("#seg-min button").forEach(function (b) {
  b.onclick = function () {
    minClass = parseInt(b.dataset.m, 10);
    document.querySelectorAll("#seg-min button").forEach(function (o) { o.classList.toggle("on", o === b); });
    draw();
  };
});
function bindToggle(id, setter) {
  var el = document.getElementById(id);
  el.onclick = function () { el.classList.toggle("on"); setter(el.classList.contains("on")); draw(); };
}
bindToggle("t-admin", function (v) { showAdmin = v; });
bindToggle("t-bld", function (v) { showBld = v; });
bindToggle("t-rds", function (v) { showRds = v; });
document.getElementById("prev").onclick = function () { idx = Math.max(idx - 1, 0); draw(); };
document.getElementById("next").onclick = function () { idx = Math.min(idx + 1, CY.length - 1); draw(); };

readHash();
buildMap();
document.querySelectorAll("#seg-min button").forEach(function (o) {
  o.classList.toggle("on", parseInt(o.dataset.m, 10) === minClass); });
draw();

window.addEventListener("hashchange", function () { readHash(); draw(); });
