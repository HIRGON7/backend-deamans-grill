require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();

/* =========================
   CORS FIX
   ========================= */

const allowedOrigins = [
  "https://deadmansgrill.vercel.app",
  "https://frontend-deamans-grill-9hletbob1.vercel.app",
  "https://frontend-deamans-grill.vercel.app",
];

// Manual CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow your Vercel domains + any Vercel preview deployment
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

  // If frontend sends cookies later, keep this.
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight request
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

/* =========================
   REGISTER
   ========================= */

app.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body;

    if (!first_name || !last_name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const checkQuery = "SELECT id FROM users WHERE email = ?";

    db.query(checkQuery, [email], async (err, results) => {
      if (err) {
        console.error("Register check database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length > 0) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertQuery = `
        INSERT INTO users (first_name, last_name, email, phone, password)
        VALUES (?, ?, ?, ?, ?)
      `;

      db.query(
        insertQuery,
        [first_name, last_name, email, phone, hashedPassword],
        (err, result) => {
          if (err) {
            console.error("Register insert database error:", err);
            return res.status(500).json({ message: "Database error" });
          }

          return res.status(201).json({
            message: "User registered successfully",
            userId: result.insertId,
          });
        }
      );
    });
  } catch (error) {
    console.error("Register server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   LOGIN
   ========================= */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const query = "SELECT * FROM users WHERE email = ?";

    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error("Login database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
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
    });
  } catch (error) {
    console.error("Login server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   START SERVER
   ========================= */

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
