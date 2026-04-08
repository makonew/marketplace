const { getConnection } = require('../data/db');

function createUsersTable() {
    const conn = getConnection();
    const sql = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            login VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            money DECIMAL(10, 2) DEFAULT 0.00
        )
    `;
    conn.query(sql, (err, result) => {
        if (err) {
            console.error('Error creating users table:', err);
            return;
        }
        console.log('Users table created or already exists');
    });
}

function findUserByLogin(login, callback) {
    const conn = getConnection();
    const sql = 'SELECT * FROM users WHERE login = ?';
    conn.query(sql, [login], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results[0] || null);
    });
}

function createUser(user, callback) {
    const conn = getConnection();
    const sql = 'INSERT INTO users (login, password, money) VALUES (?, ?, ?)';
    conn.query(sql, [user.login, user.password, user.money || 0], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, { id: result.insertId, ...user });
    });
}

function findUserById(id, callback) {
    const conn = getConnection();
    const sql = 'SELECT * FROM users WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results[0] || null);
    });
}

function updateUserMoney(id, money, callback) {
    const conn = getConnection();
    const sql = 'UPDATE users SET money = ? WHERE id = ?';
    conn.query(sql, [money, id], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, result);
    });
}

module.exports = { createUsersTable, findUserByLogin, createUser, findUserById, updateUserMoney };