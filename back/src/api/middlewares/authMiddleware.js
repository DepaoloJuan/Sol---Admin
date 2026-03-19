const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.rol !== "admin") {
    return res.status(403).send("Acceso denegado");
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
