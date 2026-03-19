const pool = require("../database/db");

const findUserByEmail = async (email) => {
  const query = `
    SELECT id, email, password, rol, id_empleado
    FROM public.usuarios
    WHERE email = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

const getAllUsuarios = async () => {
  const query = `
    SELECT u.id, u.email, u.rol, u.id_empleado,
           e.nombre AS empleado_nombre, e.apellido AS empleado_apellido
    FROM public.usuarios u
    LEFT JOIN public.empleados e ON u.id_empleado = e.id
    ORDER BY u.id ASC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

const createUsuario = async ({ email, password, rol, id_empleado }) => {
  const query = `
    INSERT INTO public.usuarios (email, password, rol, id_empleado)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    email,
    password,
    rol,
    id_empleado || null,
  ]);
  return rows[0];
};

const getUsuarioById = async (id) => {
  const query = `
    SELECT id, email, rol, id_empleado
    FROM public.usuarios
    WHERE id = $1
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

const updateUsuario = async (id, { email, rol, id_empleado }) => {
  const query = `
    UPDATE public.usuarios
    SET email = $1, rol = $2, id_empleado = $3
    WHERE id = $4
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [
    email,
    rol,
    id_empleado || null,
    id,
  ]);
  return rows[0];
};

const updatePassword = async (id, password) => {
  const query = `
    UPDATE public.usuarios
    SET password = $1
    WHERE id = $2
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [password, id]);
  return rows[0];
};

const deleteUsuario = async (id) => {
  const query = `
    DELETE FROM public.usuarios
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

module.exports = {
  findUserByEmail,
  getAllUsuarios,
  createUsuario,
  getUsuarioById,
  updateUsuario,
  updatePassword,
  deleteUsuario,
};
