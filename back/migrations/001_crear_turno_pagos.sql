-- Crea la tabla turno_pagos para registrar el método de pago (o la combinación
-- efectivo + transferencia) con el que se cobró cada turno.
CREATE TABLE turno_pagos (
  id SERIAL PRIMARY KEY,
  turno_id BIGINT NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('efectivo', 'transferencia')),
  monto NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_turno_pagos_turno_id ON turno_pagos(turno_id);
