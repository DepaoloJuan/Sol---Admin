const turnoModel = require("../models/turnoModel");
const empleadoModel = require("../models/empleadoModel");
const gastoPersonalModel = require("../models/gastoPersonalModel");
const logger = require("../../utils/logger");
const { formatDate, calcularMetricas } = require("../../utils/dateHelpers");

const verMiPanel = async (req, res) => {
  try {
    const id_empleado = req.session.user.id_empleado;

    if (!id_empleado) {
      return res.status(403).send("Tu usuario no tiene una empleada vinculada");
    }

    const empleada = await empleadoModel.getEmpleadoById(id_empleado);

    if (!empleada) {
      return res.status(404).send("Empleada no encontrada");
    }

    const hoy = new Date();

    // Semana actual (lunes a domingo)
    const diaActual = hoy.getDay();
    const diferenciaParaLunes = diaActual === 0 ? -6 : 1 - diaActual;
    const primerDiaSemana = new Date(hoy);
    primerDiaSemana.setHours(0, 0, 0, 0);
    primerDiaSemana.setDate(hoy.getDate() + diferenciaParaLunes);
    const ultimoDiaSemana = new Date(primerDiaSemana);
    ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);

    const fechaInicioSemanaActual = formatDate(primerDiaSemana);
    const fechaFinSemanaActual = formatDate(ultimoDiaSemana);

    // Semana anterior
    const primerDiaSemanaAnterior = new Date(primerDiaSemana);
    primerDiaSemanaAnterior.setDate(primerDiaSemana.getDate() - 7);
    const ultimoDiaSemanaAnterior = new Date(primerDiaSemanaAnterior);
    ultimoDiaSemanaAnterior.setDate(primerDiaSemanaAnterior.getDate() + 6);

    const fechaInicioSemanaAnterior = formatDate(primerDiaSemanaAnterior);
    const fechaFinSemanaAnterior = formatDate(ultimoDiaSemanaAnterior);

    // Semana siguiente
    const primerDiaSemanaSiguiente = new Date(primerDiaSemana);
    primerDiaSemanaSiguiente.setDate(primerDiaSemana.getDate() + 7);
    const ultimoDiaSemanaSiguiente = new Date(primerDiaSemanaSiguiente);
    ultimoDiaSemanaSiguiente.setDate(primerDiaSemanaSiguiente.getDate() + 6);

    const fechaInicioSemanaSiguiente = formatDate(primerDiaSemanaSiguiente);
    const fechaFinSemanaSiguiente = formatDate(ultimoDiaSemanaSiguiente);

    // Mes actual
    const fechaInicioMes = formatDate(
      new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    );
    const fechaFinMes = formatDate(
      new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0),
    );

    // Filtro libre
    const desde = req.query.desde || null;
    const hasta = req.query.hasta || null;

    // Turnos
    const [
      turnosSemanaActual,
      turnosSemanaAnterior,
      turnosSemanaSiguiente,
      turnosMes,
      turnosFiltro,
    ] = await Promise.all([
      turnoModel.getTurnosEmpleadoPorRango(
        id_empleado,
        fechaInicioSemanaActual,
        fechaFinSemanaActual,
      ),
      turnoModel.getTurnosEmpleadoPorRango(
        id_empleado,
        fechaInicioSemanaAnterior,
        fechaFinSemanaAnterior,
      ),
      turnoModel.getTurnosEmpleadoPorRango(
        id_empleado,
        fechaInicioSemanaSiguiente,
        fechaFinSemanaSiguiente,
      ),
      turnoModel.getTurnosEmpleadoPorRango(
        id_empleado,
        fechaInicioMes,
        fechaFinMes,
      ),
      desde && hasta
        ? turnoModel.getTurnosEmpleadoPorRango(id_empleado, desde, hasta)
        : [],
    ]);

    // Gastos personales
    const [
      gastosSemanaActual,
      gastosSemanaAnterior,
      gastosSemanaSiguiente,
      gastosMes,
      gastosFiltro,
    ] = await Promise.all([
      gastoPersonalModel.getGastosPersonalesPorRango(
        id_empleado,
        fechaInicioSemanaActual,
        fechaFinSemanaActual,
      ),
      gastoPersonalModel.getGastosPersonalesPorRango(
        id_empleado,
        fechaInicioSemanaAnterior,
        fechaFinSemanaAnterior,
      ),
      gastoPersonalModel.getGastosPersonalesPorRango(
        id_empleado,
        fechaInicioSemanaSiguiente,
        fechaFinSemanaSiguiente,
      ),
      gastoPersonalModel.getGastosPersonalesPorRango(
        id_empleado,
        fechaInicioMes,
        fechaFinMes,
      ),
      desde && hasta
        ? gastoPersonalModel.getGastosPersonalesPorRango(
            id_empleado,
            desde,
            hasta,
          )
        : [],
    ]);

    // Métricas
    const metricasSemanaActual = calcularMetricas(turnosSemanaActual);
    const metricasSemanaAnterior = calcularMetricas(turnosSemanaAnterior);
    const metricasSemanaSiguiente = calcularMetricas(turnosSemanaSiguiente);
    const metricasMes = calcularMetricas(turnosMes);
    const metricasFiltro = calcularMetricas(turnosFiltro);

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("miPanel/index", {
      title: "Mi Panel",
      user: req.session.user,
      empleada,
      turnosSemanaActual,
      turnosSemanaAnterior,
      turnosSemanaSiguiente,
      turnosMes,
      turnosFiltro,
      gastosSemanaActual,
      gastosSemanaAnterior,
      gastosSemanaSiguiente,
      gastosMes,
      gastosFiltro,
      metricasSemanaActual,
      metricasSemanaAnterior,
      metricasSemanaSiguiente,
      metricasMes,
      metricasFiltro,
      fechaInicioSemanaActual,
      fechaFinSemanaActual,
      fechaInicioSemanaAnterior,
      fechaFinSemanaAnterior,
      fechaInicioSemanaSiguiente,
      fechaFinSemanaSiguiente,
      fechaInicioMes,
      fechaFinMes,
      desde: desde || "",
      hasta: hasta || "",
      flash,
    });
  } catch (error) {
    logger.error("miPanel.load.failed", {
      userId: req.session?.user?.id,
      error: error.message,
    });
    res.status(500).send("Error interno del servidor");
  }
};

const crearGastoPersonal = async (req, res) => {
  try {
    const id_empleado = req.session.user.id_empleado;
    const {
      fecha,
      descripcion,
      monto,
      categoria,
      observaciones,
      desde,
      hasta,
    } = req.body;

    const descripcionLimpia = (descripcion || "").trim();
    const fechaValida = fecha && !Number.isNaN(new Date(fecha).getTime());

    if (!fechaValida || !descripcionLimpia) {
      req.session.flash = {
        tipo: "error",
        mensaje: "Fecha y descripción son obligatorias.",
      };
      return res.redirect(
        `/mi-panel${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ""}`,
      );
    }

    const montoLimpio = Number(
      String(monto).replace(/\./g, "").replace(",", "."),
    );
    if (Number.isNaN(montoLimpio) || montoLimpio < 0) {
      req.session.flash = {
        tipo: "error",
        mensaje: "Ingresá un monto válido.",
      };
      return res.redirect(
        `/mi-panel${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ""}`,
      );
    }

    await gastoPersonalModel.createGastoPersonal({
      id_empleado,
      fecha,
      descripcion: descripcionLimpia,
      monto: montoLimpio,
      categoria,
      observaciones,
    });

    req.session.flash = {
      tipo: "success",
      mensaje: "Gasto registrado correctamente.",
    };
    res.redirect(
      `/mi-panel${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ""}`,
    );
  } catch (error) {
    logger.error("miPanel.gasto.create.failed", {
      userId: req.session?.user?.id,
      error: error.message,
    });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarGastoPersonal = async (req, res) => {
  try {
    const id_empleado = req.session.user.id_empleado;
    const { id } = req.params;
    const {
      fecha,
      descripcion,
      monto,
      categoria,
      observaciones,
      desde,
      hasta,
    } = req.body;

    const gasto = await gastoPersonalModel.getGastoPersonalById(id);
    if (!gasto || Number(gasto.id_empleado) !== Number(id_empleado)) {
      return res.status(403).send("No tenés permiso para editar este gasto.");
    }

    await gastoPersonalModel.updateGastoPersonal(id, {
      fecha,
      descripcion: (descripcion || "").trim(),
      monto: Number(String(monto).replace(/\./g, "").replace(",", ".")),
      categoria,
      observaciones,
    });

    req.session.flash = {
      tipo: "success",
      mensaje: "Gasto actualizado correctamente.",
    };
    res.redirect(
      `/mi-panel${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ""}`,
    );
  } catch (error) {
    logger.error("miPanel.gasto.update.failed", {
      userId: req.session?.user?.id,
      error: error.message,
    });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarGastoPersonal = async (req, res) => {
  try {
    const id_empleado = req.session.user.id_empleado;
    const { id } = req.params;
    const { desde, hasta } = req.body;

    const gasto = await gastoPersonalModel.getGastoPersonalById(id);
    if (!gasto || Number(gasto.id_empleado) !== Number(id_empleado)) {
      return res.status(403).send("No tenés permiso para eliminar este gasto.");
    }

    await gastoPersonalModel.deleteGastoPersonal(id);

    req.session.flash = { tipo: "success", mensaje: "Gasto eliminado." };
    res.redirect(
      `/mi-panel${desde && hasta ? `?desde=${desde}&hasta=${hasta}` : ""}`,
    );
  } catch (error) {
    logger.error("miPanel.gasto.delete.failed", {
      userId: req.session?.user?.id,
      error: error.message,
    });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = {
  verMiPanel,
  crearGastoPersonal,
  actualizarGastoPersonal,
  eliminarGastoPersonal,
};
