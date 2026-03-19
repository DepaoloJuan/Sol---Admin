const express = require("express");
const router = express.Router();

const {
  showAgenda,
  showNuevoTurnoForm,
  storeNuevoTurno,
} = require("../controllers/agendaController");

const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/agenda", requireAdmin, showAgenda);
router.get("/agenda/nuevo", requireAdmin, showNuevoTurnoForm);
router.post("/agenda/nuevo", requireAdmin, storeNuevoTurno);

module.exports = router;
