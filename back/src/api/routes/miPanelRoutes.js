const express = require("express");
const router = express.Router();
const { verMiPanel } = require("../controllers/miPanelController");
const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/mi-panel", requireAuth, verMiPanel);

module.exports = router;
