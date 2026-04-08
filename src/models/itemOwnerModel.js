const { getConnection } = require('../data/db');

function createItemOwnersTable() {
    const conn = getConnection();
    const sql = `
        CREATE TABLE IF NOT EXISTS item_owners (
            id INT AUTO_INCREMENT PRIMARY KEY,
            owner_id INT NOT NULL,
            item_id INT NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            UNIQUE KEY unique_owner_item (owner_id, item_id)
        )
    `;
    conn.query(sql, (err, result) => {
        if (err) {
            console.error('Error creating item_owners table:', err);
            return;
        }
        console.log('ItemOwners table created or already exists');
    });
}

function getItemsByOwner(ownerId, callback) {
    const conn = getConnection();
    const sql = `
        SELECT i.* FROM items i
        INNER JOIN item_owners io ON i.id = io.item_id
        WHERE io.owner_id = ?
    `;
    conn.query(sql, [ownerId], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results);
    });
}

function getOwnersByItem(itemId, callback) {
    const conn = getConnection();
    const sql = `
        SELECT u.* FROM users u
        INNER JOIN item_owners io ON u.id = io.owner_id
        WHERE io.item_id = ?
    `;
    conn.query(sql, [itemId], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results);
    });
}

function addItemOwner(ownerId, itemId, callback) {
    const conn = getConnection();
    const sql = 'INSERT INTO item_owners (owner_id, item_id) VALUES (?, ?)';
    conn.query(sql, [ownerId, itemId], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, { id: result.insertId, owner_id: ownerId, item_id: itemId });
    });
}

function removeItemOwner(ownerId, itemId, callback) {
    const conn = getConnection();
    const sql = 'DELETE FROM item_owners WHERE owner_id = ? AND item_id = ?';
    conn.query(sql, [ownerId, itemId], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, result);
    });
}

module.exports = { 
    createItemOwnersTable, 
    getItemsByOwner, 
    getOwnersByItem, 
    addItemOwner, 
    removeItemOwner 
};
