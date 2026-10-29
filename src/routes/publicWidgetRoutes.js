const express = require("express");
const cors = require("cors");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const { getPublicWidget } = require("../controllers/publicWidgetController");
const { createSubmission } = require("../controllers/submissionController");

const router = express.Router();

router.use(cors({
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 600,
}));

const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.params.id}`,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many submissions. Please try again later.",
    });
  },
});

router.get("/:id/config", getPublicWidget);
router.post("/:id/submissions", submissionLimiter, createSubmission);

module.exports = router;
