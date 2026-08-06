const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  loginGoogle,
  registro,
  loginEmail,
  olvidePassword,
  resetearPassword,
  logout,
  ingresarTelefono,
  verProgreso,
  girarRuleta,
  verHistorial,
  verTarjetasAnteriores,
} = require("../controllers/landingCuentaController");
const { requireClienta } = require("../middlewares/clientaMiddleware");

const limiterJson = (max, windowMs, mensaje) =>
  rateLimit({
    windowMs,
    max,
    message: { ok: false, mensaje },
    standardHeaders: true,
    legacyHeaders: false,
  });

const loginGoogleLimiter = limiterJson(20, 15 * 60 * 1000, "Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
const loginLimiter = limiterJson(10, 15 * 60 * 1000, "Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
const registroLimiter = limiterJson(5, 15 * 60 * 1000, "Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
// Más estricto: cada intento manda un mail real vía Resend (cuota limitada).
const olvidePasswordLimiter = limiterJson(5, 60 * 60 * 1000, "Demasiados intentos. Esperá un rato e intentá de nuevo.");
const resetearPasswordLimiter = limiterJson(10, 15 * 60 * 1000, "Demasiados intentos. Esperá unos minutos e intentá de nuevo.");

router.post("/login-google", loginGoogleLimiter, loginGoogle);
router.post("/registro", registroLimiter, registro);
router.post("/login", loginLimiter, loginEmail);
router.post("/olvide-password", olvidePasswordLimiter, olvidePassword);
router.post("/resetear-password", resetearPasswordLimiter, resetearPassword);
router.post("/logout", requireClienta, logout);
router.post("/telefono", requireClienta, ingresarTelefono);
router.get("/progreso", requireClienta, verProgreso);
router.post("/premios/:id/girar", requireClienta, girarRuleta);
router.get("/historial", requireClienta, verHistorial);
router.get("/tarjetas-anteriores", requireClienta, verTarjetasAnteriores);

module.exports = router;
