const express = require("express");
const router = express.Router();
const gastoController = require("../controllers/gastoController");
const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/", requireAuth, gastoController.listarGastos);
router.get("/nuevo", requireAuth, gastoController.mostrarNuevoGasto);
router.post("/nuevo", requireAuth, gastoController.crearGasto);

module.exports = router;
