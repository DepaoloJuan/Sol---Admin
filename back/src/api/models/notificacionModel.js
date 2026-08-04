const pool = require("../database/db");

const crearNotificacion = async (idUsuario, { titulo, cuerpo, url }) => {
  const query = `
    INSERT INTO public.notificaciones (id_usuario, titulo, cuerpo, url)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [idUsuario, titulo, cuerpo || null, url || null]);
  return rows[0];
};

const getNotificacionesPorUsuario = async (idUsuario, limit = 20, offset = 0) => {
  const query = `
    SELECT id, titulo, cuerpo, url, leida, created_at
    FROM public.notificaciones
    WHERE id_usuario = $1
    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
  `;
  const { rows } = await pool.query(query, [idUsuario, limit, offset]);
  return rows;
};

const marcarTodasLeidas = async (idUsuario) => {
  await pool.query(
    `UPDATE public.notificaciones SET leida = true WHERE id_usuario = $1 AND leida = false`,
    [idUsuario],
  );
};

const contarNoLeidas = async (idUsuario) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.notificaciones WHERE id_usuario = $1 AND leida = false`,
    [idUsuario],
  );
  return rows[0].total;
};

module.exports = {
  crearNotificacion,
  getNotificacionesPorUsuario,
  marcarTodasLeidas,
  contarNoLeidas,
};
