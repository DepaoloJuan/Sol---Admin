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

module.exports = router;
