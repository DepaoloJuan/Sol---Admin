const pool = require("../database/db");

const guardarSuscripcion = async (idUsuario, { endpoint, keys }) => {
  const query = `
    INSERT INTO public.push_subscriptions (id_usuario, endpoint, p256dh, auth)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = $3, auth = $4
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [idUsuario, endpoint, keys.p256dh, keys.auth]);
  return rows[0];
};

const getSuscripcionesPorUsuario = async (idUsuario) => {
  const query = `
    SELECT id, id_usuario, endpoint, p256dh, auth
    FROM public.push_subscriptions
    WHERE id_usuario = $1
  `;
  const { rows } = await pool.query(query, [idUsuario]);
  return rows;
};

const getSuscripcionesPorRol = async (rol) => {
  const query = `
    SELECT ps.id, ps.id_usuario, ps.endpoint, ps.p256dh, ps.auth
    FROM public.push_subscriptions ps
    JOIN public.usuarios u ON u.id = ps.id_usuario
    WHERE u.rol = $1
  `;
  const { rows } = await pool.query(query, [rol]);
  return rows;
};

const eliminarSuscripcion = async (endpoint) => {
  await pool.query(`DELETE FROM public.push_subscriptions WHERE endpoint = $1`, [endpoint]);
};

module.exports = {
  guardarSuscripcion,
  getSuscripcionesPorUsuario,
  getSuscripcionesPorRol,
  eliminarSuscripcion,
};
