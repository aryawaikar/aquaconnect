// searchLogic.js — handles all selection logic on search.html and submits to results.html
document.addEventListener("DOMContentLoaded", () => {
    // State
    let selectedCapacity = null;
    let selectedTimeSlot = null; // stored in AM/PM display format
    let selectedCity = document.getElementById("citySelect").value;
    let selectedArea = "";

    const cityAreas = {
        Pune: ["Kothrud", "Baner", "Wakad", "Hinjewadi"],
        Mumbai: ["Andheri", "Bandra", "Dadar"],
        Delhi: ["Saket", "Dwarka", "Rohini"],
        Bangalore: ["Whitefield", "Indiranagar", "BTM"]
    };

    // DOM refs
    const citySelect   = document.getElementById("citySelect");
    const areaInput    = document.getElementById("areaInput");
    const capacityCards   = document.querySelectorAll(".capacity-card");
    const timeSlotBtns    = document.querySelectorAll(".time-slot");
    const summaryLocation = document.getElementById("summaryLocation");
    const summaryCapacity = document.getElementById("summaryCapacity");
    const summaryTimeSlot = document.getElementById("summaryTimeSlot");
    const submitBtnDesktop = document.getElementById("submitBookingBtn");
    const submitBtnMobile  = document.getElementById("submitBookingBtnMobile");
    const mapPreviewImg = document.getElementById("mapPreviewImg"); // newly added id in map preview

    // --- Hook for dateSelector.js to clear time slot state on date change ---
    window.resetSelectedTimeSlot = function () {
        selectedTimeSlot = null;
        timeSlotBtns.forEach(b => {
             b.classList.remove("btn-gradient", "text-white", "shadow-lg", "shadow-primary/20", "border-primary");
             b.classList.add("border-slate-200", "dark:border-slate-700", "bg-white", "dark:bg-slate-800", "text-slate-700", "dark:text-slate-300");
        });
        updateSummary();
    };

    // Images for city map previews
    const cityMapImages = {
        "mumbai": "https://lh3.googleusercontent.com/aida-public/AB6AXuA3WPbatBOLHKZI0wYhD943Jxbyp1uYRqkzh9Uv9qsjbIXswD3T-EX9TYsljIzGaE0s7x2ZrBdhABXKkyq1OCLpuCgIHI4BaGVKpEKx2tNisTBNQkxtmAF9F-mWcnVhAnRCo0FKRNrhkHfemapQeiNHz3e2RlAkOphOl5tf8nCD4nlC1di0C2U97SXB3kPC5wx8pDBMEbP3QgJf6kPsskIrMypzgaAyNC6TzxLzXpk3ZIHBFgYe5fM1KsrY9mlMQJqQwv6k5fJZcOYb",
        "delhi": "https://lh3.googleusercontent.com/aida-public/AB6AXuA1v0v3bIqzrB2S149x9R6l6_mY9o1LdE9yJv1sQJvFv59mJ9n80aN3P002Qn_d2K8C5X0G0R-6x90oXfS45a-H-C9B-1jE-V2rC9yD6E-T1oA-U1eG9mN-v0fF9aM-4A-C0g-F-E1nB9C9l9D2X0yE0F3mC9R8hZ0O-tA-4O",
        "pune": "https://lh3.googleusercontent.com/aida-public/AB6AXuBZL5KPqLHVj3n4457WOXIkcLj1WrDbCgEV04b2tcOjXbyTbmhd6T77O9FHfSexZI_s6JnpG-TxEpJjhBU7W3rf9LYVQmn0WMXFN_o34ji4gtMKKsxu5FGGMTQy6OUkmn59dedSBEaQQus7KHplTzq18PXIUchte2pNwLGKXyzTEgLn5V8LkatCxGEtjutLGdo1tAUYPFX1XUAiDFAQXms_kbygZGakl5hLf6xIb7HVOExqjSefsU5WfQiEb4a5dYx-XBmxZ9EufrJP",
        "bangalore": "https://lh3.googleusercontent.com/aida-public/AB6AXuCA1W-NYQgBXCVTZQierlWbjdrBE149QTVv34ZW-Cs12yTfev4PGkXYhqNAZiqPnfp74lFWvRUiOid9dEOZSJW6HC3LVw_Fi_EILveVX1dn6phQagRPSFo1McWTGEp8mmJndI9DZdR42J6kQcsSUq77bZAxSmJFZ8wXIq_9-5rnMBsWRa3fMrB1akc5hPu7FPN_IAKVQfp1zs-kzAQnRNCIaDHnyUmWUJJAClawwJeLk_GR0VmMQktMfGzKMj-dvVpE11dTVgXZcihN"
    };

    // --- Location ---
    function updateLocation() {
        selectedCity = citySelect.value;
        selectedArea = areaInput.value;
        if(mapPreviewImg) {
             const key = selectedCity.toLowerCase();
             // fallbacks for missing images if needed
             const bgUrl = cityMapImages[key] || cityMapImages["mumbai"];
             mapPreviewImg.style.backgroundImage = `url('${bgUrl}')`;
             mapPreviewImg.dataset.location = selectedCity;
        }
        updateSummary();
    }

    function populateAreas() {
        const cityValue = citySelect.options[citySelect.selectedIndex].text;
        const areas = cityAreas[cityValue] || [];
        
        areaInput.innerHTML = '<option value="" disabled selected>Select Area</option>';
        if (areas.length > 0) {
            areaInput.disabled = false;
            areas.forEach(area => {
                const opt = document.createElement("option");
                opt.value = area;
                opt.textContent = area;
                areaInput.appendChild(opt);
            });
        } else {
            areaInput.disabled = true;
        }
        
        selectedArea = "";
        updateLocation();
    }

    citySelect.addEventListener("change", populateAreas);
    areaInput.addEventListener("change", updateLocation);

    // Initial synch
    populateAreas();

    // --- Capacity card selection ---
    capacityCards.forEach(card => {
        card.addEventListener("click", () => {
            // Deactivate all
            capacityCards.forEach(c => {
                c.classList.remove("border-primary", "bg-primary/5", "dark:bg-primary/10",
                                   "text-primary", "ring-1", "ring-primary/20", "scale-105", "shadow-lg");
                c.classList.add("border-slate-200", "dark:border-slate-800", "bg-transparent",
                                "text-slate-900", "dark:text-slate-300");
                c.style.transform = "scale(1)";
            });
            // Activate selected
            card.classList.remove("border-slate-200", "dark:border-slate-800", "bg-transparent",
                                  "text-slate-900", "dark:text-slate-300");
            card.classList.add("border-primary", "bg-primary/5", "dark:bg-primary/10",
                               "text-primary", "ring-1", "ring-primary/20", "shadow-lg");
            card.style.transform = "scale(1.04)";
            selectedCapacity = card.getAttribute("data-capacity");
            updateSummary();
        });
        
        // Hover effects
        card.addEventListener("mouseenter", () => { if(selectedCapacity !== card.getAttribute("data-capacity")) card.style.transform = "scale(1.02)"; });
        card.addEventListener("mouseleave", () => { if(selectedCapacity !== card.getAttribute("data-capacity")) card.style.transform = "scale(1)"; });
    });

    // --- Time slot selection ---
    timeSlotBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            // Skip disabled / past slots
            if (btn.disabled || btn.classList.contains("cursor-not-allowed")) return;

            // Deactivate all available slots
            timeSlotBtns.forEach(b => {
                if (!b.disabled && !b.classList.contains("cursor-not-allowed")) {
                    b.classList.remove("border-primary", "btn-gradient", "text-white",
                                       "shadow-lg", "shadow-primary/20", "-translate-y-1");
                    b.classList.add("border-slate-200", "dark:border-slate-700",
                                    "bg-white", "dark:bg-slate-800",
                                    "text-slate-700", "dark:text-slate-300");
                }
            });
            // Activate selected
            btn.classList.remove("border-slate-200", "dark:border-slate-700",
                                  "bg-white", "dark:bg-slate-800",
                                  "text-slate-700", "dark:text-slate-300");
            btn.classList.add("border-primary", "btn-gradient", "text-white",
                              "shadow-lg", "shadow-primary/20", "-translate-y-1");

            selectedTimeSlot = btn.getAttribute("data-time"); // e.g. "10:00 AM"
            updateSummary();
        });
        
        // Add subtle hover transition class
        if (!btn.disabled && !btn.classList.contains("cursor-not-allowed")) {
             btn.classList.add("transition-all", "duration-200");
        }
    });

    // --- Summary panel ---
    function updateSummary() {
        const cityFormatted = selectedCity
            ? selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1)
            : "";
        const areaFormatted = selectedArea ? `, ${selectedArea}` : "";
        summaryLocation.innerText = (cityFormatted + areaFormatted) || "Not selected";
        summaryCapacity.innerText = selectedCapacity ? `${selectedCapacity} Liters` : "Not selected";
        summaryTimeSlot.innerText = selectedTimeSlot
            ? `${selectedTimeSlot}`
            : "Not selected";
    }
    updateSummary();

    // --- Convert AM/PM display slot → backend timeslot format (HH:MM-HH:MM) ---
    const SLOT_MAP = {
        "06:00 AM": "06:00-08:00",
        "07:00 AM": "06:00-08:00",
        "08:00 AM": "08:00-10:00",
        "09:00 AM": "08:00-10:00",
        "10:00 AM": "10:00-12:00",
        "11:00 AM": "10:00-12:00",
        "12:00 PM": "12:00-14:00",
        "01:00 PM": "12:00-14:00",
        "02:00 PM": "14:00-16:00",
        "03:00 PM": "14:00-16:00",
        "04:00 PM": "16:00-18:00",
        "05:00 PM": "16:00-18:00",
    };

    // Converts a raw 24h time string (e.g. "10:00") → 2-hour slot ("10:00-12:00")
    function getTimeSlot(time) {
        const hour = parseInt(time.split(":")[0], 10);
        const start = hour % 2 === 0 ? hour : hour - 1;
        const end = start + 2;
        return `${String(start).padStart(2, "0")}:00-${String(end).padStart(2, "0")}:00`;
    }

    function toBackendTimeslot(displaySlot) {
        if (!displaySlot) return null;
        // 1. Try AM/PM map first (e.g. "10:00 AM" → "10:00-12:00")
        if (SLOT_MAP[displaySlot]) return SLOT_MAP[displaySlot];
        // 2. If already in backend format HH:MM-HH:MM, pass through
        if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(displaySlot)) return displaySlot;
        // 3. Fallback: raw HH:MM string → compute 2-hour slot
        if (/^\d{1,2}:\d{2}$/.test(displaySlot)) return getTimeSlot(displaySlot);
        return displaySlot;
    }

    // --- Submit / navigate to results ---
    function handleSubmit(e) {
        e.preventDefault();

        if (!selectedArea) {
            alert("Please select an Area / Locality.");
            return;
        }
        if (!selectedCapacity) {
            alert("Please select a Tanker Capacity.");
            return;
        }
        if (!selectedTimeSlot) {
            alert("Please select a Time Slot.");
            return;
        }

        const backendTimeslot = toBackendTimeslot(selectedTimeSlot);

        // Persist all selections
        sessionStorage.setItem("city",     selectedCity);
        sessionStorage.setItem("area",     selectedArea);
        sessionStorage.setItem("capacity", selectedCapacity);
        sessionStorage.setItem("timeSlot", backendTimeslot); // backend format
        sessionStorage.setItem("timeSlotDisplay", selectedTimeSlot); // display format for payment page

        window.location.href = "results.html";
    }

    if (submitBtnDesktop) submitBtnDesktop.addEventListener("click", handleSubmit);
    if (submitBtnMobile)  submitBtnMobile.addEventListener("click", handleSubmit);
});
