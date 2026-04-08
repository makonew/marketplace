const { getConnection } = require('../data/db');

function createItemsTable() {
    const conn = getConnection();
    const sql = `
        CREATE TABLE IF NOT EXISTS items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        )
    `;
    conn.query(sql, (err, result) => {
        if (err) {
            console.error('Error creating items table:', err);
            return;
        }
        console.log('Items table created or already exists');
    });
}

function findAllItems(callback) {
    const conn = getConnection();
    const sql = 'SELECT * FROM items';
    conn.query(sql, (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results);
    });
}

function findItemById(id, callback) {
    const conn = getConnection();
    const sql = 'SELECT * FROM items WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results[0] || null);
    });
}

function createItem(item, callback) {
    const conn = getConnection();
    const sql = 'INSERT INTO items (name) VALUES (?)';
    conn.query(sql, [item.name], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, { id: result.insertId, ...item });
    });
}

function deleteItem(id, callback) {
    const conn = getConnection();
    const sql = 'DELETE FROM items WHERE id = ?';
    conn.query(sql, [id], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, result);
    });
}

module.exports = { createItemsTable, findAllItems, findItemById, createItem, deleteItem };
