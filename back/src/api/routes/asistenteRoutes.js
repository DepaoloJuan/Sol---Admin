const express = require("express");
const router = express.Router();
const { crearTokenEfimero, ejecutarToolHttp, getHistorial, guardarTurno, vaciarHistorial } = require("../controllers/asistenteController");
const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/asistente", requireAdmin, (req, res) => {
  res.render("asistente/index", { title: "Asistente", user: req.session.user });
});

router.get("/asistente/token", requireAdmin, crearTokenEfimero);
router.post("/asistente/ejecutar-tool", requireAdmin, ejecutarToolHttp);
router.get("/asistente/historial", requireAdmin, getHistorial);
router.post("/asistente/historial", requireAdmin, guardarTurno);
router.post("/asistente/historial/vaciar", requireAdmin, vaciarHistorial);

module.exports = router;
