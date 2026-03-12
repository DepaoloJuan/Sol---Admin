const pool = require("../database/db");

const getAllEmpleados = async () => {
  const query = `
    SELECT id, nombre, apellido, telefono, email, porcentaje_ganancia
    FROM public.empleados
    ORDER BY id ASC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const searchEmpleados = async (q) => {
  const query = `
    SELECT id, nombre, apellido, telefono, email, porcentaje_ganancia
    FROM public.empleados
    WHERE LOWER(nombre) LIKE LOWER($1)
       OR LOWER(apellido) LIKE LOWER($1)
    ORDER BY id ASC
  `;
  const result = await pool.query(query, [`%${q}%`]);
  return result.rows;
};

const getEmpleadoById = async (id) => {
  const query = `
    SELECT id, nombre, apellido, telefono, email, porcentaje_ganancia
    FROM public.empleados
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const createEmpleado = async ({
  nombre,
  apellido,
  telefono,
  email,
  porcentaje_ganancia,
}) => {
  const query = `
    INSERT INTO public.empleados
      (nombre, apellido, telefono, email, porcentaje_ganancia)
    VALUES
      ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const result = await pool.query(query, [
    nombre,
    apellido || null,
    telefono || null,
    email || null,
    porcentaje_ganancia || 0,
  ]);
  return result.rows[0];
};

const updateEmpleado = async (
  id,
  { nombre, apellido, telefono, email, porcentaje_ganancia },
) => {
  const query = `
    UPDATE public.empleados
    SET nombre = $1,
        apellido = $2,
        telefono = $3,
        email = $4,
        porcentaje_ganancia = $5
    WHERE id = $6
    RETURNING *;
  `;
  const result = await pool.query(query, [
    nombre,
    apellido || null,
    telefono || null,
    email || null,
    porcentaje_ganancia || 0,
    id,
  ]);
  return result.rows[0];
};

const deleteEmpleado = async (id) => {
  const query = `
    DELETE FROM public.empleados
    WHERE id = $1
    RETURNING *;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  getAllEmpleados,
  searchEmpleados,
  getEmpleadoById,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
};
