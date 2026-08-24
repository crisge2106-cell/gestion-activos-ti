// ============================================================================
// Handler Serverless para Vercel
// ============================================================================

console.log('✅ api/index.js CARGADO');

// Re-exportar directamente el handler del servidor
module.exports = require('../servidor/server.js');
