/**
 * branding.js
 * Handles the global tagline placement for AquaConnect.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Footer Tagline Logic
    const hiddenPages = ["payment.html", "tracking.html", "login.html"];
    const currentPage = window.location.pathname.split("/").pop() || "search.html";

    // Only add footer if not on hidden pages
    if (!hiddenPages.some(page => currentPage.includes(page))) {
        injectFooterTagline();
    }
});

/**
 * Injects a minimal branding footer at the bottom of the main content.
 */
function injectFooterTagline() {
    const footerExists = document.getElementById("aquaconnect-footer-tagline");
    if (footerExists) return;

    const tagline = document.createElement("div");
    tagline.id = "aquaconnect-footer-tagline";
    tagline.className = "w-full py-12 mt-auto flex justify-center items-center opacity-60 hover:opacity-100 transition-opacity duration-500";
    
    tagline.innerHTML = `
        <div class="flex flex-col items-center gap-2">
            <div class="h-px w-12 bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-2"></div>
            <p class="text-slate-500 dark:text-slate-400 font-medium tracking-[0.1em] text-xs uppercase flex items-center gap-3">
                Tap. Book. Flow. 
                <span class="text-slate-300 dark:text-slate-700 font-light">|</span> 
                <span class="text-primary/80">AquaConnect</span>
            </p>
        </div>
    `;

    // Attempt to inject into main container to ensure it scrolls with content
    const main = document.querySelector("main") || document.querySelector(".flex-1") || document.body;
    
    // If it's a flex container, we might need to adjust classes
    if (main.classList.contains("flex-col") || getComputedStyle(main).flexDirection === "column") {
        tagline.classList.add("mt-auto");
    }

    main.appendChild(tagline);
}
