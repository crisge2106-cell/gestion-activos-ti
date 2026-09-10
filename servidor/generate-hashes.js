const crypto = require('crypto');

function hashPassword(pw, salt){
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return {salt, hash};
}

const pwd = 'TempPassword123';
const {salt, hash} = hashPassword(pwd);
console.log(`Contraseña: ${pwd}`);
console.log(`Salt: ${salt}`);
console.log(`Hash: ${hash}`);
console.log(`\nUsarlo así:`);
console.log(`{username:'admin', salt:'${salt}', hash:'${hash}'},`);
