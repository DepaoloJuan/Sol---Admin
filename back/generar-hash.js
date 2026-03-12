const bcrypt = require("bcrypt");

const passwordPlana = "Admin1234";

bcrypt.hash(passwordPlana, 10).then((hash) => {
  console.log("Contraseña:", passwordPlana);
  console.log("Hash:", hash);
});
