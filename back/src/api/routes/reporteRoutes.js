const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middlewares/authMiddleware");
const reporteController = require("../controllers/reporteController");

router.get("/reportes", requireAdmin, reporteController.verReportes);
router.get("/reportes/anual", requireAdmin, reporteController.verReporteAnual);
router.post(
  "/reportes/gastos/nuevo",
  requireAdmin,
  reporteController.crearGastoDesdeReportes,
);
router.post(
  "/reportes/gastos/delete/:id",
  requireAdmin,
  reporteController.eliminarGasto,
);
router.post(
  "/reportes/gastos/update/:id",
  requireAdmin,
  reporteController.actualizarGasto,
);

module.exports = router;
