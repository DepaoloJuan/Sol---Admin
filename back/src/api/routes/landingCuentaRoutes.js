const express = require("express");
const router = express.Router();
const {
  loginGoogle,
  ingresarTelefono,
  verProgreso,
  girarRuleta,
  verHistorial,
} = require("../controllers/landingCuentaController");
const { requireClienta } = require("../middlewares/clientaMiddleware");

router.post("/login-google", loginGoogle);
router.post("/telefono", requireClienta, ingresarTelefono);
router.get("/progreso", requireClienta, verProgreso);
router.post("/premios/:id/girar", requireClienta, girarRuleta);
router.get("/historial", requireClienta, verHistorial);

module.exports = router;
