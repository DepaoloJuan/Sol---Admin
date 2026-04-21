const turnoModel = require("../api/models/turnoModel");
const gastoModel = require("../api/models/gastoModel");
const empleadoModel = require("../api/models/empleadoModel");
const { formatDate } = require("./dateHelpers");

const calcularDatosReportes = async (req) => {
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const desde =
    (req.body && req.body.desde) ||
    (req.query && req.query.desde) ||
    formatDate(inicioMes);
  const hasta =
    (req.body && req.body.hasta) ||
    (req.query && req.query.hasta) ||
    formatDate(hoy);

  const turnos = await turnoModel.getTurnosPorRango(desde, hasta);
  const gastos = await gastoModel.getGastosPorRango(desde, hasta);
  const empleados = await empleadoModel.getAllEmpleados();

  const totalTurnos = turnos.length;
  const totalFacturado = turnos.reduce(
    (acc, t) => acc + Number(t.costo || 0),
    0,
  );
  const totalCobrado = turnos.reduce((acc, t) => {
    if (t.estado === "Pagado") return acc + Number(t.costo || 0);
    return acc + Number(t.monto_abonado || 0);
  }, 0);
  const totalDeuda = turnos.reduce((acc, t) => {
    if (t.estado === "Pagado") return acc;
    return acc + (Number(t.costo || 0) - Number(t.monto_abonado || 0));
  }, 0);
  const totalGastos = gastos.reduce(
    (acc, g) => acc + Number(g.monto || 0),
    0,
  );

  // Sueldos por empleada
  const sueldosPorEmpleada = empleados.map((emp) => {
    const turnosEmpleada = turnos.filter(
      (t) => Number(t.id_empleado) === Number(emp.id),
    );
    const totalTurnosEmp = turnosEmpleada.length;
    const facturacionEmp = turnosEmpleada.reduce(
      (acc, t) => acc + Number(t.costo || 0),
      0,
    );
    const sueldoEmp = turnosEmpleada.reduce(
      (acc, t) =>
        acc + Number(t.costo || 0) * (Number(t.porcentaje_ganancia || 0) / 100),
      0,
    );
    return {
      id: emp.id,
      nombre: emp.nombre,
      apellido: emp.apellido || "",
      totalTurnos: totalTurnosEmp,
      facturacion: facturacionEmp,
      sueldo: sueldoEmp,
    };
  }).filter((emp) => emp.totalTurnos > 0);

  const totalSueldos = sueldosPorEmpleada.reduce(
    (acc, emp) => acc + emp.sueldo,
    0,
  );
  const gananciaNeta = totalCobrado - totalGastos - totalSueldos;

  return {
    desde,
    hasta,
    turnos,
    gastos,
    sueldosPorEmpleada,
    resumen: {
      totalTurnos,
      totalFacturado,
      totalCobrado,
      totalDeuda,
      totalGastos,
      totalSueldos,
      gananciaNeta,
    },
  };
};

module.exports = { calcularDatosReportes, formatDate };
