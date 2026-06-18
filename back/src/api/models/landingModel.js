// FILE: src/api/models/landingModel.js
const pool = require("../database/db");

// =============================================
// POPUP
// =============================================

const getPopup = async () => {
  const { rows } = await pool.query(`SELECT * FROM landing_popup LIMIT 1`);
  return rows[0];
};

const updatePopup = async ({
  activo,
  imagen_url,
  imagen_url_fallback,
  texto,
}) => {
  const { rows } = await pool.query(
    `UPDATE landing_popup 
     SET activo = $1, imagen_url = $2, imagen_url_fallback = $3, texto = $4, updated_at = NOW()
     RETURNING *`,
    [activo, imagen_url, imagen_url_fallback, texto],
  );
  return rows[0];
};

// =============================================
// SERVICIOS
// =============================================

const getAllServicios = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_servicios ORDER BY orden ASC, id ASC`,
  );
  return rows;
};

const getServicioById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_servicios WHERE id = $1`,
    [id],
  );
  return rows[0];
};

const createServicio = async ({ titulo, descripcion, orden, activo }) => {
  const { rows } = await pool.query(
    `INSERT INTO landing_servicios (titulo, descripcion, orden, activo)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [titulo, descripcion, orden ?? 0, activo ?? true],
  );
  return rows[0];
};

const updateServicio = async (id, { titulo, descripcion, orden, activo }) => {
  const { rows } = await pool.query(
    `UPDATE landing_servicios 
     SET titulo = $1, descripcion = $2, orden = $3, activo = $4
     WHERE id = $5 RETURNING *`,
    [titulo, descripcion, orden ?? 0, activo ?? true, id],
  );
  return rows[0];
};

const deleteServicio = async (id) => {
  await pool.query(`DELETE FROM landing_servicios WHERE id = $1`, [id]);
};

// =============================================
// IMÁGENES DE SERVICIOS
// =============================================

const getImagenesServicio = async (servicio_id) => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_servicios_imagenes 
     WHERE servicio_id = $1 ORDER BY orden ASC, id ASC`,
    [servicio_id],
  );
  return rows;
};

const addImagenServicio = async ({ servicio_id, imagen_url, orden }) => {
  const { rows } = await pool.query(
    `INSERT INTO landing_servicios_imagenes (servicio_id, imagen_url, orden)
     VALUES ($1, $2, $3) RETURNING *`,
    [servicio_id, imagen_url, orden ?? 0],
  );
  return rows[0];
};

const deleteImagenServicio = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM landing_servicios_imagenes WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0];
};

// =============================================
// CURSOS
// =============================================

const getAllCursos = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_cursos ORDER BY orden ASC, id ASC`,
  );
  return rows;
};

const getCursoById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_cursos WHERE id = $1`,
    [id],
  );
  return rows[0];
};

const createCurso = async ({
  titulo,
  descripcion,
  imagen_url,
  imagen_url_fallback,
  orden,
  activo,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO landing_cursos (titulo, descripcion, imagen_url, imagen_url_fallback, orden, activo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      titulo,
      descripcion,
      imagen_url,
      imagen_url_fallback,
      orden ?? 0,
      activo ?? true,
    ],
  );
  return rows[0];
};

const updateCurso = async (
  id,
  { titulo, descripcion, imagen_url, imagen_url_fallback, orden, activo },
) => {
  const { rows } = await pool.query(
    `UPDATE landing_cursos 
     SET titulo = $1, descripcion = $2, imagen_url = $3, imagen_url_fallback = $4, orden = $5, activo = $6
     WHERE id = $7 RETURNING *`,
    [
      titulo,
      descripcion,
      imagen_url,
      imagen_url_fallback,
      orden ?? 0,
      activo ?? true,
      id,
    ],
  );
  return rows[0];
};

const deleteCurso = async (id) => {
  await pool.query(`DELETE FROM landing_cursos WHERE id = $1`, [id]);
};

// =============================================
// GALERÍA
// =============================================

const getAllGaleria = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_galeria ORDER BY orden ASC, id ASC`,
  );
  return rows;
};

const addImagenGaleria = async ({
  imagen_url,
  imagen_url_fallback,
  alt_texto,
  orden,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO landing_galeria (imagen_url, imagen_url_fallback, alt_texto, orden)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [imagen_url, imagen_url_fallback ?? null, alt_texto ?? null, orden ?? 0],
  );
  return rows[0];
};

const deleteImagenGaleria = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM landing_galeria WHERE id = $1 RETURNING *`,
    [id],
  );
  return rows[0];
};

// =============================================
// TESTIMONIOS
// =============================================

const getAllTestimonios = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_testimonios ORDER BY orden ASC, id ASC`,
  );
  return rows;
};

const getTestimonioById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM landing_testimonios WHERE id = $1`,
    [id],
  );
  return rows[0];
};

const createTestimonio = async ({
  nombre,
  texto,
  estrellas,
  foto_url,
  foto_url_fallback,
  activo,
  orden,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO landing_testimonios (nombre, texto, estrellas, foto_url, foto_url_fallback, activo, orden)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      nombre,
      texto,
      estrellas ?? 5,
      foto_url ?? null,
      foto_url_fallback ?? null,
      activo ?? true,
      orden ?? 0,
    ],
  );
  return rows[0];
};

const updateTestimonio = async (
  id,
  { nombre, texto, estrellas, foto_url, foto_url_fallback, activo, orden },
) => {
  const { rows } = await pool.query(
    `UPDATE landing_testimonios 
     SET nombre = $1, texto = $2, estrellas = $3, foto_url = $4, foto_url_fallback = $5, activo = $6, orden = $7
     WHERE id = $8 RETURNING *`,
    [
      nombre,
      texto,
      estrellas ?? 5,
      foto_url ?? null,
      foto_url_fallback ?? null,
      activo ?? true,
      orden ?? 0,
      id,
    ],
  );
  return rows[0];
};

const deleteTestimonio = async (id) => {
  await pool.query(`DELETE FROM landing_testimonios WHERE id = $1`, [id]);
};

module.exports = {
  // Popup
  getPopup,
  updatePopup,
  // Servicios
  getAllServicios,
  getServicioById,
  createServicio,
  updateServicio,
  deleteServicio,
  // Imágenes servicios
  getImagenesServicio,
  addImagenServicio,
  deleteImagenServicio,
  // Cursos
  getAllCursos,
  getCursoById,
  createCurso,
  updateCurso,
  deleteCurso,
  // Galería
  getAllGaleria,
  addImagenGaleria,
  deleteImagenGaleria,
  // Testimonios
  getAllTestimonios,
  getTestimonioById,
  createTestimonio,
  updateTestimonio,
  deleteTestimonio,
};
