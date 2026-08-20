/* ==========================================================================
   KAARDIRAKENDUSE SEADISTUS (CONFIG)
   ==========================================================================
   Kõik teenuste aadressid ja vaikeväärtused on koondatud siia.
   ========================================================================== */

const CONFIG = {

  initialView: {
    center: [58.65, 25.0],
    zoom: 7
  },

  // Overall map zoom bounds. minZoom stops people zooming out past a
  // point where none of this app's Estonia-specific layers are useful.
  mapMinZoom: 3,
  mapMaxZoom: 19,

  // Zoom level used when centering on the user's live location (both on
  // page load and when tapping "📍 Minu asukoht" manually).
  locationDefaultZoom: 15,

  estoniaBounds: [
    [57.5, 21.7],
    [59.7, 28.2]
  ],

  /* ------------------------------------------------------------------
     TAUSTAKAARDID (BASE LAYERS)
     ------------------------------------------------------------------
     Standardne OGC WMS GetMap päring (L.tileLayer.wms) Maa-ameti
     WMS-C teenuse vastu — töötab otse EPSG:3857-ga.
  ------------------------------------------------------------------- */
  maaametWmsUrl: "https://tiles.maaamet.ee/tm/",

  baseLayers: [
    { id: "maaamet_kaart", name: "Põhikaart (Maa-amet)", type: "maaamet-wms",
      layer: "kaart", format: "image/png", attribution: "Maa- ja Ruumiamet, CC BY 4.0", default: true },
    { id: "maaamet_foto", name: "Ortofoto (Maa-amet)", type: "maaamet-wms",
      layer: "foto", format: "image/jpeg", attribution: "Maa- ja Ruumiamet, CC BY 4.0" }
  ],

  /* ------------------------------------------------------------------
     EANS UTM / DROONIKAART
     ------------------------------------------------------------------
     Reverted: the Esri ArcGIS "Droonikaart" (eans.maps.arcgis.com) turned
     out to require signing in to ArcGIS Online to view at all — not
     usable for open public access. Back to utm.eans.ee/avm/, which
     EANS's own documentation confirms does NOT require login just to
     view the map (only for submitting flight plans).

     URL-parameter sync (best-effort only): utm.eans.ee/avm/ is a
     Frequentis-built app with no published URL-parameter documentation,
     so lat/lon/zoom query params are a guess, not a confirmed API.
  ------------------------------------------------------------------- */
  eansUrl: "https://utm.eans.ee/avm/",

  /* ------------------------------------------------------------------
     NOTAM GEO (UAS geographical zones)
     ------------------------------------------------------------------
     Confirmed live and reachable: https://utm.eans.ee/avm/utm/uas.geojson
     — real NOTAM/geofencing data (danger areas, restricted zones,
     Tallinn CTR sub-zones etc.), updated by EANS same-day per the
     feed's own metaData.updateDateTime timestamps.

     STRATEGY: try the live URL first (freshest possible data — this
     matters, since restricted/danger areas can appear or disappear
     within hours). If the live fetch fails (e.g. CORS), fall back to
     a same-origin mirror copy that a daily GitHub Action keeps
     refreshed (see .github/workflows/update-notam.yml). The UI always
     shows which source is currently in use.

     Many features in the feed carry their own color (either a hex+alpha
     "color.fill"/"color.stroke" pair, or ready-to-use "fillColor"/
     "strokeColor" rgba() strings) — those are used as-is when present,
     since they encode real meaning (e.g. fully-transparent = an
     unrestricted zone). These defaults only apply when a feature has
     no color of its own.
  ------------------------------------------------------------------- */
  notam: {
    liveUrl: "https://utm.eans.ee/avm/utm/uas.geojson",
    mirrorUrl: "MyFiles/data/notam_geo.geojson",
    defaultFillColor: "#fce300",
    defaultStrokeColor: "#002cff",
    defaultFillOpacity: 0.3,
    defaultStrokeOpacity: 0.7
  },

  /* ------------------------------------------------------------------
     PRIA WFS (põllumassiivid)
     ------------------------------------------------------------------
     Kihtide loend tuuakse dünaamiliselt WFS GetCapabilities päringust.
     "PÕLLUD" mustri järgi tuvastatud kihid (nt PRIA_PÕLLUD) rühmitatakse
     nimekirjas eraldi ja neile pakutakse kiirvalikuid.
  ------------------------------------------------------------------- */
  pria: {
    wfsUrl: "https://kls.pria.ee/geoserver/pria_avalik/ows",
    minZoom: 14,
    maxFeatures: 2000,
    colorPalette: [
      "#e6194B", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
      "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#469990",
      "#9A6324", "#800000", "#808000", "#000075", "#a9a9a9"
    ]
  },

  /* ------------------------------------------------------------------
     MINU KAARDID (oma kihid) — vaikeväärtused
     ------------------------------------------------------------------
     Iga kihi kohta muudetavad, kuid need on vaikeväärtused uue kihi
     lisamisel: kiht ise ilmub alates suumitasemest 13 (nagu PRIA),
     sildid ilmuvad alles suumitasemest 15 (et vältida teksti
     ülekuhjumist väiksemas suumis).
  ------------------------------------------------------------------- */
  myLayers: {
    defaultMinZoom: 1,
    defaultMaxZoom: 19,
    defaultLabelMinZoom: 15,
    colorPalette: [
      "#8b00ff", "#ff8c00", "#009688", "#e91e63", "#3f51b5",
      "#795548", "#607d8b", "#cddc39", "#00bcd4", "#f44336"
    ],
    // Fixed colors for specific thematic values, matched case-insensitively.
    // Takes priority over the auto-cycling palette above whenever a
    // thematic field's value matches one of these — e.g. for
    // PriaKaerNisuMaisHernes1Field_DISS.zip's crop-type field.
    knownThematicColors: {
      "hernes": "#3aa655",   // green (pea)
      "kaer": "#f28b82",     // light red/coral (oats)
      "mais": "#8b6b1f",     // dark yellow/brownish (maize)
      "nisu": "#fff2a8"      // light yellow (wheat)
    },
    // Per-file default zoom/label/color settings for specific known
    // layers, applied the first time that file is loaded (matched by
    // filename, case-insensitive substring). A person's own saved
    // preferences (localStorage, once they've customized a layer) always
    // take priority over these — this only sets the starting point.
    namePresets: [
      {
        match: /kaernisumaishernes/i,
        minZoom: 13, maxZoom: 19, labelMinZoom: 15,
        labelField: "ViljadNimi",
        colorMode: "thematic", thematicField: "ViljadNimi"
      },
      {
        // KML styling metadata (styleUrl, fill-opacity, stroke-width, etc.)
        // leaks into properties via togeojson conversion and isn't useful
        // to show — restrict the popup to just the name.
        match: /sigalad_puhverala/i, minZoom: 8, maxZoom: 14,
        popupFields: ["name"]
      },
      { match: /jahipiirkond/i, minZoom: 9, maxZoom: 13 }
    ]
  },

  /* ------------------------------------------------------------------
     VÄLIANDMED (Google Sheets / repo-fail CSV-XLSX)
     ------------------------------------------------------------------
     Google Sheets loetakse JSONP kaudu (script-tag trikk) — see töötab
     puhtal staatilisel hostimisel (GitHub Pages jm) ilma igasuguse
     serveri/backendita, kuna JSONP ei allu brauseri CORS piirangutele
     samamoodi nagu fetch()/XHR.

     "OneDrive/Excel" andmeallikas on asendatud "repo-failiga": ekspordi
     oma Exceli/OneDrive andmed CSV- või XLSX-failina ja lisa see faili
     repositooriumisse (git push) — rakendus loeb seda tavalise
     samast-domeenist faili päringuna (ei vaja proksit, ei vaja PHP-d).
  ------------------------------------------------------------------- */
  sheets: {
    defaultGid: "0"
  },

  /* ------------------------------------------------------------------
     MINU KAARDID: git-põhine failihaldus (GitHub Pages ei toeta PHP-d)
     ------------------------------------------------------------------
     Failide nimekiri tuleb staatilisest manifest.json failist, mida
     GitHub Action ("update-manifest.yml") automaatselt uuendab iga
     kord, kui keegi lisab/eemaldab faile MyFiles/uploads/ kaustast ja
     teeb git push.
  ------------------------------------------------------------------- */
  myFiles: {
    manifestUrl: "MyFiles/manifest.json",
    uploadsUrlBase: "MyFiles/uploads/"
  }
};
