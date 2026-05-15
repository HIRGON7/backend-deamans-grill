require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();
const pool = db.promise();

/* =========================
   CORS FIX
   ========================= */

const allowedOrigins = [
  "https://deadmansgrill.vercel.app",
  "https://frontend-deamans-grill-9hletbob1.vercel.app",
  "https://frontend-deamans-grill.vercel.app",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    origin.endsWith(".vercel.app");

  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json());

/* =========================
   TEST ROUTES
   ========================= */

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS test");

    return res.json({
      success: true,
      message: "Database connected",
      rows,
    });
  } catch (error) {
    console.error("DB TEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

/* =========================
   REGISTER
   ========================= */

app.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
      INSERT INTO users (first_name, last_name, email, phone, password)
      VALUES (?, ?, ?, ?, ?)
      `,
      [first_name, last_name, email, phone, hashedPassword]
    );

    return res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Register database/server error",
      error: error.message,
    });
  }
});

/* =========================
   LOGIN
   ========================= */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    if (!user.password) {
      console.error("LOGIN ERROR: User has no password column/value:", user);

      return res.status(500).json({
        message: "Password is missing in database",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login database/server error",
      error: error.message,
    });
  }
});

/* =========================
   START SERVER
   ========================= */

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
