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

const getSelloPorTurno = async (idTurno) => {
  const { rows } = await pool.query(`SELECT * FROM public.fidelidad_sellos WHERE id_turno = $1`, [idTurno]);
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

// WHERE tipo_premio IS NULL: si dos requests giran la ruleta casi al mismo
// tiempo (doble tap), sólo el primero graba resultado — el segundo no pisa
// el premio ya sorteado, ver girarRuleta en el controller.
const asignarResultadoPremio = async (id, tipoPremio, descripcion) => {
  const { rows } = await pool.query(
    `UPDATE public.fidelidad_premios
     SET tipo_premio = $2, descripcion = $3
     WHERE id = $1 AND tipo_premio IS NULL
     RETURNING *`,
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

// --- Config global (fecha de arranque del programa) ---

const getFechaInicio = async () => {
  const { rows } = await pool.query(`SELECT fecha_inicio FROM public.fidelidad_config WHERE id = 1`);
  return rows[0] ? rows[0].fecha_inicio : null;
};

const setFechaInicio = async (fecha) => {
  const { rows } = await pool.query(
    `UPDATE public.fidelidad_config SET fecha_inicio = $1, updated_at = now() WHERE id = 1 RETURNING *`,
    [fecha],
  );
  return rows[0];
};

// Comparación hecha en SQL a propósito: `fecha` llega como string plano
// ("YYYY-MM-DD") desde los call-sites, y `fecha_inicio` es una columna DATE
// que node-postgres parsea a un Date de hora LOCAL — comparar esos dos con
// `new Date(...)` en JS mezcla una interpretación UTC contra una local y
// hace que el propio día del lanzamiento quede rechazado en huso horario
// negativo (Argentina). El tipo `date` de Postgres no tiene esa ambigüedad.
const fechaDentroDeVentanaFidelidad = async (fecha) => {
  const { rows } = await pool.query(
    `SELECT (fecha_inicio IS NOT NULL AND $1::date >= fecha_inicio) AS habilitada
     FROM public.fidelidad_config WHERE id = 1`,
    [fecha],
  );
  return rows[0] ? rows[0].habilitada : false;
};

// --- Servicios habilitados (lista blanca de "servicio completo") ---

const getServiciosHabilitados = async () => {
  const { rows } = await pool.query(
    `SELECT sb.id, sb.descripcion
     FROM public.fidelidad_servicios_habilitados fh
     JOIN public.servicios_base sb ON sb.id = fh.id_servicio
     ORDER BY sb.descripcion ASC`,
  );
  return rows;
};

const servicioEstaHabilitado = async (idServicio) => {
  const { rows } = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM public.fidelidad_servicios_habilitados WHERE id_servicio = $1) AS existe`,
    [idServicio],
  );
  return rows[0].existe;
};

const habilitarServicio = async (idServicio) => {
  const { rows } = await pool.query(
    `INSERT INTO public.fidelidad_servicios_habilitados (id_servicio)
     VALUES ($1)
     ON CONFLICT (id_servicio) DO NOTHING
     RETURNING *`,
    [idServicio],
  );
  return rows[0];
};

const deshabilitarServicio = async (idServicio) => {
  await pool.query(`DELETE FROM public.fidelidad_servicios_habilitados WHERE id_servicio = $1`, [idServicio]);
};

// --- Reglas de premio por tarjeta (snapshot congelado al arrancar cada ciclo) ---

const getReglasCiclo = async (idCuenta, ciclo) => {
  const { rows } = await pool.query(
    `SELECT numero_sello FROM public.fidelidad_reglas_ciclo WHERE id_cuenta = $1 AND ciclo = $2`,
    [idCuenta, ciclo],
  );
  return rows;
};

// ON CONFLICT DO NOTHING: idempotente — si dos sellos "número 1" del mismo
// ciclo pelean por el snapshot (ver retry de otorgarSelloSiCorresponde), el
// segundo intento no pisa ni duplica lo que ya congeló el primero.
const snapshotearReglasCiclo = async (idCuenta, ciclo) => {
  await pool.query(
    `INSERT INTO public.fidelidad_reglas_ciclo (id_cuenta, ciclo, numero_sello)
     SELECT $1, $2, numero_sello FROM public.fidelidad_reglas_premio
     ON CONFLICT (id_cuenta, ciclo, numero_sello) DO NOTHING`,
    [idCuenta, ciclo],
  );
};

// --- Canje de premios (Sol marca en persona que ya se lo dio a la clienta) ---

// Todas las clientas con un premio ganado (ya girado) y sin canjear, para la
// vista global /fidelidad/canjes. Se joinea contra `clientes` (no contra el
// nombre de landing_cuentas) porque ese es el nombre por el que Sol la conoce.
const getPremiosGanadosSinCanjear = async () => {
  const { rows } = await pool.query(
    `SELECT
       fp.id,
       fp.ciclo,
       fp.sello_numero,
       fp.descripcion,
       fp.created_at,
       c.id AS id_cliente,
       c.nombre AS cliente_nombre,
       c.apellido AS cliente_apellido,
       c.telefono AS cliente_telefono
     FROM public.fidelidad_premios fp
     JOIN public.landing_cuentas lc ON lc.id = fp.id_cuenta
     LEFT JOIN public.clientes c ON c.id = lc.id_cliente
     WHERE fp.tipo_premio IS NOT NULL AND fp.redimido = false
     ORDER BY fp.created_at ASC`,
  );
  return rows;
};

// Para la ficha de una clienta puntual (/clientes/:id/historial).
const getPremiosGanadosSinCanjearPorCliente = async (idCliente) => {
  const { rows } = await pool.query(
    `SELECT fp.id, fp.ciclo, fp.sello_numero, fp.descripcion, fp.created_at
     FROM public.fidelidad_premios fp
     JOIN public.landing_cuentas lc ON lc.id = fp.id_cuenta
     WHERE lc.id_cliente = $1 AND fp.tipo_premio IS NOT NULL AND fp.redimido = false
     ORDER BY fp.created_at ASC`,
    [idCliente],
  );
  return rows;
};

// WHERE redimido = false: idempotente, un doble click no pisa redimido_en.
const marcarPremioCanjeado = async (id) => {
  const { rows } = await pool.query(
    `UPDATE public.fidelidad_premios
     SET redimido = true, redimido_en = now()
     WHERE id = $1 AND redimido = false
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

// Los del ciclo actual (ganados o no) + cualquier premio de un ciclo ANTERIOR
// que haya quedado sin girar — ej. la clienta llegó al sello 10, no abrió la
// app, y en su siguiente visita ya se le otorgó un sello del ciclo nuevo. Sin
// esto ese premio queda invisible para siempre (getPremiosDelCiclo nunca lo
// trae porque ya no es el ciclo "actual").
const getPremiosActivos = async (idCuenta, cicloActual) => {
  const { rows } = await pool.query(
    `SELECT id, ciclo, sello_numero, tipo_premio, descripcion, redimido
     FROM public.fidelidad_premios
     WHERE id_cuenta = $1 AND (ciclo = $2 OR tipo_premio IS NULL)
     ORDER BY ciclo, sello_numero`,
    [idCuenta, cicloActual],
  );
  return rows;
};

module.exports = {
  getCuentaVinculadaPorCliente,
  getCicloActual,
  contarSellosDelCiclo,
  otorgarSello,
  getSelloPorTurno,
  crearPremioPendiente,
  getPremioPorIdYCuenta,
  asignarResultadoPremio,
  getPremiosDelCiclo,
  getPremiosActivos,
  getReglasPremio,
  agregarReglaPremio,
  eliminarReglaPremio,
  getCatalogoActivo,
  getCatalogoCompleto,
  crearPremioCatalogo,
  actualizarPremioCatalogo,
  toggleActivoPremioCatalogo,
  getTarjetasAnteriores,
  getPremiosGanadosSinCanjear,
  getPremiosGanadosSinCanjearPorCliente,
  marcarPremioCanjeado,
  getFechaInicio,
  setFechaInicio,
  fechaDentroDeVentanaFidelidad,
  getServiciosHabilitados,
  servicioEstaHabilitado,
  habilitarServicio,
  deshabilitarServicio,
  getReglasCiclo,
  snapshotearReglasCiclo,
};
