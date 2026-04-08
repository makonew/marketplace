require('dotenv').config();
const { connectDB, getConnection } = require('./data/db');
const { hashPassword } = require('./crypto/hash');

function seedData() {
    const conn = getConnection();

    const users = [
        { login: 'admin', password: hashPassword('admin123'), money: 1000.00 },
        { login: 'seller1', password: hashPassword('seller123'), money: 500.00 },
        { login: 'buyer1', password: hashPassword('buyer123'), money: 200.00 }
    ];

    users.forEach(user => {
        conn.query(
            'INSERT IGNORE INTO users (login, password, money) VALUES (?, ?, ?)',
            [user.login, user.password, user.money],
            (err, result) => {
                if (err) console.error('Error inserting user:', err);
            }
        );
    });

    const items = [
        { name: 'Apple' },
        { name: 'Banana' },
        { name: 'Orange' },
        { name: 'Milk' },
        { name: 'Bread' }
    ];

    items.forEach(item => {
        conn.query(
            'INSERT IGNORE INTO items (name) VALUES (?)',
            [item.name],
            (err, result) => {
                if (err) console.error('Error inserting item:', err);
            }
        );
    });

    setTimeout(() => {
        conn.query('SELECT id FROM users WHERE login = ?', ['seller1'], (err, users) => {
            if (err || users.length === 0) return;
            const sellerId = users[0].id;

            conn.query('SELECT id FROM items', (err, items) => {
                if (err || items.length === 0) return;

                const itemOwners = [
                    { owner_id: sellerId, item_id: items[0].id },
                    { owner_id: sellerId, item_id: items[1].id },
                    { owner_id: sellerId, item_id: items[2].id }
                ];

                itemOwners.forEach(io => {
                    conn.query(
                        'INSERT IGNORE INTO item_owners (owner_id, item_id) VALUES (?, ?)',
                        [io.owner_id, io.item_id],
                        (err, result) => {
                            if (err) console.error('Error inserting item_owner:', err);
                        }
                    );
                });

                console.log('Seed data inserted');
            });
        });
    }, 1000);
}

connectDB();
setTimeout(seedData, 2000);