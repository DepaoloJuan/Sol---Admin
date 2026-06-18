// FILE: src/utils/cloudinaryHelper.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Sube un buffer de imagen a Cloudinary.
 * @param {Buffer} buffer - El archivo en memoria
 * @param {string} folder - Carpeta dentro de Cloudinary (ej: "landing/galeria")
 * @returns {Promise<string>} URL segura de la imagen subida
 */
const subirImagen = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
};

/**
 * Elimina una imagen de Cloudinary por su URL.
 * @param {string} url - URL segura de Cloudinary
 */
const eliminarImagen = async (url) => {
  if (!url || !url.includes("cloudinary")) return;

  // Extrae el public_id de la URL
  // Ejemplo URL: https://res.cloudinary.com/cloud/image/upload/v123/landing/galeria/abc123.jpg
  // Public ID: landing/galeria/abc123
  const partes = url.split("/upload/");
  if (partes.length < 2) return;

  const conVersion = partes[1]; // v123/landing/galeria/abc123.jpg
  const sinVersion = conVersion.replace(/^v\d+\//, ""); // landing/galeria/abc123.jpg
  const publicId = sinVersion.replace(/\.[^/.]+$/, ""); // landing/galeria/abc123

  await cloudinary.uploader.destroy(publicId);
};

module.exports = { subirImagen, eliminarImagen };
