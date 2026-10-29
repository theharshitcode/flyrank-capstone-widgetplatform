const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function register(req, res) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({
        error: "Provide a valid email and a password of 8–72 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email address." });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [normalizedEmail, passwordHash]
    );

    return res.status(201).json({
      message: "Account created successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email is already registered." });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `SELECT id, email, password_hash
       FROM users
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured.");
      return res.status(500).json({ error: "Server configuration error." });
    }

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = { register, login };
