document.addEventListener("DOMContentLoaded", () => {
    // Inject global Navbar
    const currentPath = window.location.pathname;
    
    // Create Profile Modal Container
    const modalHtml = `
    <!-- Profile Edit Modal -->
    <div id="profileEditModal" class="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm opacity-0 invisible transition-all duration-300 flex items-center justify-center p-4">
        <div id="profileEditContent" class="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 transform translate-y-10 transition-transform duration-300 overflow-hidden">
            <div class="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Profile</h3>
                <button id="closeProfileModal" class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg p-1">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-5 space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Name</label>
                    <input type="text" id="editProfileName" class="w-full h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                    <input type="tel" id="editProfilePhone" class="w-full h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                    <input type="email" id="editProfileEmail" class="w-full h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary">
                </div>
            </div>
            <div class="p-5 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button id="cancelProfileBtn" class="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancel</button>
                <button id="saveProfileBtn" class="px-5 py-2.5 rounded-xl font-bold text-white btn-gradient">Save Changes</button>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Default User Data
    let userProfile = {
        name: sessionStorage.getItem('userName') || 'Arya Stark',
        phone: sessionStorage.getItem('userPhone') || '+91 9876543210',
        email: sessionStorage.getItem('userEmail') || 'arya.stark@example.com'
    };

    function updateProfileUI() {
        document.querySelectorAll('.profile-ui-name').forEach(el => el.textContent = userProfile.name);
        document.querySelectorAll('.profile-ui-phone').forEach(el => el.textContent = userProfile.phone);
        document.querySelectorAll('.profile-ui-email').forEach(el => el.textContent = userProfile.email);
    }
    updateProfileUI();

    // Modal logic
    const modal = document.getElementById("profileEditModal");
    const content = document.getElementById("profileEditContent");
    const closeBtn = document.getElementById("closeProfileModal");
    const cancelBtn = document.getElementById("cancelProfileBtn");
    const saveBtn = document.getElementById("saveProfileBtn");

    function openModal() {
        document.getElementById("editProfileName").value = userProfile.name;
        document.getElementById("editProfilePhone").value = userProfile.phone;
        document.getElementById("editProfileEmail").value = userProfile.email;
        modal.classList.remove("opacity-0", "invisible");
        content.classList.remove("translate-y-10");
        
        // ensure parent dropdowns close if any
        const pd = document.getElementById("profileDropdown");
        if(pd) {
             pd.classList.add("opacity-0", "invisible", "scale-95");
             pd.classList.remove("scale-100");
        }
    }

    function closeModal() {
        modal.classList.add("opacity-0", "invisible");
        content.classList.add("translate-y-10");
    }

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    
    saveBtn.addEventListener("click", () => {
        userProfile.name = document.getElementById("editProfileName").value;
        userProfile.phone = document.getElementById("editProfilePhone").value;
        userProfile.email = document.getElementById("editProfileEmail").value;
        
        sessionStorage.setItem('userName', userProfile.name);
        sessionStorage.setItem('userPhone', userProfile.phone);
        sessionStorage.setItem('userEmail', userProfile.email);
        
        updateProfileUI();
        closeModal();
    });

    // Make window.openProfileModal available globally
    window.openProfileModal = openModal;

    // Connect any Edit Profile buttons already existing or created
    document.addEventListener("click", (e) => {
        if(e.target.closest("#editProfileBtnAction") || (e.target.innerText && e.target.innerText.includes("Edit Profile"))) {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        }
    });
});
