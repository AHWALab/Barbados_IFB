# IBF Viewer: Barbados

Impact-based flood forecast maps for the Saint Thomas pilot, one map per forecast cycle, built
by `tito_utils.ibf_utils` on the FIM ensemble probability products of the same cycles.

**Live site:** https://ahwalab.github.io/Barbados_IFB/

Companion products:
[flood maps](https://ahwalab.github.io/Barbados_fim/) and
[flood potential](https://ahwalab.github.io/Barbados_warnings/).

## Contents

    index.html                     landing page with the flood risk matrix
    saint-thomas/index.html        the per cycle warning map
    methods/index.html             method and data note
    assets/data/ibf_cycles.js      all three cycles inlined: receptors at risk, district table
    assets/js/ibf.js               map logic, plain JavaScript on Leaflet
    assets/vendor/                 Leaflet 1.9.4, vendored

## The standard

Warning level is likelihood multiplied by potential impact severity, read from the Flood Risk
Matrix of the Scottish Flood Forecasting Service and the UK Flood Guidance Statement as applied
in Speight et al. (2018). Severity depths are 0.10 m minor, 0.30 m significant, 0.70 m severe,
uniform across the project. Likelihood bands are very low under 20 percent, low 20 to 40,
medium 40 to 60, high above 60, with a 5 percent reporting threshold and a 0.50 district flag
cutoff.

## Receptors

Overture Maps buildings and roads downloaded by country bounding box, the 2010 census
enumeration districts with TOT_PERS population, and the GHS BUILT-C functional class raster for
the dasymetric population weights. In the Saint Thomas window: 27,836 buildings, 3,486 road
segments, 99 enumeration districts.

## Cycles

Three cycles: 17 August 2026 at 13:00, 14:00 and 16:00 UTC. The FIM run also wrote products for
15:00, but those rasters are on the Saint Michael window rather than Saint Thomas, so that cycle
is excluded here and flagged in the FIM viewer.

| Cycle UTC | Buildings yellow | amber | red | Roads yellow or worse | Districts medium | People at yellow or worse |
|---|---|---|---|---|---|---|
| 13:00 | 247 | 13 | 1 | 59 | 4 | 430 |
| 14:00 | 214 | 36 | 0 | 57 | 14 | 379 |
| 16:00 | 231 | 4 | 0 | 57 | 1 | 394 |

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

The satellite layer is Esri World Imagery and needs no key.

## Local preview

    python -m http.server 8000

Then open http://localhost:8000/. Only the basemap tiles need internet.

---

AHWA Laboratory, The University of Iowa. EWS-F project, funded by the WMO.
Training demonstration. Not an operational warning product.
