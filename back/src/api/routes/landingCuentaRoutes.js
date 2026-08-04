const express = require("express");
const router = express.Router();
const {
  loginGoogle,
  registro,
  loginEmail,
  olvidePassword,
  resetearPassword,
  ingresarTelefono,
  verProgreso,
  girarRuleta,
  verHistorial,
  verTarjetasAnteriores,
} = require("../controllers/landingCuentaController");
const { requireClienta } = require("../middlewares/clientaMiddleware");

router.post("/login-google", loginGoogle);
router.post("/registro", registro);
router.post("/login", loginEmail);
router.post("/olvide-password", olvidePassword);
router.post("/resetear-password", resetearPassword);
router.post("/telefono", requireClienta, ingresarTelefono);
router.get("/progreso", requireClienta, verProgreso);
router.post("/premios/:id/girar", requireClienta, girarRuleta);
router.get("/historial", requireClienta, verHistorial);
router.get("/tarjetas-anteriores", requireClienta, verTarjetasAnteriores);

module.exports = router;
