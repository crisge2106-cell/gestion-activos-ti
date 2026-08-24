// ============================================================================
// Handler Serverless para Vercel - PRUEBA SIMPLE
// ============================================================================

console.log('✅ api/index.js CARGADO');

module.exports = async (req, res) => {
  console.log('📨 api/index.js INVOCADO:', req.method, req.url);

  // Prueba simple: si es /test, responder JSON
  if (req.url === '/test') {
    return res.json({ success: true, message: 'Test OK' });
  }

  // Si no, delegar al servidor
  try {
    const handler = require('../servidor/server.js');
    if (typeof handler === 'function') {
      return await handler(req, res);
    } else {
      console.error('❌ server.js no exporta una función');
      return res.status(500).json({ error: 'Handler not function' });
    }
  } catch (err) {
    console.error('❌ Error en api/index.js:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
