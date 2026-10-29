const express = require("express");
const requireAuth = require("../middleware/authMiddleware");
const {
  createWidget,
  listWidgets,
  getWidget,
  updateWidget,
  deleteWidget,
} = require("../controllers/widgetController");

const router = express.Router();

router.use(requireAuth);

router.post("/", createWidget);
router.get("/", listWidgets);
router.get("/:id", getWidget);
router.put("/:id", updateWidget);
router.delete("/:id", deleteWidget);

module.exports = router;
