const bcrypt = require("bcrypt");
const { findUserByEmail } = require("../models/userModel");
const logger = require("../../utils/logger");

const showLogin = (req, res) => {
  res.render("auth/login", { error: null });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);

    if (!user) {
      return res.render("auth/login", {
        error: "Usuario o contraseña incorrectos",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render("auth/login", {
        error: "Usuario o contraseña incorrectos",
      });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      id_empleado: user.id_empleado || null,
      nombre: user.nombre || user.email,
    };

    logger.info("auth.login.success", {
      userId: user.id,
      email: user.email,
      rol: user.rol,
    });

    req.session.save((err) => {
      if (err) {
        logger.error("auth.session.save_error", { error: err.message });
        return res.status(500).send("Error interno del servidor");
      }

      if (user.rol === "admin") {
        return res.redirect("/admin");
      }

      return res.redirect("/mi-panel");
    });
  } catch (error) {
    logger.error("auth.login.failed", {
      email: req.body.email,
      error: error.message,
    });
    return res.status(500).send("Error interno del servidor");
  }
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

module.exports = {
  showLogin,
  login,
  logout,
};
