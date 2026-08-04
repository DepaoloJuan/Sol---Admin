const landingCuentaModel = require("../models/landingCuentaModel");

const requireClienta = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, mensaje: "No autenticado." });
  }

  const cuenta = await landingCuentaModel.buscarPorToken(token);
  if (!cuenta) {
    return res.status(401).json({ ok: false, mensaje: "Sesión inválida o expirada." });
  }

  req.cuenta = cuenta;
  next();
};

module.exports = { requireClienta };
