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

const calcularDatosDashboard = async () => {
  const hoy = new Date();
  const hasta = formatDate(hoy);
  const [year, month] = hasta.split('-');
  const desde = `${year}-${month}-01`;

  const turnos = await turnoModel.getTurnosPorRango(desde, hasta);
  const gastos = await gastoModel.getGastosPorRango(desde, hasta);
  const empleados = await empleadoModel.getAllEmpleados();

  // --- Stat cards ---
  const totalFacturado = turnos.reduce((acc, t) => acc + Number(t.costo || 0), 0);
  const totalCobrado = turnos.reduce((acc, t) => {
    if (t.estado === 'Pagado') return acc + Number(t.costo || 0);
    return acc + Number(t.monto_abonado || 0);
  }, 0);
  const totalDeuda = totalFacturado - totalCobrado;
  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);

  const totalSueldos = empleados.reduce((acc, emp) => {
    const turnosEmp = turnos.filter(t => Number(t.id_empleado) === Number(emp.id));
    const sueldo = turnosEmp.reduce(
      (s, t) => s + Number(t.costo || 0) * (Number(t.porcentaje_ganancia || 0) / 100),
      0
    );
    return acc + sueldo;
  }, 0);

  const gananciaNeta = totalCobrado - totalGastos - totalSueldos;

  // --- Facturación diaria del mes ---
  const toFechaStr = (f) =>
    f instanceof Date ? f.toISOString().slice(0, 10) : String(f).slice(0, 10);

  const facturacionPorDia = {};
  turnos.forEach(t => {
    const dia = toFechaStr(t.fecha);
    facturacionPorDia[dia] = (facturacionPorDia[dia] || 0) + Number(t.costo || 0);
  });

  const diasDelMes = [];
  let cursorStr = desde;
  while (cursorStr <= hasta) {
    diasDelMes.push(cursorStr);
    const d = new Date(cursorStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    cursorStr = formatDate(d);
  }

  const graficoFacDiaria = {
    labels: diasDelMes,
    valores: diasDelMes.map(d => Math.round(facturacionPorDia[d] || 0)),
  };

  // --- Top 5 servicios ---
  const conteoServicios = {};
  turnos.forEach(t => {
    const nombre = t.servicio_descripcion || 'Sin servicio';
    conteoServicios[nombre] = (conteoServicios[nombre] || 0) + 1;
  });
  const top5Servicios = Object.entries(conteoServicios)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const graficoServicios = {
    labels: top5Servicios.map(s => s[0]),
    valores: top5Servicios.map(s => s[1]),
  };

  // --- Ranking empleadas ---
  const rankingEmpleadas = empleados.map(emp => {
    const turnosEmp = turnos.filter(t => Number(t.id_empleado) === Number(emp.id));
    const facturacion = turnosEmp.reduce((acc, t) => acc + Number(t.costo || 0), 0);
    const sueldo = turnosEmp.reduce(
      (acc, t) => acc + Number(t.costo || 0) * (Number(t.porcentaje_ganancia || 0) / 100),
      0
    );
    return {
      nombre: emp.nombre,
      totalTurnos: turnosEmp.length,
      facturacion: Math.round(facturacion),
      sueldo: Math.round(sueldo),
    };
  })
  .filter(e => e.totalTurnos > 0)
  .sort((a, b) => b.facturacion - a.facturacion);

  return {
    desde,
    hasta,
    resumen: {
      totalFacturado: Math.round(totalFacturado),
      totalCobrado: Math.round(totalCobrado),
      totalDeuda: Math.round(totalDeuda),
      gananciaNeta: Math.round(gananciaNeta),
    },
    graficoFacDiaria,
    graficoServicios,
    rankingEmpleadas,
  };
};

module.exports = { calcularDatosReportes, calcularDatosDashboard, formatDate };
