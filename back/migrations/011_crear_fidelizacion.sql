CREATE TABLE landing_cuentas (
  id SERIAL PRIMARY KEY,
  google_sub VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre VARCHAR(255),
  telefono_ingresado VARCHAR(50),
  id_cliente INTEGER REFERENCES clientes(id),
  estado_vinculacion VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado_vinculacion IN ('pendiente', 'auto', 'manual', 'rechazada')),
  token_sesion VARCHAR(64),
  token_expira_at TIMESTAMPTZ,
  reset_token VARCHAR(64),
  reset_token_expira TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (google_sub IS NOT NULL OR password_hash IS NOT NULL)
);
CREATE INDEX idx_landing_cuentas_cliente ON landing_cuentas(id_cliente);

CREATE TABLE fidelidad_sellos (
  id SERIAL PRIMARY KEY,
  id_cuenta INTEGER NOT NULL REFERENCES landing_cuentas(id) ON DELETE CASCADE,
  id_turno INTEGER NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  numero_sello INTEGER NOT NULL,
  ciclo INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_turno)
);
CREATE INDEX idx_fidelidad_sellos_cuenta ON fidelidad_sellos(id_cuenta);

CREATE TABLE fidelidad_premios (
  id SERIAL PRIMARY KEY,
  id_cuenta INTEGER NOT NULL REFERENCES landing_cuentas(id) ON DELETE CASCADE,
  ciclo INTEGER NOT NULL,
  sello_numero INTEGER NOT NULL CHECK (sello_numero BETWEEN 1 AND 10),
  tipo_premio VARCHAR(50),
  descripcion VARCHAR(255),
  redimido BOOLEAN NOT NULL DEFAULT false,
  redimido_en TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(id_cuenta, ciclo, sello_numero)
);

-- Configurable desde /fidelidad/premios: en qué sello hay oportunidad de premio.
CREATE TABLE fidelidad_reglas_premio (
  id SERIAL PRIMARY KEY,
  numero_sello INTEGER NOT NULL UNIQUE CHECK (numero_sello BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO fidelidad_reglas_premio (numero_sello) VALUES (5), (10);

-- Catálogo editable de premios posibles (sorteo ponderado por "peso").
CREATE TABLE fidelidad_premios_catalogo (
  id SERIAL PRIMARY KEY,
  descripcion VARCHAR(255) NOT NULL,
  peso INTEGER NOT NULL DEFAULT 10 CHECK (peso > 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO fidelidad_premios_catalogo (descripcion, peso) VALUES
  ('10% de descuento en tu próximo turno', 40),
  ('20% de descuento en tu próximo turno', 25),
  ('Perfilado de cejas gratis', 15),
  ('Manicura gratis', 15),
  ('50% de descuento en tu próximo turno', 5);
