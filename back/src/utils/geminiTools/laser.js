const logger = require("../logger");
const laserModel = require("../../api/models/laserModel");
const { resolverUnico, fechaDB } = require("./_shared");

// ── Resolvers locales (no hay "search" dedicado en el modelo para zonas/combos/días) ──

const buscarZonasPorNombre = async (nombre) => {
  const zonas = await laserModel.getAllZonas();
  const q = nombre.toLowerCase();
  return zonas.filter((z) => z.nombre.toLowerCase().includes(q));
};

const buscarCombosPorNombre = async (nombre) => {
  const combos = await laserModel.getAllCombos();
  const q = nombre.toLowerCase();
  return combos.filter((c) => c.nombre.toLowerCase().includes(q));
};

const buscarDiaPorFecha = async (fecha) => {
  const dias = await laserModel.getAllDiasLaser();
  return dias.filter((d) => fechaDB(d.fecha) === fecha);
};

// searchClientasLaser solo hace LIKE contra nombre O apellido por separado,
// así que nunca matchea un nombre completo ("Diana Leiva"). Buscamos client-side
// contra el nombre completo concatenado en vez de depender del LIKE del modelo.
const buscarClientasLaserPorNombreCompleto = async (query) => {
  const clientas = await laserModel.getAllClientasLaser();
  const q = query.toLowerCase();
  return clientas.filter((c) => `${c.nombre} ${c.apellido}`.toLowerCase().includes(q));
};

const resolverClientaLaser = (nombre) => resolverUnico(buscarClientasLaserPorNombreCompleto, nombre, "clienta láser");
const resolverZona = (nombre) => resolverUnico(buscarZonasPorNombre, nombre, "zona");
const resolverCombo = (nombre) => resolverUnico(buscarCombosPorNombre, nombre, "combo");
const resolverDia = (fecha) => resolverUnico(buscarDiaPorFecha, fecha, "día láser");

// ── ZONAS ──────────────────────────────────────────

const consultarZonas = async ({ genero }) => {
  try {
    const zonas = await laserModel.getAllZonas();
    const filtradas = genero ? zonas.filter((z) => z.genero === genero) : zonas;
    return { ok: true, zonas: filtradas.map((z) => ({ nombre: z.nombre, precio: Number(z.precio), genero: z.genero })) };
  } catch (error) {
    logger.error("asistente.laser.consultarZonas.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar las zonas, intentá de nuevo." };
  }
};

const proponerCrearZona = async ({ nombre, precio, genero }) => ({
  ok: true,
  confirmado: false,
  resumen: `Nueva zona láser: ${nombre}, precio $${Number(precio) || 0}, género ${genero || "F"}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearZona.`,
});

const confirmarCrearZona = async ({ nombre, precio, genero }) => {
  try {
    await laserModel.createZona({ nombre, precio, genero });
    return { ok: true, mensaje: `Zona ${nombre} creada.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarCrearZona.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear la zona, avisale a Juanma." };
  }
};

const proponerEditarZona = async ({ nombre_actual, nuevo_nombre, nuevo_precio }) => {
  const resuelto = await resolverZona(nombre_actual);
  if (!resuelto.ok) return resuelto;
  const cambios = [];
  if (nuevo_nombre) cambios.push(`nombre → ${nuevo_nombre}`);
  if (nuevo_precio) cambios.push(`precio → $${nuevo_precio}`);
  if (cambios.length === 0) return { ok: false, mensaje: "No me dijiste qué cambiar de esa zona." };
  return {
    ok: true,
    confirmado: false,
    resumen: `Zona ${resuelto.entidad.nombre}. Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarZona.`,
  };
};

const confirmarEditarZona = async ({ nombre_actual, nuevo_nombre, nuevo_precio }) => {
  try {
    const resuelto = await resolverZona(nombre_actual);
    if (!resuelto.ok) return resuelto;
    const z = resuelto.entidad;
    await laserModel.updateZona(z.id, {
      nombre: nuevo_nombre || z.nombre,
      precio: nuevo_precio || z.precio,
      genero: z.genero,
    });
    return { ok: true, mensaje: `Zona ${z.nombre} actualizada.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEditarZona.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar la zona, avisale a Juanma." };
  }
};

const proponerEliminarZona = async ({ nombre }) => {
  const resuelto = await resolverZona(nombre);
  if (!resuelto.ok) return resuelto;
  return {
    ok: true,
    confirmado: false,
    resumen: `Vas a eliminar la zona ${resuelto.entidad.nombre}. Si está incluida en algún combo o tratamiento pautado, esa eliminación puede fallar o dejar referencias huérfanas. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarZona.`,
  };
};

const confirmarEliminarZona = async ({ nombre }) => {
  try {
    const resuelto = await resolverZona(nombre);
    if (!resuelto.ok) return resuelto;
    await laserModel.deleteZona(resuelto.entidad.id);
    return { ok: true, mensaje: `Zona ${resuelto.entidad.nombre} eliminada.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEliminarZona.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar la zona, puede tener combos o tratamientos asociados. Avisale a Juanma." };
  }
};

// ── COMBOS ─────────────────────────────────────────

const consultarCombos = async ({ genero }) => {
  try {
    const combos = await laserModel.getAllCombos();
    const filtrados = genero ? combos.filter((c) => c.genero === genero) : combos;
    return { ok: true, combos: filtrados.map((c) => ({ nombre: c.nombre, precio: Number(c.precio), genero: c.genero, zonas: c.zonas })) };
  } catch (error) {
    logger.error("asistente.laser.consultarCombos.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los combos, intentá de nuevo." };
  }
};

const resolverListaZonas = async (nombresZonas) => {
  const ids = [];
  for (const n of nombresZonas) {
    const r = await resolverZona(n);
    if (!r.ok) return r;
    ids.push(r.entidad.id);
  }
  return { ok: true, ids };
};

const proponerCrearCombo = async ({ nombre, precio, genero, zonas }) => {
  const nombresZonas = Array.isArray(zonas) ? zonas : [zonas].filter(Boolean);
  const resuelto = await resolverListaZonas(nombresZonas);
  if (!resuelto.ok) return resuelto;
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo combo: ${nombre}, precio $${Number(precio) || 0}, género ${genero || "F"}, zonas: ${nombresZonas.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearCombo.`,
  };
};

const confirmarCrearCombo = async ({ nombre, precio, genero, zonas }) => {
  try {
    const nombresZonas = Array.isArray(zonas) ? zonas : [zonas].filter(Boolean);
    const resuelto = await resolverListaZonas(nombresZonas);
    if (!resuelto.ok) return resuelto;
    await laserModel.createCombo({ nombre, precio, genero, zona_ids: resuelto.ids });
    return { ok: true, mensaje: `Combo ${nombre} creado.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarCrearCombo.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el combo, avisale a Juanma." };
  }
};

const proponerEditarCombo = async ({ nombre_actual, nuevo_nombre, nuevo_precio }) => {
  const resuelto = await resolverCombo(nombre_actual);
  if (!resuelto.ok) return resuelto;
  const cambios = [];
  if (nuevo_nombre) cambios.push(`nombre → ${nuevo_nombre}`);
  if (nuevo_precio) cambios.push(`precio → $${nuevo_precio}`);
  if (cambios.length === 0) return { ok: false, mensaje: "No me dijiste qué cambiar de ese combo." };
  return {
    ok: true,
    confirmado: false,
    resumen: `Combo ${resuelto.entidad.nombre}. Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarCombo.`,
  };
};

const confirmarEditarCombo = async ({ nombre_actual, nuevo_nombre, nuevo_precio }) => {
  try {
    const resuelto = await resolverCombo(nombre_actual);
    if (!resuelto.ok) return resuelto;
    const c = resuelto.entidad;
    await laserModel.updateCombo(c.id, { nombre: nuevo_nombre || c.nombre, precio: nuevo_precio || c.precio });
    return { ok: true, mensaje: `Combo ${c.nombre} actualizado.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEditarCombo.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar el combo, avisale a Juanma." };
  }
};

const proponerEliminarCombo = async ({ nombre }) => {
  const resuelto = await resolverCombo(nombre);
  if (!resuelto.ok) return resuelto;
  return {
    ok: true,
    confirmado: false,
    resumen: `Vas a eliminar el combo ${resuelto.entidad.nombre}. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarCombo.`,
  };
};

const confirmarEliminarCombo = async ({ nombre }) => {
  try {
    const resuelto = await resolverCombo(nombre);
    if (!resuelto.ok) return resuelto;
    await laserModel.deleteCombo(resuelto.entidad.id);
    return { ok: true, mensaje: `Combo ${resuelto.entidad.nombre} eliminado.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEliminarCombo.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el combo, avisale a Juanma." };
  }
};

// ── CLIENTAS LÁSER ─────────────────────────────────

const consultarClientasLaser = async ({ nombre }) => {
  try {
    const clientas = nombre ? await laserModel.searchClientasLaser(nombre) : await laserModel.getAllClientasLaser();
    return {
      ok: true,
      clientas: clientas.map((c) => ({
        nombre: `${c.nombre} ${c.apellido}`.trim(),
        telefono: c.telefono,
        genero: c.genero,
      })),
    };
  } catch (error) {
    logger.error("asistente.laser.consultarClientasLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar las clientas láser, intentá de nuevo." };
  }
};

const proponerCrearClientaLaser = async ({ nombre, apellido, telefono, genero, notas }) => {
  const existentes = await laserModel.searchClientasLaser(`${nombre}`);
  const coincide = existentes.find(
    (c) => c.nombre.toLowerCase() === nombre.toLowerCase() && c.apellido.toLowerCase() === (apellido || "").toLowerCase(),
  );
  const avisoExistente = coincide
    ? ` OJO: ya existe una clienta láser con ese nombre y apellido — crearla de nuevo va a ACTUALIZAR sus datos (teléfono/género/notas), no va a duplicarla.`
    : "";
  return {
    ok: true,
    confirmado: false,
    resumen: `Nueva clienta láser: ${nombre} ${apellido || ""}, teléfono ${telefono || "sin dato"}, género ${genero || "F"}.${avisoExistente} Pedile confirmación explícita a Sol antes de llamar a confirmarCrearClientaLaser.`,
  };
};

const confirmarCrearClientaLaser = async ({ nombre, apellido, telefono, genero, notas }) => {
  try {
    const clienta = await laserModel.createClientaLaser({ nombre, apellido, telefono, genero, notas });
    return { ok: true, mensaje: `Clienta láser ${clienta.nombre} ${clienta.apellido} creada.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarCrearClientaLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear la clienta láser, avisale a Juanma." };
  }
};

const proponerEditarClientaLaser = async ({ nombre_actual, nuevo_nombre, nuevo_apellido, nuevo_telefono, nuevo_genero, nuevas_notas }) => {
  const resuelto = await resolverClientaLaser(nombre_actual);
  if (!resuelto.ok) return resuelto;
  const cambios = [];
  if (nuevo_nombre) cambios.push(`nombre → ${nuevo_nombre}`);
  if (nuevo_apellido) cambios.push(`apellido → ${nuevo_apellido}`);
  if (nuevo_telefono) cambios.push(`teléfono → ${nuevo_telefono}`);
  if (nuevo_genero) cambios.push(`género → ${nuevo_genero}`);
  if (nuevas_notas) cambios.push(`notas → ${nuevas_notas}`);
  if (cambios.length === 0) return { ok: false, mensaje: "No me dijiste qué cambiar de esa clienta." };
  return {
    ok: true,
    confirmado: false,
    resumen: `Clienta láser ${resuelto.entidad.nombre} ${resuelto.entidad.apellido}. Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarClientaLaser.`,
  };
};

const confirmarEditarClientaLaser = async ({ nombre_actual, nuevo_nombre, nuevo_apellido, nuevo_telefono, nuevo_genero, nuevas_notas }) => {
  try {
    const resuelto = await resolverClientaLaser(nombre_actual);
    if (!resuelto.ok) return resuelto;
    const c = resuelto.entidad;
    await laserModel.updateClientaLaser(c.id, {
      nombre: nuevo_nombre || c.nombre,
      apellido: nuevo_apellido || c.apellido,
      telefono: nuevo_telefono || c.telefono,
      genero: nuevo_genero || c.genero,
      notas: nuevas_notas || c.notas,
    });
    return { ok: true, mensaje: `Clienta láser ${c.nombre} actualizada.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEditarClientaLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar la clienta láser, avisale a Juanma." };
  }
};

// Misma lógica de negocio que back/src/api/controllers/laserController.js (eliminarClientaLaser):
// 0 sesiones -> hard delete directo. Con sesiones + cobrado>0 -> soft delete (default seguro).
// Con sesiones + solo pendiente -> ofrece hard delete con cascada (nada de plata cobrada que conservar).
const proponerEliminarClientaLaser = async ({ nombre }) => {
  const resuelto = await resolverClientaLaser(nombre);
  if (!resuelto.ok) return resuelto;
  const c = resuelto.entidad;
  const estado = await laserModel.getEstadoFinancieroClientaLaser(c.id);
  const totalSesiones = Number(estado.total_sesiones);
  const totalCobrado = Number(estado.total_cobrado);
  const totalPendiente = Number(estado.total_pendiente);

  if (totalSesiones === 0) {
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar a la clienta láser ${c.nombre} ${c.apellido}, que no tiene sesiones registradas. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarClientaLaser.`,
    };
  }

  if (totalCobrado > 0) {
    return {
      ok: true,
      confirmado: false,
      resumen: `${c.nombre} ${c.apellido} tiene $${totalCobrado.toLocaleString("es-AR")} cobrados en sesiones. Lo más seguro es ocultarla (baja lógica): se va a ocultar del sistema pero su historial financiero se conserva. Si Sol pide explícitamente borrar TODO su historial (sesiones incluidas), hay que llamar a confirmarEliminarClientaLaser con forzar="hard". Pedile confirmación explícita a Sol sobre cuál opción quiere antes de confirmar.`,
    };
  }

  return {
    ok: true,
    confirmado: false,
    resumen: `${c.nombre} ${c.apellido} tiene $${totalPendiente.toLocaleString("es-AR")} pendientes de cobro (nada cobrado todavía) en ${totalSesiones} sesión(es). Se puede eliminar junto con esas sesiones. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarClientaLaser.`,
  };
};

const confirmarEliminarClientaLaser = async ({ nombre, forzar }) => {
  try {
    const resuelto = await resolverClientaLaser(nombre);
    if (!resuelto.ok) return resuelto;
    const c = resuelto.entidad;
    const estado = await laserModel.getEstadoFinancieroClientaLaser(c.id);
    const totalSesiones = Number(estado.total_sesiones);
    const totalCobrado = Number(estado.total_cobrado);

    if (totalSesiones === 0) {
      await laserModel.deleteClientaLaser(c.id);
      return { ok: true, mensaje: `Clienta láser ${c.nombre} eliminada.` };
    }

    if (totalCobrado > 0 && forzar !== "hard") {
      await laserModel.softDeleteClientaLaser(c.id);
      return { ok: true, mensaje: `Clienta láser ${c.nombre} ocultada. Su historial financiero se conserva.` };
    }

    await laserModel.deleteClientaLaserConSesiones(c.id);
    return { ok: true, mensaje: `Clienta láser ${c.nombre} y sus sesiones eliminadas.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEliminarClientaLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar la clienta láser, avisale a Juanma." };
  }
};

// ── DÍAS LÁSER ─────────────────────────────────────

const consultarDiasLaser = async ({ desde, hasta }) => {
  try {
    const dias = await laserModel.getAllDiasLaser();
    const filtrados = dias.filter((d) => {
      const f = fechaDB(d.fecha);
      return (!desde || f >= desde) && (!hasta || f <= hasta);
    });
    return {
      ok: true,
      dias: filtrados.map((d) => ({
        fecha: fechaDB(d.fecha),
        totalSesiones: Number(d.total_sesiones),
        totalFacturado: Number(d.total_facturado),
        totalCobrado: Number(d.total_cobrado),
        totalGastos: Number(d.total_gastos),
      })),
    };
  } catch (error) {
    logger.error("asistente.laser.consultarDiasLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los días de láser, intentá de nuevo." };
  }
};

const proponerCrearDiaLaser = async ({ fecha, notas }) => {
  const existentes = await buscarDiaPorFecha(fecha);
  if (existentes.length > 0) {
    return { ok: false, mensaje: `Ya existe un día de trabajo láser registrado para el ${fecha}.` };
  }
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo día láser: ${fecha}${notas ? `, notas: ${notas}` : ""}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearDiaLaser.`,
  };
};

const confirmarCrearDiaLaser = async ({ fecha, notas }) => {
  try {
    await laserModel.createDiaLaser({ fecha, notas });
    return { ok: true, mensaje: `Día láser del ${fecha} creado.` };
  } catch (error) {
    if (error.code === "23505") {
      return { ok: false, mensaje: `Ya existe un día de trabajo láser registrado para el ${fecha}.` };
    }
    logger.error("asistente.laser.confirmarCrearDiaLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el día láser, avisale a Juanma." };
  }
};

const proponerEliminarDiaLaser = async ({ fecha }) => {
  const resuelto = await resolverDia(fecha);
  if (!resuelto.ok) return resuelto;
  const d = resuelto.entidad;
  const totalSesiones = Number(d.total_sesiones);
  const aviso = totalSesiones > 0 ? ` OJO: tiene ${totalSesiones} sesión(es) cargadas ese día, que también se van a perder.` : "";
  return {
    ok: true,
    confirmado: false,
    resumen: `Vas a eliminar el día láser del ${fecha}.${aviso} Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarDiaLaser.`,
  };
};

const confirmarEliminarDiaLaser = async ({ fecha }) => {
  try {
    const resuelto = await resolverDia(fecha);
    if (!resuelto.ok) return resuelto;
    await laserModel.deleteDiaLaser(resuelto.entidad.id);
    return { ok: true, mensaje: `Día láser del ${fecha} eliminado.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEliminarDiaLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el día láser, avisale a Juanma." };
  }
};

// ── SESIONES ───────────────────────────────────────

const consultarSesionesDia = async ({ fecha }) => {
  const resuelto = await resolverDia(fecha);
  if (!resuelto.ok) return resuelto;
  try {
    const sesiones = await laserModel.getSesionesPorDia(resuelto.entidad.id);
    return {
      ok: true,
      sesiones: sesiones.map((s) => ({
        clienta: `${s.clienta_nombre} ${s.clienta_apellido}`.trim(),
        hora: s.hora,
        costoTotal: Number(s.costo_total),
        montoAbonado: Number(s.monto_abonado),
        estado: s.estado,
        items: s.items.map((i) => i.nombre),
      })),
    };
  } catch (error) {
    logger.error("asistente.laser.consultarSesionesDia.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar las sesiones de ese día, intentá de nuevo." };
  }
};

const consultarSesionesClienta = async ({ clienta }) => {
  const resuelto = await resolverClientaLaser(clienta);
  if (!resuelto.ok) return resuelto;
  try {
    const sesiones = await laserModel.getSesionesPorClientaLaser(resuelto.entidad.id);
    return {
      ok: true,
      sesiones: sesiones.map((s) => ({
        fecha: fechaDB(s.fecha),
        hora: s.hora,
        costoTotal: Number(s.costo_total),
        montoAbonado: Number(s.monto_abonado),
        estado: s.estado,
        items: s.items.map((i) => i.nombre),
      })),
    };
  } catch (error) {
    logger.error("asistente.laser.consultarSesionesClienta.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar las sesiones de esa clienta, intentá de nuevo." };
  }
};

const resolverItem = async (nombreItem, generoClienta) => {
  const zonas = await buscarZonasPorNombre(nombreItem);
  const zonasDelGenero = zonas.filter((z) => z.genero === generoClienta);
  if (zonasDelGenero.length === 1) return { ok: true, tipo: "zona", id: zonasDelGenero[0].id, nombre: zonasDelGenero[0].nombre };

  const combos = await buscarCombosPorNombre(nombreItem);
  const combosDelGenero = combos.filter((c) => c.genero === generoClienta);
  if (combosDelGenero.length === 1) return { ok: true, tipo: "combo", id: combosDelGenero[0].id, nombre: combosDelGenero[0].nombre };

  if (zonasDelGenero.length + combosDelGenero.length === 0) {
    return { ok: false, mensaje: `No encontré ninguna zona o combo llamado "${nombreItem}" para ese género.` };
  }
  return { ok: false, mensaje: `Hay más de una zona/combo que coincide con "${nombreItem}". Pedile a Sol que sea más específica.` };
};

// Simplificación deliberada: una sesión se crea con UN ítem inicial (zona o combo);
// para sumar más ítems a la misma sesión (mismo día + misma clienta) se usa
// proponerAgregarItemSesion/confirmarAgregarItemSesion. Evita tener que exponer
// un array completo de ítems en una sola llamada de voz.
const proponerCrearSesionLaser = async ({ fecha, clienta, hora, costo_total, monto_abonado, zona_o_combo, notas }) => {
  const resueltoDia = await resolverDia(fecha);
  if (!resueltoDia.ok) {
    return { ok: false, mensaje: `No existe un día láser para el ${fecha}. Hay que crearlo primero con proponerCrearDiaLaser.` };
  }
  const resueltaClienta = await resolverClientaLaser(clienta);
  if (!resueltaClienta.ok) return resueltaClienta;

  const item = await resolverItem(zona_o_combo, resueltaClienta.entidad.genero);
  if (!item.ok) return item;

  return {
    ok: true,
    confirmado: false,
    resumen: `Nueva sesión láser el ${fecha} para ${resueltaClienta.entidad.nombre} ${resueltaClienta.entidad.apellido}, ítem: ${item.nombre}, costo $${Number(costo_total) || 0}, abonado $${Number(monto_abonado) || 0}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearSesionLaser.`,
  };
};

const confirmarCrearSesionLaser = async ({ fecha, clienta, hora, costo_total, monto_abonado, zona_o_combo, notas }) => {
  try {
    const resueltoDia = await resolverDia(fecha);
    if (!resueltoDia.ok) return { ok: false, mensaje: `No existe un día láser para el ${fecha}.` };
    const resueltaClienta = await resolverClientaLaser(clienta);
    if (!resueltaClienta.ok) return resueltaClienta;
    const item = await resolverItem(zona_o_combo, resueltaClienta.entidad.genero);
    if (!item.ok) return item;

    const costo = Number(costo_total) || 0;
    const abonado = Number(monto_abonado) || 0;
    let estado = "Pendiente";
    if (abonado >= costo && costo > 0) estado = "Pagado";
    else if (abonado > 0) estado = "Parcial";

    const sesion = await laserModel.createSesionLaser({
      id_dia: resueltoDia.entidad.id,
      id_clienta: resueltaClienta.entidad.id,
      hora,
      costo_total: costo,
      monto_abonado: abonado,
      estado,
      notas,
    });

    const numero =
      item.tipo === "zona"
        ? await laserModel.getNumeroSesionPorZona(resueltaClienta.entidad.id, item.id)
        : await laserModel.getNumeroSesionPorCombo(resueltaClienta.entidad.id, item.id, null);

    await laserModel.addItemSesion({
      id_sesion: sesion.id,
      id_zona: item.tipo === "zona" ? item.id : null,
      id_combo: item.tipo === "combo" ? item.id : null,
      numero_sesion: numero,
    });

    return { ok: true, mensaje: `Sesión creada para ${resueltaClienta.entidad.nombre} el ${fecha}.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarCrearSesionLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear la sesión láser, avisale a Juanma." };
  }
};

const buscarSesionDeClientaEnDia = async (fecha, nombreClienta) => {
  const resueltoDia = await resolverDia(fecha);
  if (!resueltoDia.ok) return resueltoDia;
  const resueltaClienta = await resolverClientaLaser(nombreClienta);
  if (!resueltaClienta.ok) return resueltaClienta;

  const sesiones = await laserModel.getSesionesPorDia(resueltoDia.entidad.id);
  const sesion = sesiones.find((s) => Number(s.clienta_id) === Number(resueltaClienta.entidad.id));
  if (!sesion) {
    return { ok: false, mensaje: `No encontré ninguna sesión de ${nombreClienta} el ${fecha}.` };
  }
  return { ok: true, sesion, clienta: resueltaClienta.entidad };
};

const proponerAgregarItemSesion = async ({ fecha, clienta, zona_o_combo }) => {
  const encontrado = await buscarSesionDeClientaEnDia(fecha, clienta);
  if (!encontrado.ok) return encontrado;
  const item = await resolverItem(zona_o_combo, encontrado.clienta.genero);
  if (!item.ok) return item;
  return {
    ok: true,
    confirmado: false,
    resumen: `Vas a agregar ${item.nombre} a la sesión de ${encontrado.clienta.nombre} el ${fecha}. Pedile confirmación explícita a Sol antes de llamar a confirmarAgregarItemSesion.`,
  };
};

const confirmarAgregarItemSesion = async ({ fecha, clienta, zona_o_combo }) => {
  try {
    const encontrado = await buscarSesionDeClientaEnDia(fecha, clienta);
    if (!encontrado.ok) return encontrado;
    const item = await resolverItem(zona_o_combo, encontrado.clienta.genero);
    if (!item.ok) return item;

    const numero =
      item.tipo === "zona"
        ? await laserModel.getNumeroSesionPorZona(encontrado.clienta.id, item.id)
        : await laserModel.getNumeroSesionPorCombo(encontrado.clienta.id, item.id, null);

    await laserModel.addItemSesion({
      id_sesion: encontrado.sesion.id,
      id_zona: item.tipo === "zona" ? item.id : null,
      id_combo: item.tipo === "combo" ? item.id : null,
      numero_sesion: numero,
    });

    return { ok: true, mensaje: `${item.nombre} agregado a la sesión de ${encontrado.clienta.nombre}.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarAgregarItemSesion.failed", { error: error.message });
    return { ok: false, mensaje: "No pude agregar el ítem a la sesión, avisale a Juanma." };
  }
};

const proponerEliminarSesionLaser = async ({ fecha, clienta }) => {
  const encontrado = await buscarSesionDeClientaEnDia(fecha, clienta);
  if (!encontrado.ok) return encontrado;
  return {
    ok: true,
    confirmado: false,
    resumen: `Vas a eliminar la sesión de ${encontrado.clienta.nombre} el ${fecha} (y sus ítems). Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarSesionLaser.`,
  };
};

const confirmarEliminarSesionLaser = async ({ fecha, clienta }) => {
  try {
    const encontrado = await buscarSesionDeClientaEnDia(fecha, clienta);
    if (!encontrado.ok) return encontrado;
    await laserModel.deleteSesionLaser(encontrado.sesion.id);
    return { ok: true, mensaje: `Sesión de ${encontrado.clienta.nombre} el ${fecha} eliminada.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEliminarSesionLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar la sesión, avisale a Juanma." };
  }
};

// ── GASTOS LÁSER ───────────────────────────────────

const buscarGastoLaser = async (fecha, descripcion) => {
  const resueltoDia = await resolverDia(fecha);
  if (!resueltoDia.ok) return resueltoDia;
  const gastos = await laserModel.getGastosPorDia(resueltoDia.entidad.id);
  const q = descripcion.toLowerCase();
  const candidatos = gastos.filter((g) => g.descripcion.toLowerCase().includes(q));
  if (candidatos.length === 0) {
    return { ok: false, mensaje: `No encontré ningún gasto láser con "${descripcion}" el ${fecha}.` };
  }
  if (candidatos.length > 1) {
    return { ok: false, mensaje: `Hay más de un gasto láser que coincide con "${descripcion}" el ${fecha}. Pedile a Sol más precisión.` };
  }
  return { ok: true, gasto: candidatos[0], idDia: resueltoDia.entidad.id };
};

const consultarGastosLaser = async ({ fecha }) => {
  const resuelto = await resolverDia(fecha);
  if (!resuelto.ok) return resuelto;
  try {
    const gastos = await laserModel.getGastosPorDia(resuelto.entidad.id);
    return { ok: true, gastos: gastos.map((g) => ({ descripcion: g.descripcion, monto: Number(g.monto) })) };
  } catch (error) {
    logger.error("asistente.laser.consultarGastosLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los gastos de láser, intentá de nuevo." };
  }
};

const proponerCrearGastoLaser = async ({ fecha, descripcion, monto }) => {
  const resuelto = await resolverDia(fecha);
  if (!resuelto.ok) return { ok: false, mensaje: `No existe un día láser para el ${fecha}.` };
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo gasto láser el ${fecha}: ${descripcion}, $${Number(monto) || 0}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearGastoLaser.`,
  };
};

const confirmarCrearGastoLaser = async ({ fecha, descripcion, monto }) => {
  try {
    const resuelto = await resolverDia(fecha);
    if (!resuelto.ok) return { ok: false, mensaje: `No existe un día láser para el ${fecha}.` };
    await laserModel.createGastoLaser({ id_dia: resuelto.entidad.id, descripcion, monto });
    return { ok: true, mensaje: `Gasto láser "${descripcion}" registrado.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarCrearGastoLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude registrar el gasto láser, avisale a Juanma." };
  }
};

const proponerEliminarGastoLaser = async ({ fecha, descripcion }) => {
  const encontrado = await buscarGastoLaser(fecha, descripcion);
  if (!encontrado.ok) return encontrado;
  return {
    ok: true,
    confirmado: false,
    resumen: `Vas a eliminar el gasto láser "${encontrado.gasto.descripcion}" ($${Number(encontrado.gasto.monto)}) del ${fecha}. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarGastoLaser.`,
  };
};

const confirmarEliminarGastoLaser = async ({ fecha, descripcion }) => {
  try {
    const encontrado = await buscarGastoLaser(fecha, descripcion);
    if (!encontrado.ok) return encontrado;
    await laserModel.deleteGastoLaser(encontrado.gasto.id);
    return { ok: true, mensaje: `Gasto láser "${encontrado.gasto.descripcion}" eliminado.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarEliminarGastoLaser.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el gasto láser, avisale a Juanma." };
  }
};

// ── TRATAMIENTOS PAUTADOS ──────────────────────────

const consultarTratamientos = async ({ clienta }) => {
  const resuelto = await resolverClientaLaser(clienta);
  if (!resuelto.ok) return resuelto;
  try {
    const historial = await laserModel.getHistorialClientaLaser(resuelto.entidad.id);
    return {
      ok: true,
      tratamientos: historial.map((h) => ({
        zona: h.zona_nombre,
        sesionesRealizadas: h.sesiones_realizadas,
        sesionesPautadas: h.sesiones_pautadas,
      })),
    };
  } catch (error) {
    logger.error("asistente.laser.consultarTratamientos.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar el tratamiento de esa clienta, intentá de nuevo." };
  }
};

const proponerActualizarTratamiento = async ({ clienta, zona, sesiones_pautadas }) => {
  const resueltaClienta = await resolverClientaLaser(clienta);
  if (!resueltaClienta.ok) return resueltaClienta;
  const resueltaZona = await resolverZona(zona);
  if (!resueltaZona.ok) return resueltaZona;
  return {
    ok: true,
    confirmado: false,
    resumen: `Vas a pautar ${sesiones_pautadas} sesión(es) de ${resueltaZona.entidad.nombre} para ${resueltaClienta.entidad.nombre} ${resueltaClienta.entidad.apellido}. Pedile confirmación explícita a Sol antes de llamar a confirmarActualizarTratamiento.`,
  };
};

const confirmarActualizarTratamiento = async ({ clienta, zona, sesiones_pautadas }) => {
  try {
    const resueltaClienta = await resolverClientaLaser(clienta);
    if (!resueltaClienta.ok) return resueltaClienta;
    const resueltaZona = await resolverZona(zona);
    if (!resueltaZona.ok) return resueltaZona;
    await laserModel.upsertTratamiento(resueltaClienta.entidad.id, resueltaZona.entidad.id, Number(sesiones_pautadas));
    return { ok: true, mensaje: `Tratamiento de ${resueltaZona.entidad.nombre} actualizado para ${resueltaClienta.entidad.nombre}.` };
  } catch (error) {
    logger.error("asistente.laser.confirmarActualizarTratamiento.failed", { error: error.message });
    return { ok: false, mensaje: "No pude actualizar el tratamiento, avisale a Juanma." };
  }
};

// ── FUNCTION DECLARATIONS ──────────────────────────

const functionDeclarations = [
  {
    name: "consultarZonas",
    description: "Lista las zonas del catálogo láser, opcionalmente filtradas por género (F/M). Solo lectura.",
    parameters: { type: "OBJECT", properties: { genero: { type: "STRING", description: "F o M, opcional" } } },
  },
  {
    name: "proponerCrearZona",
    description: "Arma una propuesta de zona láser nueva sin guardarla.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" }, precio: { type: "NUMBER" }, genero: { type: "STRING" } },
      required: ["nombre"],
    },
  },
  {
    name: "confirmarCrearZona",
    description: "Crea la zona de verdad. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" }, precio: { type: "NUMBER" }, genero: { type: "STRING" } },
      required: ["nombre"],
    },
  },
  {
    name: "proponerEditarZona",
    description: "Arma una propuesta de edición de una zona existente sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: { nombre_actual: { type: "STRING" }, nuevo_nombre: { type: "STRING" }, nuevo_precio: { type: "NUMBER" } },
      required: ["nombre_actual"],
    },
  },
  {
    name: "confirmarEditarZona",
    description: "Aplica de verdad la edición de la zona. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { nombre_actual: { type: "STRING" }, nuevo_nombre: { type: "STRING" }, nuevo_precio: { type: "NUMBER" } },
      required: ["nombre_actual"],
    },
  },
  {
    name: "proponerEliminarZona",
    description: "Arma una propuesta de eliminación de zona sin borrar nada. Acción irreversible.",
    parameters: { type: "OBJECT", properties: { nombre: { type: "STRING" } }, required: ["nombre"] },
  },
  {
    name: "confirmarEliminarZona",
    description: "Elimina de verdad la zona. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: { type: "OBJECT", properties: { nombre: { type: "STRING" } }, required: ["nombre"] },
  },
  {
    name: "consultarCombos",
    description: "Lista los combos del catálogo láser, opcionalmente filtrados por género. Solo lectura.",
    parameters: { type: "OBJECT", properties: { genero: { type: "STRING" } } },
  },
  {
    name: "proponerCrearCombo",
    description: "Arma una propuesta de combo nuevo (con sus zonas) sin guardarlo.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        precio: { type: "NUMBER" },
        genero: { type: "STRING" },
        zonas: { type: "ARRAY", items: { type: "STRING" }, description: "Nombres de las zonas incluidas" },
      },
      required: ["nombre", "zonas"],
    },
  },
  {
    name: "confirmarCrearCombo",
    description: "Crea el combo de verdad. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        precio: { type: "NUMBER" },
        genero: { type: "STRING" },
        zonas: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["nombre", "zonas"],
    },
  },
  {
    name: "proponerEditarCombo",
    description: "Arma una propuesta de edición de nombre/precio de un combo existente sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: { nombre_actual: { type: "STRING" }, nuevo_nombre: { type: "STRING" }, nuevo_precio: { type: "NUMBER" } },
      required: ["nombre_actual"],
    },
  },
  {
    name: "confirmarEditarCombo",
    description: "Aplica de verdad la edición del combo. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { nombre_actual: { type: "STRING" }, nuevo_nombre: { type: "STRING" }, nuevo_precio: { type: "NUMBER" } },
      required: ["nombre_actual"],
    },
  },
  {
    name: "proponerEliminarCombo",
    description: "Arma una propuesta de eliminación de combo sin borrar nada. Acción irreversible.",
    parameters: { type: "OBJECT", properties: { nombre: { type: "STRING" } }, required: ["nombre"] },
  },
  {
    name: "confirmarEliminarCombo",
    description: "Elimina de verdad el combo. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: { type: "OBJECT", properties: { nombre: { type: "STRING" } }, required: ["nombre"] },
  },
  {
    name: "consultarClientasLaser",
    description: "Busca clientas de láser por nombre/apellido, o lista todas si no se especifica nombre. Solo lectura.",
    parameters: { type: "OBJECT", properties: { nombre: { type: "STRING" } } },
  },
  {
    name: "proponerCrearClientaLaser",
    description: "Arma una propuesta de clienta láser nueva sin guardarla. Avisa si ya existe una con el mismo nombre y apellido (en ese caso, crear actualiza en vez de duplicar).",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        apellido: { type: "STRING" },
        telefono: { type: "STRING" },
        genero: { type: "STRING", description: "F o M" },
        notas: { type: "STRING" },
      },
      required: ["nombre", "apellido"],
    },
  },
  {
    name: "confirmarCrearClientaLaser",
    description: "Crea (o actualiza, si ya existe por nombre+apellido) la clienta láser de verdad. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre: { type: "STRING" },
        apellido: { type: "STRING" },
        telefono: { type: "STRING" },
        genero: { type: "STRING" },
        notas: { type: "STRING" },
      },
      required: ["nombre", "apellido"],
    },
  },
  {
    name: "proponerEditarClientaLaser",
    description: "Arma una propuesta de edición de una clienta láser existente (buscada por nombre actual) sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nuevo_nombre: { type: "STRING" },
        nuevo_apellido: { type: "STRING" },
        nuevo_telefono: { type: "STRING" },
        nuevo_genero: { type: "STRING" },
        nuevas_notas: { type: "STRING" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "confirmarEditarClientaLaser",
    description: "Aplica de verdad la edición de la clienta láser. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        nombre_actual: { type: "STRING" },
        nuevo_nombre: { type: "STRING" },
        nuevo_apellido: { type: "STRING" },
        nuevo_telefono: { type: "STRING" },
        nuevo_genero: { type: "STRING" },
        nuevas_notas: { type: "STRING" },
      },
      required: ["nombre_actual"],
    },
  },
  {
    name: "proponerEliminarClientaLaser",
    description: "Busca una clienta láser y arma una propuesta de eliminación SIN borrar nada. Explica si corresponde baja lógica (tiene cobros) o eliminación con sesiones. Acción irreversible.",
    parameters: { type: "OBJECT", properties: { nombre: { type: "STRING" } }, required: ["nombre"] },
  },
  {
    name: "confirmarEliminarClientaLaser",
    description: "Elimina (o oculta, según el caso) de verdad a la clienta láser. Pasar forzar=\"hard\" SOLO si Sol pidió explícitamente borrar todo el historial en vez de ocultarla. NUNCA llamar sin confirmación verbal explícita de Sol sobre la opción puntual propuesta.",
    parameters: {
      type: "OBJECT",
      properties: { nombre: { type: "STRING" }, forzar: { type: "STRING", description: "\"hard\" para forzar borrado total en vez de ocultar, opcional" } },
      required: ["nombre"],
    },
  },
  {
    name: "consultarDiasLaser",
    description: "Lista los días de trabajo láser en un rango de fechas, con sus totales. Solo lectura.",
    parameters: { type: "OBJECT", properties: { desde: { type: "STRING" }, hasta: { type: "STRING" } } },
  },
  {
    name: "proponerCrearDiaLaser",
    description: "Arma una propuesta de día de trabajo láser nuevo sin guardarlo.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING", description: "YYYY-MM-DD" }, notas: { type: "STRING" } },
      required: ["fecha"],
    },
  },
  {
    name: "confirmarCrearDiaLaser",
    description: "Crea el día láser de verdad. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, notas: { type: "STRING" } },
      required: ["fecha"],
    },
  },
  {
    name: "proponerEliminarDiaLaser",
    description: "Arma una propuesta de eliminación de un día láser (y sus sesiones) sin borrar nada. Acción irreversible.",
    parameters: { type: "OBJECT", properties: { fecha: { type: "STRING" } }, required: ["fecha"] },
  },
  {
    name: "confirmarEliminarDiaLaser",
    description: "Elimina de verdad el día láser. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: { type: "OBJECT", properties: { fecha: { type: "STRING" } }, required: ["fecha"] },
  },
  {
    name: "consultarSesionesDia",
    description: "Lista las sesiones láser cargadas en un día puntual. Solo lectura.",
    parameters: { type: "OBJECT", properties: { fecha: { type: "STRING" } }, required: ["fecha"] },
  },
  {
    name: "consultarSesionesClienta",
    description: "Lista el historial de sesiones láser de una clienta. Solo lectura.",
    parameters: { type: "OBJECT", properties: { clienta: { type: "STRING" } }, required: ["clienta"] },
  },
  {
    name: "proponerCrearSesionLaser",
    description: "Arma una propuesta de sesión láser nueva para una clienta en un día existente, con UN ítem inicial (zona o combo) sin guardar nada. El día tiene que existir de antes.",
    parameters: {
      type: "OBJECT",
      properties: {
        fecha: { type: "STRING" },
        clienta: { type: "STRING" },
        hora: { type: "STRING" },
        costo_total: { type: "NUMBER" },
        monto_abonado: { type: "NUMBER" },
        zona_o_combo: { type: "STRING" },
        notas: { type: "STRING" },
      },
      required: ["fecha", "clienta", "zona_o_combo"],
    },
  },
  {
    name: "confirmarCrearSesionLaser",
    description: "Crea la sesión láser de verdad, con su primer ítem. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        fecha: { type: "STRING" },
        clienta: { type: "STRING" },
        hora: { type: "STRING" },
        costo_total: { type: "NUMBER" },
        monto_abonado: { type: "NUMBER" },
        zona_o_combo: { type: "STRING" },
        notas: { type: "STRING" },
      },
      required: ["fecha", "clienta", "zona_o_combo"],
    },
  },
  {
    name: "proponerAgregarItemSesion",
    description: "Arma una propuesta para agregar una zona/combo adicional a una sesión ya existente de una clienta en un día, sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, clienta: { type: "STRING" }, zona_o_combo: { type: "STRING" } },
      required: ["fecha", "clienta", "zona_o_combo"],
    },
  },
  {
    name: "confirmarAgregarItemSesion",
    description: "Agrega de verdad el ítem a la sesión existente. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, clienta: { type: "STRING" }, zona_o_combo: { type: "STRING" } },
      required: ["fecha", "clienta", "zona_o_combo"],
    },
  },
  {
    name: "proponerEliminarSesionLaser",
    description: "Busca una sesión láser (por día y clienta) y arma una propuesta de eliminación sin borrar nada. Acción irreversible.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, clienta: { type: "STRING" } },
      required: ["fecha", "clienta"],
    },
  },
  {
    name: "confirmarEliminarSesionLaser",
    description: "Elimina de verdad la sesión láser. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, clienta: { type: "STRING" } },
      required: ["fecha", "clienta"],
    },
  },
  {
    name: "consultarGastosLaser",
    description: "Lista los gastos láser de un día puntual. Solo lectura.",
    parameters: { type: "OBJECT", properties: { fecha: { type: "STRING" } }, required: ["fecha"] },
  },
  {
    name: "proponerCrearGastoLaser",
    description: "Arma una propuesta de gasto láser nuevo para un día existente sin guardarlo.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, descripcion: { type: "STRING" }, monto: { type: "NUMBER" } },
      required: ["fecha", "descripcion", "monto"],
    },
  },
  {
    name: "confirmarCrearGastoLaser",
    description: "Registra el gasto láser de verdad. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, descripcion: { type: "STRING" }, monto: { type: "NUMBER" } },
      required: ["fecha", "descripcion", "monto"],
    },
  },
  {
    name: "proponerEliminarGastoLaser",
    description: "Busca un gasto láser por día y descripción y arma una propuesta de eliminación sin borrar nada. Acción irreversible.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, descripcion: { type: "STRING" } },
      required: ["fecha", "descripcion"],
    },
  },
  {
    name: "confirmarEliminarGastoLaser",
    description: "Elimina de verdad el gasto láser. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { fecha: { type: "STRING" }, descripcion: { type: "STRING" } },
      required: ["fecha", "descripcion"],
    },
  },
  {
    name: "consultarTratamientos",
    description: "Muestra el plan de tratamiento (sesiones pautadas vs. realizadas por zona) de una clienta láser. Solo lectura.",
    parameters: { type: "OBJECT", properties: { clienta: { type: "STRING" } }, required: ["clienta"] },
  },
  {
    name: "proponerActualizarTratamiento",
    description: "Arma una propuesta para pautar/actualizar la cantidad de sesiones de una zona en el tratamiento de una clienta, sin guardar nada.",
    parameters: {
      type: "OBJECT",
      properties: { clienta: { type: "STRING" }, zona: { type: "STRING" }, sesiones_pautadas: { type: "NUMBER" } },
      required: ["clienta", "zona", "sesiones_pautadas"],
    },
  },
  {
    name: "confirmarActualizarTratamiento",
    description: "Aplica de verdad el tratamiento pautado. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: { clienta: { type: "STRING" }, zona: { type: "STRING" }, sesiones_pautadas: { type: "NUMBER" } },
      required: ["clienta", "zona", "sesiones_pautadas"],
    },
  },
];

const ejecutar = async (nombre, args) => {
  switch (nombre) {
    case "consultarZonas":
      return consultarZonas(args);
    case "proponerCrearZona":
      return proponerCrearZona(args);
    case "confirmarCrearZona":
      return confirmarCrearZona(args);
    case "proponerEditarZona":
      return proponerEditarZona(args);
    case "confirmarEditarZona":
      return confirmarEditarZona(args);
    case "proponerEliminarZona":
      return proponerEliminarZona(args);
    case "confirmarEliminarZona":
      return confirmarEliminarZona(args);
    case "consultarCombos":
      return consultarCombos(args);
    case "proponerCrearCombo":
      return proponerCrearCombo(args);
    case "confirmarCrearCombo":
      return confirmarCrearCombo(args);
    case "proponerEditarCombo":
      return proponerEditarCombo(args);
    case "confirmarEditarCombo":
      return confirmarEditarCombo(args);
    case "proponerEliminarCombo":
      return proponerEliminarCombo(args);
    case "confirmarEliminarCombo":
      return confirmarEliminarCombo(args);
    case "consultarClientasLaser":
      return consultarClientasLaser(args);
    case "proponerCrearClientaLaser":
      return proponerCrearClientaLaser(args);
    case "confirmarCrearClientaLaser":
      return confirmarCrearClientaLaser(args);
    case "proponerEditarClientaLaser":
      return proponerEditarClientaLaser(args);
    case "confirmarEditarClientaLaser":
      return confirmarEditarClientaLaser(args);
    case "proponerEliminarClientaLaser":
      return proponerEliminarClientaLaser(args);
    case "confirmarEliminarClientaLaser":
      return confirmarEliminarClientaLaser(args);
    case "consultarDiasLaser":
      return consultarDiasLaser(args);
    case "proponerCrearDiaLaser":
      return proponerCrearDiaLaser(args);
    case "confirmarCrearDiaLaser":
      return confirmarCrearDiaLaser(args);
    case "proponerEliminarDiaLaser":
      return proponerEliminarDiaLaser(args);
    case "confirmarEliminarDiaLaser":
      return confirmarEliminarDiaLaser(args);
    case "consultarSesionesDia":
      return consultarSesionesDia(args);
    case "consultarSesionesClienta":
      return consultarSesionesClienta(args);
    case "proponerCrearSesionLaser":
      return proponerCrearSesionLaser(args);
    case "confirmarCrearSesionLaser":
      return confirmarCrearSesionLaser(args);
    case "proponerAgregarItemSesion":
      return proponerAgregarItemSesion(args);
    case "confirmarAgregarItemSesion":
      return confirmarAgregarItemSesion(args);
    case "proponerEliminarSesionLaser":
      return proponerEliminarSesionLaser(args);
    case "confirmarEliminarSesionLaser":
      return confirmarEliminarSesionLaser(args);
    case "consultarGastosLaser":
      return consultarGastosLaser(args);
    case "proponerCrearGastoLaser":
      return proponerCrearGastoLaser(args);
    case "confirmarCrearGastoLaser":
      return confirmarCrearGastoLaser(args);
    case "proponerEliminarGastoLaser":
      return proponerEliminarGastoLaser(args);
    case "confirmarEliminarGastoLaser":
      return confirmarEliminarGastoLaser(args);
    case "consultarTratamientos":
      return consultarTratamientos(args);
    case "proponerActualizarTratamiento":
      return proponerActualizarTratamiento(args);
    case "confirmarActualizarTratamiento":
      return confirmarActualizarTratamiento(args);
    default:
      return null;
  }
};

const systemInstructionFragment =
  "El módulo láser es un sistema paralelo al del salón (clientas, zonas, combos, días de trabajo, sesiones, gastos y tratamientos pautados propios). " +
  "Para crear, editar o eliminar cualquier cosa de láser, usá siempre primero la herramienta 'proponer...' correspondiente, leele el resumen completo a Sol, y SOLO después de una confirmación verbal explícita e inequívoca llamá a la 'confirmar...'. " +
  "Para cargar una sesión con varios ítems (zonas o combos), primero creá la sesión con un ítem usando proponerCrearSesionLaser/confirmarCrearSesionLaser, y para cada ítem adicional usá proponerAgregarItemSesion/confirmarAgregarItemSesion. " +
  "Eliminar una clienta láser puede significar ocultarla (baja lógica, conserva historial) o borrarla junto con sus sesiones — explicáselo siempre a Sol antes de pedir confirmación, y solo usá forzar=\"hard\" si ella lo pide explícitamente. " +
  "Ninguna acción de escritura de este módulo se puede deshacer una vez confirmada.";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
