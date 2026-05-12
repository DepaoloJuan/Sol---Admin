const pool = require("../database/db");

// ── ZONAS ──────────────────────────────────────────
const getAllZonas = async () => {
  const { rows } = await pool.query(
    `SELECT id, nombre, precio, genero FROM zonas_laser ORDER BY genero, nombre ASC`,
  );
  return rows;
};

const createZona = async ({ nombre, precio, genero }) => {
  const { rows } = await pool.query(
    `INSERT INTO zonas_laser (nombre, precio, genero) VALUES ($1, $2, $3) RETURNING *`,
    [nombre, Number(precio) || 0, genero || "F"],
  );
  return rows[0];
};

const updateZona = async (id, { nombre, precio, genero }) => {
  const { rows } = await pool.query(
    `UPDATE zonas_laser SET nombre = $1, precio = $2, genero = $3 WHERE id = $4 RETURNING *`,
    [nombre, Number(precio) || 0, genero || "F", id],
  );
  return rows[0];
};

const deleteZona = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM zonas_laser WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0];
};

// ── COMBOS ─────────────────────────────────────────
const getAllCombos = async () => {
  const { rows } = await pool.query(
    `SELECT c.id, c.nombre, c.precio, c.genero,
            COALESCE(
              json_agg(z.nombre ORDER BY z.nombre) FILTER (WHERE z.id IS NOT NULL),
              '[]'
            ) AS zonas
     FROM combos_laser c
     LEFT JOIN combo_zonas cz ON cz.id_combo = c.id
     LEFT JOIN zonas_laser z ON z.id = cz.id_zona
     GROUP BY c.id
     ORDER BY c.genero, c.nombre ASC`,
  );
  return rows;
};

const createCombo = async ({ nombre, precio, genero, zona_ids }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `INSERT INTO combos_laser (nombre, precio, genero) VALUES ($1, $2, $3) RETURNING *`,
      [nombre, Number(precio) || 0, genero || "F"],
    );
    const combo = rows[0];
    for (const id_zona of zona_ids) {
      await client.query(
        `INSERT INTO combo_zonas (id_combo, id_zona) VALUES ($1, $2)`,
        [combo.id, id_zona],
      );
    }
    await client.query("COMMIT");
    return combo;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

const updateCombo = async (id, { nombre, precio }) => {
  const { rows } = await pool.query(
    `UPDATE combos_laser SET nombre = $1, precio = $2 WHERE id = $3 RETURNING *`,
    [nombre, Number(precio) || 0, id],
  );
  return rows[0];
};

const deleteCombo = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM combos_laser WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0];
};

// ── CLIENTAS LASER ─────────────────────────────────
const getAllClientasLaser = async () => {
  const { rows } = await pool.query(
    `SELECT id, nombre, apellido, telefono, genero, notas
     FROM clientas_laser
     ORDER BY apellido, nombre ASC`
  );
  return rows;
};

const searchClientasLaser = async (q) => {
  const { rows } = await pool.query(
    `SELECT id, nombre, apellido, telefono, genero, notas
     FROM clientas_laser
     WHERE LOWER(nombre) LIKE LOWER($1)
        OR LOWER(apellido) LIKE LOWER($1)
     ORDER BY apellido, nombre ASC`,
    [`%${q}%`]
  );
  return rows;
};

const getClientaLaserById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, nombre, apellido, telefono, genero, notas
     FROM clientas_laser WHERE id = $1`,
    [id]
  );
  return rows[0];
};

const createClientaLaser = async ({ nombre, apellido, telefono, genero, notas }) => {
  const { rows } = await pool.query(
    `INSERT INTO clientas_laser (nombre, apellido, telefono, genero, notas)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (nombre, apellido)
     DO UPDATE SET telefono = EXCLUDED.telefono,
                   genero = EXCLUDED.genero,
                   notas = EXCLUDED.notas
     RETURNING *`,
    [nombre, apellido, telefono, genero || 'F', notas || null]
  );
  return rows[0];
};

const updateClientaLaser = async (id, { nombre, apellido, telefono, genero, notas }) => {
  const { rows } = await pool.query(
    `UPDATE clientas_laser
     SET nombre = $1, apellido = $2, telefono = $3, genero = $4, notas = $5
     WHERE id = $6 RETURNING *`,
    [nombre, apellido, telefono, genero || 'F', notas || null, id]
  );
  return rows[0];
};

const deleteClientaLaser = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM clientas_laser WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
};

// ── DÍAS LASER ─────────────────────────────────────
const getAllDiasLaser = async () => {
  const { rows } = await pool.query(
    `SELECT d.id, d.fecha, d.notas,
            COUNT(s.id) AS total_sesiones,
            COALESCE(SUM(s.costo_total), 0) AS total_facturado,
            COALESCE(SUM(s.monto_abonado), 0) AS total_cobrado,
            COALESCE((SELECT SUM(g.monto) FROM gastos_laser g WHERE g.id_dia = d.id), 0) AS total_gastos
     FROM dias_laser d
     LEFT JOIN sesiones_laser s ON s.id_dia = d.id
     GROUP BY d.id
     ORDER BY d.fecha DESC`
  );
  return rows;
};

const getDiaLaserById = async (id) => {
  const { rows } = await pool.query(
    `SELECT d.id, d.fecha, d.notas,
            COALESCE(SUM(s.costo_total), 0) AS total_facturado,
            COALESCE(SUM(s.monto_abonado), 0) AS total_cobrado,
            COALESCE((SELECT SUM(g.monto) FROM gastos_laser g WHERE g.id_dia = d.id), 0) AS total_gastos
     FROM dias_laser d
     LEFT JOIN sesiones_laser s ON s.id_dia = d.id
     WHERE d.id = $1
     GROUP BY d.id`,
    [id]
  );
  return rows[0];
};

const createDiaLaser = async ({ fecha, notas }) => {
  const { rows } = await pool.query(
    `INSERT INTO dias_laser (fecha, notas) VALUES ($1::date, $2) RETURNING *`,
    [fecha, notas || null]
  );
  return rows[0];
};

const updateDiaLaser = async (id, { fecha, notas }) => {
  const { rows } = await pool.query(
    `UPDATE dias_laser SET fecha = $1, notas = $2 WHERE id = $3 RETURNING *`,
    [fecha, notas || null, id]
  );
  return rows[0];
};

const deleteDiaLaser = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM dias_laser WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
};

// ── SESIONES ───────────────────────────────────────
const getSesionesPorDia = async (id_dia) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.hora, s.costo_total, s.monto_abonado, s.estado, s.notas,
            cl.nombre AS clienta_nombre, cl.apellido AS clienta_apellido,
            cl.id AS clienta_id,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', si.id,
                  'id_zona', si.id_zona,
                  'id_combo', si.id_combo,
                  'numero_sesion', si.numero_sesion,
                  'nombre', COALESCE(z.nombre, c.nombre),
                  'precio', COALESCE(z.precio, c.precio),
                  'tipo', CASE WHEN si.id_combo IS NOT NULL THEN 'combo' ELSE 'zona' END
                )
                ORDER BY si.id
              ) FILTER (WHERE si.id IS NOT NULL),
              '[]'
            ) AS items
     FROM sesiones_laser s
     JOIN clientas_laser cl ON cl.id = s.id_clienta
     LEFT JOIN sesion_items si ON si.id_sesion = s.id
     LEFT JOIN zonas_laser z ON z.id = si.id_zona
     LEFT JOIN combos_laser c ON c.id = si.id_combo
     WHERE s.id_dia = $1
     GROUP BY s.id, cl.id
     ORDER BY s.hora ASC NULLS LAST`,
    [id_dia]
  );
  return rows;
};

const createSesionLaser = async ({ id_dia, id_clienta, hora, costo_total, monto_abonado, estado, notas }) => {
  const { rows } = await pool.query(
    `INSERT INTO sesiones_laser (id_dia, id_clienta, hora, costo_total, monto_abonado, estado, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id_dia, id_clienta, hora || null, Number(costo_total) || 0,
     Number(monto_abonado) || 0, estado || 'Pendiente', notas || null]
  );
  return rows[0];
};

const updateSesionLaser = async (id, { hora, costo_total, monto_abonado, estado, notas }) => {
  const { rows } = await pool.query(
    `UPDATE sesiones_laser
     SET hora = $1, costo_total = $2, monto_abonado = $3, estado = $4, notas = $5
     WHERE id = $6 RETURNING *`,
    [hora || null, Number(costo_total) || 0,
     Number(monto_abonado) || 0, estado || 'Pendiente', notas || null, id]
  );
  return rows[0];
};

const deleteSesionLaser = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM sesiones_laser WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
};

// ── SESION ITEMS ───────────────────────────────────
const addItemSesion = async ({ id_sesion, id_zona, id_combo, numero_sesion }) => {
  const { rows } = await pool.query(
    `INSERT INTO sesion_items (id_sesion, id_zona, id_combo, numero_sesion)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id_sesion, id_zona || null, id_combo || null, numero_sesion || 1]
  );
  return rows[0];
};

const deleteItemsSesion = async (id_sesion) => {
  await pool.query(`DELETE FROM sesion_items WHERE id_sesion = $1`, [id_sesion]);
};

const getNumeroSesionPorZona = async (id_clienta, id_zona) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total
     FROM sesion_items si
     JOIN sesiones_laser s ON s.id = si.id_sesion
     WHERE s.id_clienta = $1 AND si.id_zona = $2`,
    [id_clienta, id_zona]
  );
  return Number(rows[0].total) + 1;
};

const getNumeroSesionPorCombo = async (id_clienta, id_combo, id_zona) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS total
     FROM sesion_items si
     JOIN sesiones_laser s ON s.id = si.id_sesion
     JOIN combo_zonas cz ON cz.id_combo = si.id_combo AND cz.id_zona = $3
     WHERE s.id_clienta = $1 AND si.id_combo = $2`,
    [id_clienta, id_combo, id_zona]
  );
  return Number(rows[0].total) + 1;
};

// ── GASTOS LASER ───────────────────────────────────
const getGastosPorDia = async (id_dia) => {
  const { rows } = await pool.query(
    `SELECT id, descripcion, monto FROM gastos_laser
     WHERE id_dia = $1 ORDER BY id ASC`,
    [id_dia]
  );
  return rows;
};

const createGastoLaser = async ({ id_dia, descripcion, monto }) => {
  const { rows } = await pool.query(
    `INSERT INTO gastos_laser (id_dia, descripcion, monto)
     VALUES ($1, $2, $3) RETURNING *`,
    [id_dia, descripcion, Number(monto) || 0]
  );
  return rows[0];
};

const deleteGastoLaser = async (id) => {
  await pool.query(`DELETE FROM gastos_laser WHERE id = $1`, [id]);
};

// ── HISTORIAL POR CLIENTA ──────────────────────────
const getHistorialClientaLaser = async (id_clienta) => {
  const { rows: zonasPautadas } = await pool.query(
    `SELECT z.id AS zona_id, z.nombre AS zona_nombre,
            COALESCE(t.sesiones_pautadas, NULL) AS sesiones_pautadas
     FROM zonas_laser z
     LEFT JOIN tratamientos_laser t ON t.id_zona = z.id AND t.id_clienta = $1
     WHERE z.genero = (SELECT genero FROM clientas_laser WHERE id = $1)
     ORDER BY z.nombre ASC`,
    [id_clienta]
  );

  const { rows: realizadas } = await pool.query(
    `SELECT z.id AS zona_id, COUNT(*) AS total
     FROM sesion_items si
     JOIN sesiones_laser s ON s.id = si.id_sesion
     JOIN zonas_laser z ON z.id = si.id_zona
     WHERE s.id_clienta = $1 AND si.id_zona IS NOT NULL
     GROUP BY z.id

     UNION ALL

     SELECT z.id AS zona_id, COUNT(*) AS total
     FROM sesion_items si
     JOIN sesiones_laser s ON s.id = si.id_sesion
     JOIN combo_zonas cz ON cz.id_combo = si.id_combo
     JOIN zonas_laser z ON z.id = cz.id_zona
     WHERE s.id_clienta = $1 AND si.id_combo IS NOT NULL
     GROUP BY z.id`,
    [id_clienta]
  );

  const conteo = {};
  for (const r of realizadas) {
    conteo[r.zona_id] = (conteo[r.zona_id] || 0) + Number(r.total);
  }

  return zonasPautadas.map(z => ({
    zona_id: z.zona_id,
    zona_nombre: z.zona_nombre,
    sesiones_realizadas: conteo[z.zona_id] || 0,
    sesiones_pautadas: z.sesiones_pautadas,
  }));
};

const getSesionesPorClientaLaser = async (id_clienta) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.hora, s.costo_total, s.monto_abonado, s.estado, s.notas,
            d.fecha,
            COALESCE(
              json_agg(
                json_build_object(
                  'nombre', COALESCE(z.nombre, c.nombre),
                  'tipo', CASE WHEN si.id_combo IS NOT NULL THEN 'combo' ELSE 'zona' END
                )
                ORDER BY si.id
              ) FILTER (WHERE si.id IS NOT NULL),
              '[]'
            ) AS items
     FROM sesiones_laser s
     JOIN dias_laser d ON d.id = s.id_dia
     LEFT JOIN sesion_items si ON si.id_sesion = s.id
     LEFT JOIN zonas_laser z ON z.id = si.id_zona
     LEFT JOIN combos_laser c ON c.id = si.id_combo
     WHERE s.id_clienta = $1
     GROUP BY s.id, d.fecha
     ORDER BY d.fecha DESC, s.hora ASC`,
    [id_clienta]
  );
  return rows;
};

// ── TRATAMIENTOS ───────────────────────────────────
const upsertTratamiento = async (id_clienta, id_zona, sesiones_pautadas) => {
  await pool.query(
    `INSERT INTO tratamientos_laser (id_clienta, id_zona, sesiones_pautadas)
     VALUES ($1, $2, $3)
     ON CONFLICT (id_clienta, id_zona)
     DO UPDATE SET sesiones_pautadas = EXCLUDED.sesiones_pautadas`,
    [id_clienta, id_zona, sesiones_pautadas]
  );
};

module.exports = {
  getAllZonas, createZona, updateZona, deleteZona,
  getAllCombos, createCombo, updateCombo, deleteCombo,
  getAllClientasLaser, searchClientasLaser, getClientaLaserById,
  createClientaLaser, updateClientaLaser, deleteClientaLaser,
  getAllDiasLaser, getDiaLaserById, createDiaLaser, updateDiaLaser, deleteDiaLaser,
  getSesionesPorDia, createSesionLaser, updateSesionLaser, deleteSesionLaser,
  addItemSesion, deleteItemsSesion, getNumeroSesionPorZona, getNumeroSesionPorCombo,
  getGastosPorDia, createGastoLaser, deleteGastoLaser,
  getHistorialClientaLaser, getSesionesPorClientaLaser, upsertTratamiento,
};
