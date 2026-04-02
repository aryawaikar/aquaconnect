/**
 * trackingSimulation.js
 * ─────────────────────
 * Uber/Swiggy-style delivery simulation for AquaConnect tracking page.
 * Uses MapLibre GL JS — no API key required.
 *
 * Usage: included in tracking.html, called as window.AquaTracking.start()
 */

(function () {
  "use strict";

  // ── City anchor coordinates ───────────────────────────────────────────────
  const CITY_COORDS = {
    pune:      { lat: 18.5204, lng: 73.8567 },
    mumbai:    { lat: 19.0760, lng: 72.8777 },
    delhi:     { lat: 28.6139, lng: 77.2090 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    hyderabad: { lat: 17.3850, lng: 78.4867 },
    chennai:   { lat: 13.0827, lng: 80.2707 },
    kolkata:   { lat: 22.5726, lng: 88.3639 },
    ahmedabad: { lat: 23.0225, lng: 72.5714 },
  };

  // ── Status stages ──────────────────────────────────────────────────────────
  const STAGES = [
    { id: "stage-confirmed",  label: "Order Confirmed",   sub: "Booking received & verified",   pct: 0   },
    { id: "stage-assigned",   label: "Driver Assigned",   sub: "Driver heading to depot",       pct: 12  },
    { id: "stage-dispatched", label: "Tanker Dispatched", sub: "Left the depot",                pct: 25  },
    { id: "stage-ontheway",   label: "On The Way",        sub: "En route to your location",     pct: 40  },
    { id: "stage-arriving",   label: "Arriving Soon",     sub: "Almost at your doorstep!",      pct: 80  },
    { id: "stage-delivered",  label: "Delivered ✓",       sub: "Water unloading complete",      pct: 100 },
  ];

  // ── Dummy driver roster ────────────────────────────────────────────────────
  const DRIVERS = [
    { name: "Ramesh Kadam",   phone: "+91 98201 33412" },
    { name: "Suresh Patil",   phone: "+91 97654 21098" },
    { name: "Vikram Singh",   phone: "+91 99870 45312" },
    { name: "Arun Sharma",    phone: "+91 98765 10234" },
    { name: "Prakash Jadhav", phone: "+91 91234 56789" },
  ];

  // ── Simulation state ───────────────────────────────────────────────────────
  let map        = null;
  let tankerMark = null;
  let simTimer   = null;

  let progress = 0;
  const TOTAL_DURATION_S = 90;
  const TICK_MS          = 2000;
  const PCTS_PER_TICK    = 100 / (TOTAL_DURATION_S * 1000 / TICK_MS);

  // MapLibre uses [lng, lat] order (GeoJSON convention)
  let startLngLat = null;
  let endLngLat   = null;
  let driver      = null;

  // ── Math helpers ──────────────────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpLngLat(s, e, t) { return [lerp(s[0], e[0], t), lerp(s[1], e[1], t)]; }

  function distKm(a, b) {
    const R = 6371;
    const dLat = (b[1] - a[1]) * Math.PI / 180;
    const dLng = (b[0] - a[0]) * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 +
              Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function etaString(remainingPct) {
    const remS = (remainingPct / 100) * TOTAL_DURATION_S;
    if (remS <= 0) return "Delivered!";
    if (remS < 60) return "Arriving in < 1 min";
    const mins = Math.ceil(remS / 60);
    return `Arriving in ${mins} min${mins > 1 ? "s" : ""}`;
  }

  function updateETA() {
    const e = el("sim-eta");
    if (e) e.textContent = etaString(100 - progress);
  }

  function updateProgressBar() {
    const bar = el("sim-progress-bar");
    if (bar) bar.style.width = `${Math.min(progress, 100)}%`;
    const pct = el("sim-progress-pct");
    if (pct) pct.textContent = `${Math.round(progress)}%`;
  }

  function updateTimeline() {
    STAGES.forEach((stage, idx) => {
      const dot   = el(`dot-${stage.id}`);
      const label = el(`lbl-${stage.id}`);
      const sub   = el(`sub-${stage.id}`);
      if (!dot || !label) return;

      const isActive = progress >= stage.pct &&
                       (idx === STAGES.length - 1 || progress < STAGES[idx + 1].pct);
      const isDone   = idx < STAGES.length - 1 && progress >= STAGES[idx + 1].pct;

      if (isDone) {
        dot.className = "absolute -left-6 top-0.5 size-6 rounded-full bg-emerald-500 flex items-center justify-center z-10 transition-all duration-500";
        dot.innerHTML = '<span class="material-symbols-outlined text-white text-xs">check</span>';
        label.className = "text-sm font-bold text-emerald-400";
        if (sub) sub.className = "text-xs text-emerald-600 mt-0.5";
      } else if (isActive) {
        dot.className = "absolute -left-6 top-0.5 size-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(19,127,236,0.7)] z-10 transition-all duration-500";
        dot.innerHTML = '<span class="size-2 rounded-full bg-white animate-pulse inline-block"></span>';
        label.className = "text-sm font-bold text-white";
        if (sub) sub.className = "text-xs text-primary mt-0.5";
      } else {
        dot.className = "absolute -left-6 top-0.5 size-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 z-10 transition-all duration-500";
        dot.innerHTML = '<span class="size-2 rounded-full bg-slate-600 inline-block"></span>';
        label.className = "text-sm font-bold text-slate-500";
        if (sub) sub.className = "text-xs text-slate-600 mt-0.5";
      }
    });

    // Status badge
    const statusEl = el("sim-status-text");
    if (statusEl) {
      let active = STAGES[0];
      for (const s of STAGES) { if (progress >= s.pct) active = s; }
      statusEl.textContent = active.label;
    }
  }

  // ── Chime on stage change ──────────────────────────────────────────────────
  let lastStageIdx = -1;
  function checkStageChange() {
    let idx = 0;
    STAGES.forEach((s, i) => { if (progress >= s.pct) idx = i; });
    if (idx !== lastStageIdx) {
      lastStageIdx = idx;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880; osc.type = "sine";
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
      } catch (_) {}
    }
  }

  // ── Simulation tick ────────────────────────────────────────────────────────
  function tick() {
    if (progress >= 100) {
      clearInterval(simTimer);
      progress = 100;
      updateTimeline(); updateProgressBar(); updateETA();
      const e = el("sim-eta");
      if (e) e.textContent = "Delivered! 🎉";
      return;
    }

    progress = Math.min(progress + PCTS_PER_TICK, 100);
    const t = progress / 100;

    if (tankerMark && startLngLat && endLngLat) {
      tankerMark.setLngLat(lerpLngLat(startLngLat, endLngLat, t));
    }

    if (map && startLngLat && endLngLat && progress % 15 < PCTS_PER_TICK + 1) {
      map.easeTo({ center: lerpLngLat(startLngLat, endLngLat, t), duration: 1500 });
    }

    // Update remaining route line
    if (map && map.getSource("route-remaining")) {
      const cur = lerpLngLat(startLngLat, endLngLat, t);
      map.getSource("route-remaining").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [cur, endLngLat] },
      });
    }

    checkStageChange();
    updateTimeline();
    updateProgressBar();
    updateETA();
  }

  // ── Tanker marker element ─────────────────────────────────────────────────
  function makeTankerEl() {
    const div = document.createElement("div");
    div.style.cssText = [
      "width:44px", "height:44px",
      "background:linear-gradient(135deg,#137fec,#0550ae)",
      "border-radius:50%",
      "display:flex", "align-items:center", "justify-content:center",
      "box-shadow:0 0 18px rgba(19,127,236,0.9),0 0 36px rgba(19,127,236,0.4)",
      "border:2px solid rgba(255,255,255,0.3)",
      "animation:tankerPulse 2s infinite",
    ].join(";");
    div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="white" width="20" height="20">
      <path d="M1 3h15v13H1zm16 3h2l3 3v7h-5V6zM5.5 18a1.5 1.5 0 1 1 0 3
               1.5 1.5 0 0 1 0-3zm12 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
    </svg>`;
    return div;
  }

  // ── Map initialisation ─────────────────────────────────────────────────────
  function initMap(cityKey) {
    if (map) return; // guard against double-init

    console.log("Map starting...");

    if (typeof maplibregl === "undefined") {
      console.error("MapLibre not loaded ❌");
      return;
    }

    const center = CITY_COORDS[cityKey] || CITY_COORDS["pune"];

    startLngLat = [center.lng - 0.04 + Math.random() * 0.02,
                   center.lat + 0.04 + Math.random() * 0.02];
    endLngLat   = [center.lng + 0.03 + Math.random() * 0.01,
                   center.lat - 0.03 + Math.random() * 0.01];

    // ── Create the map ───────────────────────────────────────────────────────
    map = new maplibregl.Map({
      container:          "liveMap",
      style:              "https://demotiles.maplibre.org/style.json",
      center:             [center.lng, center.lat],
      zoom:               12,
      attributionControl: false,
    });

    // ── After style loads: add dark overlay + route lines ───────────────────
    map.on("load", function () {
      console.log("Map loaded successfully ✅");

      // Dark CartoDB raster overlay
      map.addSource("carto-dark", {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CartoDB",
      });
      // Insert below the first symbol layer so labels stay on top
      const firstSymbol = (map.getStyle().layers.find(l => l.type === "symbol") || {}).id;
      map.addLayer({ id: "carto-dark-bg", type: "raster", source: "carto-dark" },
                   firstSymbol);

      // Faint full-route line
      map.addSource("route-full", {
        type: "geojson",
        data: { type: "Feature",
                geometry: { type: "LineString",
                            coordinates: [startLngLat, endLngLat] } },
      });
      map.addLayer({ id: "route-full-layer", type: "line", source: "route-full",
                     paint: { "line-color": "#1e40af", "line-width": 3,
                              "line-opacity": 0.4, "line-dasharray": [4, 4] } });

      // Bright remaining route (updated on each tick)
      map.addSource("route-remaining", {
        type: "geojson",
        data: { type: "Feature",
                geometry: { type: "LineString",
                            coordinates: [startLngLat, endLngLat] } },
      });
      map.addLayer({ id: "route-remaining-layer", type: "line",
                     source: "route-remaining",
                     paint: { "line-color": "#137fec", "line-width": 4,
                              "line-opacity": 0.95 } });

      // Fit map to show both endpoints
      map.fitBounds([
        [Math.min(startLngLat[0], endLngLat[0]) - 0.01,
         Math.min(startLngLat[1], endLngLat[1]) - 0.01],
        [Math.max(startLngLat[0], endLngLat[0]) + 0.01,
         Math.max(startLngLat[1], endLngLat[1]) + 0.01],
      ], { padding: 80 });

      // Force resize to fix any residual container measurement issue
      setTimeout(function () { map.resize(); }, 300);

      // Update distance display
      const km = distKm(startLngLat, endLngLat);
      const distEl = el("sim-distance");
      if (distEl) distEl.textContent = `${km.toFixed(1)} km`;
    });

    // ── Depot marker (green) ─────────────────────────────────────────────────
    const depotEl = document.createElement("div");
    depotEl.style.cssText = [
      "width:28px", "height:28px",
      "background:#10b981", "border-radius:6px",
      "display:flex", "align-items:center", "justify-content:center",
      "box-shadow:0 0 10px rgba(16,185,129,0.8)",
    ].join(";");
    depotEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
      fill="white" width="16" height="16">
      <path d="M20 9V7h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12
               c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V9h2z"/>
    </svg>`;
    new maplibregl.Marker({ element: depotEl, anchor: "center" })
      .setLngLat(startLngLat).addTo(map);

    // ── Destination marker (red pin) ─────────────────────────────────────────
    new maplibregl.Marker({ color: "#ef4444", anchor: "bottom" })
      .setLngLat(endLngLat).addTo(map);

    // ── Tanker marker (animated, moves each tick) ────────────────────────────
    tankerMark = new maplibregl.Marker({ element: makeTankerEl(), anchor: "center" })
      .setLngLat(startLngLat).addTo(map);
  }

  // ── Populate driver card ──────────────────────────────────────────────────
  function populateDriverCard() {
    driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
    const company  = sessionStorage.getItem("companyName") || "AquaSupply Tankers";
    const capacity = sessionStorage.getItem("capacity")    || "5000";
    const pfx = ["MH", "KA", "DL", "TN", "GJ"][Math.floor(Math.random() * 5)];
    const num = `${10 + Math.floor(Math.random() * 40)}`;
    const L1  = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const L2  = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const vn  = `${pfx}${num} ${L1}${L2} ${1000 + Math.floor(Math.random() * 9000)}`;

    const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
    set("driver-name",     driver.name);
    set("driver-vehicle",  vn);
    set("driver-capacity", `${capacity}L Tanker`);
    set("driver-phone",    driver.phone);
    set("driver-company",  company);
  }

  // ── Populate session data ─────────────────────────────────────────────────
  function populateSessionData() {
    const city     = sessionStorage.getItem("city")        || "Pune";
    const company  = sessionStorage.getItem("companyName") || "AquaSupply Inc";
    const district = sessionStorage.getItem("district")    || "";

    const set = (id, val) => { const e = el(id); if (e) e.textContent = val; };
    set("trackCompany",   company);
    set("trackVesselName", company);
    set("trackDest",      city.charAt(0).toUpperCase() + city.slice(1));
    set("trackDestSub",   district || "Local Delivery Area");
  }

  // ── Public entry point ────────────────────────────────────────────────────
  function start() {
    function _run() {
      try {
        console.log("AquaTracking start() — maplibregl:", typeof maplibregl);

        const raw     = (sessionStorage.getItem("city") || "pune").toLowerCase().trim();
        const cityKey = Object.keys(CITY_COORDS).find(k => raw.includes(k)) || "pune";

        populateSessionData();
        populateDriverCard();
        initMap(cityKey);

        progress = 0;
        updateTimeline();
        updateProgressBar();
        updateETA();

        simTimer = setInterval(tick, TICK_MS);
      } catch (err) {
        console.error("AquaTracking start() failed:", err);
        const e = el("sim-eta");
        if (e) e.textContent = "Tanker is on the way";
      }
    }

    // If page is already fully loaded run immediately, otherwise wait for load.
    if (document.readyState === "complete") {
      _run();
    } else {
      window.addEventListener("load", _run, { once: true });
    }
  }

  window.AquaTracking = { start };

})();
