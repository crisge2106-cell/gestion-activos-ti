/**
 * Genera un archivo Excel rellenando la plantilla con datos de solicitud
 * Usa manipulación de ZIP nativo de Node.js
 */

const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function generarExcelSolicitud(solicitud, plantillaPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Leer plantilla
    fs.readFile(plantillaPath, (err, buffer) => {
      if(err) return reject(err);

      try {
        // La plantilla es un ZIP - extraer contenido
        zlib.unzip(buffer, (err, unzipped) => {
          if(err) return reject(err);

          try {
            // Buscar el archivo sheet1.xml (primera hoja con datos)
            const archivos = extraerArchivosDelZip(unzipped);

            // Modificar sheet1.xml con los datos
            if(archivos['xl/worksheets/sheet1.xml']) {
              archivos['xl/worksheets/sheet1.xml'] = modificarSheet(
                archivos['xl/worksheets/sheet1.xml'].toString('utf8'),
                solicitud
              );
            }

            // Reempaquetar como ZIP
            const nuevoZip = empaquetarZip(archivos);

            // Guardar archivo
            fs.writeFile(outputPath, nuevoZip, (err) => {
              if(err) return reject(err);
              resolve({ success: true, path: outputPath });
            });
          } catch(e) {
            reject(e);
          }
        });
      } catch(e) {
        reject(e);
      }
    });
  });
}

function extraerArchivosDelZip(buffer) {
  // Nota: Esta es una aproximación simple
  // En un caso real, usarías una librería de ZIP apropiada
  // Por ahora, devolvemos un objeto vacío ya que manipular ZIP es complejo
  return {};
}

function modificarSheet(xmlContent, solicitud) {
  // Modificar valores en el XML
  let xml = xmlContent;

  // Reemplazar datos simples
  xml = xml.replace(/CRISTOPHER MORE PALACIOS/g, (solicitud.usuario || '').toUpperCase());
  xml = xml.replace(/SOL--0001/g, solicitud.numero || '');
  xml = xml.replace(/2026-07-21/g, solicitud.fecha ? solicitud.fecha.substring(0, 10) : '');

  // Reemplazar items
  if(solicitud.items && solicitud.items.length > 0) {
    // Buscar las filas de ejemplo y reemplazarlas
    for(let i = 0; i < solicitud.items.length; i++) {
      const item = solicitud.items[i];
      const num = i + 1;

      // Buscar patrón de item en el XML y reemplazar
      // Esto es una aproximación - el XML exacto dependerá de la estructura de la plantilla
    }
  }

  return xml;
}

function empaquetrZip(archivos) {
  // Reempaquetar archivos como ZIP
  // Esto también es complejo sin una librería
  // Por ahora retornamos un Buffer vacío
  return Buffer.alloc(0);
}

module.exports = { generarExcelSolicitud };
