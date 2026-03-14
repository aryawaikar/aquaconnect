document.addEventListener("DOMContentLoaded", () => {
    const styleId = "aquaconnect-global-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            /* === Global Animations === */
            @keyframes fadeInUp {
                0% { opacity: 0; transform: translateY(24px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
            .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            
            /* Add page transition to main bodies */
            body { animation: fadeIn 0.3s ease-out forwards; }

            /* === Glassmorphism card === */
            .glass-card {
                background: rgba(255,255,255,0.08); /* slight opacity bump per request */
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                border: 1px solid rgba(255,255,255,0.1);
                transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
            }
            .glass-card:hover {
                transform: translateY(-6px);
                box-shadow: 0 24px 60px rgba(19,127,236,0.18), 0 0 0 1px rgba(19,127,236,0.3);
                border-color: rgba(19, 127, 236, 0.35);
            }
            /* In light mode override */
            .light .glass-card, :root:not(.dark) .glass-card {
                background: rgba(255,255,255,0.85); /* a bit whiter for contrast */
                border: 1px solid rgba(19,127,236,0.12);
            }

            /* === Premium Gradient styling === text-gradient, bg-gradient... */
            .text-gradient {
                background: linear-gradient(135deg, #1e3a8a, #0ea5e9, #06b6d4); /* blue -> aqua -> cyan */
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            /* === Gradient buttons === */
            .btn-gradient {
                background: linear-gradient(135deg, #1e3a8a, #0ea5e9, #06b6d4); /* blue -> aqua -> cyan */
                background-size: 200% 200%;
                transition: box-shadow 0.2s ease, opacity 0.2s ease, background-position 0.3s ease, transform 0.15s ease;
            }
            .btn-gradient:hover {
                box-shadow: 0 0 22px rgba(99,102,241,0.5);
                background-position: right center;
                opacity: 0.95;
            }
            .btn-gradient:active, button:active {
                transform: scale(0.97);
            }

            /* === Icon circles === */
            .icon-circle {
                background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15));
                border: 1px solid rgba(99,102,241,0.2);
                transition: transform 0.22s ease, box-shadow 0.22s ease;
            }
            .group:hover .icon-circle {
                transform: scale(1.1);
                box-shadow: 0 8px 24px rgba(99,102,241,0.2);
            }

            /* Delay helpers */
            .delay-100 { animation-delay: 0.1s; }
            .delay-200 { animation-delay: 0.2s; }
            .delay-300 { animation-delay: 0.3s; }
        `;
        document.head.appendChild(style);
    }
});
