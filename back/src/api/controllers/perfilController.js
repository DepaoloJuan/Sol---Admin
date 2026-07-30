const bcrypt = require("bcrypt");
const logger = require("../../utils/logger");
const userModel = require("../models/userModel");
const { subirImagen, eliminarImagen } = require("../../utils/cloudinaryHelper");

const mostrarPerfil = (req, res) => {
  const flash = req.session.flash || null;
  delete req.session.flash;

  res.render("perfil/index", {
    title: "Mi perfil",
    user: req.session.user,
    flash,
  });
};

const actualizarFoto = async (req, res) => {
  try {
    if (!req.file) {
      req.session.flash = { tipo: "error", mensaje: "Elegí una imagen para subir." };
      return res.redirect("/mi-perfil");
    }

    const fotoAnterior = req.session.user.foto_url;
    if (fotoAnterior) await eliminarImagen(fotoAnterior);

    const fotoUrl = await subirImagen(req.file.buffer, "usuarios/perfil");
    await userModel.updateFotoUsuario(req.session.user.id, fotoUrl);

    req.session.user.foto_url = fotoUrl;

    req.session.flash = { tipo: "success", mensaje: "Foto de perfil actualizada." };
    res.redirect("/mi-perfil");
  } catch (error) {
    logger.error("perfil.foto.update.failed", { userId: req.session?.user?.id, error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo actualizar la foto." };
    res.redirect("/mi-perfil");
  }
};

const eliminarFoto = async (req, res) => {
  try {
    const fotoActual = req.session.user.foto_url;
    if (fotoActual) await eliminarImagen(fotoActual);

    await userModel.updateFotoUsuario(req.session.user.id, null);
    req.session.user.foto_url = null;

    req.session.flash = { tipo: "success", mensaje: "Foto de perfil eliminada." };
    res.redirect("/mi-perfil");
  } catch (error) {
    logger.error("perfil.foto.delete.failed", { userId: req.session?.user?.id, error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo eliminar la foto." };
    res.redirect("/mi-perfil");
  }
};

const actualizarTitulo = async (req, res) => {
  try {
    const titulo = (req.body.titulo || "").trim();

    if (titulo.length > 50) {
      req.session.flash = { tipo: "error", mensaje: "El título es demasiado largo (máximo 50 caracteres)." };
      return res.redirect("/mi-perfil");
    }

    await userModel.updateTituloUsuario(req.session.user.id, titulo || null);
    req.session.user.titulo = titulo || null;

    req.session.flash = { tipo: "success", mensaje: "Título actualizado." };
    res.redirect("/mi-perfil");
  } catch (error) {
    logger.error("perfil.titulo.update.failed", { userId: req.session?.user?.id, error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo actualizar el título." };
    res.redirect("/mi-perfil");
  }
};

const actualizarPasswordPropia = async (req, res) => {
  try {
    const { password_actual, password_nueva, password_confirmar } = req.body;

    if (!password_actual || !password_nueva || !password_confirmar) {
      req.session.flash = { tipo: "error", mensaje: "Completá los tres campos de contraseña." };
      return res.redirect("/mi-perfil");
    }

    if (password_nueva !== password_confirmar) {
      req.session.flash = { tipo: "error", mensaje: "La nueva contraseña y su confirmación no coinciden." };
      return res.redirect("/mi-perfil");
    }

    if (password_nueva.length < 6) {
      req.session.flash = { tipo: "error", mensaje: "La nueva contraseña tiene que tener al menos 6 caracteres." };
      return res.redirect("/mi-perfil");
    }

    const usuario = await userModel.findUserByEmail(req.session.user.email);
    const coincide = await bcrypt.compare(password_actual, usuario.password);

    if (!coincide) {
      req.session.flash = { tipo: "error", mensaje: "La contraseña actual no es correcta." };
      return res.redirect("/mi-perfil");
    }

    const hash = await bcrypt.hash(password_nueva, 10);
    await userModel.updatePassword(usuario.id, hash);

    req.session.flash = { tipo: "success", mensaje: "Contraseña actualizada correctamente." };
    res.redirect("/mi-perfil");
  } catch (error) {
    logger.error("perfil.password.update.failed", { userId: req.session?.user?.id, error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo actualizar la contraseña." };
    res.redirect("/mi-perfil");
  }
};

module.exports = {
  mostrarPerfil,
  actualizarFoto,
  eliminarFoto,
  actualizarTitulo,
  actualizarPasswordPropia,
};
