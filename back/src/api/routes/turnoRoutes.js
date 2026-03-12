const express = require("express");
const router = express.Router();

const turnoController = require("../controllers/turnoController");

router.get("/turnos/:id/editar", turnoController.mostrarEditarTurno);
router.post("/turnos/:id/editar", turnoController.actualizarTurno);
router.post("/turnos/:id/eliminar", turnoController.eliminarTurno);

module.exports = router;
