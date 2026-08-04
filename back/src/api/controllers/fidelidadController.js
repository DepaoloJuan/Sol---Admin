const logger = require("../../utils/logger");
const landingCuentaModel = require("../models/landingCuentaModel");
const clienteModel = require("../models/clienteModel");
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

module.exports = { verPendientes, vincularManual, crearClienteYVincular, rechazar };
