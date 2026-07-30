const fichaExtensionesModel = require("../models/fichaExtensionesModel");
const logger = require("../../utils/logger");
const { formatDate } = require("../../utils/dateHelpers");

const listarFichasExtensiones = async (req, res) => {
  try {
    const fichas = await fichaExtensionesModel.getAllFichasExtensiones();

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("fichas/extensiones/index", {
      title: "Extensiones",
      user: req.session.user,
      fichas,
      flash,
    });
  } catch (error) {
    logger.error("fichaExtensiones.list.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const showNuevaFichaExtensionesForm = (req, res) => {
  res.render("fichas/extensiones/nuevo", {
    title: "Nueva ficha de extensiones",
    user: req.session.user,
    error: null,
    fecha: formatDate(new Date()),
  });
};

const crearFichaExtensiones = async (req, res) => {
  try {
    const { id_cliente, diseno, fecha } = req.body;

    if (!id_cliente || !diseno || !fecha) {
      return res.status(400).render("fichas/extensiones/nuevo", {
        title: "Nueva ficha de extensiones",
        user: req.session.user,
        error: "Elegí una clienta, el diseño y la fecha.",
        fecha: fecha || formatDate(new Date()),
      });
    }

    await fichaExtensionesModel.createFichaExtensiones({ id_cliente: Number(id_cliente), diseno, fecha });

    req.session.flash = { tipo: "success", mensaje: "Ficha de extensiones guardada." };
    res.redirect("/mis-fichas/extensiones");
  } catch (error) {
    logger.error("fichaExtensiones.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const mostrarEditarFichaExtensiones = async (req, res) => {
  try {
    const { id } = req.params;
    const ficha = await fichaExtensionesModel.getFichaExtensionesById(id);

    if (!ficha) {
      return res.status(404).send("Ficha no encontrada");
    }

    res.render("fichas/extensiones/editar", {
      title: "Editar ficha de extensiones",
      user: req.session.user,
      ficha: { ...ficha, fecha: formatDate(new Date(ficha.fecha)) },
      error: null,
    });
  } catch (error) {
    logger.error("fichaExtensiones.edit.show.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarFichaExtensiones = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente, diseno, fecha } = req.body;

    if (!id_cliente || !diseno || !fecha) {
      const ficha = await fichaExtensionesModel.getFichaExtensionesById(id);
      return res.status(400).render("fichas/extensiones/editar", {
        title: "Editar ficha de extensiones",
        user: req.session.user,
        ficha: { ...ficha, id_cliente, diseno, fecha },
        error: "Elegí una clienta, el diseño y la fecha.",
      });
    }

    await fichaExtensionesModel.updateFichaExtensiones(id, { id_cliente: Number(id_cliente), diseno, fecha });

    req.session.flash = { tipo: "success", mensaje: "Ficha de extensiones actualizada." };
    res.redirect("/mis-fichas/extensiones");
  } catch (error) {
    logger.error("fichaExtensiones.update.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarFichaExtensiones = async (req, res) => {
  try {
    const { id } = req.params;
    await fichaExtensionesModel.deleteFichaExtensiones(id);

    req.session.flash = { tipo: "success", mensaje: "Ficha eliminada." };
    res.redirect("/mis-fichas/extensiones");
  } catch (error) {
    logger.error("fichaExtensiones.delete.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  listarFichasExtensiones,
  showNuevaFichaExtensionesForm,
  crearFichaExtensiones,
  mostrarEditarFichaExtensiones,
  actualizarFichaExtensiones,
  eliminarFichaExtensiones,
};
