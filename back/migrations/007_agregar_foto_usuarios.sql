-- Agrega la foto de perfil de cada usuario (admin o empleada).
-- Columna nullable: quien no tenga foto sigue mostrando su inicial.
ALTER TABLE usuarios ADD COLUMN foto_url TEXT;
