const pool = require("../database/db");

const getAllServicios = async () => {
  const query = `
    SELECT id, descripcion, precio, duracion_sugerida
    FROM public.servicios_base
    ORDER BY descripcion ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const createServicio = async ({ descripcion, precio, duracion_sugerida }) => {
  const query = `
    INSERT INTO public.servicios_base (descripcion, precio, duracion_sugerida)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [
    descripcion,
    precio || 0,
    duracion_sugerida || 30,
  ]);
  return result.rows[0];
};

const updateDuracionSugerida = async (id, duracion_sugerida) => {
  const query = `
    UPDATE public.servicios_base
    SET duracion_sugerida = $1
    WHERE id = $2
    RETURNING *;
  `;
  const result = await pool.query(query, [duracion_sugerida, id]);
  return result.rows[0];
};

const searchServicios = async (q) => {
  const query = `
    SELECT id, descripcion, precio, duracion_sugerida
    FROM public.servicios_base
    WHERE LOWER(descripcion) LIKE LOWER($1)
    ORDER BY descripcion ASC
  `;
  const result = await pool.query(query, [`%${q}%`]);
  return result.rows;
};

const getServicioById = async (id) => {
  const query = `
    SELECT id, descripcion, precio, duracion_sugerida
    FROM public.servicios_base
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateServicio = async (
  id,
  { descripcion, precio, duracion_sugerida },
) => {
  const query = `
    UPDATE public.servicios_base
    SET descripcion = $1,
        precio = $2,
        duracion_sugerida = $3
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [
    descripcion,
    precio || 0,
    duracion_sugerida || 30,
    id,
  ]);
  return result.rows[0];
};

const deleteServicio = async (id) => {
  const query = `
    DELETE FROM public.servicios_base
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updatePrecioYDuracionSugerida = async (id, precio, duracion_sugerida) => {
  const query = `
    UPDATE public.servicios_base
    SET precio = $1,
        duracion_sugerida = $2
    WHERE id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [precio, duracion_sugerida, id]);
  return result.rows[0];
};

module.exports = {
  getAllServicios,
  createServicio,
  updateDuracionSugerida,
  searchServicios,
  getServicioById,
  updateServicio,
  deleteServicio,
  updatePrecioYDuracionSugerida,
};
