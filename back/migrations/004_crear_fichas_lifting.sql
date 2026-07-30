-- Cuaderno de fichas técnicas de lifting de pestañas (uso de Mili).
-- Independiente de turnos: se elige la clienta real de la base y se
-- tipea la fecha y el dato técnico a mano.
CREATE TABLE fichas_lifting (
  id SERIAL PRIMARY KEY,
  id_cliente INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tamano_molde VARCHAR(50) NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fichas_lifting_cliente ON fichas_lifting(id_cliente);
