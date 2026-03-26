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
  return result.rows[0];
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
}) => {
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
        monto_abonado
      )
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
  ];

  const result = await pool.query(query, values);
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
  },
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
      propina = $10
    WHERE id = $11
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
    id,
  ];

  const result = await pool.query(query, values);
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
      t.propina,
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
};
