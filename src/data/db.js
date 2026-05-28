require('dotenv').config();
const mysql = require('mysql2');

let conn;

function connectDB(callback) {
    conn = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'marketplace',
        port: process.env.DB_PORT || 3306
    });

    conn.connect((err) => {
        if (err) {
            console.error('Error connecting to database:', err);
            return;
        }
        console.log('Connected to MySQL database');
        if (callback) callback();
    });
}

function getConnection() {
    return conn;
}

module.exports = { connectDB, getConnection };
