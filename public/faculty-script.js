const API_URL = "http://localhost:3000";
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
  backBtn: document.getElementById("back-btn"),
  facultyPic: document.getElementById("faculty-pic"),
  facultyName: document.getElementById("faculty-name"),
  facultyBio: document.getElementById("faculty-bio"),
  facultyResearch: document.getElementById("faculty-research"),
  facultyQual: document.getElementById("faculty-qual"),
  facultyExp: document.getElementById("faculty-exp"),
  editBtn: document.getElementById("edit-btn"),
  editModal: document.getElementById("edit-modal"),
  editTitle: document.getElementById("edit-title"),
  profileForm: document.getElementById("profile-form"),
  exportPdf: document.getElementById("export-pdf"),
  closeEdit: document.getElementById("close-edit"),
  toastContainer: document.getElementById("toast-container"),
};

// State Variables
let currentUser = null;
let facultyId = null;
let currentProfile = null;
let toastTimeouts = [];

const urlParams = new URLSearchParams(window.location.search);
facultyId = urlParams.get("id"); // Get faculty ID from URL
console.log("Faculty ID from URL:", facultyId);

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

// Theme Management
if (elements.themeToggle) {
  elements.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    elements.themeToggle.innerHTML = `<i class="fas fa-${
      isDark ? "sun" : "moon"
    }"></i>`;
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
    elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

// Authentication
if (elements.loginBtn)
  elements.loginBtn.addEventListener("click", () =>
    elements.loginModal.classList.remove("hidden")
  );
if (elements.closeLogin)
  elements.closeLogin.addEventListener("click", () =>
    elements.loginModal.classList.add("hidden")
  );

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("token");
    elements.loginBtn.classList.remove("hidden");
    elements.logoutBtn.classList.add("hidden");
    elements.userStatus.innerHTML = "";
    elements.editBtn.classList.add("hidden");
    loadFacultyProfile();
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
        localStorage.setItem("token", data.token);
        elements.loginModal.classList.add("hidden");
        elements.loginBtn.classList.add("hidden");
        elements.logoutBtn.classList.remove("hidden");
        elements.userStatus.innerHTML = `<i class="fas fa-user"></i> ${currentUser.email} <span class="role-tag">${currentUser.role}</span>`;
        loadFacultyProfile();
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

// Load Faculty Profile
async function loadFacultyProfile() {
  if (!facultyId) {
    showToast("No faculty ID provided in URL", "error");
    console.error("No faculty ID provided in URL");
    if (elements.facultyName)
      elements.facultyName.textContent = "Invalid Profile";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/profiles/${facultyId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch profile: ${res.status} - ${errorText}`);
    }
    currentProfile = await res.json();
    console.log("Fetched faculty profile:", currentProfile);

    if (elements.facultyPic)
      elements.facultyPic.src = currentProfile.profile_pic
        ? `${API_URL}${currentProfile.profile_pic}?t=${Date.now()}`
        : "https://via.placeholder.com/150";
    if (elements.facultyName)
      elements.facultyName.textContent = currentProfile.name || "Unknown";
    if (elements.facultyBio)
      elements.facultyBio.textContent = currentProfile.bio || "Not provided";
    if (elements.facultyResearch)
      elements.facultyResearch.textContent =
        currentProfile.research || "Not provided";
    if (elements.facultyQual)
      elements.facultyQual.textContent =
        currentProfile.qualifications || "Not provided";
    if (elements.facultyExp)
      elements.facultyExp.textContent =
        currentProfile.experience || "Not provided";

    if (
      currentUser &&
      (currentUser.id === currentProfile.user_id.toString() ||
        currentUser.role === "manager")
    ) {
      elements.editBtn.classList.remove("hidden");
    } else {
      elements.editBtn.classList.add("hidden");
    }
  } catch (err) {
    showToast("Failed to load faculty profile: " + err.message, "error");
    console.error("Profile fetch error:", err);
    if (elements.facultyPic)
      elements.facultyPic.src = "https://via.placeholder.com/150";
    if (elements.facultyName)
      elements.facultyName.textContent = "Profile Not Found";
    if (elements.facultyBio) elements.facultyBio.textContent = "N/A";
    if (elements.facultyResearch) elements.facultyResearch.textContent = "N/A";
    if (elements.facultyQual) elements.facultyQual.textContent = "N/A";
    if (elements.facultyExp) elements.facultyExp.textContent = "N/A";
  }
}

// Edit Profile
if (elements.editBtn) {
  elements.editBtn.addEventListener("click", () => {
    if (!currentUser) {
      showToast("Please login to edit this profile", "error");
      elements.loginModal.classList.remove("hidden");
      return;
    }
    if (
      currentUser.id !== currentProfile.user_id.toString() &&
      currentUser.role !== "manager"
    ) {
      showToast("Unauthorized: You can only edit your own profile", "error");
      return;
    }
    if (!currentProfile) return showToast("No profile data available", "error");
    elements.editModal.classList.remove("hidden");
    elements.editTitle.innerHTML = `<i class="fas fa-user-edit"></i> Edit IT Faculty Profile`;
    elements.profileForm.id.value = facultyId;
    elements.profileForm.name.value = currentProfile.name || "";
    elements.profileForm.bio.value = currentProfile.bio || "";
    elements.profileForm.research.value = currentProfile.research || "";
    elements.profileForm.qualifications.value =
      currentProfile.qualifications || "";
    elements.profileForm.experience.value = currentProfile.experience || "";
    elements.profileForm.profile_pic.value = "";
  });
}

if (elements.profileForm) {
  elements.profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast("Please login to save changes", "error");
      elements.loginModal.classList.remove("hidden");
      return;
    }
    if (
      currentUser.id !== currentProfile.user_id.toString() &&
      currentUser.role !== "manager"
    ) {
      showToast("Unauthorized: You can only edit your own profile", "error");
      return;
    }
    const formData = new FormData(elements.profileForm);
    console.log("Sending update request:", Array.from(formData.entries()));
    try {
      const res = await fetch(`${API_URL}/profiles/${facultyId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      const data = await res.json();
      console.log("Update response:", data);
      if (data.success) {
        elements.editModal.classList.add("hidden");
        currentProfile = data.profile;
        loadFacultyProfile();
        showToast(`Faculty profile updated: ${formData.get("name")}`);
      } else {
        showToast(`Failed to update faculty: ${data.message}`, "error");
      }
    } catch (err) {
      showToast("Server error during update: " + err.message, "error");
      console.error(err);
    }
  });
}

if (elements.closeEdit) {
  elements.closeEdit.addEventListener("click", () =>
    elements.editModal.classList.add("hidden")
  );
}

// Export to PDF
if (elements.exportPdf) {
  elements.exportPdf.addEventListener("click", () => {
    if (!currentProfile) {
      showToast("No faculty profile data available for export", "error");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("SSN IT Faculty Profile", 20, 20);
    doc.setFontSize(12);
    doc.text(`Name: ${currentProfile.name || "Unknown"}`, 20, 30);
    doc.text(`Bio: ${currentProfile.bio || "N/A"}`, 20, 40);
    doc.text(`Research Interests: ${currentProfile.research || "N/A"}`, 20, 50);
    doc.text(
      `Qualifications: ${currentProfile.qualifications || "N/A"}`,
      20,
      60
    );
    doc.text(`Experience: ${currentProfile.experience || "N/A"}`, 20, 70);
    doc.save(`${currentProfile.name || "faculty"}_SSN.pdf`);
    showToast(`Exported PDF for ${currentProfile.name || "faculty"}`);
  });
}

// Back Button
if (elements.backBtn) {
  elements.backBtn.addEventListener("click", () => {
    window.location.href = `${API_URL}/index.html`;
  });
}

// Initial Load
async function initialize() {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const res = await fetch(`${API_URL}/profiles/${facultyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      currentProfile = data;
      currentUser = {
        id: data.user_id.toString(),
        email: localStorage.getItem("email") || "Unknown",
        role:
          data.user_id.toString() ===
          (await fetch(`${API_URL}/profiles`)
            .then((res) => res.json())
            .then(
              (profiles) =>
                profiles.find((p) => p.email === "admin@ssn.edu.in")?._id
            ))
            ? "manager"
            : "staff",
      };
      localStorage.setItem("email", currentUser.email);
      elements.logoutBtn.classList.remove("hidden");
      elements.loginBtn.classList.add("hidden");
      elements.userStatus.innerHTML = `<i class="fas fa-user"></i> ${currentUser.email} <span class="role-tag">${currentUser.role}</span>`;
    } catch (err) {
      console.error("Failed to initialize user:", err);
      currentUser = null;
      localStorage.removeItem("token");
      elements.loginBtn.classList.remove("hidden");
      elements.logoutBtn.classList.add("hidden");
    }
  }
  loadFacultyProfile();
}

initialize();
