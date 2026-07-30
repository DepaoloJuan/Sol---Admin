const fichaLiftingModel = require("../models/fichaLiftingModel");
const logger = require("../../utils/logger");
const { formatDate } = require("../../utils/dateHelpers");

const listarFichasLifting = async (req, res) => {
  try {
    const fichas = await fichaLiftingModel.getAllFichasLifting();

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("fichas/lifting/index", {
      title: "Lifting",
      user: req.session.user,
      fichas,
      flash,
    });
  } catch (error) {
    logger.error("fichaLifting.list.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const showNuevaFichaLiftingForm = (req, res) => {
  res.render("fichas/lifting/nuevo", {
    title: "Nueva ficha de lifting",
    user: req.session.user,
    error: null,
    fecha: formatDate(new Date()),
  });
};

const crearFichaLifting = async (req, res) => {
  try {
    const { id_cliente, tamano_molde, fecha } = req.body;

    if (!id_cliente || !tamano_molde || !fecha) {
      return res.status(400).render("fichas/lifting/nuevo", {
        title: "Nueva ficha de lifting",
        user: req.session.user,
        error: "Elegí una clienta, el tamaño de molde y la fecha.",
        fecha: fecha || formatDate(new Date()),
      });
    }

    await fichaLiftingModel.createFichaLifting({ id_cliente: Number(id_cliente), tamano_molde, fecha });

    req.session.flash = { tipo: "success", mensaje: "Ficha de lifting guardada." };
    res.redirect("/mis-fichas/lifting");
  } catch (error) {
    logger.error("fichaLifting.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const mostrarEditarFichaLifting = async (req, res) => {
  try {
    const { id } = req.params;
    const ficha = await fichaLiftingModel.getFichaLiftingById(id);

    if (!ficha) {
      return res.status(404).send("Ficha no encontrada");
    }

    res.render("fichas/lifting/editar", {
      title: "Editar ficha de lifting",
      user: req.session.user,
      ficha: { ...ficha, fecha: formatDate(new Date(ficha.fecha)) },
      error: null,
    });
  } catch (error) {
    logger.error("fichaLifting.edit.show.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarFichaLifting = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente, tamano_molde, fecha } = req.body;

    if (!id_cliente || !tamano_molde || !fecha) {
      const ficha = await fichaLiftingModel.getFichaLiftingById(id);
      return res.status(400).render("fichas/lifting/editar", {
        title: "Editar ficha de lifting",
        user: req.session.user,
        ficha: { ...ficha, id_cliente, tamano_molde, fecha },
        error: "Elegí una clienta, el tamaño de molde y la fecha.",
      });
    }

    await fichaLiftingModel.updateFichaLifting(id, { id_cliente: Number(id_cliente), tamano_molde, fecha });

    req.session.flash = { tipo: "success", mensaje: "Ficha de lifting actualizada." };
    res.redirect("/mis-fichas/lifting");
  } catch (error) {
    logger.error("fichaLifting.update.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarFichaLifting = async (req, res) => {
  try {
    const { id } = req.params;
    await fichaLiftingModel.deleteFichaLifting(id);

    req.session.flash = { tipo: "success", mensaje: "Ficha eliminada." };
    res.redirect("/mis-fichas/lifting");
  } catch (error) {
    logger.error("fichaLifting.delete.failed", { id: req.params.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  listarFichasLifting,
  showNuevaFichaLiftingForm,
  crearFichaLifting,
  mostrarEditarFichaLifting,
  actualizarFichaLifting,
  eliminarFichaLifting,
};
