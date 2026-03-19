const bcrypt = require("bcrypt");
const usuarioModel = require("../models/userModel");
const empleadoModel = require("../models/empleadoModel");

const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioModel.getAllUsuarios();
    const empleados = await empleadoModel.getAllEmpleados();

    res.render("usuarios/index", {
      title: "Usuarios",
      user: req.session.user,
      usuarios,
      empleados,
      error: null,
    });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    res.status(500).send("Error interno del servidor");
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { email, password, rol, id_empleado } = req.body;

    if (!email || !password || !rol) {
      const usuarios = await usuarioModel.getAllUsuarios();
      const empleados = await empleadoModel.getAllEmpleados();
      return res.status(400).render("usuarios/index", {
        title: "Usuarios",
        user: req.session.user,
        usuarios,
        empleados,
        error: "Email, contraseña y rol son obligatorios.",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await usuarioModel.createUsuario({
      email,
      password: hash,
      rol,
      id_empleado: id_empleado || null,
    });

    res.redirect("/usuarios");
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.session.user.id)) {
      return res.status(400).send("No podés eliminar tu propio usuario");
    }

    await usuarioModel.deleteUsuario(id);
    res.redirect("/usuarios");
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).send("La contraseña es obligatoria");
    }

    const hash = await bcrypt.hash(password, 10);
    await usuarioModel.updatePassword(id, hash);

    res.redirect("/usuarios");
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  listarUsuarios,
  crearUsuario,
  eliminarUsuario,
  actualizarPassword,
};
