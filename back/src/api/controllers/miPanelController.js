const turnoModel = require("../models/turnoModel");
const empleadoModel = require("../models/empleadoModel");

const formatDate = (fecha) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calcularMetricas = (lista, porcentaje) => {
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
  const comisionEstimada = facturacionTotal * (Number(porcentaje || 0) / 100);
  return { totalTurnos, horasTrabajadas, facturacionTotal, comisionEstimada };
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

    // Hoy
    const fechaHoy = formatDate(hoy);

    // Semana actual (lunes a domingo)
    const diaActual = hoy.getDay();
    const diferenciaParaLunes = diaActual === 0 ? -6 : 1 - diaActual;
    const primerDiaSemana = new Date(hoy);
    primerDiaSemana.setHours(0, 0, 0, 0);
    primerDiaSemana.setDate(hoy.getDate() + diferenciaParaLunes);
    const ultimoDiaSemana = new Date(primerDiaSemana);
    ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);

    const fechaInicioSemana = formatDate(primerDiaSemana);
    const fechaFinSemana = formatDate(ultimoDiaSemana);

    // Mes actual
    const fechaInicioMes = formatDate(
      new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    );
    const fechaFinMes = formatDate(
      new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0),
    );

    // Turnos
    const turnosHoy = await turnoModel.getTurnosEmpleadoPorRango(
      id_empleado,
      fechaHoy,
      fechaHoy,
    );
    const turnosSemana = await turnoModel.getTurnosEmpleadoPorRango(
      id_empleado,
      fechaInicioSemana,
      fechaFinSemana,
    );
    const turnosMes = await turnoModel.getTurnosEmpleadoPorRango(
      id_empleado,
      fechaInicioMes,
      fechaFinMes,
    );

    // Métricas
    const metricasHoy = calcularMetricas(
      turnosHoy,
      empleada.porcentaje_ganancia,
    );
    const metricasSemana = calcularMetricas(
      turnosSemana,
      empleada.porcentaje_ganancia,
    );
    const metricasMes = calcularMetricas(
      turnosMes,
      empleada.porcentaje_ganancia,
    );

    res.render("miPanel/index", {
      title: "Mi Panel",
      user: req.session.user,
      empleada,
      turnosHoy,
      turnosSemana,
      turnosMes,
      metricasHoy,
      metricasSemana,
      metricasMes,
      fechaHoy,
      fechaInicioSemana,
      fechaFinSemana,
    });
  } catch (error) {
    console.error("Error al cargar mi panel:", error);
    res.status(500).send("Error interno del servidor");
  }
};

module.exports = { verMiPanel };
