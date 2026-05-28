require('dotenv').config();
const { connectDB, getConnection } = require('./data/db');
const { hashPassword } = require('./crypto/hash');

const CREATE_TABLES = [
    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        money DECIMAL(10, 2) DEFAULT 0.00
    )`,
    `CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS item_owners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        item_id INT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        UNIQUE KEY unique_owner_item (owner_id, item_id)
    )`,
    `CREATE TABLE IF NOT EXISTS sell_offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NOT NULL,
        item_id INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        status ENUM('active', 'sold', 'cancelled') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`
];

function seedData() {
    const conn = getConnection();
    createTables(conn, 0, () => clearData(conn));
}

function clearData(conn) {
    const tables = ['sell_offers', 'item_owners', 'items', 'users'];
    let pending = tables.length;
    tables.forEach(t => {
        conn.query('DELETE FROM ' + t, (err) => {
            if (err) console.error('Error clearing ' + t + ':', err);
            if (--pending > 0) return;
            insertUsers(conn);
        });
    });
}

function createTables(conn, index, callback) {
    if (index >= CREATE_TABLES.length) return callback();
    conn.query(CREATE_TABLES[index], (err) => {
        if (err) console.error('Error creating table:', err);
        createTables(conn, index + 1, callback);
    });
}

function insertUsers(conn) {
    const users = [
        { login: 'admin', password: hashPassword('admin123'), money: 1000.00 },
        { login: 'seller1', password: hashPassword('seller123'), money: 500.00 },
        { login: 'buyer1', password: hashPassword('buyer123'), money: 200.00 }
    ];

    let pending = users.length;
    users.forEach(user => {
        conn.query(
            'INSERT IGNORE INTO users (login, password, money) VALUES (?, ?, ?)',
            [user.login, user.password, user.money],
            (err) => {
                if (err) console.error('Error inserting user:', err);
                if (--pending > 0) return;
                insertItems(conn);
            }
        );
    });
}

function insertItems(conn) {
    const items = [
        { name: 'Apple' },
        { name: 'Banana' },
        { name: 'Orange' },
        { name: 'Milk' },
        { name: 'Bread' }
    ];

    let pending = items.length;
    items.forEach(item => {
        conn.query(
            'INSERT IGNORE INTO items (name) VALUES (?)',
            [item.name],
            (err) => {
                if (err) console.error('Error inserting item:', err);
                if (--pending > 0) return;
                insertSellOffers(conn);
            }
        );
    });
}

function insertSellOffers(conn) {
    conn.query('SELECT id FROM users WHERE login = ?', ['seller1'], (err, users) => {
        if (err || users.length === 0) {
            console.error('Seller not found');
            closeConnection(conn);
            return;
        }
        const sellerId = users[0].id;

        conn.query('SELECT id FROM items', (err, items) => {
            if (err || items.length === 0) {
                console.error('No items found');
                closeConnection(conn);
                return;
            }

            const itemOwners = [
                { owner_id: sellerId, item_id: items[0].id },
                { owner_id: sellerId, item_id: items[1].id },
                { owner_id: sellerId, item_id: items[2].id }
            ];

            let pending = itemOwners.length;
            itemOwners.forEach(io => {
                conn.query(
                    'INSERT IGNORE INTO item_owners (owner_id, item_id) VALUES (?, ?)',
                    [io.owner_id, io.item_id],
                    (err) => {
                        if (err) console.error('Error inserting item_owner:', err);
                        if (--pending > 0) return;
                        insertOffers(conn, sellerId, items);
                    }
                );
            });
        });
    });
}

function insertOffers(conn, sellerId, items) {
    const sellOffers = [
        { seller_id: sellerId, item_id: items[0].id, price: 10.00 },
        { seller_id: sellerId, item_id: items[1].id, price: 5.00 }
    ];

    let pending = sellOffers.length;
    sellOffers.forEach(o => {
        conn.query(
            'INSERT IGNORE INTO sell_offers (seller_id, item_id, price) VALUES (?, ?, ?)',
            [o.seller_id, o.item_id, o.price],
            (err) => {
                if (err) console.error('Error inserting sell_offer:', err);
                if (--pending > 0) return;
                console.log('Seed data inserted');
                closeConnection(conn);
            }
        );
    });
}

function closeConnection(conn) {
    conn.end(err => {
        if (err) console.error('Error closing connection:', err);
    });
}

connectDB(seedData);
