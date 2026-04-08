const crypto = require('crypto');


function getSalt(){
    if(!process.env.SALT)
        throw new Error("SALT is missing");

    const salt = Buffer.from(process.env.SALT.trim(), 'hex');
    if(salt.length !== 16)
        throw new Error(`SALT length expected 16 bytes, got ${salt.length} bytes`);

    return salt;
}

function hashPassword(password){
    const salt = getSalt();
    const hash = crypto.scryptSync(password, salt, 64)

    return hash.toString('hex');
}

function verifyPassword(password, stored){
    const salt = getSalt();
    const hash = crypto.scryptSync(password, salt, 64);

    return hash.toString('hex') === stored;
}

module.exports = { hashPassword, verifyPassword }