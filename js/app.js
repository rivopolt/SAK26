/* ==========================================================================
   KAARDIRAKENDUS - app.js
   ========================================================================== */

let map;
let currentBaseLayer = null;
const baseLayerObjects = {};
let userLocationMarker = null;
let userAccuracyCircle = null;
let locationWatchId = null;

/* ---- PRIA ---- */
let priaLayersMeta = [];        // [{name, title}] from GetCapabilities
const priaLayersState = {};     // typeName -> { color, geo, loading }

/* ---- Minu kaardid (uploaded + MyFiles layers) ---- */
const myLayers = {};             // id -> entry (see addGeoJsonToMap for shape)
let myLayerCounter = 0;
let searchHighlightMarker = null;

/* ---- Väliandmed (Google Sheets / OneDrive join) ---- */
const sheetState = {
  source: "google",
  id: null,
  gid: null,
  headers: [],
  rows: [],
  workbook: null,
  timerHandle: null
};

/* ---------------------------------------------------------------------- */
/* INIT                                                                    */
/* ---------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", init);

function init() {
  map = L.map("map", { zoomControl: true, attributionControl: true })
    .setView(CONFIG.initialView.center, CONFIG.initialView.zoom);

  buildBaseLayers();
  setupBaseLayerUI();
  setupCollapseToggles();
  setupEans();
  setupPria();
  setupFileUpload();
  setupMyFilesBrowser();
  setupSearch();
  setupSheets();
  setupLocateControls();
  setupCoordReadout();
  setupPanelToggle();
  setupModals();

  map.on("moveend", debounce(() => {
    refreshAllEnabledPriaLayers();
    refreshAllMyLayers();
  }, 400));
}

/* ---------------------------------------------------------------------- */
/* COLLAPSIBLE SECTIONS                                                     */
/* ---------------------------------------------------------------------- */
function setupCollapseToggles() {
  document.querySelectorAll(".collapseBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const collapsed = target.classList.toggle("collapsed");
      btn.textContent = collapsed ? "▸" : "▾";
    });
  });
}

/* ---------------------------------------------------------------------- */
/* BASE LAYERS                                                              */
/* ---------------------------------------------------------------------- */
function buildBaseLayers() {
  CONFIG.baseLayers.forEach(cfg => {
    let layer;
    if (cfg.type === "osm") {
      layer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: cfg.attribution
      });
    } else if (cfg.type === "maaamet-wms") {
      layer = L.tileLayer.wms(CONFIG.maaametWmsUrl, {
        layers: cfg.layer,
        format: cfg.format,
        version: "1.1.1",
        transparent: false,
        uppercase: true,
        crs: L.CRS.EPSG3857,
        maxZoom: 18,
        minZoom: 3,
        attribution: cfg.attribution
      });
      layer.on("tileerror", () => {
        showBanner(`"${cfg.name}" kihi pildid ei laadinud serverist. Kontrolli config.js failis kihi nime.`);
      });
    }
    baseLayerObjects[cfg.id] = layer;
    if (cfg.default) {
      currentBaseLayer = layer;
      layer.addTo(map);
    }
  });
}

function setupBaseLayerUI() {
  const container = document.getElementById("baseLayerList");
  CONFIG.baseLayers.forEach(cfg => {
    const row = document.createElement("div");
    row.className = "layerRow";
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "baseLayer";
    radio.value = cfg.id;
    radio.checked = !!cfg.default;
    radio.addEventListener("change", () => switchBaseLayer(cfg.id));
    const span = document.createElement("span");
    span.textContent = cfg.name;
    label.appendChild(radio);
    label.appendChild(span);
    row.appendChild(label);
    container.appendChild(row);
  });
}

function switchBaseLayer(id) {
  if (currentBaseLayer) map.removeLayer(currentBaseLayer);
  currentBaseLayer = baseLayerObjects[id];
  currentBaseLayer.addTo(map);
  currentBaseLayer.bringToBack();
}

/* ---------------------------------------------------------------------- */
/* EANS UTM / DRONE MAP                                                     */
/* ---------------------------------------------------------------------- */
function setupEans() {
  const toggle = document.getElementById("eansToggle");
  toggle.addEventListener("change", () => {
    if (toggle.checked) openEansOverlay(); else closeEansOverlay();
  });
}

function currentMainViewParams() {
  const c = map.getCenter();
  return { lat: c.lat.toFixed(6), lon: c.lng.toFixed(6), zoom: map.getZoom() };
}

function eansUrlForCurrentView() {
  const v = currentMainViewParams();
  const sep = CONFIG.eansUrl.includes("?") ? "&" : "?";
  return `${CONFIG.eansUrl}${sep}lat=${v.lat}&lon=${v.lon}&zoom=${v.zoom}`;
}

function openEansOverlay() {
  if (document.getElementById("eansOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "eansOverlay";
  overlay.className = "iframeOverlay";
  overlay.innerHTML = `
    <div class="iframeOverlayBar">
      <span>EANS Droonikaart</span>
      <button id="syncEansBtn" class="linkBtn">🔄 Sünkrooni Taustakaardiga</button>
      <a href="${CONFIG.eansUrl}" target="_blank" rel="noopener" class="openNewTabLink">Ava uues aknas ↗</a>
      <button id="closeEansBtn" class="closeIframeBtn">✕</button>
    </div>
    <iframe id="eansIframe" src="${eansUrlForCurrentView()}" title="EANS Droonikaart"></iframe>
  `;
  document.getElementById("mapPanel").appendChild(overlay);
  document.getElementById("closeEansBtn").addEventListener("click", () => {
    document.getElementById("eansToggle").checked = false;
    closeEansOverlay();
  });
  document.getElementById("syncEansBtn").addEventListener("click", () => {
    document.getElementById("eansIframe").src = eansUrlForCurrentView();
  });
}

function closeEansOverlay() {
  const overlay = document.getElementById("eansOverlay");
  if (overlay) overlay.remove();
}

/* ---------------------------------------------------------------------- */
/* PRIA WFS: grouped layer list, quick presets, colors, saved searches      */
/* ---------------------------------------------------------------------- */
function setupPria() {
  document.getElementById("priaLoadLayersBtn").addEventListener("click", loadPriaLayerList);
  document.getElementById("priaSelectMainBtn").addEventListener("click", selectMainPolludLayer);
  document.getElementById("priaSelectAllPolludBtn").addEventListener("click", selectAllPolludLayers);
  document.getElementById("priaOtherToggleBtn").addEventListener("click", toggleOtherPriaGroup);

  document.getElementById("priaPresetSaveBtn").addEventListener("click", savePriaPreset);
  document.getElementById("priaPresetLoadBtn").addEventListener("click", loadPriaPreset);
  document.getElementById("priaPresetDeleteBtn").addEventListener("click", deletePriaPreset);

  refreshPriaPresetSelect();
}

function normalizeEstonian(str) {
  return String(str || "").toLowerCase()
    .replace(/õ/g, "o").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
}

function isPolludLayer(info) {
  return normalizeEstonian(info.title).includes("pollu") || normalizeEstonian(info.name).includes("pollu");
}

async function loadPriaLayerList() {
  setStatus("priaStatus", "Laen kihtide loendit...");
  try {
    const url = `${CONFIG.pria.wfsUrl}?service=WFS&version=2.0.0&request=GetCapabilities`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const featureTypeNodes = xml.getElementsByTagNameNS("*", "FeatureType");

    const layers = [];
    for (const ft of featureTypeNodes) {
      const nameEl = ft.getElementsByTagNameNS("*", "Name")[0];
      const titleEl = ft.getElementsByTagNameNS("*", "Title")[0];
      if (nameEl) {
        layers.push({
          name: nameEl.textContent.trim(),
          title: titleEl ? titleEl.textContent.trim() : nameEl.textContent.trim()
        });
      }
    }
    if (layers.length === 0) throw new Error("Vastusest ei leitud ühtegi kihti (FeatureType)");

    priaLayersMeta = layers;
    renderPriaLayerList();
    setStatus("priaStatus", `${layers.length} kihti leitud.`);
  } catch (err) {
    setStatus("priaStatus", `Kihtide loendi laadimine ebaõnnestus (${err.message}).`);
  }
}

function renderPriaLayerList() {
  const mainList = document.getElementById("priaMainGroupList");
  const otherList = document.getElementById("priaOtherGroupList");
  const otherToggleBtn = document.getElementById("priaOtherToggleBtn");
  mainList.innerHTML = "";
  otherList.innerHTML = "";

  const mainGroup = priaLayersMeta.filter(isPolludLayer);
  const otherGroup = priaLayersMeta.filter(info => !isPolludLayer(info));

  document.getElementById("priaQuickButtons").classList.toggle("hidden", mainGroup.length === 0);

  mainGroup.forEach(info => mainList.appendChild(buildPriaLayerRow(info)));
  otherGroup.forEach(info => otherList.appendChild(buildPriaLayerRow(info)));

  if (otherGroup.length > 0) {
    otherToggleBtn.classList.remove("hidden");
    otherToggleBtn.textContent = `▸ Näita muid kihte (${otherGroup.length})`;
    otherList.classList.add("hidden");
  } else {
    otherToggleBtn.classList.add("hidden");
  }
}

function toggleOtherPriaGroup() {
  const otherList = document.getElementById("priaOtherGroupList");
  const btn = document.getElementById("priaOtherToggleBtn");
  const nowHidden = otherList.classList.toggle("hidden");
  const count = priaLayersMeta.filter(info => !isPolludLayer(info)).length;
  btn.textContent = (nowHidden ? "▸ Näita muid kihte (" : "▾ Peida muud kihid (") + count + ")";
}

function buildPriaLayerRow(info) {
  const row = document.createElement("div");
  row.className = "layerRow";
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.dataset.typeName = info.name;
  cb.checked = !!priaLayersState[info.name];
  const swatch = document.createElement("span");
  swatch.className = "colorSwatch";
  swatch.style.background = getColorForTypeName(info.name);
  const span = document.createElement("span");
  span.textContent = info.title;
  span.title = info.name;
  cb.addEventListener("change", () => togglePriaLayer(info.name, cb.checked));
  label.appendChild(cb);
  label.appendChild(swatch);
  label.appendChild(span);
  row.appendChild(label);
  return row;
}

function selectMainPolludLayer() {
  const mainGroup = priaLayersMeta.filter(isPolludLayer);
  if (mainGroup.length === 0) {
    setStatus("priaStatus", "Kihtide loendit pole veel laetud või ei leitud 'PÕLLUD' kihte.");
    return;
  }
  // Prefer the shortest matching name as the most likely "primary" layer.
  const best = mainGroup.slice().sort((a, b) => a.name.length - b.name.length)[0];
  setPriaCheckbox(best.name, true);
  setStatus("priaStatus", `Valitud peamine kiht: ${best.title}`);
}

function selectAllPolludLayers() {
  const mainGroup = priaLayersMeta.filter(isPolludLayer);
  mainGroup.forEach(info => setPriaCheckbox(info.name, true));
  setStatus("priaStatus", `${mainGroup.length} 'PÕLLUD' kihti valitud.`);
}

function getColorForTypeName(name) {
  const stored = JSON.parse(localStorage.getItem("pria_layer_colors") || "{}");
  if (stored[name]) return stored[name];
  const palette = CONFIG.pria.colorPalette;
  const usedColors = Object.values(stored);
  const color = palette.find(c => !usedColors.includes(c)) || palette[Object.keys(stored).length % palette.length];
  stored[name] = color;
  localStorage.setItem("pria_layer_colors", JSON.stringify(stored));
  return color;
}

function togglePriaLayer(typeName, enabled) {
  if (enabled) {
    const color = getColorForTypeName(typeName);
    const geo = L.geoJSON(null, {
      style: { color, weight: 2, fillColor: color, fillOpacity: 0.15 },
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, color, fillColor: color, fillOpacity: 0.6 }),
      onEachFeature: bindFeaturePopup
    }).addTo(map);
    priaLayersState[typeName] = { color, geo };
    fetchPriaLayerData(typeName);
  } else {
    const state = priaLayersState[typeName];
    if (state && state.geo) map.removeLayer(state.geo);
    delete priaLayersState[typeName];
  }
}

function refreshAllEnabledPriaLayers() {
  Object.keys(priaLayersState).forEach(typeName => fetchPriaLayerData(typeName));
}

function fetchPriaLayerData(typeName) {
  const state = priaLayersState[typeName];
  if (!state || state.loading) return;

  if (map.getZoom() < CONFIG.pria.minZoom) {
    setStatus("priaStatus", `Suumi lähemale (praegu ${map.getZoom()}, vajalik ${CONFIG.pria.minZoom}+).`);
    state.geo.clearLayers();
    return;
  }

  const bounds = map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",") + ",EPSG:4326";

  const params = new URLSearchParams({
    service: "WFS", version: "2.0.0", request: "GetFeature",
    typeNames: typeName, outputFormat: "application/json",
    srsName: "EPSG:4326", count: String(CONFIG.pria.maxFeatures), bbox
  });

  state.loading = true;
  setStatus("priaStatus", `Laen "${typeName}" andmeid...`);

  fetch(`${CONFIG.pria.wfsUrl}?${params.toString()}`)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(geojson => {
      state.geo.clearLayers();
      state.geo.addData(geojson);
      const n = (geojson.features || []).length;
      setStatus("priaStatus",
        n >= CONFIG.pria.maxFeatures
          ? `"${typeName}": ${n}+ objekti (piirmäär täis)`
          : `"${typeName}": ${n} objekti laetud`);
    })
    .catch(err => setStatus("priaStatus", `Viga "${typeName}" laadimisel (${err.message})`))
    .finally(() => { state.loading = false; });
}

/* ---- PRIA saved / predefined searches ---- */
function getPriaPresets() {
  return JSON.parse(localStorage.getItem("pria_presets") || "{}");
}

function savePriaPreset() {
  const nameInput = document.getElementById("priaPresetName");
  const name = nameInput.value.trim();
  if (!name) { alert("Sisesta eelseadistusele nimi."); return; }
  const enabledTypeNames = Object.keys(priaLayersState);
  if (enabledTypeNames.length === 0) { alert("Vali enne vähemalt üks PRIA kiht."); return; }
  const presets = getPriaPresets();
  presets[name] = { typeNames: enabledTypeNames };
  localStorage.setItem("pria_presets", JSON.stringify(presets));
  nameInput.value = "";
  refreshPriaPresetSelect(name);
  setStatus("priaStatus", `Eelseadistus "${name}" salvestatud.`);
}

async function loadPriaPreset() {
  const select = document.getElementById("priaPresetSelect");
  const name = select.value;
  if (!name) return;
  const preset = getPriaPresets()[name];
  if (!preset) return;
  if (priaLayersMeta.length === 0) await loadPriaLayerList();
  Object.keys(priaLayersState).forEach(typeName => {
    if (!preset.typeNames.includes(typeName)) setPriaCheckbox(typeName, false);
  });
  preset.typeNames.forEach(typeName => setPriaCheckbox(typeName, true));
  setStatus("priaStatus", `Eelseadistus "${name}" rakendatud.`);
}

function setPriaCheckbox(typeName, checked) {
  const cb = document.querySelector(
    `#priaMainGroupList input[data-type-name="${cssEscape(typeName)}"], #priaOtherGroupList input[data-type-name="${cssEscape(typeName)}"]`
  );
  if (cb) {
    if (cb.checked !== checked) {
      cb.checked = checked;
      cb.dispatchEvent(new Event("change"));
    }
  } else {
    togglePriaLayer(typeName, checked);
  }
}

function deletePriaPreset() {
  const select = document.getElementById("priaPresetSelect");
  const name = select.value;
  if (!name) return;
  if (!confirm(`Kustutada eelseadistus "${name}"?`)) return;
  const presets = getPriaPresets();
  delete presets[name];
  localStorage.setItem("pria_presets", JSON.stringify(presets));
  refreshPriaPresetSelect();
}

function refreshPriaPresetSelect(selectName) {
  const select = document.getElementById("priaPresetSelect");
  const presets = getPriaPresets();
  select.innerHTML = '<option value="">— vali salvestatud otsing —</option>';
  Object.keys(presets).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  if (selectName) select.value = selectName;
}

/* ---------------------------------------------------------------------- */
/* GEOLOCATION ("blue dot")                                                 */
/* ---------------------------------------------------------------------- */
function setupLocateControls() {
  document.getElementById("locateBtn").addEventListener("click", toggleLiveLocation);
  document.getElementById("fitEstoniaBtn").addEventListener("click", () => map.fitBounds(CONFIG.estoniaBounds));
}

function toggleLiveLocation() {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
    document.getElementById("locateBtn").classList.remove("active");
    return;
  }
  if (!navigator.geolocation) { alert("Brauser ei toeta asukoha tuvastamist."); return; }

  document.getElementById("locateBtn").classList.add("active");
  let firstFix = true;
  locationWatchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      updateUserLocationMarker(latitude, longitude, accuracy);
      if (firstFix) { map.setView([latitude, longitude], 16); firstFix = false; }
    },
    err => {
      alert("Asukoha tuvastamine ebaõnnestus: " + err.message);
      document.getElementById("locateBtn").classList.remove("active");
      locationWatchId = null;
    },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function updateUserLocationMarker(lat, lng, accuracy) {
  const latlng = [lat, lng];
  if (!userLocationMarker) {
    userLocationMarker = L.marker(latlng, {
      icon: L.divIcon({
        className: "userLocationDot",
        html: '<div class="dotOuter"><div class="dotInner"></div></div>',
        iconSize: [22, 22], iconAnchor: [11, 11]
      }),
      zIndexOffset: 1000
    }).addTo(map);
  } else {
    userLocationMarker.setLatLng(latlng);
  }
  if (!userAccuracyCircle) {
    userAccuracyCircle = L.circle(latlng, { radius: accuracy, color: "#1a73e8", weight: 1, fillColor: "#1a73e8", fillOpacity: 0.12 }).addTo(map);
  } else {
    userAccuracyCircle.setLatLng(latlng);
    userAccuracyCircle.setRadius(accuracy);
  }
}

/* ---------------------------------------------------------------------- */
/* COORDINATE READOUT                                                       */
/* ---------------------------------------------------------------------- */
function setupCoordReadout() {
  const el = document.getElementById("coordReadout");
  map.on("mousemove", e => { el.textContent = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`; });
  map.on("click", e => { el.textContent = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)} (klikitud)`; });
}

/* ---------------------------------------------------------------------- */
/* LEFT PANEL TOGGLE                                                        */
/* ---------------------------------------------------------------------- */
function setupPanelToggle() {
  const panel = document.getElementById("layerPanel");
  const openerBtn = document.getElementById("panelOpenerBtn");
  document.getElementById("panelToggleBtn").addEventListener("click", () => {
    panel.classList.add("collapsed");
    setTimeout(() => map.invalidateSize(), 300);
  });
  openerBtn.addEventListener("click", () => {
    panel.classList.remove("collapsed");
    setTimeout(() => map.invalidateSize(), 300);
  });
}

/* ---------------------------------------------------------------------- */
/* MODALS                                                                   */
/* ---------------------------------------------------------------------- */
function setupModals() {
  document.getElementById("modalCloseBtn").addEventListener("click", closeModal);
  document.getElementById("modalOverlay").addEventListener("click", e => {
    if (e.target.id === "modalOverlay") closeModal();
  });
  document.querySelectorAll(".infoIconBtn[data-info]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tpl = document.getElementById(`tpl-${btn.dataset.info}`);
      if (tpl) openModal("Info", tpl.innerHTML);
    });
  });
  document.getElementById("appInfoBtn").addEventListener("click", () => {
    openModal("Rakenduse info", `
      <h3>Kaardirakendus</h3>
      <p>Avatud ligipääsuga kaardirakendus: taustakaardid, PRIA põllumassiivid,
      EANS droonikaart, sinu enda üleslaetud kaardikihid ja Google Sheets/OneDrive
      väliandmed ühel vaatel.</p>
      <p><strong>Andmete allikad ja litsentsid:</strong></p>
      <ul>
        <li>Maa- ja Ruumiamet — taustakaardid (CC BY 4.0)</li>
        <li>PRIA — põllumassiivide avalik WFS-teenus</li>
        <li>EANS — UTM/droonikaardi rakendus (utm.eans.ee)</li>
        <li>OpenStreetMap panustajad</li>
      </ul>
      <p>Vajuta iga jaotise juures oleva ⓘ nupu peale täpsema info nägemiseks.</p>
    `);
  });
}

function openModal(title, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modalOverlay").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
}

/* ---------------------------------------------------------------------- */
/* WARNING BANNER                                                           */
/* ---------------------------------------------------------------------- */
let bannerTimeout = null;
function showBanner(text) {
  let banner = document.getElementById("warningBanner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "warningBanner";
    banner.className = "warningBanner";
    document.getElementById("mapPanel").appendChild(banner);
  }
  banner.textContent = text;
  banner.classList.add("visible");
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => banner.classList.remove("visible"), 7000);
}

/* ---------------------------------------------------------------------- */
/* FILE UPLOAD                                                              */
/* ---------------------------------------------------------------------- */
function setupFileUpload() {
  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try { await handleUploadedFile(file); }
      catch (err) { alert(`Faili "${file.name}" töötlemine ebaõnnestus: ${err.message}`); }
    }
    e.target.value = "";
  });
}

async function handleUploadedFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "kml") {
    addKmlStringToMap(await file.text(), file.name, "upload");
  } else if (ext === "kmz") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const kmlEntry = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith(".kml"));
    if (!kmlEntry) throw new Error("KMZ failist ei leitud .kml sisu");
    addKmlStringToMap(await kmlEntry.async("text"), file.name, "upload");
  } else if (ext === "zip") {
    if (typeof shp !== "function") throw new Error("Shapefile'i teisendaja (shpjs) ei ole laetud.");
    addGeoJsonToMap(await shp(await file.arrayBuffer()), file.name, "upload");
  } else {
    throw new Error("Toetatud on ainult .kml, .kmz ja .zip (shapefile) failid");
  }

  uploadFileToServer(file).catch(err => {
    console.warn("Serverisse salvestamine ebaõnnestus:", err);
  });
}

function addKmlStringToMap(kmlText, label, source) {
  const dom = new DOMParser().parseFromString(kmlText, "text/xml");
  addGeoJsonToMap(toGeoJSON.kml(dom), label, source);
}

/* ---------------------------------------------------------------------- */
/* MINU KAARDID: viewport+zoom-aware rendering, thematic colors, labels     */
/* ---------------------------------------------------------------------- */
function normalizeToFeatureArray(geojson) {
  if (!geojson) return [];
  if (geojson.type === "FeatureCollection") return geojson.features || [];
  if (geojson.type === "Feature") return [geojson];
  return [{ type: "Feature", properties: {}, geometry: geojson }];
}

function computeFeatureBounds(feature) {
  try { return L.geoJSON(feature).getBounds(); } catch (e) { return null; }
}

function collectFieldNamesFromFeatures(features) {
  const set = new Set();
  features.forEach(f => { if (f.properties) Object.keys(f.properties).forEach(k => set.add(k)); });
  return Array.from(set);
}

function addGeoJsonToMap(geojson, label, source) {
  // Avoid loading the same MyFiles entry twice (e.g. auto-load + manual click)
  const already = Object.values(myLayers).find(e => e.name === label && e.source === source);
  if (already) return;

  const id = "layer_" + (++myLayerCounter);
  const features = normalizeToFeatureArray(geojson);
  features.forEach(f => { f.__bounds = computeFeatureBounds(f); });

  const entry = {
    id, name: label, source,
    rawFeatures: features,
    fields: collectFieldNamesFromFeatures(features),
    labelField: null,
    minZoom: CONFIG.myLayers.defaultMinZoom,
    labelMinZoom: CONFIG.myLayers.defaultLabelMinZoom,
    visible: true,
    colorMode: "single",
    singleColor: CONFIG.myLayers.colorPalette[Object.keys(myLayers).length % CONFIG.myLayers.colorPalette.length],
    thematicField: null,
    thematicColorMap: null,
    thematicLegend: [],
    renderedLayer: null
  };

  myLayers[id] = entry;
  renderMyLayersList();
  refreshSearchLayerOptions();
  renderMyLayerForCurrentView(entry);

  try {
    const overallBounds = L.latLngBounds([]);
    features.forEach(f => { if (f.__bounds && f.__bounds.isValid()) overallBounds.extend(f.__bounds); });
    if (overallBounds.isValid()) map.fitBounds(overallBounds, { maxZoom: 16 });
  } catch (e) { /* ignore */ }
}

function normalizeThematicValue(v) {
  return (v === undefined || v === null || v === "") ? "(tühi)" : String(v);
}

function updateThematicColorMap(entry) {
  if (entry.colorMode !== "thematic" || !entry.thematicField) {
    entry.thematicColorMap = null;
    entry.thematicLegend = [];
    return;
  }
  const values = new Set();
  entry.rawFeatures.forEach(f => values.add(normalizeThematicValue(f.properties ? f.properties[entry.thematicField] : undefined)));
  const sorted = Array.from(values).sort();
  const palette = CONFIG.myLayers.colorPalette;
  const map2 = new Map();
  sorted.forEach((v, i) => map2.set(v, palette[i % palette.length]));
  entry.thematicColorMap = map2;
  entry.thematicLegend = sorted.map(v => ({ value: v, color: map2.get(v) }));
}

function colorForFeature(entry, feature) {
  if (entry.colorMode === "thematic" && entry.thematicColorMap) {
    const v = normalizeThematicValue(feature.properties ? feature.properties[entry.thematicField] : undefined);
    return entry.thematicColorMap.get(v) || "#999999";
  }
  return entry.singleColor;
}

function renderMyLayerForCurrentView(entry) {
  if (entry.renderedLayer) {
    map.removeLayer(entry.renderedLayer);
    entry.renderedLayer = null;
  }
  if (!entry.visible) return;

  const zoom = map.getZoom();
  if (zoom < entry.minZoom) return;

  const viewBounds = map.getBounds();
  const visibleFeatures = entry.rawFeatures.filter(f => f.__bounds && f.__bounds.isValid() && viewBounds.intersects(f.__bounds));
  if (visibleFeatures.length === 0) return;

  const showLabels = zoom >= entry.labelMinZoom && !!entry.labelField;

  const geoLayer = L.geoJSON({ type: "FeatureCollection", features: visibleFeatures }, {
    style: (feature) => {
      const c = colorForFeature(entry, feature);
      return { color: c, weight: 3, fillColor: c, fillOpacity: 0.2 };
    },
    pointToLayer: (feature, latlng) => {
      const c = colorForFeature(entry, feature);
      return L.circleMarker(latlng, { radius: 7, color: c, fillColor: c, fillOpacity: 0.7 });
    },
    onEachFeature: (feature, layer) => {
      bindFeaturePopup(feature, layer);
      if (showLabels) {
        const val = feature.properties ? feature.properties[entry.labelField] : undefined;
        if (val !== undefined && val !== "") {
          layer.bindTooltip(String(val), { permanent: true, direction: "center", className: "featureLabel" });
        }
      }
    }
  }).addTo(map);

  entry.renderedLayer = geoLayer;
}

function refreshAllMyLayers() {
  Object.values(myLayers).forEach(renderMyLayerForCurrentView);
}

function bindFeaturePopup(feature, layer) {
  if (!feature.properties || Object.keys(feature.properties).length === 0) return;
  const rows = Object.entries(feature.properties)
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`)
    .join("");
  layer.bindPopup(`<table class="popupTable">${rows}</table>`);
}

/* ---- Minu kaardid: list UI (zoom controls, colors, labels, remove/delete) ---- */
function renderMyLayersList() {
  const container = document.getElementById("myLayersList");
  container.innerHTML = "";

  Object.values(myLayers).forEach(entry => {
    const row = document.createElement("div");
    row.className = "myLayerRow";

    /* top line: visibility + name + info/remove/delete buttons */
    const topLine = document.createElement("div");
    topLine.className = "myLayerTopLine";

    const visLabel = document.createElement("label");
    const visCb = document.createElement("input");
    visCb.type = "checkbox";
    visCb.checked = entry.visible;
    visCb.addEventListener("change", () => {
      entry.visible = visCb.checked;
      renderMyLayerForCurrentView(entry);
    });
    const nameSpan = document.createElement("span");
    nameSpan.className = "myLayerName";
    nameSpan.textContent = "📄 " + entry.name;
    visLabel.appendChild(visCb);
    visLabel.appendChild(nameSpan);
    topLine.appendChild(visLabel);

    const btnGroup = document.createElement("span");
    btnGroup.className = "myLayerBtnGroup";

    const infoBtn = document.createElement("button");
    infoBtn.className = "smallIconBtn";
    infoBtn.title = "Kihi info";
    infoBtn.textContent = "ⓘ";
    infoBtn.addEventListener("click", () => showMyLayerInfo(entry.id));

    const removeBtn = document.createElement("button");
    removeBtn.className = "smallIconBtn";
    removeBtn.title = "Eemalda kaardilt (praeguses seansis)";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => removeMyLayer(entry.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "smallIconBtn dangerIconBtn";
    deleteBtn.title = "Kustuta jäädavalt serverist";
    deleteBtn.textContent = "🗑";
    deleteBtn.addEventListener("click", () => deleteMyLayerFromServer(entry.id));

    btnGroup.appendChild(infoBtn);
    btnGroup.appendChild(removeBtn);
    btnGroup.appendChild(deleteBtn);
    topLine.appendChild(btnGroup);
    row.appendChild(topLine);

    /* zoom-level controls */
    const zoomRow = document.createElement("div");
    zoomRow.className = "myLayerZoomRow";

    const minZoomLabel = document.createElement("label");
    minZoomLabel.className = "smallLabel";
    minZoomLabel.textContent = "Kiht alates suumist:";
    const minZoomInput = document.createElement("input");
    minZoomInput.type = "number";
    minZoomInput.min = "0"; minZoomInput.max = "19";
    minZoomInput.className = "zoomNumberInput";
    minZoomInput.value = entry.minZoom;
    minZoomInput.addEventListener("change", () => {
      entry.minZoom = parseInt(minZoomInput.value, 10) || 0;
      renderMyLayerForCurrentView(entry);
    });

    const labelZoomLabel = document.createElement("label");
    labelZoomLabel.className = "smallLabel";
    labelZoomLabel.textContent = "Sildid alates suumist:";
    const labelZoomInput = document.createElement("input");
    labelZoomInput.type = "number";
    labelZoomInput.min = "0"; labelZoomInput.max = "19";
    labelZoomInput.className = "zoomNumberInput";
    labelZoomInput.value = entry.labelMinZoom;
    labelZoomInput.addEventListener("change", () => {
      entry.labelMinZoom = parseInt(labelZoomInput.value, 10) || 0;
      renderMyLayerForCurrentView(entry);
    });

    zoomRow.appendChild(minZoomLabel);
    zoomRow.appendChild(minZoomInput);
    zoomRow.appendChild(labelZoomLabel);
    zoomRow.appendChild(labelZoomInput);
    row.appendChild(zoomRow);

    /* label field picker */
    if (entry.fields.length > 0) {
      const labelRow = document.createElement("div");
      labelRow.className = "myLayerLabelRow";
      const labelText = document.createElement("span");
      labelText.className = "smallLabel";
      labelText.textContent = "Sildi väli:";
      const select = document.createElement("select");
      const noneOpt = document.createElement("option");
      noneOpt.value = ""; noneOpt.textContent = "(puudub)";
      select.appendChild(noneOpt);
      entry.fields.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f; opt.textContent = f;
        if (f === entry.labelField) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener("change", () => {
        entry.labelField = select.value || null;
        renderMyLayerForCurrentView(entry);
      });
      labelRow.appendChild(labelText);
      labelRow.appendChild(select);
      row.appendChild(labelRow);

      /* color mode: single vs thematic */
      const colorRow = document.createElement("div");
      colorRow.className = "myLayerLabelRow";
      const colorLabelText = document.createElement("span");
      colorLabelText.className = "smallLabel";
      colorLabelText.textContent = "Värvimine:";
      const modeSelect = document.createElement("select");
      ["single", "thematic"].forEach(mode => {
        const opt = document.createElement("option");
        opt.value = mode;
        opt.textContent = mode === "single" ? "Ühtne värv" : "Temaatiline (välja järgi)";
        if (mode === entry.colorMode) opt.selected = true;
        modeSelect.appendChild(opt);
      });
      colorRow.appendChild(colorLabelText);
      colorRow.appendChild(modeSelect);
      row.appendChild(colorRow);

      const colorSubRow = document.createElement("div");
      colorSubRow.className = "myLayerLabelRow";

      function renderColorSubControls() {
        colorSubRow.innerHTML = "";
        if (entry.colorMode === "single") {
          const colorInput = document.createElement("input");
          colorInput.type = "color";
          colorInput.value = entry.singleColor;
          colorInput.addEventListener("input", () => {
            entry.singleColor = colorInput.value;
            renderMyLayerForCurrentView(entry);
          });
          colorSubRow.appendChild(colorInput);
        } else {
          const fieldSelect = document.createElement("select");
          const noneOpt2 = document.createElement("option");
          noneOpt2.value = ""; noneOpt2.textContent = "(vali väli)";
          fieldSelect.appendChild(noneOpt2);
          entry.fields.forEach(f => {
            const opt = document.createElement("option");
            opt.value = f; opt.textContent = f;
            if (f === entry.thematicField) opt.selected = true;
            fieldSelect.appendChild(opt);
          });
          fieldSelect.addEventListener("change", () => {
            entry.thematicField = fieldSelect.value || null;
            updateThematicColorMap(entry);
            renderMyLayerForCurrentView(entry);
            renderLegend();
          });
          colorSubRow.appendChild(fieldSelect);
        }
      }

      const legendBox = document.createElement("div");
      legendBox.className = "thematicLegend";

      function renderLegend() {
        legendBox.innerHTML = "";
        if (entry.colorMode !== "thematic" || !entry.thematicField) return;
        entry.thematicLegend.forEach(item => {
          const chip = document.createElement("span");
          chip.className = "legendChip";
          const sw = document.createElement("span");
          sw.className = "colorSwatch";
          sw.style.background = item.color;
          chip.appendChild(sw);
          chip.appendChild(document.createTextNode(" " + item.value));
          legendBox.appendChild(chip);
        });
      }

      modeSelect.addEventListener("change", () => {
        entry.colorMode = modeSelect.value;
        updateThematicColorMap(entry);
        renderMyLayerForCurrentView(entry);
        renderColorSubControls();
        renderLegend();
      });

      renderColorSubControls();
      renderLegend();
      row.appendChild(colorSubRow);
      row.appendChild(legendBox);
    }

    container.appendChild(row);
  });
}

function showMyLayerInfo(id) {
  const entry = myLayers[id];
  if (!entry) return;
  const fieldsHtml = entry.fields.length
    ? `<ul>${entry.fields.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`
    : "<p>Sellel kihil ei ole tuvastatud andmevälju.</p>";
  openModal(entry.name, `
    <h3>${escapeHtml(entry.name)}</h3>
    <p><strong>Objekte kihil:</strong> ${entry.rawFeatures.length}</p>
    <p><strong>Kiht ilmub alates suumist:</strong> ${entry.minZoom} &nbsp;|&nbsp;
       <strong>sildid alates:</strong> ${entry.labelMinZoom}</p>
    <p><strong>Saadaolevad andmeväljad:</strong></p>
    ${fieldsHtml}
    <p class="smallNote">Klõpsa kaardil otse objektil, et näha selle konkreetse objekti kõiki väärtusi.</p>
  `);
}

function removeMyLayer(id) {
  const entry = myLayers[id];
  if (!entry) return;
  if (!confirm(`Eemaldada kiht "${entry.name}" praegusest vaatest? (Fail jääb serverisse alles.)`)) return;
  if (entry.renderedLayer) map.removeLayer(entry.renderedLayer);
  delete myLayers[id];
  renderMyLayersList();
  refreshSearchLayerOptions();
}

async function deleteMyLayerFromServer(id) {
  const entry = myLayers[id];
  if (!entry) return;
  if (!confirm(`Kustutada "${entry.name}" JÄÄDAVALT serverist? Seda ei saa hiljem enam MyFiles kaustast taastada.`)) return;

  try {
    const resp = await fetch(CONFIG.php.deleteEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: entry.name })
    });
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => null);
      throw new Error(errJson && errJson.error ? errJson.error : `HTTP ${resp.status}`);
    }
  } catch (err) {
    alert(`Serverist kustutamine ebaõnnestus: ${err.message}. Kiht eemaldati siiski praegusest vaatest.`);
  }

  if (entry.renderedLayer) map.removeLayer(entry.renderedLayer);
  delete myLayers[id];
  renderMyLayersList();
  refreshSearchLayerOptions();
  loadMyFilesList(false);
}

function uploadFileToServer(file) {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(CONFIG.php.uploadEndpoint, { method: "POST", body: formData })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
}

/* ---------------------------------------------------------------------- */
/* MyFiles BROWSER — now auto-loads everything on startup                  */
/* ---------------------------------------------------------------------- */
function setupMyFilesBrowser() {
  document.getElementById("refreshMyFilesBtn").addEventListener("click", () => loadMyFilesList(true));
  loadMyFilesList(true); // auto-load all files present on the server at startup
}

function loadMyFilesList(autoLoadAll) {
  setStatus("myFilesStatus", "Loen MyFiles kausta...");
  fetch(CONFIG.php.listEndpoint)
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(files => {
      renderMyFilesFileList(files);
      setStatus("myFilesStatus", files.length ? "" : "MyFiles kaust on tühi.");
      if (autoLoadAll) {
        files.forEach(fname => loadMyFilesEntry(fname));
      }
    })
    .catch(err => {
      setStatus("myFilesStatus", "MyFiles nimekirja ei õnnestunud lugeda (kas php/list_files.php on serveris kättesaadav?).");
      console.warn(err);
    });
}

function renderMyFilesFileList(files) {
  const container = document.getElementById("myFilesFileList");
  container.innerHTML = "";
  files.forEach(fname => {
    const row = document.createElement("div");
    row.className = "layerRow";
    const btn = document.createElement("button");
    btn.className = "smallLoadBtn";
    btn.textContent = "📂 " + fname;
    btn.addEventListener("click", () => loadMyFilesEntry(fname));
    const delBtn = document.createElement("button");
    delBtn.className = "smallIconBtn dangerIconBtn";
    delBtn.title = "Kustuta jäädavalt serverist";
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", () => deleteFileByName(fname));
    row.appendChild(btn);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

async function deleteFileByName(fname) {
  if (!confirm(`Kustutada "${fname}" JÄÄDAVALT serverist?`)) return;
  try {
    const resp = await fetch(CONFIG.php.deleteEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: fname })
    });
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => null);
      throw new Error(errJson && errJson.error ? errJson.error : `HTTP ${resp.status}`);
    }
    const existing = Object.values(myLayers).find(e => e.name === fname);
    if (existing) {
      if (existing.renderedLayer) map.removeLayer(existing.renderedLayer);
      delete myLayers[existing.id];
      renderMyLayersList();
      refreshSearchLayerOptions();
    }
    loadMyFilesList(false);
  } catch (err) {
    alert(`Kustutamine ebaõnnestus: ${err.message}`);
  }
}

async function loadMyFilesEntry(fname) {
  if (Object.values(myLayers).some(e => e.name === fname && e.source === "myfiles")) return; // already loaded

  const url = CONFIG.php.myFilesUrlBase + encodeURIComponent(fname);
  const ext = fname.split(".").pop().toLowerCase();
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    if (ext === "kml") {
      addKmlStringToMap(await resp.text(), fname, "myfiles");
    } else if (ext === "kmz") {
      const zip = await JSZip.loadAsync(await resp.arrayBuffer());
      const kmlEntry = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith(".kml"));
      if (!kmlEntry) throw new Error("KMZ failist ei leitud .kml sisu");
      addKmlStringToMap(await kmlEntry.async("text"), fname, "myfiles");
    } else if (ext === "zip") {
      if (typeof shp !== "function") throw new Error("Shapefile'i teisendaja (shpjs) ei ole laetud.");
      addGeoJsonToMap(await shp(await resp.arrayBuffer()), fname, "myfiles");
    } else {
      throw new Error("Tundmatu failitüüp");
    }
  } catch (err) {
    console.warn(`Faili "${fname}" laadimine ebaõnnestus: ${err.message}`);
  }
}

/* ---------------------------------------------------------------------- */
/* SEARCH + Google Maps directions (Minu kaardid)                          */
/* ---------------------------------------------------------------------- */
function setupSearch() {
  document.getElementById("searchLayerSelect").addEventListener("change", refreshSearchFieldOptions);
  document.getElementById("searchGoBtn").addEventListener("click", performSearch);
  refreshSearchLayerOptions();
}

function refreshSearchLayerOptions() {
  const select = document.getElementById("searchLayerSelect");
  const previous = select.value;
  select.innerHTML = "";
  Object.values(myLayers).forEach(entry => {
    const opt = document.createElement("option");
    opt.value = entry.id;
    opt.textContent = "📄 " + entry.name;
    select.appendChild(opt);
  });
  if (select.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(lisa esmalt fail 'Minu kaardid' alt)";
    select.appendChild(opt);
  } else if (previous && Array.from(select.options).some(o => o.value === previous)) {
    select.value = previous;
  }
  refreshSearchFieldOptions();
}

function refreshSearchFieldOptions() {
  const layerId = document.getElementById("searchLayerSelect").value;
  const fieldSelect = document.getElementById("searchFieldSelect");
  fieldSelect.innerHTML = "";
  const entry = myLayers[layerId];
  if (!entry) return;
  entry.fields.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f; opt.textContent = f;
    fieldSelect.appendChild(opt);
  });
  const guess = entry.fields.find(f => /nimi|name|kood|code|objekt|^id$/i.test(f));
  if (guess) fieldSelect.value = guess;
}

function performSearch() {
  const layerId = document.getElementById("searchLayerSelect").value;
  const field = document.getElementById("searchFieldSelect").value;
  const query = document.getElementById("searchTextInput").value.trim().toLowerCase();
  const resultBox = document.getElementById("searchResult");

  const entry = myLayers[layerId];
  if (!entry || !field || !query) {
    setStatus("searchStatus", "Vali kiht, väli ja sisesta otsitav väärtus.");
    resultBox.classList.add("hidden");
    return;
  }

  const matches = entry.rawFeatures.filter(f =>
    f.properties && String(f.properties[field] ?? "").toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    setStatus("searchStatus", "Ühtegi objekti ei leitud.");
    resultBox.classList.add("hidden");
    return;
  }

  const feature = matches[0];
  const bounds = feature.__bounds;
  const center = bounds && bounds.isValid() ? bounds.getCenter() : null;

  setStatus("searchStatus",
    matches.length > 1 ? `${matches.length} vastet leitud, näidatakse esimest.` : "1 vaste leitud.");

  if (searchHighlightMarker) { map.removeLayer(searchHighlightMarker); searchHighlightMarker = null; }

  if (center) {
    const targetZoom = Math.max(map.getZoom(), entry.minZoom, entry.labelMinZoom, 16);
    map.setView(center, targetZoom);
    searchHighlightMarker = L.circleMarker(center, {
      radius: 12, color: "#ff0000", weight: 3, fillOpacity: 0
    }).addTo(map);
  }

  resultBox.classList.remove("hidden");
  resultBox.innerHTML = "";
  const rows = Object.entries(feature.properties || {})
    .map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`)
    .join("");
  resultBox.innerHTML = `<table class="popupTable">${rows}</table>`;

  if (center) {
    const dirLink = document.createElement("a");
    dirLink.href = `https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`;
    dirLink.target = "_blank";
    dirLink.rel = "noopener";
    dirLink.className = "wideBtn directionsLink";
    dirLink.textContent = "🚗 Ava Google Mapsi juhised";
    resultBox.appendChild(dirLink);
  }
}

/* ---------------------------------------------------------------------- */
/* VÄLIANDMED: Google Sheets / OneDrive (both via server-side proxy)        */
/* ---------------------------------------------------------------------- */
function setupSheets() {
  document.getElementById("sheetLoadBtn").addEventListener("click", () => loadSheetData(false));
  document.getElementById("onedriveLoadBtn").addEventListener("click", () => loadOneDriveData(false));
  document.getElementById("onedriveTabSelect").addEventListener("change", applyOneDriveTab);

  document.querySelectorAll('input[name="sheetSource"]').forEach(radio => {
    radio.addEventListener("change", () => {
      sheetState.source = radio.value;
      document.getElementById("googleSourceControls").classList.toggle("hidden", radio.value !== "google");
      document.getElementById("onedriveSourceControls").classList.toggle("hidden", radio.value !== "onedrive");
    });
  });

  document.getElementById("sheetJoinBtn").addEventListener("click", performSheetJoin);
  document.getElementById("sheetRefreshTargetsBtn").addEventListener("click", refreshJoinTargetOptions);
  document.getElementById("sheetTargetLayerSelect").addEventListener("change", populateTargetFieldOptions);
  document.getElementById("sheetAutoRefreshSelect").addEventListener("change", (e) => {
    setupSheetAutoRefresh(parseInt(e.target.value, 10));
  });
}

function parseGoogleSheetUrl(raw) {
  const val = raw.trim();
  const idMatch = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = val.match(/[#&?]gid=(\d+)/);
  return { id: idMatch ? idMatch[1] : val, gid: gidMatch ? gidMatch[1] : CONFIG.sheets.defaultGid };
}

async function loadSheetData(silent) {
  const input = document.getElementById("sheetUrlInput").value.trim();
  if (!input) { if (!silent) alert("Sisesta Google Sheeti link või ID."); return; }

  const { id, gid } = parseGoogleSheetUrl(input);
  sheetState.id = id; sheetState.gid = gid; sheetState.source = "google";

  if (!silent) setStatus("sheetStatus", "Loen Sheeti...");

  try {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const proxyUrl = `${CONFIG.php.dataProxyEndpoint}?url=${encodeURIComponent(targetUrl)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try { const errJson = await resp.json(); if (errJson && errJson.error) detail = errJson.error; } catch (e) {}
      throw new Error(detail);
    }
    const text = await resp.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (!parsed.data || parsed.data.length === 0) {
      throw new Error("Sheetist ei leitud ridu (kas jagamisõigused on 'kõigil, kellel link on'?)");
    }
    sheetState.headers = parsed.meta.fields || [];
    sheetState.rows = parsed.data;

    document.getElementById("sheetJoinControls").classList.remove("hidden");
    populateKeyColumnOptions();
    refreshJoinTargetOptions();

    if (!silent) setStatus("sheetStatus", `${sheetState.rows.length} rida loetud (${sheetState.headers.length} veergu).`);
  } catch (err) {
    setStatus("sheetStatus", `Sheeti lugemine ebaõnnestus (${err.message}).`);
  }
}

function guessOneDriveDownloadUrl(raw) {
  const val = raw.trim();
  const qIndex = val.indexOf("?");
  const base = qIndex >= 0 ? val.slice(0, qIndex) : val;
  return `${base}?download=1`;
}

async function loadOneDriveData(silent) {
  const input = document.getElementById("onedriveUrlInput").value.trim();
  if (!input) { if (!silent) alert("Kleebi OneDrive/SharePoint jagamislink."); return; }

  if (!silent) setStatus("sheetStatus", "Loen OneDrive faili...");

  const downloadUrl = guessOneDriveDownloadUrl(input);
  const proxyUrl = `${CONFIG.php.dataProxyEndpoint}?url=${encodeURIComponent(downloadUrl)}`;

  try {
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try { const errJson = await resp.json(); if (errJson && errJson.error) detail = errJson.error; } catch (e) {}
      throw new Error(detail);
    }
    const buf = await resp.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buf), { type: "array" });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) throw new Error("Failist ei leitud ühtegi töölehte");

    sheetState.workbook = workbook;
    sheetState.source = "onedrive";

    const tabRow = document.getElementById("onedriveTabRow");
    const tabSelect = document.getElementById("onedriveTabSelect");
    tabSelect.innerHTML = "";
    workbook.SheetNames.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name; opt.textContent = name;
      tabSelect.appendChild(opt);
    });
    tabRow.classList.toggle("hidden", workbook.SheetNames.length <= 1);

    applyOneDriveTab();

    if (!silent) setStatus("sheetStatus", `"${tabSelect.value}" leht loetud: ${sheetState.rows.length} rida, ${sheetState.headers.length} veergu.`);
  } catch (err) {
    setStatus("sheetStatus", `OneDrive faili lugemine ebaõnnestus (${err.message}).`);
  }
}

function applyOneDriveTab() {
  if (!sheetState.workbook) return;
  const tabSelect = document.getElementById("onedriveTabSelect");
  const sheetName = tabSelect.value || sheetState.workbook.SheetNames[0];
  const ws = sheetState.workbook.Sheets[sheetName];
  if (!ws) return;

  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  sheetState.rows = rows;
  const headers = new Set();
  rows.forEach(r => Object.keys(r).forEach(k => headers.add(k)));
  sheetState.headers = Array.from(headers);

  document.getElementById("sheetJoinControls").classList.remove("hidden");
  populateKeyColumnOptions();
  refreshJoinTargetOptions();
}

function populateKeyColumnOptions() {
  const select = document.getElementById("sheetKeyColumnSelect");
  select.innerHTML = "";
  sheetState.headers.forEach(h => {
    const opt = document.createElement("option");
    opt.value = h; opt.textContent = h;
    select.appendChild(opt);
  });
  const guess = sheetState.headers.find(h => /nimi|name|objekt|object|^id$/i.test(h));
  if (guess) select.value = guess;
}

function refreshJoinTargetOptions() {
  const select = document.getElementById("sheetTargetLayerSelect");
  const previous = select.value;
  select.innerHTML = "";
  Object.values(myLayers).forEach(entry => {
    const opt = document.createElement("option");
    opt.value = `my:${entry.id}`;
    opt.textContent = "📄 " + entry.name;
    select.appendChild(opt);
  });
  Object.keys(priaLayersState).forEach(typeName => {
    const opt = document.createElement("option");
    opt.value = `pria:${typeName}`;
    opt.textContent = "🌾 " + typeName;
    select.appendChild(opt);
  });
  if (select.options.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "(pole ühtegi sobivat kihti)";
    select.appendChild(opt);
  } else if (previous && Array.from(select.options).some(o => o.value === previous)) {
    select.value = previous;
  }
  populateTargetFieldOptions();
}

function resolveJoinTarget(targetId) {
  if (!targetId) return null;
  if (targetId.startsWith("my:")) {
    const entry = myLayers[targetId.slice(3)];
    return entry ? { kind: "my", entry, features: entry.rawFeatures } : null;
  }
  if (targetId.startsWith("pria:")) {
    const typeName = targetId.slice(5);
    const state = priaLayersState[typeName];
    if (!state) return null;
    const features = [];
    state.geo.eachLayer(l => { if (l.feature) features.push(l.feature); });
    return { kind: "pria", typeName, features };
  }
  return null;
}

function populateTargetFieldOptions() {
  const targetId = document.getElementById("sheetTargetLayerSelect").value;
  const fieldSelect = document.getElementById("sheetTargetFieldSelect");
  fieldSelect.innerHTML = "";
  const target = resolveJoinTarget(targetId);
  if (!target) return;
  const fields = target.kind === "my" ? target.entry.fields : collectFieldNamesFromFeatures(target.features);
  fields.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f; opt.textContent = f;
    fieldSelect.appendChild(opt);
  });
  const guess = fields.find(f => /nimi|name|objekt|object|^id$/i.test(f));
  if (guess) fieldSelect.value = guess;
}

function performSheetJoin() {
  const keyColumn = document.getElementById("sheetKeyColumnSelect").value;
  const targetId = document.getElementById("sheetTargetLayerSelect").value;
  const targetField = document.getElementById("sheetTargetFieldSelect").value;

  if (!keyColumn || !targetId || !targetField) {
    setStatus("sheetJoinStatus", "Vali kõik kolm välja enne ühendamist.");
    return;
  }
  const target = resolveJoinTarget(targetId);
  if (!target) {
    setStatus("sheetJoinStatus", "Valitud kaardikihti ei leitud.");
    return;
  }

  const lookup = new Map();
  sheetState.rows.forEach(row => {
    const key = normalizeJoinKey(row[keyColumn]);
    if (key) lookup.set(key, row);
  });

  const matchedKeys = new Set();
  let matchedCount = 0;

  target.features.forEach(feature => {
    const rawValue = feature.properties ? feature.properties[targetField] : undefined;
    const key = normalizeJoinKey(rawValue);
    const row = key ? lookup.get(key) : null;
    if (row) {
      feature.properties = { ...feature.properties, ...row };
      matchedKeys.add(key);
      matchedCount++;
    }
  });

  const unmatchedSheetRows = sheetState.rows.filter(row => {
    const key = normalizeJoinKey(row[keyColumn]);
    return key && !matchedKeys.has(key);
  });

  if (target.kind === "my") {
    target.entry.fields = collectFieldNamesFromFeatures(target.entry.rawFeatures);
    renderMyLayersList();
    renderMyLayerForCurrentView(target.entry);
    refreshSearchFieldOptions();
  } else {
    refreshAllEnabledPriaLayers();
  }

  let msg = `${matchedCount} kaardiobjekti ühendatud Sheeti andmetega.`;
  if (unmatchedSheetRows.length > 0) {
    const sample = unmatchedSheetRows.slice(0, 5).map(r => r[keyColumn]).join(", ");
    msg += ` ${unmatchedSheetRows.length} Sheeti reale ei leitud kaardilt vastavat objekti (nt: ${sample}${unmatchedSheetRows.length > 5 ? ", ..." : ""}).`;
  }
  setStatus("sheetJoinStatus", msg);
}

function normalizeJoinKey(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().toLowerCase();
}

function setupSheetAutoRefresh(ms) {
  clearInterval(sheetState.timerHandle);
  sheetState.timerHandle = null;
  if (ms > 0) {
    sheetState.timerHandle = setInterval(async () => {
      if (sheetState.source === "onedrive") await loadOneDriveData(true);
      else await loadSheetData(true);
      performSheetJoin();
    }, ms);
  }
}

/* ---------------------------------------------------------------------- */
/* HELPERS                                                                  */
/* ---------------------------------------------------------------------- */
function setStatus(elId, text) {
  const el = document.getElementById(elId);
  if (el) el.textContent = text;
}

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function cssEscape(str) {
  return window.CSS && CSS.escape ? CSS.escape(str) : str.replace(/["\\]/g, "\\$&");
}
