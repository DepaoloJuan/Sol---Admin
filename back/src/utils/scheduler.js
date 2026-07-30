const cron = require("node-cron");
const logger = require("./logger");
const { formatDate } = require("./dateHelpers");
const { getAlertasDashboard } = require("./alertasHelper");
const { enviarPushATodas } = require("./pushHelper");
const pushSubscriptionModel = require("../api/models/pushSubscriptionModel");
const empleadoModel = require("../api/models/empleadoModel");
const userModel = require("../api/models/userModel");
const turnoModel = require("../api/models/turnoModel");

const enviarDigestDiarioAdmin = async () => {
  try {
    const alertas = await getAlertasDashboard();
    if (alertas.length === 0) return;

    const suscripciones = await pushSubscriptionModel.getSuscripcionesPorRol("admin");
    if (suscripciones.length === 0) return;

    const body = alertas.map((a) => a.mensaje).join(" · ");

    await enviarPushATodas(suscripciones, {
      title: "Resumen del día",
      body,
      url: "/admin",
    });
  } catch (error) {
    logger.error("scheduler.digestAdmin.failed", { error: error.message });
  }
};

const enviarResumenSemanalEmpleadas = async () => {
  try {
    const hoy = new Date();
    const diferenciaParaLunes = hoy.getDay() === 0 ? -6 : 1 - hoy.getDay();
    const primerDiaSemana = new Date(hoy);
    primerDiaSemana.setHours(0, 0, 0, 0);
    primerDiaSemana.setDate(hoy.getDate() + diferenciaParaLunes);
    const ultimoDiaSemana = new Date(primerDiaSemana);
    ultimoDiaSemana.setDate(primerDiaSemana.getDate() + 6);

    const desde = formatDate(primerDiaSemana);
    const hasta = formatDate(ultimoDiaSemana);

    const turnos = await turnoModel.getTurnosPorRango(desde, hasta);
    const empleados = await empleadoModel.getAllEmpleados();

    for (const emp of empleados) {
      const turnosEmp = turnos.filter((t) => Number(t.id_empleado) === Number(emp.id));
      if (turnosEmp.length === 0) continue;

      const sueldo = turnosEmp.reduce(
        (acc, t) => acc + Number(t.costo || 0) * (Number(t.porcentaje_ganancia || 0) / 100),
        0,
      );

      const usuario = await userModel.getUsuarioByEmpleadoId(emp.id);
      if (!usuario) continue;

      const suscripciones = await pushSubscriptionModel.getSuscripcionesPorUsuario(usuario.id);
      if (suscripciones.length === 0) continue;

      await enviarPushATodas(suscripciones, {
        title: "Resumen de la semana",
        body: `Tu ganancia esta semana: $${Math.round(sueldo).toLocaleString("es-AR")}`,
        url: "/mi-panel",
      });
    }
  } catch (error) {
    logger.error("scheduler.resumenSemanal.failed", { error: error.message });
  }
};

const iniciarScheduler = () => {
  cron.schedule("0 8 * * *", enviarDigestDiarioAdmin);
  cron.schedule("0 20 * * 6", enviarResumenSemanalEmpleadas);
  logger.info("scheduler.iniciado");
};

module.exports = { iniciarScheduler };
