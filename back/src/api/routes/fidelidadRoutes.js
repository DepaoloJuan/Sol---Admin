const express = require("express");
const router = express.Router();
const {
  verPendientes,
  vincularManual,
  crearClienteYVincular,
  rechazar,
  verCanjes,
  marcarCanjeado,
  verPremios,
  actualizarFechaInicio,
  habilitarServicio,
  deshabilitarServicio,
  otorgarSelloManual,
  agregarRegla,
  eliminarRegla,
  crearPremio,
  actualizarPremio,
  toggleActivoPremio,
} = require("../controllers/fidelidadController");
const { requireAdmin, requireAdminOMili } = require("../middlewares/authMiddleware");

router.get("/fidelidad/pendientes", requireAdmin, verPendientes);
router.post("/fidelidad/:id/vincular", requireAdmin, vincularManual);
router.post("/fidelidad/:id/crear-cliente", requireAdmin, crearClienteYVincular);
router.post("/fidelidad/:id/rechazar", requireAdmin, rechazar);

router.get("/fidelidad/canjes", requireAdminOMili, verCanjes);
router.post("/fidelidad/premios/:id/canjear", requireAdminOMili, marcarCanjeado);

router.get("/fidelidad/premios", requireAdmin, verPremios);
router.post("/fidelidad/config/fecha-inicio", requireAdmin, actualizarFechaInicio);
router.post("/fidelidad/servicios/:id/habilitar", requireAdminOMili, habilitarServicio);
router.post("/fidelidad/servicios/:id/deshabilitar", requireAdminOMili, deshabilitarServicio);
router.post("/fidelidad/turnos/:id/otorgar-sello", requireAdminOMili, otorgarSelloManual);
router.post("/fidelidad/premios/reglas", requireAdmin, agregarRegla);
router.post("/fidelidad/premios/reglas/:id/eliminar", requireAdmin, eliminarRegla);
router.post("/fidelidad/premios/catalogo", requireAdmin, crearPremio);
router.post("/fidelidad/premios/catalogo/:id", requireAdmin, actualizarPremio);
router.post("/fidelidad/premios/catalogo/:id/toggle", requireAdmin, toggleActivoPremio);

module.exports = router;
