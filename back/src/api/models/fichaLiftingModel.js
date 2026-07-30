const pool = require("../database/db");

const getAllFichasLifting = async () => {
  const query = `
    SELECT f.id, f.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
           f.tamano_molde, f.fecha
    FROM public.fichas_lifting f
    LEFT JOIN public.clientes c ON f.id_cliente = c.id
    ORDER BY f.fecha DESC, f.id DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const createFichaLifting = async ({ id_cliente, tamano_molde, fecha }) => {
  const query = `
    INSERT INTO public.fichas_lifting (id_cliente, tamano_molde, fecha)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [id_cliente, tamano_molde, fecha]);
  return result.rows[0];
};

const getFichaLiftingById = async (id) => {
  const query = `
    SELECT f.id, f.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
           f.tamano_molde, f.fecha
    FROM public.fichas_lifting f
    LEFT JOIN public.clientes c ON f.id_cliente = c.id
    WHERE f.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateFichaLifting = async (id, { id_cliente, tamano_molde, fecha }) => {
  const query = `
    UPDATE public.fichas_lifting
    SET id_cliente = $1,
        tamano_molde = $2,
        fecha = $3
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [id_cliente, tamano_molde, fecha, id]);
  return result.rows[0];
};

const deleteFichaLifting = async (id) => {
  const query = `
    DELETE FROM public.fichas_lifting
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  getAllFichasLifting,
  createFichaLifting,
  getFichaLiftingById,
  updateFichaLifting,
  deleteFichaLifting,
};
