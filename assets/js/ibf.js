/* Impact-based forecast viewer, Barbados, per forecast cycle. One application for every
   event folder: the event page loads its own data/ibf_cycles.js (window.IBF_DATA).
   Leaflet, no build step. Receptor payloads may be verbose GeoJSON (August 2026) or the
   compact rows of the Tomas case; both are expanded to the same properties here. */

"use strict";

var D = window.IBF_DATA;
var CY = D.cycles;
var LEVELS = ["VERY LOW", "LOW", "MEDIUM", "HIGH"];
var LCOL = ["#63BE5F", "#FFD500", "#F58220", "#DA291C"];
var ADMIN_KEY = D.admin_key || "ED_CODE";
var ADMIN_LABEL = D.admin_label || "Enumeration district";
var ADMIN_NAME = D.admin_name_key || null;

var idx = CY.length - 1, minClass = (D.default_min !== undefined ? D.default_min : 1),
    showAdmin = true, showBld = true, showRds = true, showFac = true, showEds = false;
var map, adminLayer, bldLayer, rdLayer, facLayer, edLayer;
var FAC_LABEL = { medical: "Health", education: "Education", civic: "Civic and emergency" };
var adminById = {};

/* ---------- expand compact payloads ---------- */

function expandBuildings(c) {
  if (c.buildings) return c.buildings;
  var B = c.buildings_compact, ix = {};
  B.cols.forEach(function (k, i) { ix[k] = i; });
  var feats = B.rows.map(function (r) {
    var rc = r[ix.rc];
    return { type: "Feature",
      properties: { ADM1_PCODE: B.pcodes[r[ix.pc]], population_per_building: r[ix.pop],
                    p_ge_10cm: r[ix.p10], p_ge_30cm: r[ix.p30], p_ge_70cm: r[ix.p70],
                    risk_class: rc, risk_level: LEVELS[rc], risk_color: LCOL[rc],
                    likelihood: B.lks[r[ix.lk]], subtype: r[ix.sub] ? B.subs[r[ix.sub] - 1] : null,
                    critical: !!r[ix.cr] },
      geometry: { type: "Point", coordinates: [r[ix.lon], r[ix.lat]] } };
  });
  c.buildings = { type: "FeatureCollection", features: feats };
  return c.buildings;
}
function expandRoads(c) {
  c.roads.features.forEach(function (f) {
    var p = f.properties;
    if (p.rc !== undefined) {
      p.risk_class = p.rc; p.risk_level = LEVELS[p.rc]; p.risk_color = LCOL[p.rc];
      p.road_class = p.cls; p.road_length_m = p.len; p.ADM1_PCODE = p.pc;
      p.p_ge_10cm = p.p10; p.p_ge_30cm = p.p30; p.p_ge_70cm = p.p70; p.likelihood = p.lk;
    }
  });
  return c.roads;
}

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

/* ---------- basemap ----------
   CARTO raster basemaps require an API key since August 2026. This key was issued to the
   University of Iowa for the domains ahwalab.github.io and localhost. It is a browser side
   key: it is visible in this file by design, and CARTO restricts it to those domains.
   To rotate it, replace the value here and in the other two viewer repositories.
   CARTO and OpenStreetMap attribution must stay visible on the map, which it does below. */

var CARTO_KEY = "cb1_2hul_1_d1beea1581cc2f8c94ba52d4";
var CARTO_LIGHT = "https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png" +
                  "?key=" + CARTO_KEY;
var ESRI_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/" +
                   "World_Imagery/MapServer/tile/{z}/{y}/{x}";

function buildMap() {
  map = L.map("map", { zoomControl: true, preferCanvas: true });
  map.attributionControl.setPrefix("");
  var street = L.tileLayer(CARTO_LIGHT, {
    maxZoom: 19, attribution: "OpenStreetMap contributors, CARTO" }).addTo(map);
  var sat = L.tileLayer(ESRI_IMAGERY,
    { maxZoom: 19, attribution: "Esri World Imagery" });
  L.control.layers({ "Street map": street, "Satellite": sat }, {},
    { position: "topleft", collapsed: true }).addTo(map);
  map.fitBounds(D.bounds, { padding: [10, 10] });

  var lg = L.control({ position: "bottomright" });
  lg.onAdd = function () {
    var d = L.DomUtil.create("div", "map-legend");
    d.id = "maplegend";
    return d;
  };
  lg.addTo(map);
  updateLegend();
}

function updateLegend() {
  var d = document.getElementById("maplegend");
  if (!d) return;
  var h = "<b>Warning level, flood risk matrix</b>" +
    LEVELS.map(function (n, i) {
      return "<div><i style='background:" + LCOL[i] + "'></i>" + n + "</div>"; }).join("") +
    "<div style='margin-top:4px;color:#5b6770'>" + plural(ADMIN_LABEL) + " filled, buildings as dots," +
    "<br>roads as lines, facilities as squares</div>";
  if (D.eds && showEds) {
    h += "<div class='lg-sub'>People at yellow or worse per district</div>" +
      "<div class='rampbox'><div style='background:#deebf7'></div><div style='background:#9ecae1'></div>" +
      "<div style='background:#4292c6'></div><div style='background:#08519c'></div></div>" +
      "<div class='ramplab'><span>1</span><span>50</span><span>150</span><span class='last'>400 and up</span></div>";
  }
  d.innerHTML = h;
}

function plural(s) { return s === "Parish" ? "Parishes" : s + "s"; }
function pct(v) { return (v === null || v === undefined) ? "-" : Math.round(v * 100) + "%"; }
function td(k, v) { return "<tr><td style='color:#5b6770'>" + k + "</td><td>" + v + "</td></tr>"; }

function bldPopup(p) {
  return "<b>Building</b><table>" +
    td("Warning level", "<b>" + p.risk_level + "</b>") +
    td("Likelihood band", p.likelihood) +
    td("P(depth at or above 0.10 m)", pct(p.p_ge_10cm)) +
    td("P(depth at or above 0.30 m)", pct(p.p_ge_30cm)) +
    td("P(depth at or above 0.70 m)", pct(p.p_ge_70cm)) +
    td("People in this building", (p.population_per_building === null || p.population_per_building === undefined) ? "-" : p.population_per_building) +
    td("Use", (p.subtype || "not recorded") + (p.critical ? ", critical facility" : "")) +
    (p.ED_CODE ? td("Enumeration district", p.ED_CODE) : "") +
    (p.ADM1_PCODE ? td("Parish", parishName(p.ADM1_PCODE)) : "") +
    "</table>";
}
function rdPopup(p) {
  return "<b>Road segment</b><table>" +
    td("Warning level", "<b>" + p.risk_level + "</b>") +
    td("Class", p.road_class) +
    td("Length", Math.round(p.road_length_m) + " m") +
    td("P(depth at or above 0.10 m)", pct(p.p_ge_10cm)) +
    td("P(depth at or above 0.30 m)", pct(p.p_ge_30cm)) +
    td("Likelihood band", p.likelihood) +
    (p.ADM1_PCODE ? td("Parish", parishName(p.ADM1_PCODE)) : "") +
    "</table>";
}
function facPopup(p) {
  var rc = p.risk_class || 0;
  var lvl = p.risk_level === "NO BUILDING NEARBY"
    ? "no building within 30 m"
    : "<b>" + (p.risk_level || LEVELS[rc]) + "</b>" + (p.dist_m !== undefined && p.dist_m !== null ? " (nearest building " + p.dist_m + " m)" : "");
  return "<b>" + (p.name || "Unnamed facility") + "</b><table>" +
    td("Type", (FAC_LABEL[p.subtype] || p.subtype) + ", " + String(p.osm_tag).replace(/_/g, " ")) +
    td("Warning level here", lvl) +
    "</table><div style='margin-top:6px;color:#5b6770;font-size:11.5px'>" +
    "Critical facility from the OpenStreetMap extract of 6 April 2026.</div>";
}
function parishName(pc) {
  var a = adminById[pc];
  return a && a.ADM1_EN ? a.ADM1_EN : pc;
}

function adPopup(a) {
  var head = ADMIN_LABEL + " " + (ADMIN_NAME && a[ADMIN_NAME] ? a[ADMIN_NAME] : a[ADMIN_KEY]);
  var h = "<b>" + head + "</b><table>" +
    td("Overall risk", "<b>" + a.risk_level + "</b>") +
    td("Census population", Math.round(a.population).toLocaleString()) +
    td("Buildings", a.bldg_count.toLocaleString()) +
    td("Road length", (a.rd_len_m / 1000).toFixed(1) + " km");
  if (a.bld_yellow !== undefined) {
    h += td("Buildings yellow, amber, red", a.bld_yellow.toLocaleString() + ", " + a.bld_amber.toLocaleString() + ", " + a.bld_red.toLocaleString()) +
         td("Road segments at yellow or worse", a.rd_yellow_plus.toLocaleString()) +
         td("People at yellow or worse", a.pop_yellow_plus.toLocaleString()) +
         td("People in buildings with P over 0.5 at any depth", a.pop_hazard.toLocaleString()) +
         td("Critical facilities, at yellow or worse", a.critical + ", " + a.critical_at_risk);
  } else {
    h += td("People at or above the reporting cut", Math.round(a.IWF_Pop).toLocaleString()) +
         td("Buildings at or above the cut", a.IWF_bld_cnt.toLocaleString()) +
         td("Road at or above the cut", Math.round(a.IWF_roads_m) + " m");
  }
  return h + "</table>";
}
function n0(v) { return (v === undefined || v === null) ? 0 : v; }
function edPopup(p) {
  return "<b>Enumeration district " + p.ED_CODE + "</b><table>" +
    td("Census population 2010", n0(p.population).toLocaleString()) +
    td("Buildings in the stock", n0(p.bld).toLocaleString()) +
    td("Buildings at yellow or worse", n0(p.bld_yellow_plus).toLocaleString() + " (" + n0(p.share_yellow_plus) + "%)") +
    td("Buildings at amber or worse", n0(p.bld_amber_plus).toLocaleString()) +
    td("Buildings red", n0(p.bld_red).toLocaleString()) +
    td("People at yellow or worse", n0(p.pop_yellow_plus).toLocaleString()) +
    "</table><div style='margin-top:6px;color:#5b6770;font-size:11.5px'>Counted from the receptors; " +
    "the district itself carries no matrix level in this run.</div>";
}
function edColor(v) {
  return v >= 400 ? "#08519c" : (v >= 150 ? "#4292c6" : (v >= 50 ? "#9ecae1" : (v >= 1 ? "#deebf7" : "#ffffff")));
}

function draw() {
  var c = CY[idx];
  var selEl = document.getElementById("cycsel");
  if (selEl) selEl.value = idx;
  document.getElementById("cyctitle").textContent = "Cycle " + c.cycle + (c.horizon ? ", " + c.horizon : "");
  adminById = {};
  c.admin.forEach(function (a) { adminById[a[ADMIN_KEY]] = a; });

  [adminLayer, bldLayer, rdLayer, facLayer, edLayer].forEach(function (l) { if (l) map.removeLayer(l); });

  var parishLevel = ADMIN_KEY === "ADM1_PCODE";
  adminLayer = L.geoJSON(D.admin_geom, {
    style: function (f) {
      var a = adminById[f.properties[ADMIN_KEY]];
      return { color: parishLevel ? "#33414d" : "#8a97a3", weight: parishLevel ? 1.2 : 0.7,
               fillColor: a ? a.risk_color : "#eeeeee",
               fillOpacity: parishLevel ? 0.12 : (a && a.risk_class > 0 ? 0.55 : 0.18) };
    },
    onEachFeature: function (f, l) {
      var a = adminById[f.properties[ADMIN_KEY]];
      if (a) l.bindPopup(adPopup(a));
      if (parishLevel && a) l.bindTooltip(a.ADM1_EN + ", " + a.risk_level, { sticky: true });
    }
  });
  if (showAdmin) adminLayer.addTo(map);

  if (D.eds) {
    edLayer = L.geoJSON(D.eds, {
      style: function (f) {
        var v = f.properties.pop_yellow_plus || 0;
        return { color: "#6b7a88", weight: 0.5, fillColor: edColor(v), fillOpacity: v >= 1 ? 0.6 : 0.05 };
      },
      onEachFeature: function (f, l) { l.bindPopup(edPopup(f.properties)); }
    });
    if (showEds) edLayer.addTo(map);
  }

  rdLayer = L.geoJSON(expandRoads(c), {
    filter: function (f) { return f.properties.risk_class >= minClass; },
    style: function (f) { return { color: f.properties.risk_color, weight: 3.5, opacity: 0.95 }; },
    onEachFeature: function (f, l) { l.bindPopup(rdPopup(f.properties)); }
  });
  if (showRds) rdLayer.addTo(map);

  bldLayer = L.geoJSON(expandBuildings(c), {
    filter: function (f) { return f.properties.risk_class >= minClass; },
    pointToLayer: function (f, ll) {
      return L.circleMarker(ll, { radius: f.properties.risk_class >= 2 ? 5 : 3.6,
        fillColor: f.properties.risk_color, color: "#33414d", weight: 0.7, fillOpacity: 0.95 });
    },
    onEachFeature: function (f, l) { l.bindPopup(bldPopup(f.properties)); }
  });
  if (showBld) bldLayer.addTo(map);

  if (c.facilities) {
    facLayer = L.geoJSON(c.facilities, {
      filter: function (f) { return ADMIN_KEY !== "ADM1_PCODE" || (f.properties.risk_class || 0) >= minClass; },
      pointToLayer: function (f, ll) {
        var p = f.properties;
        return L.marker(ll, { icon: L.divIcon({
          className: "", iconSize: [13, 13], iconAnchor: [6, 6],
          html: "<div class='fac-icon' style='background:" + (p.risk_color || LCOL[p.risk_class || 0]) + "'></div>" }) });
      },
      onEachFeature: function (f, l) { l.bindPopup(facPopup(f.properties)); }
    });
    if (showFac) facLayer.addTo(map);
  }

  var s = c.summary;
  var nb = Object.keys(s.buildings).reduce(function (t, k) { return t + s.buildings[k]; }, 0);
  var nr = Object.keys(s.roads).reduce(function (t, k) { return t + s.roads[k]; }, 0);
  var kv = document.getElementById("kv");
  var rows = [
    [parishLevel ? "Buildings on the island" : "Buildings in window", nb.toLocaleString()],
    [parishLevel ? "Road segments on the island" : "Road segments in window", nr.toLocaleString()],
    [plural(ADMIN_LABEL), c.admin.length],
    ["People at yellow or worse", Math.round(s.pop_yellow_plus).toLocaleString() +
      (s.pop_total ? " of " + s.pop_total.toLocaleString() : "")]];
  if (s.road_km_yellow_plus !== undefined) rows.push(["Road at yellow or worse", s.road_km_yellow_plus + " km"]);
  rows.push(["Critical facilities", (s.critical_buildings || 0) + " buildings" +
    (c.facilities ? ", " + c.facilities.features.length + " named" : "")]);
  rows.push(["Critical facilities at yellow or worse", (s.critical_at_risk || 0) +
    (s.critical_at_amber_plus !== undefined ? " (" + s.critical_at_amber_plus + " at amber or worse)" : "")]);
  kv.innerHTML = rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("");

  var tb = document.getElementById("sttable");
  var h = "<tr><th>Warning level</th><th>Buildings</th><th>Roads</th><th>" + plural(ADMIN_LABEL) + "</th></tr>";
  LEVELS.forEach(function (n, i) {
    h += "<tr" + (i >= minClass ? " class='on'" : "") + "><td><span class='sw' style='background:" + LCOL[i] + "'></span>" +
      n + "</td><td>" + (s.buildings[n] || 0).toLocaleString() + "</td><td>" +
      (s.roads[n] || 0).toLocaleString() + "</td><td>" + (s.admin[n] || 0) + "</td></tr>";
  });
  tb.innerHTML = h;

  var pt = document.getElementById("parishtable");
  if (pt) {
    if (parishLevel) {
      var ph = "<tr><th>Parish</th><th>Yellow</th><th>Amber</th><th>Red</th><th>Roads</th><th>People</th></tr>";
      c.admin.forEach(function (a) {
        ph += "<tr><td><span class='sw' style='background:" + a.risk_color + "'></span>" + a.ADM1_EN + "</td><td>" +
          a.bld_yellow.toLocaleString() + "</td><td>" + a.bld_amber.toLocaleString() + "</td><td>" + a.bld_red.toLocaleString() +
          "</td><td>" + a.rd_yellow_plus.toLocaleString() + "</td><td>" + a.pop_yellow_plus.toLocaleString() + "</td></tr>";
      });
      pt.innerHTML = ph;
    } else { pt.innerHTML = ""; }
  }
  updateLegend();
  writeHash();
}

/* controls */
var sel = document.getElementById("cycsel");
if (sel) {
  CY.forEach(function (c, i) {
    var o = document.createElement("option"); o.value = i; o.textContent = c.label + " UTC";
    sel.appendChild(o);
  });
  sel.onchange = function () { idx = parseInt(sel.value, 10); draw(); };
}
document.querySelectorAll("#seg-min button").forEach(function (b) {
  b.onclick = function () {
    minClass = parseInt(b.dataset.m, 10);
    document.querySelectorAll("#seg-min button").forEach(function (o) { o.classList.toggle("on", o === b); });
    draw();
  };
});
function bindToggle(id, setter) {
  var el = document.getElementById(id);
  if (!el) return;
  el.onclick = function () { el.classList.toggle("on"); setter(el.classList.contains("on")); draw(); };
}
bindToggle("t-admin", function (v) { showAdmin = v; });
bindToggle("t-bld", function (v) { showBld = v; });
bindToggle("t-rds", function (v) { showRds = v; });
bindToggle("t-fac", function (v) { showFac = v; });
bindToggle("t-eds", function (v) { showEds = v; });
if (document.getElementById("prev")) {
  document.getElementById("prev").onclick = function () { idx = Math.max(idx - 1, 0); draw(); };
  document.getElementById("next").onclick = function () { idx = Math.min(idx + 1, CY.length - 1); draw(); };
}

readHash();
buildMap();
document.querySelectorAll("#seg-min button").forEach(function (o) {
  o.classList.toggle("on", parseInt(o.dataset.m, 10) === minClass); });
draw();

window.addEventListener("hashchange", function () { readHash(); draw(); });
