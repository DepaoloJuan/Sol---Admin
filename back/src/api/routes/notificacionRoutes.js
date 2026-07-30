const express = require("express");
const router = express.Router();

const { listarPropias, marcarLeidas } = require("../controllers/notificacionController");
const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/notificaciones/mias", requireAuth, listarPropias);
router.post("/notificaciones/mias/marcar-leidas", requireAuth, marcarLeidas);

module.exports = router;
