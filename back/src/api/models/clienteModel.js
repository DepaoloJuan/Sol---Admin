const pool = require("../database/db");

const getAllClientes = async () => {
  const query = `
    SELECT id, nombre, apellido, telefono
    FROM public.clientes
    ORDER BY nombre ASC, apellido ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const createCliente = async ({ nombre, apellido, telefono }) => {
  const query = `
    INSERT INTO public.clientes (nombre, apellido, telefono)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [nombre, apellido, telefono || null]);
  return result.rows[0];
};

const searchClientes = async (q) => {
  const query = `
    SELECT id, nombre, apellido, telefono
    FROM public.clientes
    WHERE
      LOWER(nombre) LIKE LOWER($1)
      OR LOWER(apellido) LIKE LOWER($1)
      OR LOWER(CONCAT(nombre, ' ', apellido)) LIKE LOWER($1)
    ORDER BY nombre ASC, apellido ASC
  `;
  const result = await pool.query(query, [`%${q}%`]);
  return result.rows;
};

const getClienteById = async (id) => {
  const query = `
    SELECT id, nombre, apellido, telefono
    FROM public.clientes
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const updateCliente = async (id, { nombre, apellido, telefono }) => {
  const query = `
    UPDATE public.clientes
    SET nombre = $1,
        apellido = $2,
        telefono = $3
    WHERE id = $4
    RETURNING *;
  `;
  const result = await pool.query(query, [
    nombre,
    apellido,
    telefono || null,
    id,
  ]);
  return result.rows[0];
};

const deleteCliente = async (id) => {
  const query = `
    DELETE FROM public.clientes
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  getAllClientes,
  createCliente,
  searchClientes,
  getClienteById,
  updateCliente,
  deleteCliente,
};
