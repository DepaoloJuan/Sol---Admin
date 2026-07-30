const logger = require("../logger");
const { calcularDatosReportes } = require("../reporteHelpers");

const consultarReportes = async ({ desde, hasta }) => {
  try {
    const datos = await calcularDatosReportes({ body: { desde, hasta }, query: {} });
    const r = datos.resumen;
    return {
      ok: true,
      periodo: { desde: datos.desde, hasta: datos.hasta },
      resumen: {
        totalFacturado: Math.round(r.totalFacturado),
        totalCobrado: Math.round(r.totalCobrado),
        totalDeuda: Math.round(r.totalDeuda),
        totalEfectivo: Math.round(r.totalEfectivo),
        totalTransferencia: Math.round(r.totalTransferencia),
        totalGastos: Math.round(r.totalGastos),
        totalSueldos: Math.round(r.totalSueldos),
        gananciaNeta: Math.round(r.gananciaNeta),
      },
    };
  } catch (error) {
    logger.error("asistente.consultarReportes.failed", { error: error.message });
    return { ok: false, mensaje: "No pude calcular el reporte de ese rango, intentá de nuevo." };
  }
};

const functionDeclarations = [
  {
    name: "consultarReportes",
    description:
      "Consulta el resumen financiero (facturado, cobrado, deuda, efectivo, transferencia, gastos, sueldos, ganancia neta) de un rango de fechas. Solo lectura, no requiere confirmación.",
    parameters: {
      type: "OBJECT",
      properties: {
        desde: { type: "STRING", description: "Fecha de inicio en formato YYYY-MM-DD" },
        hasta: { type: "STRING", description: "Fecha de fin en formato YYYY-MM-DD" },
      },
      required: ["desde", "hasta"],
    },
  },
];

const ejecutar = async (nombre, args) => {
  if (nombre === "consultarReportes") return consultarReportes(args);
  return null;
};

const systemInstructionFragment =
  "Para preguntas sobre facturación, cobros, deuda o ganancia en un rango de fechas, usá consultarReportes (es de solo lectura, no necesita confirmación).";

module.exports = { functionDeclarations, ejecutar, systemInstructionFragment };
