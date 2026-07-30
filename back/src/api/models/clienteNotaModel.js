const pool = require("../database/db");

const getNotasPorCliente = async (idCliente) => {
  const query = `
    SELECT
      n.id,
      n.texto,
      n.created_at,
      COALESCE(e.nombre, u.email) AS autor_nombre,
      u.email AS autor_email
    FROM public.cliente_notas n
    LEFT JOIN public.usuarios u ON n.id_usuario = u.id
    LEFT JOIN public.empleados e ON u.id_empleado = e.id
    WHERE n.id_cliente = $1
    ORDER BY n.created_at DESC
  `;
  const result = await pool.query(query, [idCliente]);
  return result.rows;
};

const createNotaCliente = async (idCliente, idUsuario, texto) => {
  const query = `
    INSERT INTO public.cliente_notas (id_cliente, id_usuario, texto)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [idCliente, idUsuario, texto]);
  return result.rows[0];
};

module.exports = { getNotasPorCliente, createNotaCliente };
