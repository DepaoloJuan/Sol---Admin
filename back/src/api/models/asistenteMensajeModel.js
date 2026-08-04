const pool = require("../database/db");

const guardarMensaje = async (idUsuario, rol, texto) => {
  const query = `
    INSERT INTO public.asistente_mensajes (id_usuario, rol, texto)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [idUsuario, rol, texto]);
  return rows[0];
};

const getUltimosMensajes = async (idUsuario, limit = 40) => {
  const query = `
    SELECT rol, texto, created_at
    FROM public.asistente_mensajes
    WHERE id_usuario = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const { rows } = await pool.query(query, [idUsuario, limit]);
  return rows.reverse();
};

const vaciarMensajes = async (idUsuario) => {
  await pool.query(`DELETE FROM public.asistente_mensajes WHERE id_usuario = $1`, [idUsuario]);
};

module.exports = {
  guardarMensaje,
  getUltimosMensajes,
  vaciarMensajes,
};
