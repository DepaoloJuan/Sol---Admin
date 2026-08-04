const logger = require("../../utils/logger");
const landingCuentaModel = require("../models/landingCuentaModel");
const clienteModel = require("../models/clienteModel");
const fidelidadModel = require("../models/fidelidadModel");
const fidelidadHelper = require("../../utils/fidelidadHelper");

const verPendientes = async (req, res) => {
  try {
    const flash = req.session.flash || null;
    delete req.session.flash;

    const pendientes = await landingCuentaModel.getPendientes();

    const pendientesConCandidatos = await Promise.all(
      pendientes.map(async (cuenta) => {
        const normalizado = fidelidadHelper.normalizarTelefono(cuenta.telefono_ingresado);
        const candidatos = normalizado
          ? await clienteModel.buscarPorTelefonoNormalizado(normalizado)
          : [];
        return { ...cuenta, candidatos };
      }),
    );

    res.render("fidelidad/pendientes", {
      title: "Fidelización - Pendientes",
      user: req.session.user,
      pendientes: pendientesConCandidatos,
      flash,
    });
  } catch (error) {
    logger.error("fidelidad.verPendientes.failed", { error: error.message });
    res.status(500).send("Error interno");
  }
};

const vincularManual = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_cliente } = req.body;

    await landingCuentaModel.actualizarVinculacion(id, {
      telefonoIngresado: undefined,
      idCliente: id_cliente,
      estadoVinculacion: "manual",
    });

    req.session.flash = { tipo: "success", mensaje: "Cuenta vinculada correctamente." };
    res.redirect("/fidelidad/pendientes");
  } catch (error) {
    logger.error("fidelidad.vincularManual.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo vincular la cuenta." };
    res.redirect("/fidelidad/pendientes");
  }
};

const crearClienteYVincular = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido } = req.body;

    const cuenta = await landingCuentaModel.getById(id);
    const nuevoCliente = await clienteModel.createCliente({
      nombre,
      apellido,
      telefono: cuenta.telefono_ingresado,
    });

    await landingCuentaModel.actualizarVinculacion(id, {
      telefonoIngresado: undefined,
      idCliente: nuevoCliente.id,
      estadoVinculacion: "manual",
    });

    req.session.flash = { tipo: "success", mensaje: "Clienta nueva creada y vinculada." };
    res.redirect("/fidelidad/pendientes");
  } catch (error) {
    logger.error("fidelidad.crearClienteYVincular.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo crear la clienta." };
    res.redirect("/fidelidad/pendientes");
  }
};

const rechazar = async (req, res) => {
  try {
    const { id } = req.params;
    await landingCuentaModel.actualizarVinculacion(id, {
      telefonoIngresado: undefined,
      idCliente: null,
      estadoVinculacion: "rechazada",
    });
    req.session.flash = { tipo: "success", mensaje: "Cuenta rechazada." };
    res.redirect("/fidelidad/pendientes");
  } catch (error) {
    logger.error("fidelidad.rechazar.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo rechazar la cuenta." };
    res.redirect("/fidelidad/pendientes");
  }
};

const verPremios = async (req, res) => {
  try {
    const flash = req.session.flash || null;
    delete req.session.flash;

    const reglas = await fidelidadModel.getReglasPremio();
    const catalogo = await fidelidadModel.getCatalogoCompleto();

    res.render("fidelidad/premios", {
      title: "Fidelización - Premios",
      user: req.session.user,
      reglas,
      catalogo,
      flash,
    });
  } catch (error) {
    logger.error("fidelidad.verPremios.failed", { error: error.message });
    res.status(500).send("Error interno");
  }
};

const agregarRegla = async (req, res) => {
  try {
    const numeroSello = Number(req.body.numero_sello);
    if (!Number.isInteger(numeroSello) || numeroSello < 1 || numeroSello > 10) {
      req.session.flash = { tipo: "error", mensaje: "El sello tiene que ser un número entre 1 y 10." };
      return res.redirect("/fidelidad/premios");
    }

    await fidelidadModel.agregarReglaPremio(numeroSello);
    req.session.flash = { tipo: "success", mensaje: `Ahora el sello ${numeroSello} tiene premio.` };
    res.redirect("/fidelidad/premios");
  } catch (error) {
    logger.error("fidelidad.agregarRegla.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo agregar la regla." };
    res.redirect("/fidelidad/premios");
  }
};

const eliminarRegla = async (req, res) => {
  try {
    const { id } = req.params;
    await fidelidadModel.eliminarReglaPremio(id);
    req.session.flash = { tipo: "success", mensaje: "Regla eliminada." };
    res.redirect("/fidelidad/premios");
  } catch (error) {
    logger.error("fidelidad.eliminarRegla.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo eliminar la regla." };
    res.redirect("/fidelidad/premios");
  }
};

const crearPremio = async (req, res) => {
  try {
    const { descripcion } = req.body;
    const peso = Number(req.body.peso) || 10;
    if (!descripcion || !descripcion.trim()) {
      req.session.flash = { tipo: "error", mensaje: "Falta la descripción del premio." };
      return res.redirect("/fidelidad/premios");
    }

    await fidelidadModel.crearPremioCatalogo(descripcion.trim(), peso);
    req.session.flash = { tipo: "success", mensaje: "Premio agregado al catálogo." };
    res.redirect("/fidelidad/premios");
  } catch (error) {
    logger.error("fidelidad.crearPremio.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo crear el premio." };
    res.redirect("/fidelidad/premios");
  }
};

const actualizarPremio = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion } = req.body;
    const peso = Number(req.body.peso) || 10;
    if (!descripcion || !descripcion.trim()) {
      req.session.flash = { tipo: "error", mensaje: "Falta la descripción del premio." };
      return res.redirect("/fidelidad/premios");
    }

    await fidelidadModel.actualizarPremioCatalogo(id, descripcion.trim(), peso);
    req.session.flash = { tipo: "success", mensaje: "Premio actualizado." };
    res.redirect("/fidelidad/premios");
  } catch (error) {
    logger.error("fidelidad.actualizarPremio.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo actualizar el premio." };
    res.redirect("/fidelidad/premios");
  }
};

const toggleActivoPremio = async (req, res) => {
  try {
    const { id } = req.params;
    await fidelidadModel.toggleActivoPremioCatalogo(id);
    req.session.flash = { tipo: "success", mensaje: "Premio actualizado." };
    res.redirect("/fidelidad/premios");
  } catch (error) {
    logger.error("fidelidad.toggleActivoPremio.failed", { error: error.message });
    req.session.flash = { tipo: "error", mensaje: "No se pudo actualizar el premio." };
    res.redirect("/fidelidad/premios");
  }
};

module.exports = {
  verPendientes,
  vincularManual,
  crearClienteYVincular,
  rechazar,
  verPremios,
  agregarRegla,
  eliminarRegla,
  crearPremio,
  actualizarPremio,
  toggleActivoPremio,
};
