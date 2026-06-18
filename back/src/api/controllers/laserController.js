const logger = require("../../utils/logger");
const laserModel = require("../models/laserModel");
const ExcelJS = require("exceljs");
const pool = require("../database/db");

// ── DASHBOARD ──────────────────────────────────────
const listarDias = async (req, res) => {
  try {
    const dias = await laserModel.getAllDiasLaser();

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("laser/index", {
      title: "Depilación Láser",
      user: req.session.user,
      dias,
      flash,
    });
  } catch (error) {
    logger.error("laser.list.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// ── CATÁLOGO ───────────────────────────────────────
const verCatalogo = async (req, res) => {
  try {
    const zonas = await laserModel.getAllZonas();
    const combos = await laserModel.getAllCombos();

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("laser/catalogo", {
      title: "Catálogo Láser",
      user: req.session.user,
      zonas,
      combos,
      flash,
    });
  } catch (error) {
    logger.error("laser.catalogo.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const crearZona = async (req, res) => {
  try {
    const { nombre, precio, genero } = req.body;
    await laserModel.createZona({ nombre, precio, genero });
    req.session.flash = { tipo: "success", mensaje: "Zona creada correctamente." };
    res.redirect("/laser/catalogo");
  } catch (error) {
    logger.error("laser.zona.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const editarZona = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, genero } = req.body;
    await laserModel.updateZona(id, { nombre, precio, genero });
    req.session.flash = { tipo: "success", mensaje: "Zona actualizada correctamente." };
    res.redirect("/laser/catalogo");
  } catch (error) {
    logger.error("laser.zona.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarZona = async (req, res) => {
  try {
    const { id } = req.params;
    await laserModel.deleteZona(id);
    req.session.flash = { tipo: "success", mensaje: "Zona eliminada." };
    res.redirect("/laser/catalogo");
  } catch (error) {
    logger.error("laser.zona.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const crearCombo = async (req, res) => {
  try {
    const { nombre, precio, genero, zona_ids } = req.body;
    const ids = Array.isArray(zona_ids) ? zona_ids : zona_ids ? [zona_ids] : [];
    await laserModel.createCombo({ nombre, precio, genero, zona_ids: ids });
    req.session.flash = { tipo: "success", mensaje: "Combo creado correctamente." };
    res.redirect("/laser/catalogo");
  } catch (error) {
    logger.error("laser.combo.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const editarCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio } = req.body;
    await laserModel.updateCombo(id, { nombre, precio });
    req.session.flash = { tipo: "success", mensaje: "Combo actualizado correctamente." };
    res.redirect("/laser/catalogo");
  } catch (error) {
    logger.error("laser.combo.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarCombo = async (req, res) => {
  try {
    const { id } = req.params;
    await laserModel.deleteCombo(id);
    req.session.flash = { tipo: "success", mensaje: "Combo eliminado." };
    res.redirect("/laser/catalogo");
  } catch (error) {
    logger.error("laser.combo.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// ── CLIENTAS LASER ─────────────────────────────────
const listarClientasLaser = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const eliminarId = req.query.eliminar;

    const clientes = q
      ? await laserModel.searchClientasLaser(q)
      : await laserModel.getAllClientasLaser();

    let flash = req.session.flash || null;
    delete req.session.flash;

    // Regenerar flash de confirmación si viene de historial con eliminarId
    if (eliminarId && !flash) {
      const estado = await laserModel.getEstadoFinancieroClientaLaser(eliminarId);
      const totalCobrado = Number(estado.total_cobrado);
      const totalPendiente = Number(estado.total_pendiente);

      if (totalCobrado > 0) {
        flash = {
          tipo: "warning",
          mensaje: `Esta clienta tiene $${totalCobrado.toLocaleString('es-AR')} cobrados. Se ocultará del sistema pero su historial financiero se conservará.`,
          accion: { texto: "Confirmar", url: `/laser/clientas/${eliminarId}/eliminar`, metodo: "POST", extra: { forzar: "soft" } }
        };
      } else if (totalPendiente > 0) {
        flash = {
          tipo: "warning",
          mensaje: `Esta clienta tiene $${totalPendiente.toLocaleString('es-AR')} pendientes de cobro. ¿Eliminarla igual?`,
          accion: { texto: "Eliminar igual", url: `/laser/clientas/${eliminarId}/eliminar`, metodo: "POST", extra: { forzar: "hard" } }
        };
      }
    }

    res.render("laser/clientas", {
      title: "Clientas Láser",
      user: req.session.user,
      clientes,
      q: q || "",
      flash,
    });
  } catch (error) {
    logger.error("laser.clientas.list.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const showNuevaClientaLaserForm = (req, res) => {
  res.render("laser/nueva-clienta", {
    title: "Nueva Clienta Láser",
    user: req.session.user,
    error: null,
  });
};

const storeClientaLaser = async (req, res) => {
  try {
    const { nombre, apellido, telefono, genero, notas } = req.body;
    if (!nombre || !apellido || !telefono?.trim()) {
      return res.status(400).render("laser/nueva-clienta", {
        title: "Nueva Clienta Láser",
        user: req.session.user,
        error: "Nombre, apellido y teléfono son obligatorios.",
      });
    }
    await laserModel.createClientaLaser({ nombre, apellido, telefono, genero, notas });
    req.session.flash = { tipo: "success", mensaje: "Clienta creada correctamente." };
    res.redirect("/laser/clientas");
  } catch (error) {
    logger.error("laser.clienta.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const mostrarEditarClientaLaser = async (req, res) => {
  try {
    const cliente = await laserModel.getClientaLaserById(req.params.id);
    if (!cliente) return res.status(404).send("Clienta no encontrada");
    res.render("laser/editar-clienta", {
      title: "Editar Clienta Láser",
      user: req.session.user,
      cliente,
      error: null,
    });
  } catch (error) {
    logger.error("laser.clienta.edit.show.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarClientaLaser = async (req, res) => {
  try {
    const { nombre, apellido, telefono, genero, notas } = req.body;
    if (!nombre || !apellido || !telefono?.trim()) {
      const cliente = await laserModel.getClientaLaserById(req.params.id);
      return res.status(400).render("laser/editar-clienta", {
        title: "Editar Clienta Láser",
        user: req.session.user,
        cliente,
        error: "Nombre, apellido y teléfono son obligatorios.",
      });
    }
    await laserModel.updateClientaLaser(req.params.id, { nombre, apellido, telefono, genero, notas });
    req.session.flash = { tipo: "success", mensaje: "Clienta actualizada correctamente." };
    res.redirect("/laser/clientas");
  } catch (error) {
    logger.error("laser.clienta.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarClientaLaser = async (req, res) => {
  try {
    const { id } = req.params;
    const { forzar } = req.body;

    const estado = await laserModel.getEstadoFinancieroClientaLaser(id);
    const totalSesiones = Number(estado.total_sesiones);
    const totalCobrado = Number(estado.total_cobrado);
    const totalPendiente = Number(estado.total_pendiente);

    // Sin sesiones → hard delete
    if (totalSesiones === 0) {
      await laserModel.deleteClientaLaser(id);
      req.session.flash = { tipo: "success", mensaje: "Clienta eliminada." };
      return res.redirect("/laser/clientas");
    }

    // Con sesiones cobradas → soft delete
    if (totalCobrado > 0 && forzar !== 'soft') {
      req.session.flash = {
        tipo: "warning",
        mensaje: `Esta clienta tiene $${Number(totalCobrado).toLocaleString('es-AR')} cobrados. Se ocultará del sistema pero su historial financiero se conservará.`,
        accion: { texto: "Confirmar", url: `/laser/clientas/${id}/eliminar`, metodo: "POST", extra: { forzar: "soft" } }
      };
      return res.redirect("/laser/clientas");
    }

    // Con sesiones cobradas y confirmado → soft delete
    if (totalCobrado > 0 && forzar === 'soft') {
      await laserModel.softDeleteClientaLaser(id);
      req.session.flash = { tipo: "success", mensaje: "Clienta ocultada. Su historial financiero se conserva." };
      return res.redirect("/laser/clientas");
    }

    // Con saldo pendiente y sin cobro → advertir
    if (totalPendiente > 0 && forzar !== 'hard') {
      req.session.flash = {
        tipo: "warning",
        mensaje: `Esta clienta tiene $${Number(totalPendiente).toLocaleString('es-AR')} pendientes de cobro. ¿Eliminarla igual?`,
        accion: { texto: "Eliminar igual", url: `/laser/clientas/${id}/eliminar`, metodo: "POST", extra: { forzar: "hard" } }
      };
      return res.redirect("/laser/clientas");
    }

    // Hard delete con cascada (sesiones sin cobro)
    await laserModel.deleteClientaLaserConSesiones(id);
    req.session.flash = { tipo: "success", mensaje: "Clienta y sus sesiones eliminadas." };
    res.redirect("/laser/clientas");

  } catch (error) {
    logger.error("laser.clienta.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const exportarClientasLaserExcel = async (req, res) => {
  try {
    const clientes = await laserModel.getAllClientasLaser();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Clientas Láser");

    worksheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Nombre", key: "nombre", width: 20 },
      { header: "Apellido", key: "apellido", width: 20 },
      { header: "Teléfono", key: "telefono", width: 18 },
      { header: "Género", key: "genero", width: 12 },
      { header: "Notas", key: "notas", width: 30 },
    ];

    clientes.forEach(c => worksheet.addRow(c));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=clientas-laser.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("laser.clientas.export.failed", { error: error.message });
    res.status(500).send("Error al exportar");
  }
};

const importarClientasLaserExcel = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const filas = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      filas.push({
        nombre: row.getCell(2).value?.toString().trim() || "",
        apellido: row.getCell(3).value?.toString().trim() || "",
        telefono: row.getCell(4).value?.toString().trim() || "",
        genero: row.getCell(5).value?.toString().trim() || "F",
        notas: row.getCell(6).value?.toString().trim() || "",
      });
    });

    for (const fila of filas) {
      if (!fila.nombre || !fila.apellido) continue;
      await laserModel.createClientaLaser(fila);
    }

    req.session.flash = { tipo: "success", mensaje: "Clientas importadas correctamente." };
    res.redirect("/laser/clientas");
  } catch (error) {
    logger.error("laser.clientas.import.failed", { error: error.message });
    res.status(500).send("Error al importar");
  }
};

// ── DÍAS DE TRABAJO ────────────────────────────────
const showNuevoDiaForm = (req, res) => {
  res.render("laser/nuevo-dia", {
    title: "Nuevo Día Láser",
    user: req.session.user,
    error: null,
  });
};

const crearDia = async (req, res) => {
  try {
    const { fecha, notas } = req.body;
    if (!fecha) {
      return res.status(400).render("laser/nuevo-dia", {
        title: "Nuevo Día Láser",
        user: req.session.user,
        error: "La fecha es obligatoria.",
      });
    }
    const dia = await laserModel.createDiaLaser({ fecha, notas });
    req.session.flash = { tipo: "success", mensaje: "Día creado correctamente." };
    res.redirect(`/laser/dias/${dia.id}`);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).render("laser/nuevo-dia", {
        title: "Nuevo Día Láser",
        user: req.session.user,
        error: "Ya existe un día de trabajo registrado para esa fecha.",
      });
    }
    logger.error("laser.dia.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const verDia = async (req, res) => {
  try {
    const { id } = req.params;
    const dia = await laserModel.getDiaLaserById(id);
    if (!dia) return res.status(404).send("Día no encontrado");

    const sesiones = await laserModel.getSesionesPorDia(id);
    const gastos = await laserModel.getGastosPorDia(id);
    const clientas = await laserModel.getAllClientasLaser();
    const zonas = await laserModel.getAllZonas();
    const combos = await laserModel.getAllCombos();

    const flash = req.session.flash || null;
    delete req.session.flash;

    const ganancia_neta = Number(dia.total_cobrado) - Number(dia.total_gastos);

    res.render("laser/dia", {
      title: "Día Láser",
      user: req.session.user,
      dia: { ...dia, ganancia_neta },
      sesiones,
      gastos,
      clientas,
      zonas,
      combos,
      flash,
    });
  } catch (error) {
    logger.error("laser.dia.view.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const editarDia = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, notas } = req.body;
    await laserModel.updateDiaLaser(id, { fecha, notas });
    req.session.flash = { tipo: "success", mensaje: "Día actualizado correctamente." };
    res.redirect(`/laser/dias/${id}`);
  } catch (error) {
    logger.error("laser.dia.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarDia = async (req, res) => {
  try {
    const { id } = req.params;
    await laserModel.deleteDiaLaser(id);
    req.session.flash = { tipo: "success", mensaje: "Día eliminado." };
    res.redirect("/laser");
  } catch (error) {
    logger.error("laser.dia.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// ── SESIONES ───────────────────────────────────────
const crearSesion = async (req, res) => {
  const { id_dia } = req.params;
  const { id_clienta, hora, costo_total, monto_abonado, notas, items } = req.body;

  if (!id_clienta) {
    req.session.flash = { tipo: "error", mensaje: "Seleccioná una clienta." };
    return res.redirect(`/laser/dias/${id_dia}`);
  }

  const costo = Number(costo_total) || 0;
  const abonado = Number(monto_abonado) || 0;
  let estado = 'Pendiente';
  if (abonado >= costo && costo > 0) estado = 'Pagado';
  else if (abonado > 0) estado = 'Parcial';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [sesion] } = await client.query(
      `INSERT INTO sesiones_laser (id_dia, id_clienta, hora, costo_total, monto_abonado, estado, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id_dia, id_clienta, hora || null, costo, abonado, estado, notas || null]
    );

    const itemsArray = Array.isArray(items) ? items : items ? [items] : [];
    for (const item of itemsArray) {
      const [tipo, itemId] = item.split('-');
      const col = tipo === 'zona' ? 'id_zona' : 'id_combo';

      const { rows: [{ total }] } = await client.query(
        `SELECT COUNT(*) AS total FROM sesion_items si
         JOIN sesiones_laser s ON s.id = si.id_sesion
         WHERE s.id_clienta = $1 AND si.${col} = $2`,
        [id_clienta, itemId]
      );
      const numero = Number(total) + 1;

      await client.query(
        `INSERT INTO sesion_items (id_sesion, id_zona, id_combo, numero_sesion)
         VALUES ($1, $2, $3, $4)`,
        [
          sesion.id,
          tipo === 'zona' ? itemId : null,
          tipo === 'combo' ? itemId : null,
          numero,
        ]
      );
    }

    await client.query('COMMIT');
    req.session.flash = { tipo: "success", mensaje: "Sesión cargada correctamente." };
    res.redirect(`/laser/dias/${id_dia}`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error("laser.sesion.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  } finally {
    client.release();
  }
};

const editarSesion = async (req, res) => {
  const { id } = req.params;
  const { hora, costo_total, monto_abonado, notas, items, id_dia } = req.body;

  const costo = Number(costo_total) || 0;
  const abonado = Number(monto_abonado) || 0;
  let estado = 'Pendiente';
  if (abonado >= costo && costo > 0) estado = 'Pagado';
  else if (abonado > 0) estado = 'Parcial';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [sesionActual] } = await client.query(
      `SELECT id_clienta FROM sesiones_laser WHERE id = $1`,
      [id]
    );
    const id_clienta = sesionActual?.id_clienta;

    await client.query(
      `UPDATE sesiones_laser
       SET hora = $1, costo_total = $2, monto_abonado = $3, estado = $4, notas = $5
       WHERE id = $6`,
      [hora || null, costo, abonado, estado, notas || null, id]
    );

    const { rows: itemsPrevios } = await client.query(
      `SELECT id_zona, id_combo, numero_sesion FROM sesion_items WHERE id_sesion = $1`,
      [id]
    );

    const mapaNumeros = {};
    for (const row of itemsPrevios) {
      const clave = row.id_zona ? `zona-${row.id_zona}` : `combo-${row.id_combo}`;
      mapaNumeros[clave] = row.numero_sesion;
    }

    await client.query(`DELETE FROM sesion_items WHERE id_sesion = $1`, [id]);

    const itemsArray = Array.isArray(items) ? items : items ? [items] : [];
    for (const item of itemsArray) {
      const [tipo, itemId] = item.split('-');
      const clave = `${tipo}-${itemId}`;

      let numero;
      if (mapaNumeros[clave] !== undefined) {
        numero = mapaNumeros[clave];
      } else {
        const col = tipo === 'zona' ? 'id_zona' : 'id_combo';
        const { rows: [{ total }] } = await client.query(
          `SELECT COUNT(*) AS total FROM sesion_items si
           JOIN sesiones_laser s ON s.id = si.id_sesion
           WHERE s.id_clienta = $1 AND si.${col} = $2`,
          [id_clienta, itemId]
        );
        numero = Number(total) + 1;
      }

      await client.query(
        `INSERT INTO sesion_items (id_sesion, id_zona, id_combo, numero_sesion)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          tipo === 'zona' ? itemId : null,
          tipo === 'combo' ? itemId : null,
          numero,
        ]
      );
    }

    await client.query('COMMIT');
    req.session.flash = { tipo: "success", mensaje: "Sesión actualizada correctamente." };
    res.redirect(`/laser/dias/${id_dia}`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error("laser.sesion.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  } finally {
    client.release();
  }
};

const eliminarSesion = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_dia } = req.body;
    await laserModel.deleteSesionLaser(id);
    req.session.flash = { tipo: "success", mensaje: "Sesión eliminada." };
    res.redirect(`/laser/dias/${id_dia}`);
  } catch (error) {
    logger.error("laser.sesion.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// ── GASTOS ─────────────────────────────────────────
const crearGasto = async (req, res) => {
  try {
    const { id_dia } = req.params;
    const { descripcion, monto } = req.body;
    if (!descripcion || !monto) {
      req.session.flash = { tipo: "error", mensaje: "Descripción y monto son obligatorios." };
      return res.redirect(`/laser/dias/${id_dia}`);
    }
    await laserModel.createGastoLaser({ id_dia, descripcion, monto });
    req.session.flash = { tipo: "success", mensaje: "Gasto registrado." };
    res.redirect(`/laser/dias/${id_dia}`);
  } catch (error) {
    logger.error("laser.gasto.create.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const eliminarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_dia } = req.body;
    await laserModel.deleteGastoLaser(id);
    req.session.flash = { tipo: "success", mensaje: "Gasto eliminado." };
    res.redirect(`/laser/dias/${id_dia}`);
  } catch (error) {
    logger.error("laser.gasto.delete.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

// ── HISTORIAL ──────────────────────────────────────
const verHistorialClientaLaser = async (req, res) => {
  try {
    const { id } = req.params;
    const clienta = await laserModel.getClientaLaserById(id);
    if (!clienta) return res.status(404).send("Clienta no encontrada");

    const historial = await laserModel.getHistorialClientaLaser(id);
    const sesiones = await laserModel.getSesionesPorClientaLaser(id);
    const zonas = await laserModel.getAllZonas();

    const flash = req.session.flash || null;
    delete req.session.flash;

    res.render("laser/historial-clienta", {
      title: `Historial — ${clienta.nombre} ${clienta.apellido}`,
      user: req.session.user,
      clienta,
      historial,
      sesiones,
      zonas: zonas.filter(z => z.genero === clienta.genero),
      flash,
      returnEliminar: req.query.returnEliminar === 'true',
    });
  } catch (error) {
    logger.error("laser.historial.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const actualizarTratamiento = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    for (const key of Object.keys(body)) {
      if (key.startsWith('zona_')) {
        const id_zona = key.replace('zona_', '');
        const sesiones_pautadas = Number(body[key]);
        if (sesiones_pautadas > 0) {
          await laserModel.upsertTratamiento(id, id_zona, sesiones_pautadas);
        }
      }
    }

    req.session.flash = { tipo: "success", mensaje: "Tratamiento actualizado." };
    res.redirect(`/laser/clientas/${id}/historial`);
  } catch (error) {
    logger.error("laser.tratamiento.update.failed", { error: error.message });
    res.status(500).send("Error interno del servidor");
  }
};

const crearZonaRapida = async (req, res) => {
  try {
    const { nombre, precio, genero } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });
    const zona = await laserModel.createZona({ nombre, precio: Number(precio) || 0, genero: genero || 'F' });
    res.json(zona);
  } catch (error) {
    logger.error("laser.zona.rapida.failed", { error: error.message });
    res.status(500).json({ error: 'Error al crear la zona.' });
  }
};

const crearComboRapido = async (req, res) => {
  try {
    const { nombre, precio, genero } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio.' });
    const combo = await laserModel.createCombo({ nombre, precio: Number(precio) || 0, genero: genero || 'F', zona_ids: [] });
    res.json(combo);
  } catch (error) {
    logger.error("laser.combo.rapido.failed", { error: error.message });
    res.status(500).json({ error: 'Error al crear el combo.' });
  }
};

const crearClientaRapida = async (req, res) => {
  try {
    const { nombre, apellido, telefono, genero } = req.body;
    if (!nombre || !apellido) return res.status(400).json({ error: 'Nombre y apellido son obligatorios.' });
    const clienta = await laserModel.createClientaLaser({
      nombre,
      apellido,
      telefono: telefono || '',
      genero: genero || 'F',
      notas: null,
    });
    res.json(clienta);
  } catch (error) {
    logger.error("laser.clienta.rapida.failed", { error: error.message });
    res.status(500).json({ error: 'Error al crear la clienta.' });
  }
};

const buscarClientasSalon = async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.json([]);
    const { rows } = await pool.query(
      `SELECT id, nombre, apellido, telefono
       FROM clientes
       WHERE LOWER(nombre) LIKE LOWER($1)
          OR LOWER(apellido) LIKE LOWER($1)
       ORDER BY apellido, nombre ASC
       LIMIT 10`,
      [`%${q}%`]
    );
    res.json(rows);
  } catch (error) {
    logger.error("laser.buscar.salon.failed", { error: error.message });
    res.json([]);
  }
};

module.exports = {
  listarDias,
  verCatalogo,
  crearZona, editarZona, eliminarZona,
  crearCombo, editarCombo, eliminarCombo,
  listarClientasLaser, showNuevaClientaLaserForm, storeClientaLaser,
  mostrarEditarClientaLaser, actualizarClientaLaser, eliminarClientaLaser,
  exportarClientasLaserExcel, importarClientasLaserExcel,
  showNuevoDiaForm, crearDia, verDia, editarDia, eliminarDia,
  crearSesion, editarSesion, eliminarSesion,
  crearGasto, eliminarGasto,
  verHistorialClientaLaser, actualizarTratamiento,
  crearZonaRapida, crearComboRapido,
  crearClientaRapida, buscarClientasSalon,
};
