# Impact-Based Flood Forecast Viewer: Barbados

Per forecast cycle warning maps built on the TITO FIM ensemble products with the project
routine `tito_utils.ibf_utils`, for two demonstration cases.

**Live site:** https://ahwalab.github.io/Barbados_IFB/

| Case | Folder | Scope |
|---|---|---|
| Hurricane Tomas, 30 October 2010 | `tomas2010/` | whole island, one cycle: 204,727 buildings, 22,509 road segments, 11 parishes, 366 critical facilities |
| Hindcast of 16 to 17 August 2026 | `aug2026/` | Saint Thomas window, three cycles: 27,836 buildings, 3,486 road segments, 99 enumeration districts |

Companion products:
[flood maps](https://ahwalab.github.io/Barbados_fim/) and
[flood potential](https://ahwalab.github.io/Barbados_warnings/).

## What it shows

The warning colour of every building, road segment and admin unit comes from the Flood Risk
Matrix of the Scottish Flood Forecasting Service and the UK Flood Guidance Statement, as applied
in Speight et al. (2018): likelihood from the FIM exceedance grids, impact severity from the
depth reached at the receptor. Green is business as usual, yellow be aware, amber be prepared,
red take action. The method note in `methods/` gives the rules, the receptor stock and the
results of both cases.

## Repository layout

    index.html                    portal, one card per case, the matrix, documentation links
    assets/css/style.css          styles, shared by the three Barbados viewers
    assets/js/ibf.js              the application, one for both cases
    assets/vendor/                Leaflet 1.9.4, vendored
    aug2026/index.html            Saint Thomas, three cycles
    aug2026/data/ibf_cycles.js    receptors at yellow or worse as GeoJSON, district table, facilities
    tomas2010/index.html          whole island, one cycle
    tomas2010/data/ibf_cycles.js  receptors at yellow or worse as compact rows, parish table, district counts, facilities
    methods/index.html            method and data note
    saint-thomas/index.html       forwards the old address to aug2026/

## Things a reader must know

1. **One count per receptor in the Tomas case.** The run writes one GeoPackage per parish window,
   and a window is the parish plus a 250 m buffer, so a receptor near a boundary is scored in up to
   five windows. The viewer keeps each receptor once, from the window of its own parish. The per
   window summaries in the run outputs add up to more.
2. **Every parish is HIGH in the Tomas case.** The impact thresholds of the matrix are passed in
   all eleven parishes. The information is in the receptors; the 2010 enumeration districts are
   carried as a context layer shaded by the people at yellow or worse, counted from the receptors.
3. **August 2026 is three cycles, not four.** Cycle 17 August 15:00 carries flood maps on the
   Saint Michael window and is excluded from this product.

## Basemap key

CARTO raster basemaps have required an API key since August 2026. The key issued to the
University of Iowa sits near the top of `assets/js/ibf.js` as `CARTO_KEY`, and the light basemap URL is
built from it:

    https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=CARTO_KEY

It is a browser side key, so it is visible in the source by design. CARTO restricts it to
`ahwalab.github.io` and `localhost`, and that restriction is what protects it. To rotate it,
replace the value in that one line, here and in the other two viewer repositories. CARTO and
OpenStreetMap attribution must stay visible on the map, and it is printed in the bottom right
corner of every map.

## Local preview

    python -m http.server 8000

Then open http://localhost:8000/. Only the basemap tiles need internet.

---

AHWA Laboratory, The University of Iowa. EWS-F project, funded by the WMO.
Training demonstration. Not an operational warning product.
