require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const db = require("./db");

const app = express();

const allowedOrigins = [
  "https://deadmansgrill.vercel.app",
  "https://frontend-deamans-grill-9hletbob1.vercel.app",
  "https://frontend-deamans-grill.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests from browser + tools like Postman
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/register", async (req, res) => {
  const { first_name, last_name, email, phone, password } = req.body;

  if (!first_name || !last_name || !email || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const checkQuery = "SELECT id FROM users WHERE email = ?";

  db.query(checkQuery, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

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
        if (err) return res.status(500).json({ message: "Database error" });

        res.status(201).json({
          message: "User registered successfully",
          userId: result.insertId,
        });
      }
    );
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const query = "SELECT * FROM users WHERE email = ?";

  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
      },
    });
  });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
