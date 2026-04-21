const turnoModel = require("../models/turnoModel");
const empleadoModel = require("../models/empleadoModel");
const logger = require("../../utils/logger");
const { formatDate } = require("../../utils/dateHelpers");

const calcularMetricas = (lista) => {
  const totalTurnos = lista.length;
  const totalMinutos = lista.reduce(
    (acc, t) => acc + Number(t.duracion || 0),
    0,
  );
  const horasTrabajadas = (totalMinutos / 60).toFixed(1);
  const facturacionTotal = lista.reduce(
    (acc, t) => acc + Number(t.costo || 0),
    0,
  );
  const comisionEstimada = lista.reduce(
    (acc, t) =>
      acc + Number(t.costo || 0) * (Number(t.porcentaje_ganancia || 0) / 100),
    0,
  );
  const totalPropinas = lista.reduce(
    (acc, t) => acc + Number(t.propina || 0),
    0,
  );
  return {
    totalTurnos,
    horasTrabajadas,
    facturacionTotal,
    comisionEstimada,
    totalPropinas,
  };
};

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
    const primerDiaSemanaActual = new Date(hoy);
    primerDiaSemanaActual.setHours(0, 0, 0, 0);
    primerDiaSemanaActual.setDate(hoy.getDate() + diferenciaParaLunes);
    const ultimoDiaSemanaActual = new Date(primerDiaSemanaActual);
    ultimoDiaSemanaActual.setDate(primerDiaSemanaActual.getDate() + 6);

    // Semana anterior
    const primerDiaSemanaAnterior = new Date(primerDiaSemanaActual);
    primerDiaSemanaAnterior.setDate(primerDiaSemanaActual.getDate() - 7);
    const ultimoDiaSemanaAnterior = new Date(primerDiaSemanaAnterior);
    ultimoDiaSemanaAnterior.setDate(primerDiaSemanaAnterior.getDate() + 6);

    // Semana siguiente
    const primerDiaSemanaSiguiente = new Date(primerDiaSemanaActual);
    primerDiaSemanaSiguiente.setDate(primerDiaSemanaActual.getDate() + 7);
    const ultimoDiaSemanaSiguiente = new Date(primerDiaSemanaSiguiente);
    ultimoDiaSemanaSiguiente.setDate(primerDiaSemanaSiguiente.getDate() + 6);

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

    // Fechas formateadas
    const fechaInicioSemanaActual = formatDate(primerDiaSemanaActual);
    const fechaFinSemanaActual = formatDate(ultimoDiaSemanaActual);
    const fechaInicioSemanaAnterior = formatDate(primerDiaSemanaAnterior);
    const fechaFinSemanaAnterior = formatDate(ultimoDiaSemanaAnterior);
    const fechaInicioSemanaSiguiente = formatDate(primerDiaSemanaSiguiente);
    const fechaFinSemanaSiguiente = formatDate(ultimoDiaSemanaSiguiente);

    // Queries
    const turnosSemanaActual = await turnoModel.getTurnosEmpleadoPorRango(
      id_empleado,
      fechaInicioSemanaActual,
      fechaFinSemanaActual,
    );
    const turnosSemanaAnterior = await turnoModel.getTurnosEmpleadoPorRango(
      id_empleado,
      fechaInicioSemanaAnterior,
      fechaFinSemanaAnterior,
    );
    const turnosSemanaSiguiente = await turnoModel.getTurnosEmpleadoPorRango(
      id_empleado,
      fechaInicioSemanaSiguiente,
      fechaFinSemanaSiguiente,
    );
    const turnosMes = await turnoModel.getTurnosEmpleadoPorRango(
      id_empleado,
      fechaInicioMes,
      fechaFinMes,
    );
    const turnosFiltro =
      desde && hasta
        ? await turnoModel.getTurnosEmpleadoPorRango(id_empleado, desde, hasta)
        : [];

    // Métricas
    const metricasSemanaActual = calcularMetricas(turnosSemanaActual);
    const metricasSemanaAnterior = calcularMetricas(turnosSemanaAnterior);
    const metricasSemanaSiguiente = calcularMetricas(turnosSemanaSiguiente);
    const metricasMes = calcularMetricas(turnosMes);
    const metricasFiltro = calcularMetricas(turnosFiltro);

    res.render("miPanel/index", {
      title: "Mi Panel",
      user: req.session.user,
      empleada,
      turnosSemanaActual,
      turnosSemanaAnterior,
      turnosSemanaSiguiente,
      turnosMes,
      turnosFiltro,
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
    });
  } catch (error) {
    logger.error("miPanel.load.failed", { userId: req.session?.user?.id, error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = { verMiPanel };
