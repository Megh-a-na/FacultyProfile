# 👨‍🏫 Faculty Profile Management System

A lightweight web application built for managing and displaying faculty member profiles. This project streamlines how faculty data—such as qualifications, research, and academic contributions—is uploaded, stored, and presented, particularly useful for college departments and academic websites.

---

## 🚀 Project Overview

Many educational institutions still rely on static pages or manual updates for faculty profiles, leading to inefficiencies and inconsistent information.

This project provides:

- A **user-friendly frontend** to input and view faculty details.
- A **Node.js backend** with a SQLite database for persistence.
- Simple and modular **HTML/CSS/JS** frontend files.
- Image upload capability for faculty photographs.
- Organized directory structure for easy extension.

The current version is a **Minimum Viable Product (MVP)**, ideal for academic administrators or developers creating custom university systems.

---

## 🎯 Core Features

### 1. Faculty Profile Upload

- Admin can add profiles with:
  - Name, Designation, Department
  - Education, Experience, Awards, Publications
  - Image upload (stored in `server/uploads`)

### 2. Profile Display Interface

- A clean UI displays all uploaded faculty members.
- Details like qualifications and research areas shown on hover or click.
- Responsive design with basic CSS styling.

### 3. Backend Logic with Node.js

- Backend API built in `server.js`.
- Upload handling and form processing via Express.js.
- Uses `multer` for handling image uploads.
- SQLite database (`database.db`) stores faculty info.

### 4. Reset and Initialization Scripts

- SQL file (`reset_db.sql`) for initializing/resetting the database.
- Server logs and error handling via `server.log`.

---

## 🧱 Tech Stack

### Frontend

- **HTML / CSS / JavaScript**
- **Vanilla JS** for DOM manipulation
- No external libraries for frontend (lightweight and portable)

### Backend

- **Node.js + Express**
- **SQLite** for database
- **Multer** for image upload middleware

---

## 🗂️ Project Structure

```text
FacultyProfile-main/
├── public/                     # Frontend files
│   ├── index.html              # Main page
│   ├── faculty-profile.html    # Faculty display page
│   ├── faculty-script.js       # Script for profile display
│   ├── script.js               # Handles form interactions
│   ├── styles.css              # Styling
│   └── src/                    # Assets (e.g., logos, default images)
│
├── server/                     # Backend logic
│   ├── server.js               # Express server
│   ├── Bplus.py                # (Potential integration or unused)
│   ├── reset_db.sql            # Database schema reset script
│   ├── database.db             # SQLite DB storing profiles
│   ├── server.log              # Log file for debugging
│   └── uploads/                # Uploaded faculty images
│
├── package.json                # Node dependencies
├── package-lock.json           # Dependency tree
├── Procfile                    # For deployment (e.g., Heroku)
└── .vscode/                    # Editor configuration
```

---

## 🛠️ Installation Guide

Follow these steps to set up and run the Faculty Profile Management System locally on your machine.

### 📋 Prerequisites

Make sure the following software is installed on your system:

- [Node.js (v14 or later)](https://nodejs.org/)
- [npm (comes with Node.js)](https://www.npmjs.com/)
- [Git](https://git-scm.com/) (optional, for cloning the repo)

---

### 📥 1. Clone the Repository

```bash
git clone https://github.com/your-username/FacultyProfile-main.git
cd FacultyProfile-main
```

> Alternatively, you can download the ZIP and extract it manually.

---

### 📦 2. Install Dependencies

Navigate to the project root and install Node.js dependencies:

```bash
npm install
```

---

### 🛠️ 3. Initialize the Database

To set up the SQLite database with the required schema, run the SQL script:

#### Option A: Using SQLite CLI

If you have the SQLite command line installed:

```bash
sqlite3 server/database.db < server/reset_db.sql
```

#### Option B: Manually

You can also open `database.db` with any SQLite database browser and execute the SQL script found in `server/reset_db.sql`.

---

### 🚀 4. Run the Server

Start the Express server:

```bash
node server/server.js
```

By default, the server runs on **http://localhost:3000**

---

### 🌐 5. Access the Application

Open your browser and navigate to:

```
http://localhost:3000/public/index.html
```

Use this interface to add faculty profiles and view the listings.

---

### 🖼️ Image Upload Notes

Uploaded faculty images are stored in the `server/uploads/` directory. Ensure this folder exists and is writable by the server. It will be created automatically if it doesn’t exist.

---

### 🧪 Test and Debug

- Use your browser's developer tools for any frontend issues.
- Check `server/server.log` for backend logs and errors.

---

## 💡 Use Cases

- Academic department websites.
- Profile directories for research labs or administrative units.
- Quick-start template for university information systems.

---

## 🔮 Future Scope

- Role-based login for faculty/admins.
- Advanced search and filter by department or publication.
- Integration with external CV formats (e.g., ORCID, Google Scholar).
- Export to PDF or printable view.
- Admin dashboard for bulk editing or CSV import.
