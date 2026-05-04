const pool = require("../database/db");

const getGastosPersonalesPorRango = async (id_empleado, desde, hasta) => {
  const { rows } = await pool.query(
    `SELECT *
     FROM public.gastos_personales
     WHERE id_empleado = $1
       AND fecha BETWEEN $2 AND $3
     ORDER BY fecha ASC`,
    [id_empleado, desde, hasta],
  );
  return rows;
};

const createGastoPersonal = async ({
  id_empleado,
  fecha,
  descripcion,
  monto,
  categoria,
  observaciones,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO public.gastos_personales
       (id_empleado, fecha, descripcion, monto, categoria, observaciones)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id_empleado,
      fecha,
      descripcion,
      monto,
      categoria || null,
      observaciones || null,
    ],
  );
  return rows[0];
};

const getGastoPersonalById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.gastos_personales WHERE id = $1`,
    [id],
  );
  return rows[0];
};

const updateGastoPersonal = async (
  id,
  { fecha, descripcion, monto, categoria, observaciones },
) => {
  const { rows } = await pool.query(
    `UPDATE public.gastos_personales
     SET fecha = $1, descripcion = $2, monto = $3, categoria = $4, observaciones = $5
     WHERE id = $6
     RETURNING *`,
    [fecha, descripcion, monto, categoria || null, observaciones || null, id],
  );
  return rows[0];
};

const deleteGastoPersonal = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM public.gastos_personales WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0];
};

module.exports = {
  getGastosPersonalesPorRango,
  createGastoPersonal,
  getGastoPersonalById,
  updateGastoPersonal,
  deleteGastoPersonal,
};
