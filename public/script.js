const API_URL =
  window.location.hostname === "localhost" ? "http://localhost:3000" : "";
console.log("App running on:", API_URL);
const { jsPDF } = window.jspdf;

// DOM Elements
const elements = {
  themeToggle: document.getElementById("theme-toggle"),
  loginBtn: document.getElementById("login-btn"),
  logoutBtn: document.getElementById("logout-btn"),
  userStatus: document.getElementById("user-status"),
  loginModal: document.getElementById("login-modal"),
  loginForm: document.getElementById("login-form"),
  closeLogin: document.getElementById("close-login"),
  profileGrid: document.getElementById("profile-grid"),
  adminDashboard: document.getElementById("admin-dashboard"),
  addStaffBtn: document.getElementById("add-staff-btn"),
  adminProfiles: document.getElementById("admin-profiles"),
  editModal: document.getElementById("edit-modal"),
  editTitle: document.getElementById("edit-title"),
  profileForm: document.getElementById("profile-form"),
  exportPdf: document.getElementById("export-pdf"),
  closeEdit: document.getElementById("close-edit"),
  searchBar: document.getElementById("search-bar"),
  roleFilter: document.getElementById("role-filter"),
  resetFilters: document.getElementById("reset-filters"),
  toastContainer: document.getElementById("toast-container"),
  totalStaff: document.getElementById("total-staff"),
  forgotPasswordBtn: document.getElementById("forgot-password-btn"),
  forgotPasswordModal: document.getElementById("forgot-password-modal"),
  forgotPasswordForm: document.getElementById("forgot-password-form"),
  closeForgotPassword: document.getElementById("close-forgot-password"),
};

// State Variables
let currentUser = null;
let profiles = [];
let toastTimeouts = [];

// Utility Functions
const showToast = (message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fas fa-${
    type === "success" ? "check-circle" : "exclamation-circle"
  }"></i> ${message}`;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);
  const timeout = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  toastTimeouts.push(timeout);
};

// Validate Token
async function validateToken(token) {
  try {
    const res = await fetch(`${API_URL}/profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Token validation failed");
    return true;
  } catch (err) {
    console.error("Token validation error:", err);
    return false;
  }
}

// Fetch Current User Info
async function fetchCurrentUser(token) {
  try {
    const res = await fetch(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch user info");
    return await res.json();
  } catch (err) {
    console.error("Fetch user error:", err);
    return null;
  }
}

// Check and Refresh Token
async function checkToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    logout();
    return false;
  }
  const isValid = await validateToken(token);
  if (!isValid) {
    showToast("Session expired. Please log in again.", "error");
    logout();
    return false;
  }
  return true;
}

// Logout Function
function logout() {
  currentUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("email");
  elements.loginBtn.classList.remove("hidden");
  elements.logoutBtn.classList.add("hidden");
  elements.userStatus.innerHTML = "";
  elements.adminDashboard.classList.add("hidden");
  elements.profileGrid.classList.remove("hidden");
  loadProfiles();
}

// Theme Management
if (elements.themeToggle) {
  elements.themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-theme", elements.themeToggle.checked);
    localStorage.setItem(
      "theme",
      elements.themeToggle.checked ? "dark" : "light"
    );
  });

  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    elements.themeToggle.checked = true;
  }
}

// Authentication
if (elements.loginBtn) {
  elements.loginBtn.addEventListener("click", () =>
    elements.loginModal.classList.remove("hidden")
  );
}

if (elements.closeLogin) {
  elements.closeLogin.addEventListener("click", () =>
    elements.loginModal.classList.add("hidden")
  );
}

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener("click", () => {
    logout();
    showToast("Logged out successfully");
  });
}

if (elements.loginForm) {
  elements.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = elements.loginForm.email.value;
    const password = elements.loginForm.password.value;
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        currentUser.id = String(data.user.id); // Ensure ID consistency
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", data.user.email);
        elements.loginModal.classList.add("hidden");
        elements.loginBtn.classList.add("hidden");
        elements.logoutBtn.classList.remove("hidden");
        elements.userStatus.innerHTML = `<i class="fas fa-user"></i> ${currentUser.email} <span class="role-tag">${currentUser.role}</span>`;
        console.log("Logged in user:", currentUser);
        if (currentUser.role === "manager") {
          elements.adminDashboard.classList.remove("hidden");
          elements.profileGrid.classList.add("hidden");
          loadAdminProfiles();
        } else {
          loadProfiles();
        }
        showToast(`Welcome, ${currentUser.email}!`);
      } else {
        showToast("Login failed: " + data.message, "error");
      }
    } catch (err) {
      showToast("Server error during login: " + err.message, "error");
      console.error(err);
    }
  });
}

// Forgot Password (unchanged)
if (elements.forgotPasswordBtn) {
  elements.forgotPasswordBtn.addEventListener("click", () => {
    elements.loginModal.classList.add("hidden");
    elements.forgotPasswordModal.classList.remove("hidden");
  });
}

if (elements.closeForgotPassword) {
  elements.closeForgotPassword.addEventListener("click", () =>
    elements.forgotPasswordModal.classList.add("hidden")
  );
}

if (elements.forgotPasswordForm) {
  elements.forgotPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const phone_number = elements.forgotPasswordForm.phone_number.value;
    const new_password = elements.forgotPasswordForm.new_password.value;
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number, new_password }),
      });
      const data = await res.json();
      if (data.success) {
        elements.forgotPasswordModal.classList.add("hidden");
        showToast("Password reset successfully");
      } else {
        showToast("Reset failed: " + data.message, "error");
      }
    } catch (err) {
      showToast("Server error during reset: " + err.message, "error");
      console.error(err);
    }
  });
}

// Load Profiles (Public Access)
async function loadProfiles() {
  try {
    const res = await fetch(`${API_URL}/profiles`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch profiles");
    profiles = await res.json();
    console.log("Fetched profiles:", profiles);
    renderProfiles(profiles);
  } catch (err) {
    showToast("Failed to load profiles: " + err.message, "error");
    console.error(err);
  }
}

function renderProfiles(profileList) {
  elements.profileGrid.innerHTML = "";
  if (!profileList.length) {
    elements.profileGrid.innerHTML =
      '<div class="grid-placeholder">No IT faculty profiles found</div>';
    return;
  }
  profileList.forEach((profile) => {
    const card = document.createElement("div");
    card.className = "profile-card glassy";
    card.innerHTML = `
      <img src="${
        profile.profile_pic
          ? `${API_URL}${profile.profile_pic}?t=${Date.now()}`
          : "https://via.placeholder.com/150"
      }" alt="${profile.name}" class="profile-avatar">
      <h3>${profile.name || "Unknown"}</h3>
      <p><strong>Qualifications:</strong> ${profile.qualifications || "N/A"}</p>
      <p><strong>Experience:</strong> ${profile.experience || "N/A"}</p>
      <p>${
        profile.bio ? profile.bio.substring(0, 50) + "..." : "No bio available"
      }</p>
      <button class="btn glassy-btn btn-primary" onclick="window.location.href='faculty-profile.html?id=${
        profile.id
      }'">
        View Profile
      </button>
      ${
        currentUser &&
        currentUser.role === "staff" &&
        String(profile.user_id) === currentUser.id
          ? `<button class="btn glassy-btn btn-secondary" onclick="editProfile(${profile.id})">Edit</button>`
          : ""
      }
    `;
    elements.profileGrid.appendChild(card);
  });
}

// Load Admin Profiles (Authenticated Access)
async function loadAdminProfiles() {
  if (!(await checkToken())) return;
  try {
    const res = await fetch(`${API_URL}/profiles`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch profiles");
    profiles = await res.json();
    console.log("Fetched admin profiles:", profiles);
    elements.totalStaff.textContent = profiles.length;
    renderAdminProfiles(profiles);
  } catch (err) {
    showToast("Failed to load admin profiles: " + err.message, "error");
    console.error(err);
  }
}

function renderAdminProfiles(profileList) {
  elements.adminProfiles.innerHTML = "";
  profileList.forEach((profile) => {
    const card = document.createElement("div");
    card.className = "profile-card glassy";
    const canEdit =
      currentUser.role === "manager" ||
      (currentUser.role === "staff" &&
        String(profile.user_id) === currentUser.id);
    card.innerHTML = `
      <img src="${
        profile.profile_pic
          ? `${API_URL}${profile.profile_pic}?t=${Date.now()}`
          : "https://via.placeholder.com/150"
      }" alt="${profile.name}" class="profile-avatar">
      <h3>${profile.name || "Unknown"}</h3>
      <p><strong>Qualifications:</strong> ${profile.qualifications || "N/A"}</p>
      <p><strong>Experience:</strong> ${profile.experience || "N/A"}</p>
      <p>${
        profile.bio ? profile.bio.substring(0, 50) + "..." : "No bio available"
      }</p>
      <div class="profile-actions">
        <button class="btn glassy-btn btn-primary" onclick="viewProfile(${
          profile.id
        })">View</button>
        ${
          canEdit
            ? `<button class="btn glassy-btn btn-secondary" onclick="editProfile(${profile.id})">Edit</button>`
            : ""
        }
        ${
          currentUser.role === "manager"
            ? `<button class="btn glassy-btn btn-danger" onclick="deleteProfile(${profile.id})">Delete</button>`
            : ""
        }
      </div>
    `;
    elements.adminProfiles.appendChild(card);
  });
}

// View Profile
function viewProfile(id) {
  window.location.href = `faculty-profile.html?id=${id}`;
}

// Edit Profile
async function editProfile(id) {
  if (!(await checkToken())) return;
  const profile = profiles.find((p) => p.id === id);
  if (!profile) return showToast("Profile not found", "error");
  if (
    currentUser.role !== "manager" &&
    String(profile.user_id) !== currentUser.id
  ) {
    showToast("Unauthorized: You can only edit your own profile", "error");
    return;
  }
  console.log("Editing profile:", profile, "by user:", currentUser);
  elements.editModal.classList.remove("hidden");
  elements.editTitle.innerHTML = `<i class="fas fa-user-edit"></i> Edit Faculty Profile`;
  elements.profileForm.id.value = id;
  elements.profileForm.name.value = profile.name || "";
  elements.profileForm.bio.value = profile.bio || "";
  elements.profileForm.qualifications.value = profile.qualifications || "";
  elements.profileForm.experience.value = profile.experience || "";
  elements.profileForm.research.value = profile.research || "";
  elements.profileForm.profile_pic.value = "";
  elements.profileForm.tenth_cert.value = "";
  // Reset other file inputs (omitted for brevity)
  elements.profileForm.querySelector("#email-group").classList.add("hidden");
  elements.profileForm.querySelector("#password-group").classList.add("hidden");
  elements.profileForm.querySelector("#phone-group").classList.add("hidden");
}

// Delete Profile (Manager Only)
async function deleteProfile(id) {
  if (!(await checkToken())) return;
  if (currentUser.role !== "manager") {
    showToast("Unauthorized: Only managers can delete profiles", "error");
    return;
  }
  if (!confirm("Are you sure you want to delete this profile?")) return;
  try {
    const res = await fetch(`${API_URL}/profiles/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    const data = await res.json();
    if (data.success) {
      showToast("Profile deleted successfully");
      profiles = profiles.filter((p) => p.id !== id);
      loadAdminProfiles();
    } else {
      showToast("Failed to delete profile: " + data.message, "error");
    }
  } catch (err) {
    showToast("Server error during delete: " + err.message, "error");
    console.error(err);
  }
}

// Add/Edit Profile Form Submission
if (elements.profileForm) {
  elements.profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!(await checkToken())) return;
    const formData = new FormData(elements.profileForm);
    const id = formData.get("id");
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/profiles/${id}` : `${API_URL}/profiles`;

    if (id && currentUser.role !== "manager") {
      const profile = profiles.find((p) => p.id === parseInt(id));
      if (String(profile.user_id) !== currentUser.id) {
        showToast("Unauthorized: You can only edit your own profile", "error");
        return;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        elements.editModal.classList.add("hidden");
        if (currentUser.role === "manager") {
          loadAdminProfiles();
        } else {
          loadProfiles();
        }
        showToast(
          `Faculty ${id ? "updated" : "added"}: ${formData.get("name")}`
        );
      } else {
        showToast(
          `Failed to ${id ? "update" : "add"} faculty: ${data.message}`,
          "error"
        );
      }
    } catch (err) {
      showToast(
        `Server error during ${id ? "update" : "add"}: ${err.message}`,
        "error"
      );
      console.error(err);
    }
  });
}

// Add Staff (Manager Only)
if (elements.addStaffBtn) {
  elements.addStaffBtn.addEventListener("click", async () => {
    if (!(await checkToken())) return;
    if (!currentUser || currentUser.role !== "manager") {
      showToast("Only managers can add staff", "error");
      return;
    }
    elements.editModal.classList.remove("hidden");
    elements.editTitle.innerHTML = `<i class="fas fa-user-plus"></i> Add Faculty Profile`;
    elements.profileForm.reset();
    elements.profileForm.id.value = "";
    elements.profileForm
      .querySelector("#email-group")
      .classList.remove("hidden");
    elements.profileForm
      .querySelector("#password-group")
      .classList.remove("hidden");
    elements.profileForm
      .querySelector("#phone-group")
      .classList.remove("hidden");
    elements.profileForm.email.required = true;
    elements.profileForm.password.required = true;
    elements.profileForm.phone_number.required = true;
  });
}

// Export to PDF (unchanged)
if (elements.exportPdf) {
  elements.exportPdf.addEventListener("click", (e) => {
    e.preventDefault();
    const formData = new FormData(elements.profileForm);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("SSN IT Faculty Profile", 105, 20, { align: "center" });
    doc.setFontSize(12);
    const content = [
      `Name: ${formData.get("name") || "Unknown"}`,
      `Bio: ${formData.get("bio") || "N/A"}`,
      `Qualifications: ${formData.get("qualifications") || "N/A"}`,
      `Experience: ${formData.get("experience") || "N/A"}`,
      `Research Interests: ${formData.get("research") || "N/A"}`,
    ];
    let y = 40;
    content.forEach((line) => {
      const splitText = doc.splitTextToSize(line, 170);
      splitText.forEach((text) => {
        doc.text(text, 20, y);
        y += 10;
      });
    });
    doc.save(`${formData.get("name") || "faculty"}_SSN_Profile.pdf`);
    showToast(`Exported PDF for ${formData.get("name") || "faculty"}`);
  });
}

// Close Edit Modal
if (elements.closeEdit) {
  elements.closeEdit.addEventListener("click", () => {
    elements.editModal.classList.add("hidden");
    elements.profileForm.email.required = false;
    elements.profileForm.password.required = false;
    elements.profileForm.phone_number.required = false;
  });
}

// Filter Profiles (unchanged)
if (elements.searchBar)
  elements.searchBar.addEventListener("input", filterProfiles);
if (elements.roleFilter)
  elements.roleFilter.addEventListener("change", filterProfiles);
if (elements.resetFilters) {
  elements.resetFilters.addEventListener("click", () => {
    elements.searchBar.value = "";
    elements.roleFilter.value = "";
    renderProfiles(profiles);
  });
}

function filterProfiles() {
  const searchTerm = elements.searchBar.value.toLowerCase();
  const role = elements.roleFilter.value.toLowerCase();
  const filtered = profiles.filter((profile) => {
    const matchesSearch =
      profile.name.toLowerCase().includes(searchTerm) ||
      (profile.bio || "").toLowerCase().includes(searchTerm) ||
      (profile.qualifications || "").toLowerCase().includes(searchTerm) ||
      (profile.experience || "").toLowerCase().includes(searchTerm);
    const matchesRole = role
      ? (profile.experience || "").toLowerCase().includes(role) ||
        (profile.bio || "").toLowerCase().includes(role)
      : true;
    return matchesSearch && matchesRole;
  });
  renderProfiles(filtered);
}

// Initial Load
async function initialize() {
  const token = localStorage.getItem("token");
  if (token) {
    const isValid = await validateToken(token);
    if (isValid) {
      const userData = await fetchCurrentUser(token);
      if (userData) {
        currentUser = userData;
        currentUser.id = String(userData.id); // Ensure ID consistency
        console.log("Initialized user:", currentUser);
        try {
          const res = await fetch(`${API_URL}/profiles`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Failed to fetch profiles");
          profiles = await res.json();
          elements.loginBtn.classList.add("hidden");
          elements.logoutBtn.classList.remove("hidden");
          elements.userStatus.innerHTML = `<i class="fas fa-user"></i> ${currentUser.email} <span class="role-tag">${currentUser.role}</span>`;
          if (currentUser.role === "manager") {
            elements.adminDashboard.classList.remove("hidden");
            elements.profileGrid.classList.add("hidden");
            loadAdminProfiles();
          } else {
            loadProfiles();
          }
        } catch (err) {
          console.error("Failed to fetch profiles:", err);
          logout();
        }
      } else {
        logout();
      }
    } else {
      logout();
    }
  } else {
    loadProfiles(); // Public access
  }
}

initialize();
