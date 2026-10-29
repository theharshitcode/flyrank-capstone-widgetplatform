const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const {
  listSubmissions,
  getAnalytics,
} = require("../controllers/dashboardController");

const router = express.Router();

router.use(requireAuth);

router.get("/submissions", listSubmissions);
router.get("/analytics", getAnalytics);

module.exports = router;
