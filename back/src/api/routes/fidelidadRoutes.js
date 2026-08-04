const express = require("express");
const router = express.Router();
const {
  verPendientes,
  vincularManual,
  crearClienteYVincular,
  rechazar,
} = require("../controllers/fidelidadController");
const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/fidelidad/pendientes", requireAdmin, verPendientes);
router.post("/fidelidad/:id/vincular", requireAdmin, vincularManual);
router.post("/fidelidad/:id/crear-cliente", requireAdmin, crearClienteYVincular);
router.post("/fidelidad/:id/rechazar", requireAdmin, rechazar);

module.exports = router;
