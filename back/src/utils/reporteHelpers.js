const turnoModel = require("../api/models/turnoModel");
const gastoModel = require("../api/models/gastoModel");

const formatDate = (d) => d.toISOString().split("T")[0];

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
  const gananciaNeta = totalCobrado - totalGastos;

  return {
    desde,
    hasta,
    turnos,
    gastos,
    resumen: {
      totalTurnos,
      totalFacturado,
      totalCobrado,
      totalDeuda,
      totalGastos,
      gananciaNeta,
    },
  };
};

module.exports = { calcularDatosReportes, formatDate };
