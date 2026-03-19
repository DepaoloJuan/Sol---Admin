const express = require("express");
const router = express.Router();
const turnoController = require("../controllers/turnoController");
const { requireAdmin } = require("../middlewares/authMiddleware");

router.get(
  "/turnos/:id/editar",
  requireAdmin,
  turnoController.mostrarEditarTurno,
);
router.post(
  "/turnos/:id/editar",
  requireAdmin,
  turnoController.actualizarTurno,
);
router.post(
  "/turnos/:id/eliminar",
  requireAdmin,
  turnoController.eliminarTurno,
);

module.exports = router;
