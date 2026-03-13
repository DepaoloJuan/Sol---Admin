const pool = require("../database/db");

/* ================================
   OBTENER TODOS LOS GASTOS
================================ */
const getAllGastos = async () => {
  const query = `
    SELECT *
    FROM public.gastos
    ORDER BY fecha DESC, id DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

/* ================================
   CREAR GASTO
================================ */
const createGasto = async ({
  fecha,
  descripcion,
  monto,
  categoria,
  observaciones,
}) => {
  const query = `
    INSERT INTO public.gastos
      (fecha, descripcion, monto, categoria, observaciones)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    fecha,
    descripcion,
    monto,
    categoria || null,
    observaciones || null,
  ]);
  return rows[0];
};

const getGastosPorRango = async (desde, hasta) => {
  const query = `
    SELECT *
    FROM public.gastos
    WHERE fecha BETWEEN $1 AND $2
    ORDER BY fecha ASC
  `;
  const { rows } = await pool.query(query, [desde, hasta]);
  return rows;
};

/* ================================
   OBTENER GASTO POR ID
================================ */
const getGastoById = async (id) => {
  const query = `SELECT * FROM public.gastos WHERE id = $1`;
  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
};

/* ================================
   ACTUALIZAR GASTO
================================ */
const updateGasto = async (
  id,
  { fecha, descripcion, monto, categoria, observaciones },
) => {
  const query = `
    UPDATE public.gastos
    SET fecha = $1, descripcion = $2, monto = $3, categoria = $4, observaciones = $5
    WHERE id = $6
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    fecha,
    descripcion,
    monto,
    categoria || null,
    observaciones || null,
    id,
  ]);
  return rows[0];
};

/* ================================
   ELIMINAR GASTO
================================ */
const deleteGasto = async (id) => {
  const query = `DELETE FROM public.gastos WHERE id = $1 RETURNING id`;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

module.exports = {
  getAllGastos,
  createGasto,
  getGastosPorRango,
  getGastoById,
  updateGasto,
  deleteGasto,
};
