// themeGlobal.js — runs on every page to persist dark/light theme via localStorage
(function () {
    // Apply theme BEFORE DOM paint to avoid flash of wrong theme
    const savedTheme = localStorage.getItem("theme") || "dark";
    // Persist default immediately so future pages pick it up
    if (!localStorage.getItem("theme")) {
        localStorage.setItem("theme", "dark");
    }
    if (savedTheme === "light") {
        document.documentElement.classList.remove("dark");
    } else {
        document.documentElement.classList.add("dark");
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    const themeBtn = document.getElementById("themeToggleBtn");

    function applyTheme(theme) {
        if (theme === "light") {
            document.documentElement.classList.remove("dark");
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
        } else {
            document.documentElement.classList.add("dark");
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
        }
        // Update the toggle button icon if present
        if (themeBtn) {
            const icon = themeBtn.querySelector(".material-symbols-outlined");
            if (icon) icon.textContent = theme === "light" ? "light_mode" : "dark_mode";
        }
    }

    // Apply persisted theme on every page load
    const currentTheme = localStorage.getItem("theme") || "dark";
    applyTheme(currentTheme);

    // Toggle handler — only attaches if the button exists on this page
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const newTheme = localStorage.getItem("theme") === "light" ? "dark" : "light";
            localStorage.setItem("theme", newTheme);
            applyTheme(newTheme);
        });
    }
});
