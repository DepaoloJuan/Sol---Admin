const pool = require("../database/db");

const getCuentaVinculadaPorCliente = async (idCliente) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.landing_cuentas WHERE id_cliente = $1 AND estado_vinculacion IN ('auto', 'manual')`,
    [idCliente],
  );
  return rows[0];
};

const getCicloActual = async (idCuenta) => {
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(ciclo), 1) AS ciclo FROM public.fidelidad_sellos WHERE id_cuenta = $1`,
    [idCuenta],
  );
  return rows[0].ciclo;
};

const contarSellosDelCiclo = async (idCuenta, ciclo) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM public.fidelidad_sellos WHERE id_cuenta = $1 AND ciclo = $2`,
    [idCuenta, ciclo],
  );
  return rows[0].total;
};

// ON CONFLICT (id_turno) DO NOTHING: si el turno ya había otorgado un sello
// (se editó más de una vez estando Pagado), no se duplica. Devuelve undefined
// en ese caso para que el caller sepa que no hay que crear premio tampoco.
const otorgarSello = async (idCuenta, idTurno, numeroSello, ciclo) => {
  const { rows } = await pool.query(
    `INSERT INTO public.fidelidad_sellos (id_cuenta, id_turno, numero_sello, ciclo)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id_turno) DO NOTHING
     RETURNING *`,
    [idCuenta, idTurno, numeroSello, ciclo],
  );
  return rows[0];
};

const crearPremioPendiente = async (idCuenta, ciclo, selloNumero) => {
  const { rows } = await pool.query(
    `INSERT INTO public.fidelidad_premios (id_cuenta, ciclo, sello_numero)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_cuenta, ciclo, sello_numero) DO NOTHING
     RETURNING *`,
    [idCuenta, ciclo, selloNumero],
  );
  return rows[0];
};

const getPremioPorIdYCuenta = async (id, idCuenta) => {
  const { rows } = await pool.query(
    `SELECT * FROM public.fidelidad_premios WHERE id = $1 AND id_cuenta = $2`,
    [id, idCuenta],
  );
  return rows[0];
};

const asignarResultadoPremio = async (id, tipoPremio, descripcion) => {
  const { rows } = await pool.query(
    `UPDATE public.fidelidad_premios SET tipo_premio = $2, descripcion = $3 WHERE id = $1 RETURNING *`,
    [id, tipoPremio, descripcion],
  );
  return rows[0];
};

const getSellosYPremiosDeCuenta = async (idCuenta) => {
  const { rows: sellos } = await pool.query(
    `SELECT numero_sello, ciclo, created_at FROM public.fidelidad_sellos WHERE id_cuenta = $1 ORDER BY ciclo, numero_sello`,
    [idCuenta],
  );
  const { rows: premios } = await pool.query(
    `SELECT id, ciclo, sello_numero, tipo_premio, descripcion, redimido FROM public.fidelidad_premios WHERE id_cuenta = $1 ORDER BY ciclo, sello_numero`,
    [idCuenta],
  );
  return { sellos, premios };
};

module.exports = {
  getCuentaVinculadaPorCliente,
  getCicloActual,
  contarSellosDelCiclo,
  otorgarSello,
  crearPremioPendiente,
  getPremioPorIdYCuenta,
  asignarResultadoPremio,
  getSellosYPremiosDeCuenta,
};
