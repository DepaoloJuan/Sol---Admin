const express = require("express");
const router = express.Router();

const {
  showAgenda,
  showNuevoTurnoForm,
  storeNuevoTurno,
} = require("../controllers/agendaController");

const { requireAuth } = require("../middlewares/authMiddleware");

router.get("/agenda", requireAuth, showAgenda);
router.get("/agenda/nuevo", requireAuth, showNuevoTurnoForm);
router.post("/agenda/nuevo", requireAuth, storeNuevoTurno);

module.exports = router;
