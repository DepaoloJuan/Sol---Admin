const bcrypt = require("bcrypt");
const { findUserByEmail } = require("../models/userModel");

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
    };

    req.session.save((err) => {
      if (err) {
        console.error("Error al guardar sesión:", err);
        return res.status(500).send("Error interno del servidor");
      }

      if (user.rol === "admin") {
        return res.redirect("/admin");
      }

      return res.redirect("/mi-panel");
    });
  } catch (error) {
    console.error("Error en login:", error);
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
