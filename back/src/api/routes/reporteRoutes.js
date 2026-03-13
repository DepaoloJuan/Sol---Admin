const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");
const reporteController = require("../controllers/reporteController");

router.get("/reportes", requireAuth, reporteController.verReportes);
router.post(
  "/reportes/gastos/nuevo",
  requireAuth,
  reporteController.crearGastoDesdeReportes,
);
router.post(
  "/reportes/gastos/delete/:id",
  requireAuth,
  reporteController.eliminarGasto,
);
router.post(
  "/reportes/gastos/update/:id",
  requireAuth,
  reporteController.actualizarGasto,
);

module.exports = router;
