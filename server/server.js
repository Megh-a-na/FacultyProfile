const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");

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

// Database Schema and Initial Seeding
db.serialize(async () => {
  db.run("DROP TABLE IF EXISTS users");
  db.run("DROP TABLE IF EXISTS profiles");
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone_number TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('staff', 'manager'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      bio TEXT,
      profile_pic TEXT,
      qualifications TEXT,
      experience TEXT,
      research TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log("Seeding initial users for SSN College of Engineering...");
  const hashAdmin = await bcrypt.hash("admin123", 10);
  await db.run(
    "INSERT INTO users (email, password, phone_number, role) VALUES (?, ?, ?, ?)",
    ["admin@ssn.edu.in", hashAdmin, "1234567890", "manager"],
    (err) => {
      if (!err)
        console.log(
          "Seeded admin@ssn.edu.in / admin123 / 1234567890 (manager)"
        );
    }
  );
});

// Database Query Helpers
const runQuery = (query, params) =>
  new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

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
      {
        expiresIn: "1h",
      }
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

// Add Faculty (Manager Only)
app.post(
  "/profiles",
  authenticateToken,
  upload.single("profile_pic"),
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
      research,
      qualifications,
      experience,
    } = req.body;
    const profilePic = req.file ? `/uploads/${req.file.filename}` : null;

    console.log("Adding faculty:", { email, phone_number, name, profilePic });

    if (!email || !password || !phone_number || !name) {
      console.log("Missing required fields:", {
        email,
        password,
        phone_number,
        name,
      });
      return res.status(400).json({
        success: false,
        message: "Email, password, phone number, and name are required",
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
        "INSERT INTO profiles (user_id, name, bio, profile_pic, research, qualifications, experience) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          name,
          bio || "",
          profilePic || null,
          research || "",
          qualifications || "",
          experience || "",
        ]
      );
      const newProfile = await getQuery("SELECT * FROM profiles WHERE id = ?", [
        profileResult.lastID,
      ]);
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
  upload.single("profile_pic"),
  async (req, res) => {
    const { id } = req.params;
    const { name, bio, research, qualifications, experience } = req.body;
    const profilePic = req.file ? `/uploads/${req.file.filename}` : null;

    console.log("Update request:", {
      id,
      name,
      bio,
      profilePic,
      research,
      qualifications,
      experience,
    });

    if (!name) {
      console.log("Missing required field: name");
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }

    try {
      const profile = await getQuery(
        "SELECT user_id, profile_pic FROM profiles WHERE id = ?",
        [id]
      );
      if (!profile) {
        console.log(`Faculty profile not found: ${id}`);
        return res
          .status(404)
          .json({ success: false, message: "Profile not found" });
      }

      if (
        req.user.role !== "manager" &&
        req.user.id !== profile.user_id.toString()
      ) {
        console.log(
          `Unauthorized update by ${req.user.email} on profile ${id}`
        );
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Can only edit own profile",
        });
      }

      if (
        profilePic &&
        profile.profile_pic &&
        fs.existsSync(path.join(__dirname, profile.profile_pic))
      ) {
        fs.unlinkSync(path.join(__dirname, profile.profile_pic));
        console.log(
          `Deleted old faculty profile picture: ${profile.profile_pic}`
        );
      }

      const updateQuery = profilePic
        ? "UPDATE profiles SET name = ?, bio = ?, profile_pic = ?, research = ?, qualifications = ?, experience = ? WHERE id = ?"
        : "UPDATE profiles SET name = ?, bio = ?, research = ?, qualifications = ?, experience = ? WHERE id = ?";
      const params = profilePic
        ? [
            name,
            bio || "",
            profilePic,
            research || "",
            qualifications || "",
            experience || "",
            id,
          ]
        : [
            name,
            bio || "",
            research || "",
            qualifications || "",
            experience || "",
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

// Delete Profile (Manager Only)
app.delete("/profiles/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  if (req.user.role !== "manager") {
    console.log(`Unauthorized delete attempt by ${req.user.email}`);
    return res
      .status(403)
      .json({ success: false, message: "Manager access required" });
  }

  try {
    const profile = await getQuery(
      "SELECT profile_pic FROM profiles WHERE id = ?",
      [id]
    );
    if (!profile) {
      console.log(`Faculty profile not found: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    if (
      profile.profile_pic &&
      fs.existsSync(path.join(__dirname, profile.profile_pic))
    ) {
      fs.unlinkSync(path.join(__dirname, profile.profile_pic));
      console.log(`Deleted faculty profile picture: ${profile.profile_pic}`);
    }

    await runQuery("DELETE FROM profiles WHERE id = ?", [id]);
    await runQuery(
      "DELETE FROM users WHERE id = (SELECT user_id FROM profiles WHERE id = ?)",
      [id]
    );
    console.log(`Faculty profile deleted: ${id} by ${req.user.email}`);
    res.json({ success: true, message: "Profile deleted successfully" });
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
  if (!phone_number || !new_password) {
    return res.status(400).json({
      success: false,
      message: "Phone number and new password required",
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - SSN College of Engineering`);
});
