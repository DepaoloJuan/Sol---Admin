const pool = require("../../api/database/db");
const logger = require("../logger");
const { formatDate } = require("../dateHelpers");
const { normalizarDatosTurno } = require("../turnoHelpers");
const { enviarPushATodas } = require("../pushHelper");
const clienteModel = require("../../api/models/clienteModel");
const empleadoModel = require("../../api/models/empleadoModel");
const servicioModel = require("../../api/models/servicioModel");
const turnoModel = require("../../api/models/turnoModel");
const userModel = require("../../api/models/userModel");
const pushSubscriptionModel = require("../../api/models/pushSubscriptionModel");
const { resolverUnico } = require("./_shared");

const consultarTurnos = async ({ desde, hasta, empleado }) => {
  try {
    let idEmpleado = null;
    if (empleado) {
      const resuelto = await resolverUnico(empleadoModel.searchEmpleados, empleado, "empleada");
      if (!resuelto.ok) return resuelto;
      idEmpleado = resuelto.entidad.id;
    }

    const turnos = await turnoModel.getTurnosPorRango(desde, hasta);
    const filtrados = idEmpleado
      ? turnos.filter((t) => Number(t.id_empleado) === Number(idEmpleado))
      : turnos;

    return {
      ok: true,
      turnos: filtrados.map((t) => ({
        id: t.id,
        fecha: formatDate(t.fecha),
        hora: t.hora,
        cliente: `${t.cliente_nombre || ""} ${t.cliente_apellido || ""}`.trim(),
        empleado: t.empleado_nombre,
        servicio: t.servicio_descripcion,
        estado: t.estado,
        costo: Number(t.costo || 0),
      })),
    };
  } catch (error) {
    logger.error("asistente.consultarTurnos.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los turnos, intentá de nuevo." };
  }
};

const resolverPropuesta = async ({ cliente, servicio, fecha, hora, empleado }) => {
  const resCliente = await resolverUnico(clienteModel.searchClientes, cliente, "cliente");
  if (!resCliente.ok) return resCliente;

  const resServicio = await resolverUnico(servicioModel.searchServicios, servicio, "servicio");
  if (!resServicio.ok) return resServicio;

  const resEmpleado = await resolverUnico(empleadoModel.searchEmpleados, empleado, "empleada");
  if (!resEmpleado.ok) return resEmpleado;

  const costo = Number(resServicio.entidad.precio || 0);
  const duracion = Number(resServicio.entidad.duracion_sugerida || 30);

  const turnoSolapado = await turnoModel.existeSolapamiento(
    resEmpleado.entidad.id,
    fecha,
    hora,
    duracion,
  );
  if (turnoSolapado) {
    return {
      ok: false,
      mensaje: `Esa empleada ya tiene un turno a las ${turnoSolapado.hora} con ${turnoSolapado.cliente_nombre || "otro cliente"}. Elegí otro horario.`,
    };
  }

  return {
    ok: true,
    datos: {
      id_cliente: resCliente.entidad.id,
      id_servicio: resServicio.entidad.id,
      id_empleado: resEmpleado.entidad.id,
      fecha,
      hora,
      costo,
      duracion,
      clienteNombre: `${resCliente.entidad.nombre || ""} ${resCliente.entidad.apellido || ""}`.trim(),
      servicioNombre: resServicio.entidad.descripcion,
      empleadoNombre: `${resEmpleado.entidad.nombre || ""} ${resEmpleado.entidad.apellido || ""}`.trim(),
    },
  };
};

const proponerTurno = async ({ cliente, servicio, fecha, hora, empleado }) => {
  try {
    const resuelto = await resolverPropuesta({ cliente, servicio, fecha, hora, empleado });
    if (!resuelto.ok) return resuelto;

    const { clienteNombre, servicioNombre, empleadoNombre, fecha: f, hora: h, costo } = resuelto.datos;
    return {
      ok: true,
      confirmado: false,
      resumen: `Turno para ${clienteNombre}, servicio ${servicioNombre}, con ${empleadoNombre}, el ${f} a las ${h}, costo $${costo}. Pedile confirmación explícita a Sol antes de llamar a confirmarTurno.`,
    };
  } catch (error) {
    logger.error("asistente.proponerTurno.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la propuesta de turno, intentá de nuevo." };
  }
};

const avisarEmpleadaTurno = async ({ id_empleado, fecha, hora, clienteNombre }) => {
  try {
    const usuario = await userModel.getUsuarioByEmpleadoId(id_empleado);
    if (usuario) {
      const suscripciones = await pushSubscriptionModel.getSuscripcionesPorUsuario(usuario.id);
      if (suscripciones.length > 0) {
        await enviarPushATodas(suscripciones, {
          title: "Turno nuevo asignado",
          body: `${fecha} ${hora} - ${clienteNombre}`,
          url: `/agenda?fecha=${fecha}`,
        });
      }
    }
  } catch (pushError) {
    logger.error("asistente.turno.push.failed", { error: pushError.message });
  }
};

const confirmarTurno = async ({ cliente, servicio, fecha, hora, empleado }) => {
  try {
    const resuelto = await resolverPropuesta({ cliente, servicio, fecha, hora, empleado });
    if (!resuelto.ok) return resuelto;

    const { id_cliente, id_servicio, id_empleado, costo, duracion } = resuelto.datos;
    const { costoNormalizado, duracionNormalizada, montoAbonadoNormalizado, estado } =
      normalizarDatosTurno({ costo, duracion, monto_abonado: 0 });

    const empleada = await empleadoModel.getEmpleadoById(id_empleado);
    const porcentajeGanancia = empleada ? Number(empleada.porcentaje_ganancia || 0) : 0;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await turnoModel.createTurno(
        {
          fecha,
          hora,
          id_cliente,
          id_empleado,
          id_servicio,
          costo: costoNormalizado,
          estado,
          duracion: duracionNormalizada,
          monto_abonado: montoAbonadoNormalizado,
          porcentaje_ganancia: porcentajeGanancia,
        },
        client,
      );
      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    await avisarEmpleadaTurno({ id_empleado, fecha, hora, clienteNombre: resuelto.datos.clienteNombre });

    return { ok: true, mensaje: `Turno creado para ${resuelto.datos.clienteNombre} el ${fecha} a las ${hora}.` };
  } catch (error) {
    logger.error("asistente.confirmarTurno.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el turno, avisale a Juanma." };
  }
};

/**
 * El modelo de voz no conoce IDs de turno, así que lo ubicamos por
 * cliente + fecha (+ hora aproximada para desambiguar).
 */
const buscarTurno = async ({ cliente, fecha, hora }) => {
  const turnosDelDia = await turnoModel.getTurnosPorFecha(fecha);
  const q = cliente.toLowerCase();
  let candidatos = turnosDelDia.filter((t) =>
    `${t.cliente_nombre || ""} ${t.cliente_apellido || ""}`.toLowerCase().includes(q),
  );

  if (candidatos.length > 1 && hora) {
    const conHora = candidatos.filter((t) => String(t.hora).startsWith(hora));
    if (conHora.length > 0) candidatos = conHora;
  }

  if (candidatos.length === 0) {
    return { ok: false, mensaje: `No encontré ningún turno de "${cliente}" el ${fecha}.` };
  }
  if (candidatos.length > 1) {
    const lista = candidatos.map((t) => `${t.hora} (${t.servicio_descripcion || "sin servicio"})`).join(", ");
    return { ok: false, mensaje: `Hay más de un turno de "${cliente}" el ${fecha}: ${lista}. Pedile a Sol la hora exacta.` };
  }
  return { ok: true, turno: candidatos[0] };
};

const proponerEditarTurno = async ({ cliente, fecha, hora, nueva_fecha, nueva_hora, nuevo_empleado, nuevo_estado, nuevo_servicio }) => {
  try {
    const encontrado = await buscarTurno({ cliente, fecha, hora });
    if (!encontrado.ok) return encontrado;

    const cambios = [];
    if (nueva_fecha) cambios.push(`fecha → ${nueva_fecha}`);
    if (nueva_hora) cambios.push(`hora → ${nueva_hora}`);
    if (nuevo_empleado) cambios.push(`empleada → ${nuevo_empleado}`);
    if (nuevo_estado) cambios.push(`estado → ${nuevo_estado}`);
    if (nuevo_servicio) cambios.push(`servicio → ${nuevo_servicio}`);

    if (cambios.length === 0) {
      return { ok: false, mensaje: "No me dijiste qué cambiar de ese turno." };
    }

    return {
      ok: true,
      confirmado: false,
      resumen: `Turno de ${encontrado.turno.cliente_nombre || cliente} el ${formatDate(encontrado.turno.fecha)} a las ${encontrado.turno.hora}. Cambios propuestos: ${cambios.join(", ")}. Pedile confirmación explícita a Sol antes de llamar a confirmarEditarTurno.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEditarTurno.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar la edición del turno, intentá de nuevo." };
  }
};

const confirmarEditarTurno = async ({ cliente, fecha, hora, nueva_fecha, nueva_hora, nuevo_empleado, nuevo_estado, nuevo_servicio }) => {
  try {
    const encontrado = await buscarTurno({ cliente, fecha, hora });
    if (!encontrado.ok) return encontrado;
    const turno = encontrado.turno;

    let idEmpleado = Number(turno.id_empleado);
    let porcentajeGanancia = Number(turno.porcentaje_ganancia || 0);
    if (nuevo_empleado) {
      const resEmp = await resolverUnico(empleadoModel.searchEmpleados, nuevo_empleado, "empleada");
      if (!resEmp.ok) return resEmp;
      idEmpleado = resEmp.entidad.id;
      porcentajeGanancia = Number(resEmp.entidad.porcentaje_ganancia || 0);
    }

    let idServicio = Number(turno.id_servicio);
    let costo = Number(turno.costo || 0);
    let duracion = Number(turno.duracion || 30);
    if (nuevo_servicio) {
      const resServ = await resolverUnico(servicioModel.searchServicios, nuevo_servicio, "servicio");
      if (!resServ.ok) return resServ;
      idServicio = resServ.entidad.id;
      costo = Number(resServ.entidad.precio || 0);
      duracion = Number(resServ.entidad.duracion_sugerida || 30);
    }

    const nuevaFechaFinal = nueva_fecha || formatDate(turno.fecha);
    const nuevaHoraFinal = nueva_hora || turno.hora;

    const turnoSolapado = await turnoModel.existeSolapamiento(
      idEmpleado,
      nuevaFechaFinal,
      nuevaHoraFinal,
      duracion,
      Number(turno.id),
    );
    if (turnoSolapado) {
      return {
        ok: false,
        mensaje: `Esa empleada ya tiene otro turno a las ${turnoSolapado.hora} con ${turnoSolapado.cliente_nombre || "otro cliente"}. Elegí otro horario.`,
      };
    }

    await turnoModel.updateTurno(turno.id, {
      fecha: nuevaFechaFinal,
      hora: nuevaHoraFinal,
      id_cliente: Number(turno.id_cliente),
      id_empleado: idEmpleado,
      id_servicio: idServicio,
      costo,
      estado: nuevo_estado || turno.estado,
      duracion,
      monto_abonado: Number(turno.monto_abonado || 0),
      propina: Number(turno.propina || 0),
      porcentaje_ganancia: porcentajeGanancia,
    });

    if (nuevo_empleado) {
      await avisarEmpleadaTurno({
        id_empleado: idEmpleado,
        fecha: nuevaFechaFinal,
        hora: nuevaHoraFinal,
        clienteNombre: turno.cliente_nombre || cliente,
      });
    }

    return { ok: true, mensaje: `Turno de ${turno.cliente_nombre || cliente} actualizado.` };
  } catch (error) {
    logger.error("asistente.confirmarEditarTurno.failed", { error: error.message });
    return { ok: false, mensaje: "No pude editar el turno, avisale a Juanma." };
  }
};

const proponerEliminarTurno = async ({ cliente, fecha, hora }) => {
  try {
    const encontrado = await buscarTurno({ cliente, fecha, hora });
    if (!encontrado.ok) return encontrado;
    const t = encontrado.turno;
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar el turno de ${t.cliente_nombre || cliente} el ${formatDate(t.fecha)} a las ${t.hora} (${t.servicio_descripcion || "sin servicio"}). Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarTurno.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarTurno.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese turno, intentá de nuevo." };
  }
};

const confirmarEliminarTurno = async ({ cliente, fecha, hora }) => {
  try {
    const encontrado = await buscarTurno({ cliente, fecha, hora });
    if (!encontrado.ok) return encontrado;
    await turnoModel.deleteTurno(encontrado.turno.id);
    return { ok: true, mensaje: `Turno de ${encontrado.turno.cliente_nombre || cliente} eliminado.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarTurno.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el turno, avisale a Juanma." };
  }
};

const functionDeclarations = [
  {
    name: "consultarTurnos",
    description: "Consulta de solo lectura de los turnos agendados en un rango de fechas, opcionalmente filtrados por empleada. Usar para responder preguntas sobre la agenda del día, la semana, etc.",
    parameters: {
      type: "OBJECT",
      properties: {
        desde: { type: "STRING", description: "Fecha de inicio en formato YYYY-MM-DD" },
        hasta: { type: "STRING", description: "Fecha de fin en formato YYYY-MM-DD" },
        empleado: { type: "STRING", description: "Nombre de la empleada para filtrar (opcional)" },
      },
      required: ["desde", "hasta"],
    },
  },
  {
    name: "proponerTurno",
    description: "Arma una propuesta de turno nuevo SIN guardarlo en la base. Devuelve un resumen para leerle a Sol y pedirle confirmación explícita antes de llamar a confirmarTurno.",
    parameters: {
      type: "OBJECT",
      properties: {
        cliente: { type: "STRING", description: "Nombre del cliente" },
        servicio: { type: "STRING", description: "Nombre o descripción del servicio" },
        fecha: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
        hora: { type: "STRING", description: "Hora en formato HH:MM" },
        empleado: { type: "STRING", description: "Nombre de la empleada que va a atender el turno" },
      },
      required: ["cliente", "servicio", "fecha", "hora", "empleado"],
    },
  },
  {
    name: "confirmarTurno",
    description: "Crea el turno en la base de datos de verdad. NUNCA llamar a esta función sin que Sol haya confirmado explícitamente de palabra el resumen que le leíste con proponerTurno. Si Sol no dijo una confirmación clara (\"sí\", \"dale\", \"confirmado\", etc.), no llames a esta función.",
    parameters: {
      type: "OBJECT",
      properties: {
        cliente: { type: "STRING", description: "Nombre del cliente" },
        servicio: { type: "STRING", description: "Nombre o descripción del servicio" },
        fecha: { type: "STRING", description: "Fecha en formato YYYY-MM-DD" },
        hora: { type: "STRING", description: "Hora en formato HH:MM" },
        empleado: { type: "STRING", description: "Nombre de la empleada que va a atender el turno" },
      },
      required: ["cliente", "servicio", "fecha", "hora", "empleado"],
    },
  },
  {
    name: "proponerEditarTurno",
    description: "Arma una propuesta de edición de un turno EXISTENTE (buscado por cliente + fecha, opcionalmente hora si hay ambigüedad) sin guardar nada. Devuelve un resumen de los cambios para pedir confirmación explícita antes de confirmarEditarTurno.",
    parameters: {
      type: "OBJECT",
      properties: {
        cliente: { type: "STRING", description: "Nombre del cliente del turno a editar" },
        fecha: { type: "STRING", description: "Fecha actual del turno, YYYY-MM-DD" },
        hora: { type: "STRING", description: "Hora actual aproximada, HH:MM (opcional, para desambiguar si hay varios turnos ese día)" },
        nueva_fecha: { type: "STRING", description: "Nueva fecha, YYYY-MM-DD (opcional)" },
        nueva_hora: { type: "STRING", description: "Nueva hora, HH:MM (opcional)" },
        nuevo_empleado: { type: "STRING", description: "Nueva empleada asignada (opcional)" },
        nuevo_estado: { type: "STRING", description: "Nuevo estado: Pendiente, Parcial o Pagado (opcional)" },
        nuevo_servicio: { type: "STRING", description: "Nuevo servicio (opcional)" },
      },
      required: ["cliente", "fecha"],
    },
  },
  {
    name: "confirmarEditarTurno",
    description: "Aplica de verdad los cambios propuestos con proponerEditarTurno. NUNCA llamar sin confirmación verbal explícita de Sol sobre esa propuesta puntual.",
    parameters: {
      type: "OBJECT",
      properties: {
        cliente: { type: "STRING" },
        fecha: { type: "STRING" },
        hora: { type: "STRING" },
        nueva_fecha: { type: "STRING" },
        nueva_hora: { type: "STRING" },
        nuevo_empleado: { type: "STRING" },
        nuevo_estado: { type: "STRING" },
        nuevo_servicio: { type: "STRING" },
      },
      required: ["cliente", "fecha"],
    },
  },
  {
    name: "proponerEliminarTurno",
    description: "Busca un turno existente (por cliente + fecha, opcionalmente hora) y arma una propuesta de eliminación SIN borrar nada todavía. Es una acción irreversible: siempre hay que pedir confirmación explícita antes de confirmarEliminarTurno.",
    parameters: {
      type: "OBJECT",
      properties: {
        cliente: { type: "STRING", description: "Nombre del cliente del turno a eliminar" },
        fecha: { type: "STRING", description: "Fecha del turno, YYYY-MM-DD" },
        hora: { type: "STRING", description: "Hora aproximada, HH:MM (opcional, para desambiguar)" },
      },
      required: ["cliente", "fecha"],
    },
  },
  {
    name: "confirmarEliminarTurno",
    description: "Elimina de verdad el turno de la base de datos. NUNCA llamar sin confirmación verbal explícita e inequívoca de Sol sobre esa propuesta puntual.",
    parameters: {
      type: "OBJECT",
      properties: {
        cliente: { type: "STRING" },
        fecha: { type: "STRING" },
        hora: { type: "STRING" },
      },
      required: ["cliente", "fecha"],
    },
  },
];

const ejecutar = async (nombre, args) => {
  switch (nombre) {
    case "consultarTurnos":
      return consultarTurnos(args);
    case "proponerTurno":
      return proponerTurno(args);
    case "confirmarTurno":
      return confirmarTurno(args);
    case "proponerEditarTurno":
      return proponerEditarTurno(args);
    case "confirmarEditarTurno":
      return confirmarEditarTurno(args);
    case "proponerEliminarTurno":
      return proponerEliminarTurno(args);
    case "confirmarEliminarTurno":
      return confirmarEliminarTurno(args);
    default:
      return null;
  }
};

const systemInstructionFragment =
  "Para cargar un turno nuevo, SIEMPRE usá primero proponerTurno y leele el resumen completo a Sol pidiéndole que confirme; recién después llamá a confirmarTurno. " +
  "Para editar o eliminar un turno existente, usá primero proponerEditarTurno/proponerEliminarTurno (identificá el turno por cliente y fecha, pedile la hora si hay ambigüedad), leele el resumen a Sol, y SOLO después de una confirmación verbal explícita e inequívoca llamá a confirmarEditarTurno/confirmarEliminarTurno. Eliminar un turno no se puede deshacer.";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
