const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const nodemailer = require("nodemailer");

// Email Configuration
const EMAIL_USER = process.env.EMAIL_USER || "ssnitfacultysystem@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "bbrl uydc tzwj uugh";

// Validate email configuration
if (!EMAIL_USER || !EMAIL_PASS) {
  console.error(
    "Email configuration is incomplete. Please check environment variables."
  );
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  secure: true,
  tls: {
    rejectUnauthorized: false,
  },
  maxConnections: 3,
  pool: true,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 3,
  debug: true, // Enable debug logs
});

// Function to clean up orphaned files with enhanced error handling
const cleanupOrphanedFiles = async () => {
  let filesDeleted = 0;
  let errors = [];
  try {
    console.log("Running orphaned files cleanup...");
    const uploadedFiles = await fs.promises.readdir(uploadDir);
    const dbFiles = await allQuery(
      "SELECT profile_pic, tenth_cert, twelfth_cert, appointment_order, joining_report, ug_degree, pg_ms_consolidated, phd_degree, journals_list, conferences_list, au_supervisor_letter, fdp_workshops_webinars, nptel_coursera, invited_talks, projects_sanction, consultancy, patent, community_cert, aadhar, pan FROM profiles",
      []
    );

    // Extract all file paths from database
    const dbFilePaths = new Set();
    dbFiles.forEach((profile) => {
      Object.values(profile).forEach((value) => {
        if (
          value &&
          typeof value === "string" &&
          value.startsWith("/uploads/")
        ) {
          dbFilePaths.add(path.basename(value));
        }
      });
    });

    // Check each file in uploads directory
    for (const file of uploadedFiles) {
      if (file === "placeholder.jpg") continue; // Skip placeholder

      if (!dbFilePaths.has(file)) {
        const filePath = path.join(uploadDir, file);
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up orphaned file: ${filePath}`);
      }
    }
    console.log("Orphaned files cleanup completed");
  } catch (err) {
    console.error("Error during orphaned files cleanup:", err);
  }
};

// Log email configuration status
console.log(`Email configuration using: ${EMAIL_USER}`);
if (!EMAIL_USER || !EMAIL_PASS) {
  console.warn(
    "Warning: Email credentials not properly set. Please check your configuration."
  );
}

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Email configuration error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Email Template Function
const getRegistrationEmailContent = (name, email, password) => {
  return {
    subject: "Welcome to SSN Faculty Profile System",
    text: `Dear ${name},

Your faculty profile has been created in the SSN Faculty Profile System.

Login Details:
Email: ${email}
Password: ${password}

Please login to complete your profile setup.

Best regards,
SSN Faculty Profile System`,
  };
};

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-very-secure-secret-key-1234567890";

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// File Upload Setup
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// SQLite Database
const dbPath = path.join(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Database connection error:", err);
  else console.log("Connected to SQLite database - SSN College of Engineering");
});

// Database Schema and Conditional Seeding
db.serialize(async () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone_number TEXT,
      role TEXT NOT NULL CHECK(role IN ('staff', 'manager'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      department TEXT NOT NULL DEFAULT 'IT',
      role TEXT NOT NULL DEFAULT 'Assistant Professor',
      bio TEXT,
      profile_pic TEXT,
      qualifications TEXT,
      experience TEXT,
      research TEXT,
      tenth_cert TEXT,
      twelfth_cert TEXT,
      appointment_order TEXT,
      joining_report TEXT,
      ug_degree TEXT,
      pg_ms_consolidated TEXT,
      phd_degree TEXT,
      journals_list TEXT,
      conferences_list TEXT,
      au_supervisor_letter TEXT,
      fdp_workshops_webinars TEXT,
      nptel_coursera TEXT,
      invited_talks TEXT,
      projects_sanction TEXT,
      consultancy TEXT,
      patent TEXT,
      community_cert TEXT,
      aadhar TEXT,
      pan TEXT,
      is_locked BOOLEAN DEFAULT FALSE,
      lock_expiry TEXT,
      edit_requested BOOLEAN DEFAULT FALSE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  const userCount = await new Promise((resolve) => {
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) {
        console.error("Error checking users table:", err);
        resolve(-1);
      } else {
        resolve(row.count);
      }
    });
  });

  if (userCount === 0) {
    console.log(
      "No users found, seeding initial data for SSN College of Engineering..."
    );
    try {
      const hashAdmin = await bcrypt.hash("admin123", 10);
      await runQuery(
        "INSERT INTO users (email, password, phone_number, role) VALUES (?, ?, ?, ?)",
        ["admin@ssn.edu.in", hashAdmin, "1234567890", "manager"],
        (err) => {
          if (!err)
            console.log(
              "Seeded admin@ssn.edu.in / admin123 / 1234567890 (manager)"
            );
          else console.error("Admin seeding error:", err);
        }
      );

      const hashStaff = await bcrypt.hash("mike789", 10);
      await runQuery(
        "INSERT INTO users (email, password, phone_number, role) VALUES (?, ?, ?, ?)",
        ["mike.lee@ssn.edu.in", hashStaff, "4445556666", "staff"],
        (err) => {
          if (!err)
            console.log(
              "Seeded mike.lee@ssn.edu.in / mike789 / 4445556666 (staff - IT)"
            );
          else console.error("Staff seeding error:", err);
        }
      );
      await runQuery(
        "INSERT INTO profiles (user_id, name, department, bio) VALUES (?, ?, ?, ?)",
        [2, "Dr. Mike Lee", "IT", "Information Technology Specialist"],
        (err) => {
          if (err) console.error("Profile seeding error:", err);
        }
      );
    } catch (err) {
      console.error("Seeding failed:", err);
    }
  } else {
    console.log("Users table already populated, skipping seeding.");
  }
});

// Database Query Helpers
const runQuery = (query, params, callback) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        if (callback) callback(err);
        reject(err);
      } else {
        if (callback) callback(null);
        resolve(this);
      }
    });
  });

// Helper function to delete file if it exists
const deleteFileIfExists = async (filePath) => {
  if (!filePath || !filePath.startsWith("/uploads/")) return;
  const fullPath = path.join(__dirname, filePath);
  try {
    await fs.promises.access(fullPath);
    await fs.promises.unlink(fullPath);
    console.log(`Deleted file: ${filePath}`);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`Error deleting file ${filePath}:`, err);
    }
  }
};

// Helper function to delete all profile files
const deleteProfileFiles = async (profile) => {
  const fileFields = [
    "profile_pic",
    "tenth_cert",
    "twelfth_cert",
    "appointment_order",
    "joining_report",
    "ug_degree",
    "pg_ms_consolidated",
    "phd_degree",
    "journals_list",
    "conferences_list",
    "au_supervisor_letter",
    "fdp_workshops_webinars",
    "nptel_coursera",
    "invited_talks",
    "projects_sanction",
    "consultancy",
    "patent",
    "community_cert",
    "aadhar",
    "pan",
  ];

  for (const field of fileFields) {
    if (profile[field]) {
      await deleteFileIfExists(profile[field]);
    }
  }
};

const getQuery = (query, params) =>
  new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const allQuery = (query, params) =>
  new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    console.log("No token provided");
    return res
      .status(401)
      .json({ success: false, message: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Invalid token:", err.message);
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// API Endpoints

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password required" });
  }
  try {
    const user = await getQuery("SELECT * FROM users WHERE email = ?", [email]);
    console.log("Login attempt for:", email, "User found:", user);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log(`Login failed: Invalid credentials for ${email}`);
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log(`User logged in: ${email}`);
    res.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Get Current User
app.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await getQuery(
      "SELECT id, email, role FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const profile = await getQuery(
      "SELECT id, name, is_locked, lock_expiry FROM profiles WHERE user_id = ?",
      [req.user.id]
    );
    console.log(`Fetched current user: ${req.user.email}`);
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profileId: profile?.id || null,
        name: profile?.name || null,
        is_locked: profile?.is_locked || false,
        lock_expiry: profile?.lock_expiry || null,
      },
    });
  } catch (err) {
    console.error("Fetch current user error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Get All Profiles (Public)
app.get("/profiles", async (req, res) => {
  try {
    const profiles = await allQuery("SELECT * FROM profiles", []);
    console.log("Fetched IT faculty profiles:", profiles.length, profiles);
    res.json(profiles);
  } catch (err) {
    console.error("Fetch profiles error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Get Single Profile (Public)
app.get("/profiles/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await getQuery("SELECT * FROM profiles WHERE id = ?", [id]);
    if (profile) {
      console.log(`Fetched IT faculty profile ${id}:`, profile);
      res.json(profile);
    } else {
      console.log(`IT faculty profile not found: ${id}`);
      res.status(404).json({ success: false, message: "Profile not found" });
    }
  } catch (err) {
    console.error("Fetch profile error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Delete Faculty Profile (Manager Only)
app.delete("/profiles/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "manager") {
    return res
      .status(403)
      .json({ success: false, message: "Manager access required" });
  }

  const { id } = req.params;
  try {
    // Get profile before deletion to access file paths
    const profile = await getQuery("SELECT * FROM profiles WHERE id = ?", [id]);
    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    // Get user_id for cascading delete
    const user_id = profile.user_id;

    // Delete all associated files with transaction-like behavior
    try {
      await deleteProfileFiles(profile);
      // Delete user (will cascade to profile due to foreign key)
      await runQuery("DELETE FROM users WHERE id = ?", [user_id]);
    } catch (err) {
      console.error("Error during profile deletion:", err);
      // Attempt to recover any partially deleted files
      throw new Error("Profile deletion failed: " + err.message);
    }

    console.log(`Deleted faculty profile ${id} and associated files`);
    res.json({
      success: true,
      message: "Faculty profile deleted successfully",
    });
  } catch (err) {
    console.error("Delete profile error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Add Faculty (Manager Only)
// Check if phone number exists
async function isPhoneNumberTaken(phone_number) {
  try {
    const user = await getQuery("SELECT id FROM users WHERE phone_number = ?", [
      phone_number,
    ]);
    return !!user;
  } catch (err) {
    console.error("Phone number check error:", err);
    return false;
  }
}

app.post(
  "/profiles",
  authenticateToken,
  async (req, res, next) => {
    const { phone_number } = req.body;
    if (await isPhoneNumberTaken(phone_number)) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number is already registered. Please use a different phone number.",
      });
    }
    next();
  },
  upload.fields([
    { name: "profile_pic", maxCount: 1 },
    { name: "tenth_cert", maxCount: 1 },
    { name: "twelfth_cert", maxCount: 1 },
    { name: "appointment_order", maxCount: 1 },
    { name: "joining_report", maxCount: 1 },
    { name: "ug_degree", maxCount: 1 },
    { name: "pg_ms_consolidated", maxCount: 1 },
    { name: "phd_degree", maxCount: 1 },
    { name: "journals_list", maxCount: 1 },
    { name: "conferences_list", maxCount: 1 },
    { name: "au_supervisor_letter", maxCount: 1 },
    { name: "fdp_workshops_webinars", maxCount: 1 },
    { name: "nptel_coursera", maxCount: 1 },
    { name: "invited_talks", maxCount: 1 },
    { name: "projects_sanction", maxCount: 1 },
    { name: "consultancy", maxCount: 1 },
    { name: "patent", maxCount: 1 },
    { name: "community_cert", maxCount: 1 },
    { name: "aadhar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  async (req, res) => {
    if (req.user.role !== "manager") {
      console.log(`Unauthorized add attempt by ${req.user.email}`);
      return res
        .status(403)
        .json({ success: false, message: "Manager access required" });
    }
    const {
      email,
      password,
      phone_number,
      name,
      bio,
      qualifications,
      experience,
      research,
    } = req.body;

    const files = req.files || {};
    const profilePic = files.profile_pic
      ? `/uploads/${files.profile_pic[0].filename}`
      : null;
    const tenthCert = files.tenth_cert
      ? `/uploads/${files.tenth_cert[0].filename}`
      : null;
    const twelfthCert = files.twelfth_cert
      ? `/uploads/${files.twelfth_cert[0].filename}`
      : null;
    const appointmentOrder = files.appointment_order
      ? `/uploads/${files.appointment_order[0].filename}`
      : null;
    const joiningReport = files.joining_report
      ? `/uploads/${files.joining_report[0].filename}`
      : null;
    const ugDegree = files.ug_degree
      ? `/uploads/${files.ug_degree[0].filename}`
      : null;
    const pgMsConsolidated = files.pg_ms_consolidated
      ? `/uploads/${files.pg_ms_consolidated[0].filename}`
      : null;
    const phdDegree = files.phd_degree
      ? `/uploads/${files.phd_degree[0].filename}`
      : null;
    const journalsList = files.journals_list
      ? `/uploads/${files.journals_list[0].filename}`
      : null;
    const conferencesList = files.conferences_list
      ? `/uploads/${files.conferences_list[0].filename}`
      : null;
    const auSupervisorLetter = files.au_supervisor_letter
      ? `/uploads/${files.au_supervisor_letter[0].filename}`
      : null;
    const fdpWorkshopsWebinars = files.fdp_workshops_webinars
      ? `/uploads/${files.fdp_workshops_webinars[0].filename}`
      : null;
    const nptelCoursera = files.nptel_coursera
      ? `/uploads/${files.nptel_coursera[0].filename}`
      : null;
    const invitedTalks = files.invited_talks
      ? `/uploads/${files.invited_talks[0].filename}`
      : null;
    const projectsSanction = files.projects_sanction
      ? `/uploads/${files.projects_sanction[0].filename}`
      : null;
    const consultancy = files.consultancy
      ? `/uploads/${files.consultancy[0].filename}`
      : null;
    const patent = files.patent ? `/uploads/${files.patent[0].filename}` : null;
    const communityCert = files.community_cert
      ? `/uploads/${files.community_cert[0].filename}`
      : null;
    const aadhar = files.aadhar ? `/uploads/${files.aadhar[0].filename}` : null;
    const pan = files.pan ? `/uploads/${files.pan[0].filename}` : null;

    console.log("Adding faculty:", { email, phone_number, name, profilePic });

    if (!email || !password || !name) {
      console.log("Missing required fields:", {
        email,
        password,
        name,
      });
      return res.status(400).json({
        success: false,
        message: "Email, password, and name are required",
      });
    }

    // Check if phone number is already taken
    if (phone_number && (await isPhoneNumberTaken(phone_number))) {
      console.log(`Phone number ${phone_number} is already registered`);
      return res.status(400).json({
        success: false,
        message:
          "This phone number is already registered. Please use a different phone number.",
      });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      const userResult = await runQuery(
        "INSERT INTO users (email, password, phone_number, role) VALUES (?, ?, ?, ?)",
        [email, hash, phone_number, "staff"]
      );
      const userId = userResult.lastID;

      const profileResult = await runQuery(
        "INSERT INTO profiles (user_id, name, department, bio, profile_pic, qualifications, experience, research, tenth_cert, twelfth_cert, appointment_order, joining_report, ug_degree, pg_ms_consolidated, phd_degree, journals_list, conferences_list, au_supervisor_letter, fdp_workshops_webinars, nptel_coursera, invited_talks, projects_sanction, consultancy, patent, community_cert, aadhar, pan, is_locked, lock_expiry, edit_requested) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          name,
          "IT",
          bio || "",
          profilePic || null,
          qualifications || "",
          experience || "",
          research || "",
          tenthCert || null,
          twelfthCert || null,
          appointmentOrder || null,
          joiningReport || null,
          ugDegree || null,
          pgMsConsolidated || null,
          phdDegree || null,
          journalsList || null,
          conferencesList || null,
          auSupervisorLetter || null,
          fdpWorkshopsWebinars || null,
          nptelCoursera || null,
          invitedTalks || null,
          projectsSanction || null,
          consultancy || null,
          patent || null,
          communityCert || null,
          aadhar || null,
          pan || null,
          false, //is_locked initially false
          null, //lock_expiry initially null
          false, //edit_requested initially false
        ]
      );
      const newProfile = await getQuery("SELECT * FROM profiles WHERE id = ?", [
        profileResult.lastID,
      ]);

      // Send registration email with improved retry mechanism
      let emailSent = false;
      let retryCount = 0;
      const maxRetries = 5;

      // Prepare email content
      const emailContent = getRegistrationEmailContent(name, email, password);

      const htmlContent = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to SSN Faculty Profile System</h2>
        <p>Dear ${name},</p>
        <p>Your faculty profile has been created in the SSN Faculty Profile System.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Login Details:</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p>Please login to complete your profile setup.</p>
        <p>Best regards,<br>SSN Faculty Profile System</p>
      </div>`;

      // Email sending function with retry logic
      const sendEmailWithRetry = async () => {
        while (!emailSent && retryCount < maxRetries) {
          try {
            const mailOptions = {
              from: `"SSN Faculty System" <${EMAIL_USER}>`,
              to: email,
              subject: emailContent.subject,
              text: emailContent.text,
              html: htmlContent,
              priority: "high",
              headers: {
                "X-Priority": "1",
                "X-MSMail-Priority": "High",
                Importance: "High",
              },
            };

            const info = await transporter.sendMail(mailOptions);
            emailSent = true;
            console.log(
              `Registration email sent successfully to ${email} on attempt ${
                retryCount + 1
              }. MessageID: ${info.messageId}`
            );
            return true;
          } catch (emailErr) {
            retryCount++;
            console.error(
              `Email sending attempt ${retryCount} failed for ${email}:`,
              emailErr.message
            );
            if (retryCount < maxRetries) {
              const delay = retryCount * 2000; // Increasing delay with each retry
              console.log(
                `Retrying email send to ${email} in ${delay / 1000} seconds...`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              console.error(
                `Failed to send email to ${email} after ${maxRetries} attempts. Last error: ${emailErr.message}`
              );
              return false;
            }
          }
        }
      };

      // Execute email sending
      await sendEmailWithRetry();

      console.log(
        `Faculty added: ${name} (ID: ${profileResult.lastID}) by ${req.user.email}`
      );
      res.json({
        success: true,
        profile: newProfile,
        message: "Faculty added successfully",
      });
    } catch (err) {
      console.error("Add faculty error:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error: " + err.message });
    }
  }
);

// Update Profile (Staff Own or Manager)
app.put(
  "/profiles/:id",
  authenticateToken,
  async (req, res, next) => {
    const { id } = req.params;

    try {
      const profile = await getQuery("SELECT * FROM profiles WHERE id = ?", [
        id,
      ]);
      if (!profile) {
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      }

      if (profile.is_locked) {
        const now = new Date();
        const expiry = new Date(profile.lock_expiry);

        if (now < expiry && req.user.role !== "manager") {
          return res.status(403).json({
            success: false,
            message:
              "Profile is locked. Please request edit access from admin.",
          });
        }

        if (now >= expiry) {
          await runQuery(
            "UPDATE profiles SET is_locked = TRUE, lock_expiry = NULL WHERE id = ?",
            [id]
          );
        }
      }
      next();
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Server error: " + err.message });
    }
  },
  upload.fields([
    { name: "profile_pic", maxCount: 1 },
    { name: "tenth_cert", maxCount: 1 },
    { name: "twelfth_cert", maxCount: 1 },
    { name: "appointment_order", maxCount: 1 },
    { name: "joining_report", maxCount: 1 },
    { name: "ug_degree", maxCount: 1 },
    { name: "pg_ms_consolidated", maxCount: 1 },
    { name: "phd_degree", maxCount: 1 },
    { name: "journals_list", maxCount: 1 },
    { name: "conferences_list", maxCount: 1 },
    { name: "au_supervisor_letter", maxCount: 1 },
    { name: "fdp_workshops_webinars", maxCount: 1 },
    { name: "nptel_coursera", maxCount: 1 },
    { name: "invited_talks", maxCount: 1 },
    { name: "projects_sanction", maxCount: 1 },
    { name: "consultancy", maxCount: 1 },
    { name: "patent", maxCount: 1 },
    { name: "community_cert", maxCount: 1 },
    { name: "aadhar", maxCount: 1 },
    { name: "pan", maxCount: 1 },
  ]),
  async (req, res) => {
    const { id } = req.params;
    const { name, bio, qualifications, experience, research } = req.body;

    const files = req.files || {};
    const profilePic = files.profile_pic
      ? `/uploads/${files.profile_pic[0].filename}`
      : null;
    const tenthCert = files.tenth_cert
      ? `/uploads/${files.tenth_cert[0].filename}`
      : null;
    const twelfthCert = files.twelfth_cert
      ? `/uploads/${files.twelfth_cert[0].filename}`
      : null;
    const appointmentOrder = files.appointment_order
      ? `/uploads/${files.appointment_order[0].filename}`
      : null;
    const joiningReport = files.joining_report
      ? `/uploads/${files.joining_report[0].filename}`
      : null;
    const ugDegree = files.ug_degree
      ? `/uploads/${files.ug_degree[0].filename}`
      : null;
    const pgMsConsolidated = files.pg_ms_consolidated
      ? `/uploads/${files.pg_ms_consolidated[0].filename}`
      : null;
    const phdDegree = files.phd_degree
      ? `/uploads/${files.phd_degree[0].filename}`
      : null;
    const journalsList = files.journals_list
      ? `/uploads/${files.journals_list[0].filename}`
      : null;
    const conferencesList = files.conferences_list
      ? `/uploads/${files.conferences_list[0].filename}`
      : null;
    const auSupervisorLetter = files.au_supervisor_letter
      ? `/uploads/${files.au_supervisor_letter[0].filename}`
      : null;
    const fdpWorkshopsWebinars = files.fdp_workshops_webinars
      ? `/uploads/${files.fdp_workshops_webinars[0].filename}`
      : null;
    const nptelCoursera = files.nptel_coursera
      ? `/uploads/${files.nptel_coursera[0].filename}`
      : null;
    const invitedTalks = files.invited_talks
      ? `/uploads/${files.invited_talks[0].filename}`
      : null;
    const projectsSanction = files.projects_sanction
      ? `/uploads/${files.projects_sanction[0].filename}`
      : null;
    const consultancy = files.consultancy
      ? `/uploads/${files.consultancy[0].filename}`
      : null;
    const patent = files.patent ? `/uploads/${files.patent[0].filename}` : null;
    const communityCert = files.community_cert
      ? `/uploads/${files.community_cert[0].filename}`
      : null;
    const aadhar = files.aadhar ? `/uploads/${files.aadhar[0].filename}` : null;
    const pan = files.pan ? `/uploads/${files.pan[0].filename}` : null;

    console.log("Update request:", { id, name, bio, profilePic });

    if (!name) {
      console.log("Missing required field: name");
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    try {
      const profile = await getQuery("SELECT * FROM profiles WHERE id = ?", [
        id,
      ]);
      if (!profile) {
        console.log(`Faculty profile not found: ${id}`);
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      }

      if (req.user.role !== "manager" && req.user.id !== profile.user_id) {
        console.log(
          `Unauthorized update by ${req.user.email} on profile ${id}`
        );
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Can only edit own profile",
        });
      }

      const oldFiles = [
        profile.profile_pic,
        profile.tenth_cert,
        profile.twelfth_cert,
        profile.appointment_order,
        profile.joining_report,
        profile.ug_degree,
        profile.pg_ms_consolidated,
        profile.phd_degree,
        profile.journals_list,
        profile.conferences_list,
        profile.au_supervisor_letter,
        profile.fdp_workshops_webinars,
        profile.nptel_coursera,
        profile.invited_talks,
        profile.projects_sanction,
        profile.consultancy,
        profile.patent,
        profile.community_cert,
        profile.aadhar,
        profile.pan,
      ];
      const newFiles = [
        profilePic,
        tenthCert,
        twelfthCert,
        appointmentOrder,
        joiningReport,
        ugDegree,
        pgMsConsolidated,
        phdDegree,
        journalsList,
        conferencesList,
        auSupervisorLetter,
        fdpWorkshopsWebinars,
        nptelCoursera,
        invitedTalks,
        projectsSanction,
        consultancy,
        patent,
        communityCert,
        aadhar,
        pan,
      ];
      oldFiles.forEach((oldFile, index) => {
        if (
          newFiles[index] &&
          oldFile &&
          fs.existsSync(path.join(__dirname, oldFile))
        ) {
          fs.unlinkSync(path.join(__dirname, oldFile));
          console.log(`Deleted old file: ${oldFile}`);
        }
      });

      const updateQuery = `
        UPDATE profiles SET 
          name = ?, department = 'IT', bio = ?, profile_pic = COALESCE(?, profile_pic), 
          qualifications = ?, experience = ?, research = ?,
          tenth_cert = COALESCE(?, tenth_cert), twelfth_cert = COALESCE(?, twelfth_cert),
          appointment_order = COALESCE(?, appointment_order), joining_report = COALESCE(?, joining_report),
          ug_degree = COALESCE(?, ug_degree), pg_ms_consolidated = COALESCE(?, pg_ms_consolidated),
          phd_degree = COALESCE(?, phd_degree), journals_list = COALESCE(?, journals_list),
          conferences_list = COALESCE(?, conferences_list), au_supervisor_letter = COALESCE(?, au_supervisor_letter),
          fdp_workshops_webinars = COALESCE(?, fdp_workshops_webinars), nptel_coursera = COALESCE(?, nptel_coursera),
          invited_talks = COALESCE(?, invited_talks), projects_sanction = COALESCE(?, projects_sanction),
          consultancy = COALESCE(?, consultancy), patent = COALESCE(?, patent),
          community_cert = COALESCE(?, community_cert), aadhar = COALESCE(?, aadhar),
          pan = COALESCE(?, pan), edit_requested = COALESCE(?, edit_requested)
        WHERE id = ?
      `;
      const params = [
        name,
        bio || "",
        profilePic,
        qualifications || "",
        experience || "",
        research || "",
        tenthCert,
        twelfthCert,
        appointmentOrder,
        joiningReport,
        ugDegree,
        pgMsConsolidated,
        phdDegree,
        journalsList,
        conferencesList,
        auSupervisorLetter,
        fdpWorkshopsWebinars,
        nptelCoursera,
        invitedTalks,
        projectsSanction,
        consultancy,
        patent,
        communityCert,
        aadhar,
        pan,
        false, //edit_requested
        id,
      ];

      await runQuery(updateQuery, params);
      const updatedProfile = await getQuery(
        "SELECT * FROM profiles WHERE id = ?",
        [id]
      );
      console.log(`Faculty profile updated: ${id}`, updatedProfile);
      res.json({
        success: true,
        profile: updatedProfile,
        message: "Profile updated successfully",
      });
    } catch (err) {
      console.error("Update profile error:", err);
      res
        .status(500)
        .json({ success: false, message: "Server error: " + err.message });
    }
  }
);

// Lock/Unlock All Profiles
app.post("/profiles/lock-all", authenticateToken, async (req, res) => {
  if (req.user.role !== "manager") {
    return res
      .status(403)
      .json({ success: false, message: "Manager access required" });
  }

  const { lock } = req.body;
  try {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    await runQuery(
      "UPDATE profiles SET is_locked = ?, lock_expiry = ? WHERE 1",
      [lock ? 1 : 0, lock ? expiry.toISOString() : null]
    );
    res.json({
      success: true,
      message: `All profiles ${lock ? "locked" : "unlocked"} successfully`,
    });
  } catch (err) {
    console.error("Lock/unlock all error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Edit Request
app.post("/profiles/:id/request-edit", authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await runQuery("UPDATE profiles SET edit_requested = TRUE WHERE id = ?", [
      id,
    ]);
    res.json({ success: true, message: "Edit request submitted" });
  } catch (err) {
    console.error("Edit request error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Approve Edit
app.post("/profiles/:id/approve-edit", authenticateToken, async (req, res) => {
  if (req.user.role !== "manager") {
    return res
      .status(403)
      .json({ success: false, message: "Manager access required" });
  }

  const { id } = req.params;
  try {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    await runQuery(
      "UPDATE profiles SET is_locked = FALSE, edit_requested = FALSE, lock_expiry = ? WHERE id = ?",
      [expiry.toISOString(), id]
    );
    res.json({ success: true, message: "Edit request approved" });
  } catch (err) {
    console.error("Approve edit error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Lock/Unlock Profile
app.post("/profiles/:id/lock", authenticateToken, async (req, res) => {
  if (req.user.role !== "manager") {
    return res
      .status(403)
      .json({ success: false, message: "Manager access required" });
  }

  const { id } = req.params;
  const { lock } = req.body;

  try {
    if (lock) {
      // Lock profile with 24-hour expiry
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 24);
      await runQuery(
        "UPDATE profiles SET is_locked = TRUE, lock_expiry = ? WHERE id = ?",
        [expiry.toISOString(), id]
      );
    } else {
      // Unlock profile
      await runQuery(
        "UPDATE profiles SET is_locked = FALSE, lock_expiry = NULL WHERE id = ?",
        [id]
      );
    }
    res.json({
      success: true,
      message: `Profile ${lock ? "locked" : "unlocked"} successfully`,
    });
  } catch (err) {
    console.error("Lock/unlock error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Delete Profile (Manager Only)
app.delete("/profiles/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "manager") {
    return res
      .status(403)
      .json({ success: false, message: "Manager access required" });
  }
  const { id } = req.params;

  // Use a transaction to ensure database consistency
  const dbTransaction = async () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.get(
          "SELECT * FROM profiles WHERE id = ?",
          [id],
          async (err, profile) => {
            if (err) {
              db.run("ROLLBACK");
              return reject(err);
            }

            if (!profile) {
              db.run("ROLLBACK");
              return reject(new Error("Profile not found"));
            }

            db.get(
              "SELECT * FROM users WHERE id = ?",
              [profile.user_id],
              async (err, user) => {
                if (err) {
                  db.run("ROLLBACK");
                  return reject(err);
                }

                if (!user) {
                  db.run("ROLLBACK");
                  return reject(new Error("User not found"));
                }

                // Delete database records first to maintain referential integrity
                db.run(
                  "DELETE FROM profiles WHERE id = ?",
                  [id],
                  async (err) => {
                    if (err) {
                      db.run("ROLLBACK");
                      return reject(err);
                    }

                    db.run(
                      "DELETE FROM users WHERE id = ?",
                      [profile.user_id],
                      async (err) => {
                        if (err) {
                          db.run("ROLLBACK");
                          return reject(err);
                        }

                        db.run("COMMIT", (err) => {
                          if (err) {
                            db.run("ROLLBACK");
                            return reject(err);
                          }
                          resolve({ profile, user });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  };

  try {
    // Execute transaction
    const { profile } = await dbTransaction();

    // After successful database deletion, clean up files
    const fileFields = [
      "profile_pic",
      "tenth_cert",
      "twelfth_cert",
      "appointment_order",
      "joining_report",
      "ug_degree",
      "pg_ms_consolidated",
      "phd_degree",
      "journals_list",
      "conferences_list",
      "au_supervisor_letter",
      "fdp_workshops_webinars",
      "nptel_coursera",
      "invited_talks",
      "projects_sanction",
      "consultancy",
      "patent",
      "community_cert",
      "aadhar",
      "pan",
    ];

    // Delete files asynchronously after database transaction completes
    const fileDeletePromises = [];
    for (const field of fileFields) {
      if (profile[field]) {
        // Fix file path construction - profile[field] already contains '/uploads/' prefix
        const filePath = path.join(__dirname, profile[field]);
        fileDeletePromises.push(
          fs.promises
            .unlink(filePath)
            .then(() => console.log(`Deleted file: ${filePath}`))
            .catch((err) =>
              console.warn(
                `Warning: Could not delete file ${filePath}:`,
                err.message
              )
            )
        );
      }
    }

    // Wait for all file deletions to complete
    await Promise.allSettled(fileDeletePromises);

    console.log(
      `Successfully deleted faculty profile ${id} and associated files`
    );
    res.json({
      success: true,
      message: "Profile and associated files deleted successfully",
    });
  } catch (err) {
    console.error("Delete profile error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Reset Password
app.post("/reset-password", async (req, res) => {
  const { phone_number, new_password } = req.body;
  if (!new_password) {
    return res.status(400).json({
      success: false,
      message: "New password is required",
    });
  }
  try {
    const user = await getQuery("SELECT id FROM users WHERE phone_number = ?", [
      phone_number,
    ]);
    if (!user) {
      console.log(
        `Reset password failed: No user found for phone ${phone_number}`
      );
      return res.status(404).json({
        success: false,
        message: "User not found with this phone number",
      });
    }
    const newHash = await bcrypt.hash(new_password, 10);
    await runQuery("UPDATE users SET password = ? WHERE id = ?", [
      newHash,
      user.id,
    ]);
    console.log(`Password reset for user with phone ${phone_number}`);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
});

// Start Server
// Run orphaned files cleanup on server start
cleanupOrphanedFiles();

// Schedule periodic cleanup every 24 hours
setInterval(cleanupOrphanedFiles, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - SSN College of Engineering`);
});
