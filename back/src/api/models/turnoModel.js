const pool = require("../database/db");

const getTurnosPorFecha = async (fecha) => {
  const query = `
    SELECT 
      t.id,
      t.fecha,
      t.hora,
      t.costo,
      t.estado,
      t.duracion,
      t.monto_abonado,
      t.id_empleado,
      t.id_cliente,
      t.id_servicio,
      c.nombre AS cliente_nombre,
      c.apellido AS cliente_apellido,
      e.nombre AS empleado_nombre,
      sb.descripcion AS servicio_descripcion
    FROM public.turnos t
    LEFT JOIN public.clientes c ON t.id_cliente = c.id
    LEFT JOIN public.empleados e ON t.id_empleado = e.id
    LEFT JOIN public.servicios_base sb ON t.id_servicio = sb.id
    WHERE t.fecha = $1
    ORDER BY t.hora ASC
  `;
  const result = await pool.query(query, [fecha]);
  return result.rows;
};

const getTurnoById = async (id) => {
  const query = `
    SELECT
      t.id,
      t.fecha,
      t.hora,
      t.costo,
      t.estado,
      t.duracion,
      t.monto_abonado,
      t.porcentaje_ganancia,
      t.propina,
      t.id_empleado,
      t.id_cliente,
      t.id_servicio,
      c.nombre AS cliente_nombre,
      c.apellido AS cliente_apellido,
      e.nombre AS empleado_nombre,
      sb.descripcion AS servicio_descripcion,
      sb.duracion_sugerida
    FROM public.turnos t
    LEFT JOIN public.clientes c ON t.id_cliente = c.id
    LEFT JOIN public.empleados e ON t.id_empleado = e.id
    LEFT JOIN public.servicios_base sb ON t.id_servicio = sb.id
    WHERE t.id = $1
  `;
  const result = await pool.query(query, [id]);
  const turno = result.rows[0];
  if (!turno) return turno;

  turno.pagos = await getPagosDeTurno(id);
  return turno;
};

const insertarPagos = async (turnoId, pagos, client = null) => {
  if (!pagos || pagos.length === 0) return [];

  const executor = client || pool;
  const values = [];
  const placeholders = pagos
    .map((pago, i) => {
      const base = i * 3;
      values.push(turnoId, pago.metodo, pago.monto);
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    })
    .join(", ");

  const query = `
    INSERT INTO public.turno_pagos (turno_id, metodo, monto)
    VALUES ${placeholders}
    RETURNING *;
  `;

  const result = await executor.query(query, values);
  return result.rows;
};

const eliminarPagosDeTurno = async (turnoId, client = null) => {
  const executor = client || pool;
  const query = `DELETE FROM public.turno_pagos WHERE turno_id = $1;`;
  await executor.query(query, [turnoId]);
};

const getPagosDeTurno = async (turnoId) => {
  const query = `
    SELECT id, turno_id, metodo, monto
    FROM public.turno_pagos
    WHERE turno_id = $1
    ORDER BY id ASC;
  `;
  const result = await pool.query(query, [turnoId]);
  return result.rows;
};

const createTurno = async ({
  fecha,
  hora,
  id_cliente,
  id_empleado,
  id_servicio,
  costo,
  estado,
  duracion,
  monto_abonado,
  porcentaje_ganancia,
}, client = null) => {
  const query = `
    INSERT INTO public.turnos
      (
        fecha,
        hora,
        id_cliente,
        id_empleado,
        id_servicio,
        costo,
        estado,
        duracion,
        monto_abonado,
        porcentaje_ganancia
      )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *;
  `;

  const values = [
    fecha,
    hora,
    id_cliente,
    id_empleado,
    id_servicio,
    costo,
    estado,
    duracion,
    monto_abonado,
    porcentaje_ganancia,
  ];

  const executor = client || pool;
  const result = await executor.query(query, values);
  return result.rows[0];
};

const updateTurno = async (
  id,
  {
    fecha,
    hora,
    id_cliente,
    id_empleado,
    id_servicio,
    costo,
    estado,
    duracion,
    monto_abonado,
    propina,
    porcentaje_ganancia,
  },
  client = null,
) => {
  const query = `
    UPDATE public.turnos
    SET
      fecha = $1,
      hora = $2,
      id_cliente = $3,
      id_empleado = $4,
      id_servicio = $5,
      costo = $6,
      estado = $7,
      duracion = $8,
      monto_abonado = $9,
      propina = $10,
      porcentaje_ganancia = $11
    WHERE id = $12
    RETURNING *;
  `;

  const values = [
    fecha,
    hora,
    id_cliente,
    id_empleado,
    id_servicio,
    costo,
    estado,
    duracion,
    monto_abonado,
    propina,
    porcentaje_ganancia,
    id,
  ];

  const executor = client || pool;
  const result = await executor.query(query, values);
  return result.rows[0];
};

const deleteTurno = async (id) => {
  const query = `
    DELETE FROM public.turnos
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getTurnosPorEmpleado = async (idEmpleado) => {
  const query = `
    SELECT 
      t.id,
      t.fecha,
      t.hora,
      t.duracion,
      t.costo,
      t.estado,
      t.monto_abonado,
      t.propina,
      c.nombre AS cliente_nombre,
      c.apellido AS cliente_apellido,
      sb.descripcion AS servicio_descripcion
    FROM public.turnos t
    LEFT JOIN public.clientes c ON t.id_cliente = c.id
    LEFT JOIN public.servicios_base sb ON t.id_servicio = sb.id
    WHERE t.id_empleado = $1
    ORDER BY t.fecha DESC, t.hora DESC
  `;
  const result = await pool.query(query, [idEmpleado]);
  return result.rows;
};

/* =========================================
   SOLAPAMIENTO DE TURNOS
========================================= */
const existeSolapamiento = async (idEmpleado, fecha, hora, duracion, excluirTurnoId = null) => {
  const duracionMinutos = Number(duracion) > 0 ? Number(duracion) : 30;

  const params = [idEmpleado, fecha, hora, duracionMinutos];
  let query = `
    SELECT
      t.id,
      t.hora,
      c.nombre AS cliente_nombre,
      c.apellido AS cliente_apellido
    FROM public.turnos t
    LEFT JOIN public.clientes c ON t.id_cliente = c.id
    WHERE t.id_empleado = $1
      AND t.fecha = $2
      AND t.hora < ($3::time + ($4 || ' minutes')::interval)
      AND $3::time < (t.hora + (COALESCE(t.duracion, 30) || ' minutes')::interval)
  `;

  if (excluirTurnoId) {
    params.push(excluirTurnoId);
    query += ` AND t.id <> $${params.length}`;
  }

  const { rows } = await pool.query(query, params);
  return rows[0] || null;
};

/* =========================================
   TURNOS DE EMPLEADA POR RANGO DE FECHAS
========================================= */
const getTurnosEmpleadoPorRango = async (idEmpleado, fechaInicio, fechaFin) => {
  const query = `
    SELECT 
      t.id,
      t.fecha,
      t.hora,
      t.duracion,
      t.costo,
      t.estado,
      t.monto_abonado,
      t.porcentaje_ganancia,
      t.propina,
      sb.descripcion AS servicio_descripcion,
      c.nombre AS cliente_nombre,
      c.apellido AS cliente_apellido
    FROM public.turnos t
    LEFT JOIN public.clientes c ON t.id_cliente = c.id
    LEFT JOIN public.servicios_base sb ON t.id_servicio = sb.id
    WHERE t.id_empleado = $1
      AND t.fecha BETWEEN $2 AND $3
    ORDER BY t.fecha ASC, t.hora ASC
  `;
  const result = await pool.query(query, [idEmpleado, fechaInicio, fechaFin]);
  return result.rows;
};

const getTurnosPorRango = async (desde, hasta) => {
  const query = `
    SELECT
      t.id,
      t.fecha,
      t.hora,
      t.costo,
      t.estado,
      t.duracion,
      t.monto_abonado,
      t.porcentaje_ganancia,
      t.propina,
      t.id_empleado,
      t.id_cliente,
      t.id_servicio,
      c.nombre AS cliente_nombre,
      c.apellido AS cliente_apellido,
      e.nombre AS empleado_nombre,
      sb.descripcion AS servicio_descripcion,
      COALESCE(tp.monto_efectivo_cobrado, 0) AS monto_efectivo_cobrado,
      COALESCE(tp.monto_transferencia_cobrado, 0) AS monto_transferencia_cobrado
    FROM public.turnos t
    LEFT JOIN public.clientes c ON t.id_cliente = c.id
    LEFT JOIN public.empleados e ON t.id_empleado = e.id
    LEFT JOIN public.servicios_base sb ON t.id_servicio = sb.id
    LEFT JOIN (
      SELECT
        turno_id,
        SUM(monto) FILTER (WHERE metodo = 'efectivo') AS monto_efectivo_cobrado,
        SUM(monto) FILTER (WHERE metodo = 'transferencia') AS monto_transferencia_cobrado
      FROM public.turno_pagos
      GROUP BY turno_id
    ) tp ON tp.turno_id = t.id
    WHERE t.fecha BETWEEN $1 AND $2
    ORDER BY t.fecha ASC, t.hora ASC
  `;
  const { rows } = await pool.query(query, [desde, hasta]);
  return rows;
};

const getUltimosTurnosPorCliente = async (id_cliente, limite = 10) => {
  const query = `
    SELECT 
      t.id,
      t.fecha,
      t.hora,
      t.costo,
      t.estado,
      t.duracion,
      t.monto_abonado,
      e.nombre AS empleado_nombre,
      e.apellido AS empleado_apellido,
      sb.descripcion AS servicio_descripcion
    FROM public.turnos t
    LEFT JOIN public.empleados e ON t.id_empleado = e.id
    LEFT JOIN public.servicios_base sb ON t.id_servicio = sb.id
    WHERE t.id_cliente = $1
    ORDER BY t.fecha DESC, t.hora DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [id_cliente, limite]);
  return result.rows;
};

// Historial para la clienta autenticada (portal de fidelización): a propósito
// NO selecciona costo/monto_abonado/propina ni nada de plata — ese dato nunca
// sale del lado admin.
const getHistorialParaClienta = async (id_cliente, limite = 20, offset = 0) => {
  const query = `
    SELECT
      t.id,
      t.fecha,
      t.hora,
      t.estado,
      e.nombre AS empleado_nombre,
      sb.descripcion AS servicio_descripcion
    FROM public.turnos t
    LEFT JOIN public.empleados e ON t.id_empleado = e.id
    LEFT JOIN public.servicios_base sb ON t.id_servicio = sb.id
    WHERE t.id_cliente = $1
    ORDER BY t.fecha DESC, t.hora DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [id_cliente, limite, offset]);
  return result.rows;
};

module.exports = {
  getTurnosPorFecha,
  getTurnoById,
  createTurno,
  updateTurno,
  deleteTurno,
  getTurnosPorEmpleado,
  getTurnosEmpleadoPorRango,
  getTurnosPorRango,
  getUltimosTurnosPorCliente,
  getHistorialParaClienta,
  insertarPagos,
  eliminarPagosDeTurno,
  getPagosDeTurno,
  existeSolapamiento,
};
