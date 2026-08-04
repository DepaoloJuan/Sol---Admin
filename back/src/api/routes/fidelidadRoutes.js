const express = require("express");
const router = express.Router();
const {
  verPendientes,
  vincularManual,
  crearClienteYVincular,
  rechazar,
  verPremios,
  agregarRegla,
  eliminarRegla,
  crearPremio,
  actualizarPremio,
  toggleActivoPremio,
} = require("../controllers/fidelidadController");
const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/fidelidad/pendientes", requireAdmin, verPendientes);
router.post("/fidelidad/:id/vincular", requireAdmin, vincularManual);
router.post("/fidelidad/:id/crear-cliente", requireAdmin, crearClienteYVincular);
router.post("/fidelidad/:id/rechazar", requireAdmin, rechazar);

router.get("/fidelidad/premios", requireAdmin, verPremios);
router.post("/fidelidad/premios/reglas", requireAdmin, agregarRegla);
router.post("/fidelidad/premios/reglas/:id/eliminar", requireAdmin, eliminarRegla);
router.post("/fidelidad/premios/catalogo", requireAdmin, crearPremio);
router.post("/fidelidad/premios/catalogo/:id", requireAdmin, actualizarPremio);
router.post("/fidelidad/premios/catalogo/:id/toggle", requireAdmin, toggleActivoPremio);

module.exports = router;
