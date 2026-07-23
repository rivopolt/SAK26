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
    { id: "osm", name: "OpenStreetMap", type: "osm",
      attribution: "&copy; OpenStreetMap contributors", default: true },
    { id: "maaamet_kaart", name: "Eesti kaart (Maa-amet)", type: "maaamet-wms",
      layer: "kaart", format: "image/png", attribution: "Maa- ja Ruumiamet, CC BY 4.0" },
    { id: "maaamet_hybriid", name: "Hübriidkaart (Maa-amet)", type: "maaamet-wms",
      layer: "hybriid", format: "image/png", attribution: "Maa- ja Ruumiamet, CC BY 4.0" },
    { id: "maaamet_foto", name: "Ortofoto (Maa-amet)", type: "maaamet-wms",
      layer: "foto", format: "image/jpeg", attribution: "Maa- ja Ruumiamet, CC BY 4.0" },
    { id: "maaamet_foto_inf", name: "Valevärviortofoto / CIR (Maa-amet)", type: "maaamet-wms",
      // KONTROLLI! kihi masinnimi ei olnud avalikust dokumentatsioonist 100% kinnitatav.
      layer: "fotoinfra", format: "image/jpeg", attribution: "Maa- ja Ruumiamet, CC BY 4.0" }
  ],

  /* ------------------------------------------------------------------
     EANS UTM / DROONIKAART
  ------------------------------------------------------------------- */
  eansUrl: "https://utm.eans.ee/avm/",

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
    defaultMinZoom: 13,
    defaultLabelMinZoom: 15,
    colorPalette: [
      "#8b00ff", "#ff8c00", "#009688", "#e91e63", "#3f51b5",
      "#795548", "#607d8b", "#cddc39", "#00bcd4", "#f44336"
    ]
  },

  /* ------------------------------------------------------------------
     VÄLIANDMED (Google Sheets / OneDrive)
     ------------------------------------------------------------------
     Mõlemad käivad läbi php/data_proxy.php (server-poolne toomine),
     et vältida brauseri CORS-piiranguid, mis takistavad otse
     kolmandate osapoolte teenustest fetch() abil andmete lugemist.
  ------------------------------------------------------------------- */
  sheets: {
    defaultGid: "0"
  },

  php: {
    uploadEndpoint: "php/upload.php",
    listEndpoint: "php/list_files.php",
    deleteEndpoint: "php/delete_file.php",
    dataProxyEndpoint: "php/data_proxy.php",
    myFilesUrlBase: "MyFiles/uploads/"
  }
};
