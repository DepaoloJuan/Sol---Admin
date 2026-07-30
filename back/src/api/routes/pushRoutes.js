const express = require("express");
const router = express.Router();
const { getPublicKey, suscribir, desuscribir } = require("../controllers/pushController");
const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/push/public-key", requireAuth, getPublicKey);
router.post("/push/subscribe", requireAuth, suscribir);
router.post("/push/unsubscribe", requireAuth, desuscribir);

module.exports = router;
