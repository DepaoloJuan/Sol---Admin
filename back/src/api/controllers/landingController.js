// FILE: src/api/controllers/landingController.js
const landingModel = require("../models/landingModel");
const { subirImagen, eliminarImagen } = require("../../utils/cloudinaryHelper");
const logger = require("../../utils/logger");

// =============================================
// PANEL PRINCIPAL
// =============================================

const verPanel = async (req, res) => {
  try {
    const [popup, servicios, cursos, galeria, testimonios] = await Promise.all([
      landingModel.getPopup(),
      landingModel.getAllServicios(),
      landingModel.getAllCursos(),
      landingModel.getAllGaleria(),
      landingModel.getAllTestimonios(),
    ]);

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("landing/index", {
      title: "Landing Page",
      user: req.session.user,
      popup,
      servicios,
      cursos,
      galeria,
      testimonios,
      flash,
    });
  } catch (error) {
    logger.error("landing.panel.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// =============================================
// POPUP
// =============================================

const actualizarPopup = async (req, res) => {
  try {
    const { activo, texto, imagen_url_fallback } = req.body;
    const popup = await landingModel.getPopup();

    let imagen_url = popup.imagen_url;

    if (req.file) {
      if (popup.imagen_url) await eliminarImagen(popup.imagen_url);
      imagen_url = await subirImagen(req.file.buffer, "landing/popup");
    }

    await landingModel.updatePopup({
      activo: activo === "on",
      imagen_url,
      imagen_url_fallback: imagen_url_fallback || popup.imagen_url_fallback,
      texto,
    });

    req.session.flash = { tipo: "success", mensaje: "Promoción actualizada correctamente." };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.popup.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// =============================================
// SERVICIOS
// =============================================

const verNuevoServicio = (req, res) => {
  res.render("landing/servicios/nuevo", {
    title: "Nuevo servicio",
    user: req.session.user,
    error: null,
  });
};

const crearServicio = async (req, res) => {
  try {
    const { titulo, descripcion, orden, activo } = req.body;

    if (!titulo) {
      return res.status(400).render("landing/servicios/nuevo", {
        title: "Nuevo servicio",
        user: req.session.user,
        error: "El título es obligatorio.",
      });
    }

    const servicio = await landingModel.createServicio({
      titulo,
      descripcion,
      orden: orden ? Number(orden) : 0,
      activo: activo === "on",
    });

    // Si se subió una imagen la agregamos
    if (req.file) {
      const imagen_url = await subirImagen(
        req.file.buffer,
        "landing/servicios",
      );
      await landingModel.addImagenServicio({
        servicio_id: servicio.id,
        imagen_url,
        orden: 0,
      });
    }

    req.session.flash = {
      tipo: "success",
      mensaje: "Servicio creado correctamente.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.servicio.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const verEditarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const [servicio, imagenes] = await Promise.all([
      landingModel.getServicioById(id),
      landingModel.getImagenesServicio(id),
    ]);

    if (!servicio) return res.status(404).send("Servicio no encontrado");

    res.render("landing/servicios/editar", {
      title: "Editar servicio",
      user: req.session.user,
      servicio,
      imagenes,
      error: null,
    });
  } catch (error) {
    logger.error("landing.servicio.edit.show.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, orden, activo } = req.body;

    if (!titulo) {
      const [servicio, imagenes] = await Promise.all([
        landingModel.getServicioById(id),
        landingModel.getImagenesServicio(id),
      ]);
      return res.status(400).render("landing/servicios/editar", {
        title: "Editar servicio",
        user: req.session.user,
        servicio,
        imagenes,
        error: "El título es obligatorio.",
      });
    }

    await landingModel.updateServicio(id, {
      titulo,
      descripcion,
      orden: orden ? Number(orden) : 0,
      activo: activo === "on",
    });

    // Si se subió una imagen nueva la agregamos
    if (req.file) {
      const imagen_url = await subirImagen(
        req.file.buffer,
        "landing/servicios",
      );
      await landingModel.addImagenServicio({
        servicio_id: id,
        imagen_url,
        orden: 0,
      });
    }

    req.session.flash = {
      tipo: "success",
      mensaje: "Servicio actualizado correctamente.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.servicio.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const imagenes = await landingModel.getImagenesServicio(id);

    // Eliminar imágenes de Cloudinary antes de borrar el registro
    for (const img of imagenes) {
      await eliminarImagen(img.imagen_url);
    }

    await landingModel.deleteServicio(id);

    req.session.flash = { tipo: "success", mensaje: "Servicio eliminado." };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.servicio.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarImagenServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const imagen = await landingModel.deleteImagenServicio(id);

    if (imagen) await eliminarImagen(imagen.imagen_url);

    req.session.flash = { tipo: "success", mensaje: "Imagen eliminada." };
    res.redirect(`/landing/servicios/${imagen.servicio_id}/editar`);
  } catch (error) {
    logger.error("landing.servicio.imagen.delete.failed", {
      error: error.message,
    });
    res.status(500).send("Error interno del servidor");
  }
};

// =============================================
// CURSOS
// =============================================

const verNuevoCurso = (req, res) => {
  res.render("landing/cursos/nuevo", {
    title: "Nuevo curso",
    user: req.session.user,
    error: null,
  });
};

const crearCurso = async (req, res) => {
  try {
    const { titulo, descripcion, orden, activo, imagen_url_fallback } =
      req.body;

    if (!titulo) {
      return res.status(400).render("landing/cursos/nuevo", {
        title: "Nuevo curso",
        user: req.session.user,
        error: "El título es obligatorio.",
      });
    }

    let imagen_url = null;
    if (req.file) {
      imagen_url = await subirImagen(req.file.buffer, "landing/cursos");
    }

    await landingModel.createCurso({
      titulo,
      descripcion,
      imagen_url,
      imagen_url_fallback: imagen_url_fallback || null,
      orden: orden ? Number(orden) : 0,
      activo: activo === "on",
    });

    req.session.flash = {
      tipo: "success",
      mensaje: "Curso creado correctamente.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.curso.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const verEditarCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const curso = await landingModel.getCursoById(id);

    if (!curso) return res.status(404).send("Curso no encontrado");

    res.render("landing/cursos/editar", {
      title: "Editar curso",
      user: req.session.user,
      curso,
      error: null,
    });
  } catch (error) {
    logger.error("landing.curso.edit.show.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, orden, activo, imagen_url_fallback } =
      req.body;

    if (!titulo) {
      const curso = await landingModel.getCursoById(id);
      return res.status(400).render("landing/cursos/editar", {
        title: "Editar curso",
        user: req.session.user,
        curso,
        error: "El título es obligatorio.",
      });
    }

    const curso = await landingModel.getCursoById(id);
    let imagen_url = curso.imagen_url;

    if (req.file) {
      if (curso.imagen_url) await eliminarImagen(curso.imagen_url);
      imagen_url = await subirImagen(req.file.buffer, "landing/cursos");
    }

    await landingModel.updateCurso(id, {
      titulo,
      descripcion,
      imagen_url,
      imagen_url_fallback: imagen_url_fallback || curso.imagen_url_fallback,
      orden: orden ? Number(orden) : 0,
      activo: activo === "on",
    });

    req.session.flash = {
      tipo: "success",
      mensaje: "Curso actualizado correctamente.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.curso.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const curso = await landingModel.getCursoById(id);

    if (curso?.imagen_url) await eliminarImagen(curso.imagen_url);

    await landingModel.deleteCurso(id);

    req.session.flash = { tipo: "success", mensaje: "Curso eliminado." };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.curso.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// =============================================
// GALERÍA
// =============================================

const agregarImagenGaleria = async (req, res) => {
  try {
    if (!req.file) {
      req.session.flash = { tipo: "error", mensaje: "Seleccioná una imagen." };
      return res.redirect("/landing");
    }

    const { alt_texto, orden, imagen_url_fallback } = req.body;
    const imagen_url = await subirImagen(req.file.buffer, "landing/galeria");

    await landingModel.addImagenGaleria({
      imagen_url,
      imagen_url_fallback: imagen_url_fallback || null,
      alt_texto: alt_texto || null,
      orden: orden ? Number(orden) : 0,
    });

    req.session.flash = {
      tipo: "success",
      mensaje: "Imagen agregada a la galería.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.galeria.add.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarImagenGaleria = async (req, res) => {
  try {
    const { id } = req.params;
    const imagen = await landingModel.deleteImagenGaleria(id);

    if (imagen) await eliminarImagen(imagen.imagen_url);

    req.session.flash = {
      tipo: "success",
      mensaje: "Imagen eliminada de la galería.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.galeria.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// =============================================
// TESTIMONIOS
// =============================================

const verNuevoTestimonio = (req, res) => {
  res.render("landing/testimonios/nuevo", {
    title: "Nuevo testimonio",
    user: req.session.user,
    error: null,
  });
};

const crearTestimonio = async (req, res) => {
  try {
    const { nombre, texto, estrellas, activo, orden, foto_url_fallback } =
      req.body;

    if (!nombre || !texto) {
      return res.status(400).render("landing/testimonios/nuevo", {
        title: "Nuevo testimonio",
        user: req.session.user,
        error: "Nombre y texto son obligatorios.",
      });
    }

    let foto_url = null;
    if (req.file) {
      foto_url = await subirImagen(req.file.buffer, "landing/testimonios");
    }

    await landingModel.createTestimonio({
      nombre,
      texto,
      estrellas: estrellas ? Number(estrellas) : 5,
      foto_url,
      foto_url_fallback: foto_url_fallback || null,
      activo: activo === "on",
      orden: orden ? Number(orden) : 0,
    });

    req.session.flash = {
      tipo: "success",
      mensaje: "Testimonio creado correctamente.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.testimonio.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const verEditarTestimonio = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonio = await landingModel.getTestimonioById(id);

    if (!testimonio) return res.status(404).send("Testimonio no encontrado");

    res.render("landing/testimonios/editar", {
      title: "Editar testimonio",
      user: req.session.user,
      testimonio,
      error: null,
    });
  } catch (error) {
    logger.error("landing.testimonio.edit.show.failed", {
      error: error.message,
    });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarTestimonio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, texto, estrellas, activo, orden, foto_url_fallback } =
      req.body;

    if (!nombre || !texto) {
      const testimonio = await landingModel.getTestimonioById(id);
      return res.status(400).render("landing/testimonios/editar", {
        title: "Editar testimonio",
        user: req.session.user,
        testimonio,
        error: "Nombre y texto son obligatorios.",
      });
    }

    const testimonio = await landingModel.getTestimonioById(id);
    let foto_url = testimonio.foto_url;

    if (req.file) {
      if (testimonio.foto_url) await eliminarImagen(testimonio.foto_url);
      foto_url = await subirImagen(req.file.buffer, "landing/testimonios");
    }

    await landingModel.updateTestimonio(id, {
      nombre,
      texto,
      estrellas: estrellas ? Number(estrellas) : 5,
      foto_url,
      foto_url_fallback: foto_url_fallback || testimonio.foto_url_fallback,
      activo: activo === "on",
      orden: orden ? Number(orden) : 0,
    });

    req.session.flash = {
      tipo: "success",
      mensaje: "Testimonio actualizado correctamente.",
    };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.testimonio.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarTestimonio = async (req, res) => {
  try {
    const { id } = req.params;
    const testimonio = await landingModel.getTestimonioById(id);

    if (testimonio?.foto_url) await eliminarImagen(testimonio.foto_url);

    await landingModel.deleteTestimonio(id);

    req.session.flash = { tipo: "success", mensaje: "Testimonio eliminado." };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.testimonio.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const limpiarPopup = async (req, res) => {
  try {
    const popup = await landingModel.getPopup();
    if (popup.imagen_url) await eliminarImagen(popup.imagen_url);
    await landingModel.updatePopup({
      activo: false,
      imagen_url: null,
      imagen_url_fallback: popup.imagen_url_fallback,
      texto: null,
    });
    req.session.flash = { tipo: "success", mensaje: "Promoción eliminada." };
    res.redirect("/landing");
  } catch (error) {
    logger.error("landing.popup.limpiar.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  verPanel,
  actualizarPopup,
  limpiarPopup,
  verNuevoServicio,
  crearServicio,
  verEditarServicio,
  actualizarServicio,
  eliminarServicio,
  eliminarImagenServicio,
  verNuevoCurso,
  crearCurso,
  verEditarCurso,
  actualizarCurso,
  eliminarCurso,
  agregarImagenGaleria,
  eliminarImagenGaleria,
  verNuevoTestimonio,
  crearTestimonio,
  verEditarTestimonio,
  actualizarTestimonio,
  eliminarTestimonio,
};
