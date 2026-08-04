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

// --- Reglas de premio (en qué sello hay oportunidad de premio) ---

const getReglasPremio = async () => {
  const { rows } = await pool.query(
    `SELECT id, numero_sello FROM public.fidelidad_reglas_premio ORDER BY numero_sello`,
  );
  return rows;
};

const agregarReglaPremio = async (numeroSello) => {
  const { rows } = await pool.query(
    `INSERT INTO public.fidelidad_reglas_premio (numero_sello)
     VALUES ($1)
     ON CONFLICT (numero_sello) DO NOTHING
     RETURNING *`,
    [numeroSello],
  );
  return rows[0];
};

const eliminarReglaPremio = async (id) => {
  await pool.query(`DELETE FROM public.fidelidad_reglas_premio WHERE id = $1`, [id]);
};

// --- Catálogo de premios ---

const getCatalogoActivo = async () => {
  const { rows } = await pool.query(
    `SELECT id, descripcion, peso FROM public.fidelidad_premios_catalogo WHERE activo = true`,
  );
  return rows;
};

const getCatalogoCompleto = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM public.fidelidad_premios_catalogo ORDER BY created_at ASC`,
  );
  return rows;
};

const crearPremioCatalogo = async (descripcion, peso) => {
  const { rows } = await pool.query(
    `INSERT INTO public.fidelidad_premios_catalogo (descripcion, peso) VALUES ($1, $2) RETURNING *`,
    [descripcion, peso],
  );
  return rows[0];
};

const actualizarPremioCatalogo = async (id, descripcion, peso) => {
  const { rows } = await pool.query(
    `UPDATE public.fidelidad_premios_catalogo
     SET descripcion = $2, peso = $3, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, descripcion, peso],
  );
  return rows[0];
};

const toggleActivoPremioCatalogo = async (id) => {
  const { rows } = await pool.query(
    `UPDATE public.fidelidad_premios_catalogo
     SET activo = NOT activo, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
  return rows[0];
};

// --- Tarjetas anteriores (ciclos ya completados) ---

const getTarjetasAnteriores = async (idCuenta, cicloActual) => {
  // fidelidad_sellos es la fuente de verdad de qué ciclos existieron
  // (un ciclo "completado" tiene 10 filas ahí) — se usa como base y se le
  // pegan los premios con LEFT JOIN, para que una tarjeta completada sin
  // premios (ej. si en ese momento no había ninguna regla configurada)
  // igual aparezca en la lista, con `premios: []`.
  const { rows: ciclos } = await pool.query(
    `SELECT DISTINCT ciclo FROM public.fidelidad_sellos WHERE id_cuenta = $1 AND ciclo < $2 ORDER BY ciclo DESC`,
    [idCuenta, cicloActual],
  );

  const { rows: premios } = await pool.query(
    `SELECT ciclo, sello_numero, tipo_premio, descripcion, redimido
     FROM public.fidelidad_premios
     WHERE id_cuenta = $1 AND ciclo < $2
     ORDER BY sello_numero ASC`,
    [idCuenta, cicloActual],
  );

  return ciclos.map(({ ciclo }) => ({
    ciclo,
    premios: premios
      .filter((p) => p.ciclo === ciclo)
      .map((p) => ({
        sello_numero: p.sello_numero,
        tipo_premio: p.tipo_premio,
        descripcion: p.descripcion,
        redimido: p.redimido,
      })),
  }));
};

// Premios del ciclo actual únicamente — los de ciclos ya completados se
// consultan aparte con getTarjetasAnteriores, para no duplicarlos en la
// tarjeta activa del dashboard.
const getPremiosDelCiclo = async (idCuenta, ciclo) => {
  const { rows } = await pool.query(
    `SELECT id, ciclo, sello_numero, tipo_premio, descripcion, redimido
     FROM public.fidelidad_premios
     WHERE id_cuenta = $1 AND ciclo = $2
     ORDER BY sello_numero`,
    [idCuenta, ciclo],
  );
  return rows;
};

module.exports = {
  getCuentaVinculadaPorCliente,
  getCicloActual,
  contarSellosDelCiclo,
  otorgarSello,
  crearPremioPendiente,
  getPremioPorIdYCuenta,
  asignarResultadoPremio,
  getPremiosDelCiclo,
  getReglasPremio,
  agregarReglaPremio,
  eliminarReglaPremio,
  getCatalogoActivo,
  getCatalogoCompleto,
  crearPremioCatalogo,
  actualizarPremioCatalogo,
  toggleActivoPremioCatalogo,
  getTarjetasAnteriores,
};
