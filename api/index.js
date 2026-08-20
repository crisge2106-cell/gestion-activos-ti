// ============================================================================
// Handler Serverless para Vercel
// ============================================================================

// Importar el servidor desde el directorio servidor/
const path = require('path');
process.chdir(path.join(__dirname, '../servidor'));

const server = require('./server.js');

// Exportar como función serverless de Vercel
module.exports = (req, res) => {
  // Delegar a nuestro servidor HTTP
  return server.emit('request', req, res);
};
