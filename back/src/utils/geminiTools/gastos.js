const logger = require("../logger");
const { formatDate } = require("../dateHelpers");
const gastoModel = require("../../api/models/gastoModel");
const gastoPersonalModel = require("../../api/models/gastoPersonalModel");
const empleadoModel = require("../../api/models/empleadoModel");
const { resolverUnico, fechaDB } = require("./_shared");

const ventanaDeFecha = (fecha, dias = 3) => {
  const centro = new Date(`${fecha}T12:00:00`);
  const desde = new Date(centro);
  desde.setDate(desde.getDate() - dias);
  const hasta = new Date(centro);
  hasta.setDate(hasta.getDate() + dias);
  return { desde: formatDate(desde), hasta: formatDate(hasta) };
};

/* =========================
   GASTOS GENERALES
========================= */

const consultarGastos = async ({ desde, hasta }) => {
  try {
    const gastos = await gastoModel.getGastosPorRango(desde, hasta);
    return {
      ok: true,
      gastos: gastos.map((g) => ({
        fecha: fechaDB(g.fecha),
        descripcion: g.descripcion,
        monto: Number(g.monto || 0),
        categoria: g.categoria,
      })),
    };
  } catch (error) {
    logger.error("asistente.consultarGastos.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los gastos, intentá de nuevo." };
  }
};

const proponerCrearGasto = async ({ descripcion, monto, categoria, fecha }) => {
  return {
    ok: true,
    confirmado: false,
    resumen: `Nuevo gasto: "${descripcion}", $${monto}${categoria ? `, categoría ${categoria}` : ""}, fecha ${fecha}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearGasto.`,
  };
};

const confirmarCrearGasto = async ({ descripcion, monto, categoria, fecha }) => {
  try {
    await gastoModel.createGasto({ fecha, descripcion, monto, categoria });
    return { ok: true, mensaje: `Gasto "${descripcion}" de $${monto} creado.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearGasto.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el gasto, avisale a Juanma." };
  }
};

const buscarGasto = async ({ descripcion, fecha_aproximada }) => {
  const { desde, hasta } = ventanaDeFecha(fecha_aproximada);
  const gastos = await gastoModel.getGastosPorRango(desde, hasta);
  const q = descripcion.toLowerCase();
  const candidatos = gastos.filter((g) => (g.descripcion || "").toLowerCase().includes(q));

  if (candidatos.length === 0) {
    return { ok: false, mensaje: `No encontré ningún gasto con "${descripcion}" cerca del ${fecha_aproximada}.` };
  }
  if (candidatos.length > 1) {
    const lista = candidatos.map((g) => `${fechaDB(g.fecha)}: ${g.descripcion} ($${g.monto})`).join(", ");
    return { ok: false, mensaje: `Hay más de un gasto que coincide: ${lista}. Pedile a Sol más precisión.` };
  }
  return { ok: true, gasto: candidatos[0] };
};

const proponerEliminarGasto = async ({ descripcion, fecha_aproximada }) => {
  try {
    const encontrado = await buscarGasto({ descripcion, fecha_aproximada });
    if (!encontrado.ok) return encontrado;
    const g = encontrado.gasto;
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar el gasto "${g.descripcion}" del ${fechaDB(g.fecha)} por $${g.monto}. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarGasto.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarGasto.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese gasto, intentá de nuevo." };
  }
};

const confirmarEliminarGasto = async ({ descripcion, fecha_aproximada }) => {
  try {
    const encontrado = await buscarGasto({ descripcion, fecha_aproximada });
    if (!encontrado.ok) return encontrado;
    await gastoModel.deleteGasto(encontrado.gasto.id);
    return { ok: true, mensaje: `Gasto "${encontrado.gasto.descripcion}" eliminado.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarGasto.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el gasto, avisale a Juanma." };
  }
};

/* =========================
   GASTOS PERSONALES (por empleada)
========================= */

const consultarGastosPersonales = async ({ empleado, desde, hasta }) => {
  try {
    const resuelto = await resolverUnico(empleadoModel.searchEmpleados, empleado, "empleada");
    if (!resuelto.ok) return resuelto;

    const gastos = await gastoPersonalModel.getGastosPersonalesPorRango(resuelto.entidad.id, desde, hasta);
    return {
      ok: true,
      gastos: gastos.map((g) => ({
        fecha: fechaDB(g.fecha),
        descripcion: g.descripcion,
        monto: Number(g.monto || 0),
        categoria: g.categoria,
      })),
    };
  } catch (error) {
    logger.error("asistente.consultarGastosPersonales.failed", { error: error.message });
    return { ok: false, mensaje: "No pude consultar los gastos personales, intentá de nuevo." };
  }
};

const proponerCrearGastoPersonal = async ({ empleado, descripcion, monto, categoria, fecha }) => {
  try {
    const resuelto = await resolverUnico(empleadoModel.searchEmpleados, empleado, "empleada");
    if (!resuelto.ok) return resuelto;

    return {
      ok: true,
      confirmado: false,
      resumen: `Nuevo gasto personal para ${resuelto.entidad.nombre}: "${descripcion}", $${monto}${categoria ? `, categoría ${categoria}` : ""}, fecha ${fecha}. Pedile confirmación explícita a Sol antes de llamar a confirmarCrearGastoPersonal.`,
    };
  } catch (error) {
    logger.error("asistente.proponerCrearGastoPersonal.failed", { error: error.message });
    return { ok: false, mensaje: "No pude armar el gasto personal, intentá de nuevo." };
  }
};

const confirmarCrearGastoPersonal = async ({ empleado, descripcion, monto, categoria, fecha }) => {
  try {
    const resuelto = await resolverUnico(empleadoModel.searchEmpleados, empleado, "empleada");
    if (!resuelto.ok) return resuelto;

    await gastoPersonalModel.createGastoPersonal({
      id_empleado: resuelto.entidad.id,
      fecha,
      descripcion,
      monto,
      categoria,
    });
    return { ok: true, mensaje: `Gasto personal "${descripcion}" de $${monto} creado para ${resuelto.entidad.nombre}.` };
  } catch (error) {
    logger.error("asistente.confirmarCrearGastoPersonal.failed", { error: error.message });
    return { ok: false, mensaje: "No pude crear el gasto personal, avisale a Juanma." };
  }
};

const buscarGastoPersonal = async ({ empleado, descripcion, fecha_aproximada }) => {
  const resuelto = await resolverUnico(empleadoModel.searchEmpleados, empleado, "empleada");
  if (!resuelto.ok) return resuelto;

  const { desde, hasta } = ventanaDeFecha(fecha_aproximada);
  const gastos = await gastoPersonalModel.getGastosPersonalesPorRango(resuelto.entidad.id, desde, hasta);
  const q = descripcion.toLowerCase();
  const candidatos = gastos.filter((g) => (g.descripcion || "").toLowerCase().includes(q));

  if (candidatos.length === 0) {
    return { ok: false, mensaje: `No encontré ningún gasto personal de ${resuelto.entidad.nombre} con "${descripcion}" cerca del ${fecha_aproximada}.` };
  }
  if (candidatos.length > 1) {
    const lista = candidatos.map((g) => `${fechaDB(g.fecha)}: ${g.descripcion} ($${g.monto})`).join(", ");
    return { ok: false, mensaje: `Hay más de un gasto personal que coincide: ${lista}. Pedile a Sol más precisión.` };
  }
  return { ok: true, gasto: candidatos[0], empleadoNombre: resuelto.entidad.nombre };
};

const proponerEliminarGastoPersonal = async ({ empleado, descripcion, fecha_aproximada }) => {
  try {
    const encontrado = await buscarGastoPersonal({ empleado, descripcion, fecha_aproximada });
    if (!encontrado.ok) return encontrado;
    const g = encontrado.gasto;
    return {
      ok: true,
      confirmado: false,
      resumen: `Vas a eliminar el gasto personal de ${encontrado.empleadoNombre}: "${g.descripcion}" del ${fechaDB(g.fecha)} por $${g.monto}. Esto no se puede deshacer. Pedile confirmación explícita a Sol antes de llamar a confirmarEliminarGastoPersonal.`,
    };
  } catch (error) {
    logger.error("asistente.proponerEliminarGastoPersonal.failed", { error: error.message });
    return { ok: false, mensaje: "No pude buscar ese gasto personal, intentá de nuevo." };
  }
};

const confirmarEliminarGastoPersonal = async ({ empleado, descripcion, fecha_aproximada }) => {
  try {
    const encontrado = await buscarGastoPersonal({ empleado, descripcion, fecha_aproximada });
    if (!encontrado.ok) return encontrado;
    await gastoPersonalModel.deleteGastoPersonal(encontrado.gasto.id);
    return { ok: true, mensaje: `Gasto personal "${encontrado.gasto.descripcion}" eliminado.` };
  } catch (error) {
    logger.error("asistente.confirmarEliminarGastoPersonal.failed", { error: error.message });
    return { ok: false, mensaje: "No pude eliminar el gasto personal, avisale a Juanma." };
  }
};

const functionDeclarations = [
  {
    name: "consultarGastos",
    description: "Consulta de solo lectura de los gastos generales del salón en un rango de fechas.",
    parameters: {
      type: "OBJECT",
      properties: {
        desde: { type: "STRING", description: "Fecha de inicio YYYY-MM-DD" },
        hasta: { type: "STRING", description: "Fecha de fin YYYY-MM-DD" },
      },
      required: ["desde", "hasta"],
    },
  },
  {
    name: "proponerCrearGasto",
    description: "Arma una propuesta de gasto general nuevo SIN guardarlo. Pedile confirmación a Sol antes de confirmarCrearGasto.",
    parameters: {
      type: "OBJECT",
      properties: {
        descripcion: { type: "STRING" },
        monto: { type: "NUMBER" },
        categoria: { type: "STRING" },
        fecha: { type: "STRING", description: "YYYY-MM-DD" },
      },
      required: ["descripcion", "monto", "fecha"],
    },
  },
  {
    name: "confirmarCrearGasto",
    description: "Crea el gasto general de verdad en la base. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        descripcion: { type: "STRING" },
        monto: { type: "NUMBER" },
        categoria: { type: "STRING" },
        fecha: { type: "STRING" },
      },
      required: ["descripcion", "monto", "fecha"],
    },
  },
  {
    name: "proponerEliminarGasto",
    description: "Busca un gasto general por descripción y fecha aproximada, y arma una propuesta de eliminación SIN borrar nada. Acción irreversible.",
    parameters: {
      type: "OBJECT",
      properties: {
        descripcion: { type: "STRING" },
        fecha_aproximada: { type: "STRING", description: "YYYY-MM-DD" },
      },
      required: ["descripcion", "fecha_aproximada"],
    },
  },
  {
    name: "confirmarEliminarGasto",
    description: "Elimina de verdad el gasto general. NUNCA llamar sin confirmación verbal explícita e inequívoca de Sol sobre esa propuesta puntual.",
    parameters: {
      type: "OBJECT",
      properties: {
        descripcion: { type: "STRING" },
        fecha_aproximada: { type: "STRING" },
      },
      required: ["descripcion", "fecha_aproximada"],
    },
  },
  {
    name: "consultarGastosPersonales",
    description: "Consulta de solo lectura de los gastos/anticipos personales de una empleada en un rango de fechas.",
    parameters: {
      type: "OBJECT",
      properties: {
        empleado: { type: "STRING" },
        desde: { type: "STRING", description: "YYYY-MM-DD" },
        hasta: { type: "STRING", description: "YYYY-MM-DD" },
      },
      required: ["empleado", "desde", "hasta"],
    },
  },
  {
    name: "proponerCrearGastoPersonal",
    description: "Arma una propuesta de gasto/anticipo personal nuevo para una empleada, SIN guardarlo.",
    parameters: {
      type: "OBJECT",
      properties: {
        empleado: { type: "STRING" },
        descripcion: { type: "STRING" },
        monto: { type: "NUMBER" },
        categoria: { type: "STRING" },
        fecha: { type: "STRING", description: "YYYY-MM-DD" },
      },
      required: ["empleado", "descripcion", "monto", "fecha"],
    },
  },
  {
    name: "confirmarCrearGastoPersonal",
    description: "Crea de verdad el gasto personal de la empleada. NUNCA llamar sin confirmación verbal explícita de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        empleado: { type: "STRING" },
        descripcion: { type: "STRING" },
        monto: { type: "NUMBER" },
        categoria: { type: "STRING" },
        fecha: { type: "STRING" },
      },
      required: ["empleado", "descripcion", "monto", "fecha"],
    },
  },
  {
    name: "proponerEliminarGastoPersonal",
    description: "Busca un gasto personal de una empleada por descripción y fecha aproximada, y arma una propuesta de eliminación SIN borrar nada.",
    parameters: {
      type: "OBJECT",
      properties: {
        empleado: { type: "STRING" },
        descripcion: { type: "STRING" },
        fecha_aproximada: { type: "STRING" },
      },
      required: ["empleado", "descripcion", "fecha_aproximada"],
    },
  },
  {
    name: "confirmarEliminarGastoPersonal",
    description: "Elimina de verdad el gasto personal. NUNCA llamar sin confirmación verbal explícita e inequívoca de Sol.",
    parameters: {
      type: "OBJECT",
      properties: {
        empleado: { type: "STRING" },
        descripcion: { type: "STRING" },
        fecha_aproximada: { type: "STRING" },
      },
      required: ["empleado", "descripcion", "fecha_aproximada"],
    },
  },
];

const ejecutar = async (nombre, args) => {
  switch (nombre) {
    case "consultarGastos":
      return consultarGastos(args);
    case "proponerCrearGasto":
      return proponerCrearGasto(args);
    case "confirmarCrearGasto":
      return confirmarCrearGasto(args);
    case "proponerEliminarGasto":
      return proponerEliminarGasto(args);
    case "confirmarEliminarGasto":
      return confirmarEliminarGasto(args);
    case "consultarGastosPersonales":
      return consultarGastosPersonales(args);
    case "proponerCrearGastoPersonal":
      return proponerCrearGastoPersonal(args);
    case "confirmarCrearGastoPersonal":
      return confirmarCrearGastoPersonal(args);
    case "proponerEliminarGastoPersonal":
      return proponerEliminarGastoPersonal(args);
    case "confirmarEliminarGastoPersonal":
      return confirmarEliminarGastoPersonal(args);
    default:
      return null;
  }
};

const systemInstructionFragment =
  "Para crear o eliminar un gasto (general o personal de una empleada), usá siempre primero la herramienta 'proponer...' correspondiente, leele el resumen completo a Sol, y SOLO después de una confirmación verbal explícita e inequívoca llamá a la herramienta 'confirmar...'. Eliminar un gasto no se puede deshacer.";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
