-- Cuaderno de fichas técnicas de extensiones de pestañas (uso de Mili).
-- Independiente de turnos: se elige la clienta real de la base y se
-- tipea la fecha y el dato técnico a mano.
CREATE TABLE fichas_extensiones (
  id SERIAL PRIMARY KEY,
  id_cliente INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  diseno VARCHAR(255) NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fichas_extensiones_cliente ON fichas_extensiones(id_cliente);
