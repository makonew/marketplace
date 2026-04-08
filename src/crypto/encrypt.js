const crypto = require('crypto');

const algo = 'aes-256-cbc';

function getKey(){
    if(!process.env.CRYPTO_KEY)
        throw new Error("CRYPTO_KEY is missing");

    const key = Buffer.from(process.env.CRYPTO_KEY.trim(), 'hex');
    if(key.length !== 32)
        throw new Error(`CRYPTO_KEY length expected 32 bytes, got ${key.length} bytes`);

    return key;
}

function decrypt(data){
    const [ivHex, encHex] = data.split(':');
    const decipher = crypto.createDecipheriv(algo, getKey(), Buffer.from(ivHex, 'hex'));

    return Buffer.concat([
        decipher.update(Buffer.from(encHex, 'hex')),
        decipher.final()
    ]).toString();
}

function encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algo, getKey(), iv)

    const enc = Buffer.concat([
        cipher.update(data),
        cipher.final()
    ]);

    return iv.toString('hex') + ":" + enc.toString('hex');
}

module.exports = {
    decrypt,
    encrypt
}