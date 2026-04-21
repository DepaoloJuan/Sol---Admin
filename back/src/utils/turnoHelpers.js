const normalizarDatosTurno = ({ costo, duracion, monto_abonado, propina }) => {
  const costoNormalizado = Math.max(0, Number(costo || 0));

  let duracionNormalizada = Number(duracion || 30);
  if (duracionNormalizada <= 0) duracionNormalizada = 30;

  let montoAbonadoNormalizado = Math.max(0, Number(monto_abonado || 0));
  if (montoAbonadoNormalizado > costoNormalizado) montoAbonadoNormalizado = costoNormalizado;

  let estado;
  if (montoAbonadoNormalizado <= 0) estado = "Pendiente";
  else if (montoAbonadoNormalizado >= costoNormalizado) estado = "Pagado";
  else estado = "Parcial";

  const propinaNormalizada = Math.max(0, Number(propina || 0));

  return { costoNormalizado, duracionNormalizada, montoAbonadoNormalizado, estado, propinaNormalizada };
};

module.exports = { normalizarDatosTurno };
