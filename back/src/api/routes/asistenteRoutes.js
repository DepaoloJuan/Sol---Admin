const express = require("express");
const router = express.Router();
const { crearTokenEfimero, ejecutarToolHttp } = require("../controllers/asistenteController");
const { requireAdmin } = require("../middlewares/authMiddleware");

router.get("/asistente", requireAdmin, (req, res) => {
  res.render("asistente/index", { title: "Asistente", user: req.session.user });
});

router.get("/asistente/token", requireAdmin, crearTokenEfimero);
router.post("/asistente/ejecutar-tool", requireAdmin, ejecutarToolHttp);

module.exports = router;
