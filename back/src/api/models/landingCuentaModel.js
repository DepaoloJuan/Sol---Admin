const pool = require("../database/db");

const buscarPorGoogleSub = async (googleSub) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.landing_cuentas WHERE google_sub = $1`,
    [googleSub],
  );
  return rows[0];
};

const buscarPorEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.landing_cuentas WHERE email = $1`,
    [email],
  );
  return rows[0];
};

const buscarPorToken = async (token) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.landing_cuentas WHERE token_sesion = $1 AND token_expira_at > now()`,
    [token],
  );
  return rows[0];
};

const buscarPorResetToken = async (resetToken) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.landing_cuentas WHERE reset_token = $1 AND reset_token_expira > now()`,
    [resetToken],
  );
  return rows[0];
};

const crearCuenta = async ({ googleSub, email, nombre }) => {
  const { rows } = await pool.query(
    `INSERT INTO public.landing_cuentas (google_sub, email, nombre)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [googleSub, email, nombre],
  );
  return rows[0];
};

const crearCuentaConPassword = async ({ email, nombre, passwordHash }) => {
  const { rows } = await pool.query(
    `INSERT INTO public.landing_cuentas (email, nombre, password_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, nombre, passwordHash],
  );
  return rows[0];
};

// telefonoIngresado en null/undefined deja el valor existente sin tocar (COALESCE)
const actualizarVinculacion = async (id, { telefonoIngresado, idCliente, estadoVinculacion }) => {
  const { rows } = await pool.query(
    `UPDATE public.landing_cuentas
     SET telefono_ingresado = COALESCE($2, telefono_ingresado),
         id_cliente = $3,
         estado_vinculacion = $4,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, telefonoIngresado ?? null, idCliente, estadoVinculacion],
  );
  return rows[0];
};

const guardarTokenSesion = async (id, token, expiraAt) => {
  await pool.query(
    `UPDATE public.landing_cuentas SET token_sesion = $2, token_expira_at = $3, updated_at = now() WHERE id = $1`,
    [id, token, expiraAt],
  );
};

const guardarResetToken = async (id, resetToken, expiraAt) => {
  await pool.query(
    `UPDATE public.landing_cuentas SET reset_token = $2, reset_token_expira = $3, updated_at = now() WHERE id = $1`,
    [id, resetToken, expiraAt],
  );
};

const actualizarPassword = async (id, passwordHash) => {
  await pool.query(
    `UPDATE public.landing_cuentas
     SET password_hash = $2, reset_token = NULL, reset_token_expira = NULL, updated_at = now()
     WHERE id = $1`,
    [id, passwordHash],
  );
};

const getPendientes = async () => {
  const { rows } = await pool.query(
    `SELECT id, email, nombre, telefono_ingresado, created_at
     FROM public.landing_cuentas
     WHERE estado_vinculacion = 'pendiente'
     ORDER BY created_at ASC`,
  );
  return rows;
};

const contarPendientes = async () => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.landing_cuentas WHERE estado_vinculacion = 'pendiente'`,
  );
  return rows[0].total;
};

const getById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM public.landing_cuentas WHERE id = $1`, [id]);
  return rows[0];
};

module.exports = {
  buscarPorGoogleSub,
  buscarPorEmail,
  buscarPorToken,
  buscarPorResetToken,
  crearCuenta,
  crearCuentaConPassword,
  actualizarVinculacion,
  guardarTokenSesion,
  guardarResetToken,
  actualizarPassword,
  getPendientes,
  contarPendientes,
  getById,
};
