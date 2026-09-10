const crypto = require('crypto');

// Verificar si el hash que generé coincide
const salt_stored = '4044533c66823a8bec7d0aa7ee572671';
const hash_stored = '7806fa12432fb0e1e7a410c3565b197b9f0dab85f433bd17fe4ed8d9b5c3976e2ae492acbfcaa2947b32ace9a766564e9e03256fb9a1d2ff24513d3cfb35ad40';
const password = 'TempPassword123';

// Verificar con el algoritmo del servidor
const hash_check = crypto.scryptSync(password, salt_stored, 64).toString('hex');

console.log('Password:', password);
console.log('Salt stored:', salt_stored);
console.log('Hash stored:', hash_stored);
console.log('Hash computed:', hash_check);
console.log('Match:', hash_stored === hash_check);
