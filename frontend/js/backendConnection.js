// backendConnection.js — fetches and renders company results on results.html

// ─── FIX 1: Single API_BASE for both fetches ───────────────────────────────
const API_BASE = "http://127.0.0.1:8001";

// ─── Global State for Coordination ──────────────────────────────────────────
window._searchStatus = {
    mainLoaded: false,
    recoLoaded: false,
    mainCount: 0,
    recoCount: 0,
    hasError: false
};

/**
 * Unified function to handle empty states across both independent fetches.
 * Prevents showing "No tankers available" if recommendations actually exist.
 */
window.updateEmptyStateUI = function () {
    const container = document.getElementById("resultsContainer");
    const resultsSubtitle = document.getElementById("resultsSubtitle");
    const recoEmpty = document.getElementById("recoEmpty");
    
    if (!container) return;
    if (!window._searchStatus.mainLoaded || !window._searchStatus.recoLoaded) return;

    // FIX 3: Only show empty state when BOTH are truly empty
    if (window._searchStatus.mainCount === 0 && window._searchStatus.recoCount === 0) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12 text-center">
                <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">search_off</span>
                <p class="text-xl font-bold text-slate-700 dark:text-slate-300">No tankers available for this slot.</p>
                <p class="text-slate-500 mt-2">Try a different area, capacity, or time slot.</p>
                <button onclick="window.location.href='search.html'"
                    class="mt-6 px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                    Modify Search
                </button>
            </div>
        `;
        if (resultsSubtitle) resultsSubtitle.textContent = "No tankers found";
        return;
    }

    // Case 2: Main search is empty but recommendations (options) exist
    if (window._searchStatus.mainCount === 0 && window._searchStatus.recoCount > 0) {
        container.innerHTML = ""; // Clear loading spinner
        if (resultsSubtitle) {
            resultsSubtitle.innerHTML = `
                <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-xl border border-amber-200/50 dark:border-amber-800/50 w-fit">
                    <span class="material-symbols-outlined text-[20px]">info</span>
                    No exact matches found — showing best available options below
                </div>
            `;
        }
    }
};

// ─── Global render function (also called by sort buttons) ─────────────────────
window.renderCompanies = function (companies) {
    const container = document.getElementById("resultsContainer");
    if (!container) return;

    // FIX 4: Build entire HTML string first, then set innerHTML once
    let html = "";

    companies.forEach(company => {
        const isAvailable = company.available_tankers > 0;

        const availabilityBadgeClass = isAvailable ? "bg-green-500" : "bg-red-500";
        const availabilityText       = isAvailable ? "Available" : "Fully Booked";

        const bookButton = isAvailable
            ? `<button class="book-tanker-btn flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold shadow-sm hover:bg-blue-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        data-id="${company.company_id}"
                        data-name="${company.company_name.replace(/"/g, '&quot;')}"
                        data-price="${company.price}"
                        data-district="${company.district}">
                       Book Tanker
                   </button>`
            : `<button class="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500
                            text-sm font-bold cursor-not-allowed border border-slate-200 dark:border-slate-700" disabled>
                       Waitlist
                   </button>`;

        html += `
        <div class="company-card flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div class="relative w-full aspect-video">
                <div class="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center relative overflow-hidden">
                    <span class="material-symbols-outlined text-4xl text-slate-400">local_shipping</span>
                    <img class="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply"
                         src="https://lh3.googleusercontent.com/aida-public/AB6AXuBu_14at3HMvApPKx6YZ7oarcGR9dsIp20_MDkB40V7Lvy3u7pQYS_DmCmAGyEmlUM4ouQM9quYGcvC_Fk8JcKjgwQRSoaZoIO11bR32xs8LqNdcfI1q7R1RpRuUzWbaky_haGMfOqYmm3sJ6riXSpk6sHiIQgN7QQDbvpgpIw2_r7ArvwrUz7HwYwHqMyEXujNFXm3IFZ1nLeREbdc1s7lUoNtvI9Rn8EmJakD81zaaSvD6K7c86lAZvlixV_zW-B-d6C89Ai44exq"
                         alt="Water tanker">
                </div>
                <div class="absolute top-3 right-3 ${availabilityBadgeClass} text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    ${availabilityText}
                </div>
            </div>
            <div class="p-5 flex flex-col flex-1 ${isAvailable ? "" : "opacity-75"}">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="company-name text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">${company.company_name}</h3>
                </div>
                <div class="space-y-2 mb-6">
                    <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span class="material-symbols-outlined text-lg">inventory_2</span>
                        <span class="text-sm font-medium">${company.capacity}L Capacity</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span class="material-symbols-outlined text-lg">payments</span>
                        <span class="text-sm font-medium">₹${Number(company.price).toFixed(0)} <span class="text-xs font-normal">/ delivery</span></span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span class="material-symbols-outlined text-lg">location_on</span>
                        <span class="text-sm font-medium">${company.district}</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                        <span class="material-symbols-outlined text-lg">route</span>
                        <span class="text-sm font-medium">${company.distance_km} km away</span>
                    </div>
                </div>
                <div class="mt-auto flex gap-2">
                    ${bookButton}
                    <button class="size-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/50
                                   text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700
                                   hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span class="material-symbols-outlined">info</span>
                    </button>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;

    // Attach book-tanker click handlers after every render
    container.querySelectorAll(".book-tanker-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const b = e.currentTarget;
            sessionStorage.setItem("companyId",   b.getAttribute("data-id"));
            sessionStorage.setItem("companyName", b.getAttribute("data-name"));
            sessionStorage.setItem("price",       b.getAttribute("data-price"));
            sessionStorage.setItem("district",    b.getAttribute("data-district"));
            window.location.href = "payment.html";
        });
    });
};

// ─── Main: fetch + initial render ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const container       = document.getElementById("resultsContainer");
    const resultsSubtitle = document.getElementById("resultsSubtitle");

    if (!container) return;

    // FIX 2: Trim all sessionStorage inputs
    let city     = (sessionStorage.getItem("city") || "").trim();
    let area     = (sessionStorage.getItem("area") || "").trim();
    let capacity = (sessionStorage.getItem("capacity") || "").trim();
    let timeSlot = (sessionStorage.getItem("timeSlot") || "").trim();

    let searchLocation = area || city;

    // Normalize city capitalization: "mumbai" → "Mumbai", "PUNE" → "Pune"
    if (searchLocation) {
        searchLocation = searchLocation.charAt(0).toUpperCase() + searchLocation.slice(1).toLowerCase();
    }

    // FIX 10: Debug logging
    console.log("Search Params:", { city, area, searchLocation, capacity, timeSlot });

    // FIX 3: Guard BEFORE showing loading spinner to prevent flicker
    if (!city || !capacity) {
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center p-12">
                <span class="material-symbols-outlined text-5xl text-slate-400 dark:text-slate-600 mb-4">search</span>
                <p class="text-lg font-bold text-slate-700 dark:text-slate-300">No search criteria found.</p>
                <p class="text-sm text-slate-500 mt-2">Please start a search from the main page.</p>
                <button id="goToSearchBtnFallback"
                    class="mt-6 px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                    Go to Search
                </button>
            </div>
        `;
        document.getElementById("goToSearchBtnFallback").addEventListener("click", () => {
            window.location.href = "search.html";
        });
        return;
    }

    // FIX 8: Better loading state text
    container.innerHTML = `
        <div class="col-span-full flex items-center justify-center p-12">
            <div class="flex flex-col items-center gap-4">
                <span class="material-symbols-outlined text-4xl text-primary animate-spin" style="animation: spin 1s linear infinite;">refresh</span>
                <p class="text-lg font-bold text-slate-600 dark:text-slate-400 animate-pulse">⏳ Finding best tankers for you...</p>
            </div>
        </div>
    `;

    // Build the API request URL — endpoint is /companies/search
    const url = `${API_BASE}/api/v1/companies/search?district=${encodeURIComponent(searchLocation)}&capacity=${capacity}&timeslot=${encodeURIComponent(timeSlot || "")}`;
    console.log("API URL:", url);

    // authFetch — attaches JWT if present, falls back to plain fetch for demo sessions
    const authFetch = async (url, options = {}) => {
        const token = sessionStorage.getItem("accessToken");
        const headers = { "Content-Type": "application/json", ...options.headers };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        return fetch(url, { ...options, headers });
    };

    authFetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            // FIX 10: Debug logging
            console.log("Main search response:", data);

            // FIX 4: Handle both array and object response formats safely
            const companies = Array.isArray(data)
                ? data
                : (data.recommendations || []).concat(data.others || []);

            // Assign a stable mock distance (1–10 km) when backend returns null
            companies.forEach((c, i) => {
                if (c.distance_km == null) {
                    c.distance_km = parseFloat((1 + (i * 3.7 + 2.1) % 9).toFixed(1));
                }
            });

            // Store globally so sort buttons can access and re-render
            window._allCompanies = companies;

            // Update internal status
            window._searchStatus.mainLoaded = true;
            window._searchStatus.mainCount  = companies.length;

            if (companies.length > 0) {
                if (resultsSubtitle) {
                    const locDisplay = searchLocation.charAt(0).toUpperCase() + searchLocation.slice(1);
                    resultsSubtitle.textContent = `Found ${companies.length} tanker ${companies.length === 1 ? "company" : "companies"} for ${locDisplay}`;
                }
                // Initial render (sorted by distance ascending)
                companies.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
                window.renderCompanies(companies);
            } else {
                // Main results are empty, call coordinator
                window.updateEmptyStateUI();
            }
        })
        .catch(error => {
            console.error("API error:", error);
            window._searchStatus.mainLoaded = true;
            window._searchStatus.hasError = true;
            window._searchStatus.mainCount = 0;
            window.updateEmptyStateUI();

            // FIX 9: User-friendly error message
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center p-12 text-center
                            border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 rounded-xl">
                    <span class="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
                    <p class="text-lg font-bold text-red-600 dark:text-red-400">Something went wrong</p>
                    <p class="text-red-500 dark:text-red-300 mt-1 max-w-sm">
                        Could not load tanker results. Please check your connection and try again.
                    </p>
                    <button onclick="window.location.reload()"
                        class="mt-4 px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors">
                        Retry
                    </button>
                </div>
            `;
            if (resultsSubtitle) resultsSubtitle.textContent = "Failed to load results";
        });
});

// ─── Recommendations Section ───────────────────────────────────────────────────
// Fires independently — never blocks or affects the main results list below.
document.addEventListener("DOMContentLoaded", () => {
    const recoLoading = document.getElementById("recoLoading");
    const recoCards   = document.getElementById("recoCards");
    const recoList    = document.getElementById("recoList");
    const recoEmpty   = document.getElementById("recoEmpty");

    if (!recoLoading || !recoCards || !recoList || !recoEmpty) return;

    // FIX 2: Trim inputs
    let city     = (sessionStorage.getItem("city") || "").trim();
    let area     = (sessionStorage.getItem("area") || "").trim();
    let capacity = (sessionStorage.getItem("capacity") || "").trim();

    if ((!city && !area) || !capacity) {
        recoLoading.classList.add("hidden");
        return;  // no search context — hide quietly
    }

    let searchLocation = area || city;
    searchLocation = searchLocation.charAt(0).toUpperCase() + searchLocation.slice(1).toLowerCase();

    const recoUrl = `${API_BASE}/api/v1/recommendations?capacity=${capacity}&district=${encodeURIComponent(searchLocation)}`;

    // FIX 10: Debug logging
    console.log("Recommendations request:", { searchLocation, capacity });

    fetch(recoUrl)
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(results => {
            recoLoading.classList.add("hidden");

            // FIX 10: Debug logging
            console.log("Recommendations response:", results);

            // FIX 4: Handle both array and object response formats safely
            const recommendations = Array.isArray(results) ? results.slice(0, 3) : (results.recommendations || []).slice(0, 3);
            const others = Array.isArray(results) ? results.slice(3) : (results.others || []);

            // FIX 7: Cap others at 15
            const cappedOthers = others.slice(0, 15);

            // Update internal status
            window._searchStatus.recoLoaded = true;
            window._searchStatus.recoCount  = recommendations.length;

            if (recommendations.length === 0) {
                recoEmpty.classList.remove("hidden");
                window.updateEmptyStateUI(); // Notify coordinator
            } else {
                // Options exist, dismiss any loading text in main area if it's empty
                window.updateEmptyStateUI();

                // FIX 6: Build all recommendation cards as HTML string, set innerHTML once
                let recoHtml = "";

                recommendations.forEach((company, idx) => {
                    const isBest     = idx === 0;
                    const distText   = company.distance_km != null
                        ? `${Number(company.distance_km).toFixed(1)} km away`
                        : "Distance N/A";
                    const ratingText = Number(company.rating).toFixed(1);
                    const scoreText  = company.score != null
                        ? `Score: ${Number(company.score * 100).toFixed(0)}/100`
                        : "";

                    const cardClasses = [
                        "relative flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1",
                        isBest
                            ? "border-primary/50 bg-primary/[0.03] dark:bg-primary/[0.05] shadow-md shadow-primary/10 hover:shadow-xl hover:shadow-primary/20"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md",
                    ].join(" ");

                    recoHtml += `
                    <div class="${cardClasses}">
                        ${isBest ? `
                        <div class="absolute -top-3 left-5 flex items-center gap-1.5 bg-primary text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-md tracking-wide">
                            <span class="text-yellow-300 text-xs">⭐</span><span>BEST MATCH</span>
                        </div>` : ""}
                        <div class="flex items-start justify-between mt-1">
                            <div>
                                <h3 class="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight tracking-tight">${company.company_name}</h3>
                                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${company.district}, ${company.city}</p>
                                ${isBest ? `<p class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2.5 font-bold tracking-wide uppercase">Best price &bull; Closest &bull; Suitable capacity</p>` : ""}
                            </div>
                            ${scoreText ? `<span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap">${scoreText}</span>` : ""}
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-center">
                            <div class="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2 px-1">
                                <span class="material-symbols-outlined text-lg text-green-500">payments</span>
                                <span class="text-xs font-bold text-slate-900 dark:text-slate-100">₹${Number(company.price).toFixed(0)}</span>
                                <span class="text-[10px] text-slate-400">/ delivery</span>
                            </div>
                            <div class="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2 px-1">
                                <span class="material-symbols-outlined text-lg text-blue-500">route</span>
                                <span class="text-xs font-bold text-slate-900 dark:text-slate-100">${distText}</span>
                                <span class="text-[10px] text-slate-400">distance</span>
                            </div>
                            <div class="flex flex-col items-center gap-0.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg py-2 px-1">
                                <span class="material-symbols-outlined text-lg text-orange-400">water_drop</span>
                                <span class="text-xs font-bold text-slate-900 dark:text-slate-100">${company.capacity}L</span>
                                <span class="text-[10px] text-slate-400">capacity</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1">
                                <span class="material-symbols-outlined text-base text-amber-400">star</span>
                                <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">${ratingText}</span>
                                <span class="text-[10px] text-slate-400">· ${company.available_tankers} available</span>
                            </div>
                            <button
                                class="reco-book-btn text-sm font-bold px-6 py-2 rounded-xl bg-primary text-white hover:bg-blue-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                                data-id="${company.company_id}"
                                data-name="${company.company_name.replace(/"/g, '&quot;')}"
                                data-price="${company.price}"
                                data-district="${company.district}">
                                Book Now
                            </button>
                        </div>
                    </div>`;
                });

                // Single DOM update
                recoList.innerHTML = recoHtml;

                // Wire book buttons
                recoList.querySelectorAll(".reco-book-btn").forEach(btn => {
                    btn.addEventListener("click", e => {
                        const b = e.currentTarget;
                        sessionStorage.setItem("companyId",   b.dataset.id);
                        sessionStorage.setItem("companyName", b.dataset.name);
                        sessionStorage.setItem("price",       b.dataset.price);
                        sessionStorage.setItem("district",    b.dataset.district);
                        window.location.href = "payment.html";
                    });
                });

                recoCards.classList.remove("hidden");
            } // End of recommendations else block

            // FIX 5: Only render others into the main grid if main search returned 0 results
            // This prevents recommendations from clobbering main search results
            if (cappedOthers.length > 0 && window._searchStatus.mainCount === 0) {
                // Stabilize mock distance
                cappedOthers.forEach((c, i) => {
                    if (c.distance_km == null) {
                        c.distance_km = parseFloat((1 + (i * 3.7 + 2.1) % 9).toFixed(1));
                    }
                });
                cappedOthers.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
                window._allCompanies = cappedOthers;
                window._searchStatus.mainCount = cappedOthers.length;
                window.renderCompanies(cappedOthers);

                const resultsSubtitle = document.getElementById("resultsSubtitle");
                if (resultsSubtitle) {
                    const locDisplay = searchLocation.charAt(0).toUpperCase() + searchLocation.slice(1);
                    resultsSubtitle.textContent = `Found ${cappedOthers.length} tanker ${cappedOthers.length === 1 ? "company" : "companies"} for ${locDisplay}`;
                }
            }
        })
        .catch(err => {
            // FIX 9: Non-critical error handling for recommendations
            console.warn("Recommendations fetch failed (non-critical):", err);
            recoLoading.classList.add("hidden");
            
            window._searchStatus.recoLoaded = true;
            window._searchStatus.recoCount  = 0;
            window.updateEmptyStateUI();
        });
});