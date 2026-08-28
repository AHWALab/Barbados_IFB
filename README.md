# Barbados_IFB

Impact based flood forecast maps for the Saint Thomas pilot, Barbados, one map per forecast
cycle, produced by `tito_utils.ibf_utils` from the FIM ensemble probability products of the same
cycles.

**Live site:** https://ahwalab.github.io/Barbados_IFB/

Companion products:
[flood maps](https://ahwalab.github.io/Barbados_fim/) and
[flood potential](https://ahwalab.github.io/Barbados_warnings/).

## Layout

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
segments, 99 of the 609 national enumeration districts.

## Cycles

Three cycles: 17 August 2026 at 13:00, 14:00 and 16:00 UTC. The FIM run also wrote products for
15:00, but those rasters are on the Saint Michael window rather than Saint Thomas, so that cycle
is excluded here and flagged in the FIM viewer.

| Cycle UTC | Buildings yellow | amber | red | Roads yellow or worse | Districts medium | People at yellow or worse |
|---|---|---|---|---|---|---|
| 13:00 | 247 | 13 | 1 | 59 | 4 | 430 |
| 14:00 | 214 | 36 | 0 | 57 | 14 | 379 |
| 16:00 | 231 | 4 | 0 | 57 | 1 | 394 |

No district reaches high overall risk in any cycle. This is a small event and the product is
correctly quiet. What makes the sequence useful for training is that the warning footprint grows,
peaks and recedes over four hours, and that the peak in impact at 14:00 does not fall on the same
cycle as the single most severe receptor, at 13:00.

## Local preview

    python -m http.server 8000

Then open http://localhost:8000/. Only the basemap tiles need internet.

---

AHWA Laboratory, The University of Iowa. EWS-F project, funded by the WMO.
Training demonstration. Not an operational warning product.
