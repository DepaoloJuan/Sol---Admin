const pool = require("../database/db");

const getAllFichasExtensiones = async () => {
  const query = `
    SELECT f.id, f.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
           f.diseno, f.fecha
    FROM public.fichas_extensiones f
    LEFT JOIN public.clientes c ON f.id_cliente = c.id
    ORDER BY f.fecha DESC, f.id DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const createFichaExtensiones = async ({ id_cliente, diseno, fecha }) => {
  const query = `
    INSERT INTO public.fichas_extensiones (id_cliente, diseno, fecha)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [id_cliente, diseno, fecha]);
  return result.rows[0];
};

const getFichaExtensionesById = async (id) => {
  const query = `
    SELECT f.id, f.id_cliente, c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
           f.diseno, f.fecha
    FROM public.fichas_extensiones f
    LEFT JOIN public.clientes c ON f.id_cliente = c.id
    WHERE f.id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateFichaExtensiones = async (id, { id_cliente, diseno, fecha }) => {
  const query = `
    UPDATE public.fichas_extensiones
    SET id_cliente = $1,
        diseno = $2,
        fecha = $3
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [id_cliente, diseno, fecha, id]);
  return result.rows[0];
};

const deleteFichaExtensiones = async (id) => {
  const query = `
    DELETE FROM public.fichas_extensiones
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  getAllFichasExtensiones,
  createFichaExtensiones,
  getFichaExtensionesById,
  updateFichaExtensiones,
  deleteFichaExtensiones,
};
