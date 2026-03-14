// backendConnection.js — fetches and renders company results on results.html

// ─── Global render function (also called by sort buttons) ─────────────────────
window.renderCompanies = function (companies) {
    const container = document.getElementById("resultsContainer");
    if (!container) return;

    container.innerHTML = "";

    companies.forEach(company => {
        const isAvailable = company.available_tankers > 0;

        const availabilityBadgeClass = isAvailable ? "bg-green-500" : "bg-red-500";
        const availabilityText       = isAvailable ? "Available" : "Fully Booked";

        const bookButton = isAvailable
            ? `<button class="book-tanker-btn flex-1 h-10 rounded-lg bg-gradient-to-r from-primary to-blue-600
                            text-white text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
                        data-id="${company.company_id}"
                        data-name="${company.company_name.replace(/"/g, '&quot;')}"
                        data-price="${company.price}"
                        data-district="${company.district}">
                       Book Tanker
                   </button>`
            : `<button class="flex-1 h-10 rounded-lg bg-slate-300 dark:bg-slate-700 text-slate-500
                            text-sm font-bold cursor-not-allowed" disabled>
                       Waitlist
                   </button>`;

        const card = document.createElement("div");
        card.className = "company-card flex flex-col glass-card rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 group";
        card.innerHTML = `
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
                    <button class="size-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700
                                   text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600
                                   hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <span class="material-symbols-outlined">info</span>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

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

    // Read search params from sessionStorage
    let city     = sessionStorage.getItem("city");
    let capacity = sessionStorage.getItem("capacity");
    let timeSlot = sessionStorage.getItem("timeSlot"); // already in HH:MM-HH:MM format

    // Normalize city capitalization: "mumbai" → "Mumbai", "PUNE" → "Pune"
    if (city) {
        city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    }

    console.log("Search Params:", city, capacity, timeSlot);

    // Show loading state
    container.innerHTML = `
        <div class="col-span-full flex items-center justify-center p-12">
            <div class="flex flex-col items-center gap-3">
                <span class="material-symbols-outlined text-4xl text-primary animate-spin" style="animation: spin 1s linear infinite;">refresh</span>
                <p class="text-lg font-bold text-slate-500 animate-pulse">Finding available tanker companies...</p>
            </div>
        </div>
    `;

    // Guard: need city + capacity at minimum
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

    // Build the API request URL — endpoint is /companies/search
    const API_BASE ="https://aquaconnect-backend.onrender.com";
;
    const url = `${API_BASE}/companies/search?district=${encodeURIComponent(city)}&capacity=${capacity}&timeslot=${encodeURIComponent(timeSlot || "")}`;
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
        .then(companies => {
            console.log("Companies received:", companies);

            // Assign a stable mock distance (1–10 km) when backend returns null
            companies.forEach((c, i) => {
                if (c.distance_km == null) {
                    c.distance_km = parseFloat((1 + (i * 3.7 + 2.1) % 9).toFixed(1));
                }
            });

            // Store globally so sort buttons can access and re-render
            window._allCompanies = companies;

            // Update subtitle
            if (resultsSubtitle) {
                const cityDisplay = city.charAt(0).toUpperCase() + city.slice(1);
                resultsSubtitle.textContent = companies.length > 0
                    ? `Found ${companies.length} tanker ${companies.length === 1 ? "company" : "companies"} in ${cityDisplay}`
                    : `No tankers found in ${cityDisplay} for your criteria`;
            }

            if (companies.length === 0) {
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
                return;
            }

            // Initial render (sorted by distance ascending)
            companies.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
            window.renderCompanies(companies);
        })
        .catch(error => {
            console.error("API error:", error);
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center p-12 text-center
                            border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 rounded-xl">
                    <span class="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
                    <p class="text-lg font-bold text-red-600 dark:text-red-400">Connection Failed</p>
                    <p class="text-red-500 dark:text-red-300 mt-1 max-w-sm">
                        Make sure the FastAPI backend is running at http://localhost:8001
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
