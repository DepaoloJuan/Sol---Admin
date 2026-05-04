const express = require("express");
const router = express.Router();
const {
  verMiPanel,
  crearGastoPersonal,
  actualizarGastoPersonal,
  eliminarGastoPersonal,
} = require("../controllers/miPanelController");
const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/mi-panel", requireAuth, verMiPanel);
router.post("/mi-panel/gastos/nuevo", requireAuth, crearGastoPersonal);
router.post(
  "/mi-panel/gastos/update/:id",
  requireAuth,
  actualizarGastoPersonal,
);
router.post("/mi-panel/gastos/delete/:id", requireAuth, eliminarGastoPersonal);

module.exports = router;
