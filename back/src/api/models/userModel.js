const pool = require("../database/db");

const findUserByEmail = async (email) => {
  const query = `
    SELECT id, email, password, rol
    FROM public.usuarios
    WHERE email = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

module.exports = {
  findUserByEmail,
};
