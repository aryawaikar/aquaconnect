/**
 * userAuthFlow.js
 * Login / Registration interaction for login.html.
 *
 * Login flow  (Continue as User):
 *   — Single "Phone or Email" smart input
 *   — 10-digit phone OR valid email → session created → redirect to search.html
 *   — No OTP required (demo mode)
 *
 * Register flow (Register Account):
 *   Full name / phone / email / address → POST /api/v1/users/register
 */

document.addEventListener("DOMContentLoaded", () => {
    const loginUserBtn      = document.getElementById("loginUserBtn");
    const continueUserBtn   = document.getElementById("continueUserBtn");
    const userCardContainer = document.getElementById("userCardContainer");

    if (!userCardContainer) return;

    const API_BASE = "http://localhost:8001/api/v1";

    // ── Detect whether a string is email or phone ─────────────────────────────
    function detectType(val) {
        return val.includes("@") ? "email" : "phone";
    }

    // ── Validate the smart input ──────────────────────────────────────────────
    function validateInput(val) {
        if (!val) return { ok: false, msg: "Please enter your phone number or email." };
        if (detectType(val) === "phone") {
            if (!/^\d{10}$/.test(val)) return { ok: false, msg: "Enter a valid 10-digit phone number." };
        } else {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return { ok: false, msg: "Enter a valid email address." };
        }
        return { ok: true };
    }

    // ── Create a temporary guest session and redirect ─────────────────────────
    function loginAs(val) {
        const type = detectType(val);
        const session = {
            id:    Math.floor(Math.random() * 9_000_000) + 1_000_000,
            name:  "Guest User",
            phone: type === "phone" ? val : "",
            email: type === "email" ? val : "",
        };
        sessionStorage.setItem("aquaUser", JSON.stringify(session));
        sessionStorage.setItem("userPhone", session.phone);
        sessionStorage.setItem("userEmail", session.email);
        window.location.href = "search.html";
    }

    // ── Inject shared styles once ─────────────────────────────────────────────
    if (!document.getElementById("authFlowStyles")) {
        const s = document.createElement("style");
        s.id = "authFlowStyles";
        s.textContent = `
            /* Input wrapper — relative so icon can be positioned inside */
            .aq-wrap {
                position: relative;
                display: flex;
                align-items: center;
            }

            /* Icon pinned to the left — never overlaps text */
            .aq-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                font-family: 'Material Symbols Outlined';
                font-size: 18px;
                color: rgba(148, 163, 184, 0.55);
                pointer-events: none;
                user-select: none;
                line-height: 1;
                transition: color 0.2s;
            }
            .aq-wrap:focus-within .aq-icon { color: rgba(139, 92, 246, 0.85); }

            /* The input — left-padded so text never sits under the icon */
            .aq-input {
                width: 100%;
                height: 48px;
                /* 14px left gap + 18px icon + 8px gap = 40px safe start */
                padding: 0 3rem 0 2.75rem;
                border-radius: 0.875rem;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #e2e8f0;
                font-size: 0.9375rem;
                font-family: Inter, sans-serif;
                outline: none;
                box-sizing: border-box;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .aq-input::placeholder { color: rgba(148, 163, 184, 0.50); }
            .aq-input:focus {
                border-color: rgba(99, 102, 241, 0.65);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18), 0 0 18px rgba(99, 102, 241, 0.10);
            }

            /* Auto-detected type badge inside the input on the right */
            .aq-badge {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 0.65rem;
                font-weight: 700;
                letter-spacing: 0.06em;
                padding: 2px 7px;
                border-radius: 9999px;
                background: rgba(99, 102, 241, 0.22);
                color: rgba(165, 180, 252, 0.9);
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .aq-badge.show { opacity: 1; }

            /* Inline feedback / error */
            .aq-error {
                font-size: 0.8125rem;
                color: #f87171;
                text-align: center;
                min-height: 1rem;
                opacity: 0;
                transition: opacity 0.2s;
            }

            /* Gradient primary button */
            .aq-btn-primary {
                width: 100%;
                height: 48px;
                border-radius: 0.875rem;
                border: none;
                cursor: pointer;
                font-size: 0.9375rem;
                font-weight: 700;
                font-family: Inter, sans-serif;
                color: #fff;
                background: linear-gradient(135deg, #3B82F6, #8B5CF6, #06B6D4);
                background-size: 200% 200%;
                transition: box-shadow 0.22s, transform 0.18s, opacity 0.18s, background-position 0.3s;
                box-shadow: 0 4px 18px rgba(99, 102, 241, 0.22);
            }
            .aq-btn-primary:not(:disabled):hover {
                box-shadow: 0 6px 26px rgba(99, 102, 241, 0.42);
                transform: translateY(-2px);
                background-position: right center;
            }
            .aq-btn-primary:disabled {
                opacity: 0.35;
                cursor: not-allowed;
                box-shadow: none;
                transform: none;
            }

            /* Ghost back button */
            .aq-btn-ghost {
                width: 100%;
                height: 36px;
                border: none;
                background: transparent;
                color: rgba(148, 163, 184, 0.6);
                font-size: 0.8125rem;
                font-weight: 500;
                font-family: Inter, sans-serif;
                cursor: pointer;
                border-radius: 0.5rem;
                transition: color 0.18s;
            }
            .aq-btn-ghost:hover { color: #e2e8f0; }

            /* Textarea and plain inputs for registration */
            .aq-input-plain {
                width: 100%;
                height: 46px;
                padding: 0 1rem;
                border-radius: 0.875rem;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #e2e8f0;
                font-size: 0.9rem;
                font-family: Inter, sans-serif;
                outline: none;
                box-sizing: border-box;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .aq-input-plain::placeholder { color: rgba(148, 163, 184, 0.50); }
            .aq-input-plain:focus {
                border-color: rgba(99, 102, 241, 0.65);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
            }
            .aq-textarea {
                width: 100%;
                min-height: 70px;
                padding: 0.75rem 1rem;
                border-radius: 0.875rem;
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #e2e8f0;
                font-size: 0.9rem;
                font-family: Inter, sans-serif;
                outline: none;
                resize: none;
                box-sizing: border-box;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .aq-textarea::placeholder { color: rgba(148, 163, 184, 0.50); }
            .aq-textarea:focus {
                border-color: rgba(99, 102, 241, 0.65);
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
            }

            /* Fade-in for injected content */
            @keyframes aqFadeUp {
                from { opacity: 0; transform: translateY(10px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .aq-fade { animation: aqFadeUp 0.28s ease forwards; }
        `;
        document.head.appendChild(s);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLOW 1 — "Continue as User" → Direct login (demo mode)
    // ─────────────────────────────────────────────────────────────────────────
    if (continueUserBtn) {
        continueUserBtn.addEventListener("click", () => {
            userCardContainer.innerHTML = `
                <div class="aq-fade" style="display:flex;flex-direction:column;gap:12px;">
                    <div style="position:relative;display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                             style="position:absolute;left:13px;top:50%;transform:translateY(-50%);
                                    width:18px;height:18px;fill:rgba(148,163,184,0.55);
                                    pointer-events:none;flex-shrink:0;z-index:1;"
                             aria-hidden="true">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                        <input
                            id="smartInput"
                            class="aq-input"
                            type="text"
                            placeholder="Phone number or Email"
                            autocomplete="off"
                            maxlength="100"
                            style="padding-left:44px;"
                        >
                        <span id="typeBadge" class="aq-badge"></span>
                    </div>
                    <p id="formError" class="aq-error"></p>
                    <button id="loginContinueBtn" class="aq-btn-primary" disabled>Continue &#8594;</button>
                    <button id="backBtn" class="aq-btn-ghost" type="button">&#8592; Back</button>
                </div>
            `;

            const smartInput       = document.getElementById("smartInput");
            const typeBadge        = document.getElementById("typeBadge");
            const loginContinueBtn = document.getElementById("loginContinueBtn");
            const backBtn          = document.getElementById("backBtn");
            const formError        = document.getElementById("formError");

            const showError = (msg) => { formError.textContent = msg; formError.style.opacity = "1"; };
            const clearError = () => { formError.textContent = ""; formError.style.opacity = "0"; };

            smartInput.focus();

            // Enable button and update badge whenever input changes
            smartInput.addEventListener("input", () => {
                clearError();
                const val = smartInput.value.trim();
                loginContinueBtn.disabled = val.length === 0;

                if (val.length > 0) {
                    const type = detectType(val);
                    typeBadge.textContent = type === "email" ? "EMAIL" : "PHONE";
                    typeBadge.classList.add("show");
                } else {
                    typeBadge.classList.remove("show");
                }
            });

            // Enter key = click Continue
            smartInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !loginContinueBtn.disabled) loginContinueBtn.click();
            });

            backBtn.addEventListener("click", () => location.reload());

            // Continue → validate → login
            loginContinueBtn.addEventListener("click", () => {
                const val = smartInput.value.trim();
                const check = validateInput(val);
                if (!check.ok) { showError(check.msg); return; }

                // Visual feedback before redirect
                loginContinueBtn.disabled = true;
                loginContinueBtn.textContent = "Logging in…";
                loginContinueBtn.style.opacity = "0.75";

                setTimeout(() => loginAs(val), 300);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FLOW 2 — "Register Account" → Full registration form
    // ─────────────────────────────────────────────────────────────────────────
    if (loginUserBtn) {
        loginUserBtn.addEventListener("click", () => {
            userCardContainer.innerHTML = `
                <div class="aq-fade" style="display:flex;flex-direction:column;gap:10px;">
                    <input id="regName"    class="aq-input-plain" type="text"  placeholder="Full Name"    autocomplete="name">
                    <input id="regPhone"   class="aq-input-plain" type="tel"   placeholder="Phone Number" autocomplete="tel" inputmode="tel" maxlength="10">
                    <input id="regEmail"   class="aq-input-plain" type="email" placeholder="Email Address" autocomplete="email">
                    <textarea id="regAddress" class="aq-textarea" placeholder="Home Address"></textarea>
                    <p id="formError" class="aq-error"></p>
                    <button id="regSubmitBtn" class="aq-btn-primary" disabled>Create Account →</button>
                    <button id="backBtnReg" class="aq-btn-ghost" type="button">← Back</button>
                </div>
            `;

            const regName    = document.getElementById("regName");
            const regPhone   = document.getElementById("regPhone");
            const regEmail   = document.getElementById("regEmail");
            const regAddress = document.getElementById("regAddress");
            const regSubmit  = document.getElementById("regSubmitBtn");
            const backBtnReg = document.getElementById("backBtnReg");
            const formError  = document.getElementById("formError");

            const showError  = (msg) => { formError.textContent = msg; formError.style.opacity = "1"; };
            const clearError = () => { formError.textContent = ""; formError.style.opacity = "0"; };

            regName.focus();

            const checkFields = () => {
                regSubmit.disabled = !(regName.value.trim() && regPhone.value.trim()
                                    && regEmail.value.trim() && regAddress.value.trim());
            };
            [regName, regPhone, regEmail, regAddress].forEach(el => el.addEventListener("input", checkFields));
            regAddress.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !regSubmit.disabled) { e.preventDefault(); regSubmit.click(); }
            });

            backBtnReg.addEventListener("click", () => location.reload());

            regSubmit.addEventListener("click", async () => {
                clearError();
                const name    = regName.value.trim();
                const phone   = regPhone.value.trim();
                const email   = regEmail.value.trim();
                const address = regAddress.value.trim();

                if (!name || !phone || !email || !address) { showError("Please fill out all fields."); return; }
                if (!/^\d{10}$/.test(phone))               { showError("Phone must be exactly 10 digits."); return; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError("Enter a valid email address."); return; }

                regSubmit.disabled = true;
                regSubmit.textContent = "Creating account…";

                try {
                    const res = await fetch(`${API_BASE}/users/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, phone, email, address, district: "New Delhi", city: "Delhi" })
                    });
                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.detail || "Registration failed.");
                    }
                    alert("Account created! You can now log in with your phone number.");
                    location.reload();
                } catch (err) {
                    showError(err.message);
                    regSubmit.disabled = false;
                    regSubmit.textContent = "Create Account →";
                }
            });
        });
    }
});
