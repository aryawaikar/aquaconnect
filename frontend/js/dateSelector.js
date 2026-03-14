// dateSelector.js — manages date picker, updates UI label, disables past time slots
document.addEventListener("DOMContentLoaded", () => {
    const dateLabel = document.getElementById("dateLabel");
    const datePicker = document.getElementById("datePicker");
    const timeSlotBtns = document.querySelectorAll(".time-slot");

    if (!dateLabel || !datePicker) return;

    // --- Date constraints: today or later only ---
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    datePicker.min = todayStr;
    datePicker.value = todayStr; // default to today

    let isToday = true;

    // Restore saved date from sessionStorage (key = "date")
    const savedDate = sessionStorage.getItem("date");
    if (savedDate) {
        dateLabel.innerText = savedDate;
        // Check if saved label is today
        isToday = savedDate.startsWith("Today");
    } else {
        // Default: show "Today, DD Mon"
        const defaultLabel = "Today, " + today.toLocaleString('en-US', { day: 'numeric', month: 'short' });
        dateLabel.innerText = defaultLabel;
        sessionStorage.setItem("date", defaultLabel); // persist on first load
    }

    // --- Helpers ---
    function isSameDate(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    function isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return isSameDate(date, tomorrow);
    }

    function formatDateLabel(dateObj) {
        if (isSameDate(dateObj, new Date())) {
            isToday = true;
            return "Today, " + dateObj.toLocaleString('en-US', { day: 'numeric', month: 'short' });
        } else if (isTomorrow(dateObj)) {
            isToday = false;
            return "Tomorrow, " + dateObj.toLocaleString('en-US', { day: 'numeric', month: 'short' });
        } else {
            isToday = false;
            return dateObj.toLocaleString('en-US', { weekday: 'short' }) + ", " +
                   dateObj.toLocaleString('en-US', { day: 'numeric', month: 'short' });
        }
    }

    // --- Time slot availability ---
    function disableSlot(btn) {
        btn.disabled = true;
        btn.classList.add("cursor-not-allowed", "line-through", "text-slate-400", "pointer-events-none");
        btn.classList.remove("hover:border-primary", "transition-colors", "text-slate-700", "dark:text-slate-300");
    }

    function enableSlot(btn) {
        btn.disabled = false;
        btn.classList.remove("cursor-not-allowed", "line-through", "text-slate-400", "pointer-events-none");
        if (!btn.classList.contains("bg-primary")) {
            btn.classList.add("text-slate-700", "dark:text-slate-300", "hover:border-primary", "transition-colors");
        }
    }

    function unselectSlot(btn) {
        btn.classList.remove("border-primary", "bg-primary", "text-white", "shadow-lg", "shadow-primary/20");
        btn.classList.add("border-slate-200", "dark:border-slate-700", "bg-white", "dark:bg-slate-800",
                          "text-slate-700", "dark:text-slate-300");
    }

    function clearAllSelectedSlots() {
        timeSlotBtns.forEach(b => unselectSlot(b));
        if (window.resetSelectedTimeSlot) window.resetSelectedTimeSlot();
    }

    function updateTimeSlotsAvailability() {
        const now = new Date();
        const currentHour24 = now.getHours();

        timeSlotBtns.forEach(btn => {
            const timeRaw = btn.getAttribute("data-time"); // e.g. "10:00 AM"
            if (!timeRaw) return;

            const [timeStr, ampm] = timeRaw.split(' ');
            let [hourStr] = timeStr.split(':');
            let hour24 = parseInt(hourStr, 10);
            if (ampm === "PM" && hour24 !== 12) hour24 += 12;
            if (ampm === "AM" && hour24 === 12) hour24 = 0;

            if (isToday) {
                if (hour24 <= currentHour24) {
                    disableSlot(btn);
                    // If this was selected, deselect it
                    if (btn.classList.contains("bg-primary")) {
                        unselectSlot(btn);
                        if (window.resetSelectedTimeSlot) window.resetSelectedTimeSlot();
                    }
                } else {
                    enableSlot(btn);
                }
            } else {
                enableSlot(btn);
            }
        });
    }

    // --- Date picker change ---
    datePicker.addEventListener("change", (e) => {
        if (!e.target.value) return;

        const [year, month, day] = e.target.value.split('-');
        const selectedDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        const newLabel = formatDateLabel(selectedDateObj);
        dateLabel.innerText = newLabel;
        // Bug fix #2: store under key "date" (not "selectedDate")
        sessionStorage.setItem("date", newLabel);

        clearAllSelectedSlots();
        updateTimeSlotsAvailability();
    });

    // Click on label also opens the date picker
    dateLabel.addEventListener("click", () => {
        datePicker.showPicker && datePicker.showPicker();
    });

    // Run on load
    updateTimeSlotsAvailability();

    // Auto-update every minute in case an hour clicks over while on the page
    setInterval(() => {
        if (isToday) updateTimeSlotsAvailability();
    }, 60000);
});
