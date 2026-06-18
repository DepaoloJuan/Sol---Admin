const pool = require("../api/database/db");

const getAlertasAgenda = async (fecha) => {
  const alertas = [];

  // Turnos con saldo pendiente del día
  const { rows: turnosPendientes } = await pool.query(
    `SELECT t.id, c.nombre, c.apellido, t.costo, t.monto_abonado
     FROM turnos t
     JOIN clientes c ON c.id = t.id_cliente
     WHERE t.fecha = $1
       AND t.estado IN ('Pendiente', 'Parcial')
       AND t.costo > 0`,
    [fecha],
  );

  if (turnosPendientes.length > 0) {
    const total = turnosPendientes.reduce(
      (acc, t) => acc + Number(t.costo) - Number(t.monto_abonado),
      0,
    );
    alertas.push({
      id: `deuda-agenda-${fecha}`,
      tipo: "warning",
      tipoExpiracion: "deuda",
      mensaje: `${turnosPendientes.length} turno${turnosPendientes.length > 1 ? "s" : ""} con saldo pendiente hoy ($${Math.round(total).toLocaleString("es-AR")})`,
      link: `/agenda?fecha=${fecha}`,
    });
  }

  // Cumpleaños hoy
  const hoy = new Date(fecha + "T12:00:00");
  const dia = hoy.getDate();
  const mes = hoy.getMonth() + 1;

  const { rows: cumples } = await pool.query(
    `SELECT nombre, apellido FROM clientes
     WHERE dia_cumple = $1 AND mes_cumple = $2`,
    [dia, mes],
  );

  cumples.forEach((c) => {
    alertas.push({
      id: `cumple-${c.nombre}-${c.apellido || ""}-${fecha}`,
      tipo: "info",
      tipoExpiracion: "cumple",
      mensaje: `🎂 Hoy cumple años ${c.nombre}${c.apellido ? " " + c.apellido : ""}`,
      link: `/clientes`,
    });
  });

  return alertas;
};

const getAlertasDashboard = async () => {
  const alertas = [];
  const hoy = new Date();
  const dia = hoy.getDate();
  const mes = hoy.getMonth() + 1;
  const fechaHoy = hoy.toISOString().slice(0, 10);

  // Cumpleaños hoy
  const { rows: cumples } = await pool.query(
    `SELECT nombre, apellido FROM clientes
     WHERE dia_cumple = $1 AND mes_cumple = $2`,
    [dia, mes],
  );

  cumples.forEach((c) => {
    alertas.push({
      id: `cumple-${c.nombre}-${c.apellido || ""}-${fechaHoy}`,
      tipo: "info",
      tipoExpiracion: "cumple",
      mensaje: `🎂 Hoy cumple años ${c.nombre}${c.apellido ? " " + c.apellido : ""}`,
      link: `/clientes`,
    });
  });

  // Deuda total pendiente
  const {
    rows: [deuda],
  } = await pool.query(
    `SELECT COALESCE(SUM(costo - monto_abonado), 0) AS total
     FROM turnos
     WHERE estado IN ('Pendiente', 'Parcial') AND costo > 0`,
  );

  if (Number(deuda.total) > 0) {
    alertas.push({
      id: "deuda-total",
      tipo: "warning",
      tipoExpiracion: "deuda",
      mensaje: `Deuda total pendiente: $${Math.round(Number(deuda.total)).toLocaleString("es-AR")}`,
      link: `/reportes`,
    });
  }

  return alertas;
};

module.exports = { getAlertasAgenda, getAlertasDashboard };
