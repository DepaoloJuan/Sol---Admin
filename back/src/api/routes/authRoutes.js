const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { showLogin, login, logout } = require("../controllers/authController");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos
  message:
    "Demasiados intentos de acceso. Esperá 15 minutos e intentá de nuevo.",
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/login", showLogin);
router.post("/login", loginLimiter, login);
router.get("/logout", logout);

module.exports = router;
