const { getConnection } = require('../data/db');

function createSellOffersTable() {
    const conn = getConnection();
    const sql = `
        CREATE TABLE IF NOT EXISTS sell_offers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            seller_id INT NOT NULL,
            item_id INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            status ENUM('active', 'sold', 'cancelled') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )
    `;
    conn.query(sql, (err) => {
        if (err) { console.error('Error creating sell_offers table:', err); return; }
        console.log('SellOffers table created or already exists');
    });
}

function getAllActiveOffers(callback) {
    const conn = getConnection();
    conn.query(
        `SELECT so.*, i.name as item_name, u.login as seller_name
         FROM sell_offers so
         INNER JOIN items i ON so.item_id = i.id
         INNER JOIN users u ON so.seller_id = u.id
         WHERE so.status = 'active'
         ORDER BY so.created_at DESC`,
        (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        }
    );
}

function getOffersBySeller(sellerId, callback) {
    const conn = getConnection();
    conn.query(
        `SELECT so.*, i.name as item_name
         FROM sell_offers so
         INNER JOIN items i ON so.item_id = i.id
         WHERE so.seller_id = ?
         ORDER BY so.created_at DESC`,
        [sellerId],
        (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        }
    );
}

function getOfferById(offerId, callback) {
    const conn = getConnection();
    conn.query(
        `SELECT so.*, i.name as item_name, u.login as seller_name
         FROM sell_offers so
         INNER JOIN items i ON so.item_id = i.id
         INNER JOIN users u ON so.seller_id = u.id
         WHERE so.id = ?`,
        [offerId],
        (err, results) => {
            if (err) return callback(err);
            if (results.length === 0) return callback(new Error('Offer not found'));
            callback(null, results[0]);
        }
    );
}

function createOffer({ seller_id, item_id, price }, callback) {
    const conn = getConnection();
    conn.query(
        'INSERT INTO sell_offers (seller_id, item_id, price) VALUES (?, ?, ?)',
        [seller_id, item_id, price],
        (err, result) => {
            if (err) return callback(err);
            callback(null, { id: result.insertId, seller_id, item_id, price, status: 'active' });
        }
    );
}

function buyOffer(offerId, buyerId, callback) {
    const conn = getConnection();

    conn.beginTransaction((err) => {
        if (err) return callback(err);

        conn.query('SELECT * FROM sell_offers WHERE id = ? FOR UPDATE', [offerId], (err, offers) => {
            if (err || offers.length === 0) {
                return conn.rollback(() => callback(new Error('Offer not found')));
            }

            const offer = offers[0];

            if (offer.status !== 'active') {
                return conn.rollback(() => callback(new Error('Offer is not active')));
            }

            if (offer.seller_id === buyerId) {
                return conn.rollback(() => callback(new Error('Cannot buy your own offer')));
            }

            conn.query('SELECT money FROM users WHERE id = ? FOR UPDATE', [buyerId], (err, users) => {
                if (err || users.length === 0) {
                    return conn.rollback(() => callback(new Error('Buyer not found')));
                }

                const buyerMoney = parseFloat(users[0].money);
                if (buyerMoney < parseFloat(offer.price)) {
                    return conn.rollback(() => callback(new Error('Not enough money')));
                }

                conn.query(
                    'SELECT * FROM item_owners WHERE owner_id = ? AND item_id = ?',
                    [offer.seller_id, offer.item_id],
                    (err, ownership) => {
                        if (err || ownership.length === 0) {
                            return conn.rollback(() => callback(new Error('Seller no longer owns this item')));
                        }

                        conn.query(
                            'DELETE FROM item_owners WHERE owner_id = ? AND item_id = ?',
                            [offer.seller_id, offer.item_id],
                            (err) => {
                                if (err) return conn.rollback(() => callback(err));

                                conn.query(
                                    'INSERT INTO item_owners (owner_id, item_id) VALUES (?, ?)',
                                    [buyerId, offer.item_id],
                                    (err) => {
                                        if (err) return conn.rollback(() => callback(err));

                                        conn.query(
                                            'UPDATE users SET money = money - ? WHERE id = ?',
                                            [parseFloat(offer.price), buyerId],
                                            (err) => {
                                                if (err) return conn.rollback(() => callback(err));

                                                conn.query(
                                                    'UPDATE users SET money = money + ? WHERE id = ?',
                                                    [parseFloat(offer.price), offer.seller_id],
                                                    (err) => {
                                                        if (err) return conn.rollback(() => callback(err));

                                                        conn.query(
                                                            'UPDATE sell_offers SET status = "sold" WHERE id = ?',
                                                            [offerId],
                                                            (err) => {
                                                                if (err) return conn.rollback(() => callback(err));

                                                                conn.commit((err) => {
                                                                    if (err) return conn.rollback(() => callback(err));
                                                                    callback(null, { id: offerId, status: 'sold' });
                                                                });
                                                            }
                                                        );
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    });
}

function cancelOffer(offerId, sellerId, callback) {
    const conn = getConnection();
    conn.query(
        'SELECT * FROM sell_offers WHERE id = ? AND seller_id = ?',
        [offerId, sellerId],
        (err, offers) => {
            if (err) return callback(err);
            if (offers.length === 0) return callback(new Error('Offer not found or not yours'));
            if (offers[0].status !== 'active') return callback(new Error('Offer is not active'));

            conn.query(
                'UPDATE sell_offers SET status = "cancelled" WHERE id = ?',
                [offerId],
                (err) => {
                    if (err) return callback(err);
                    callback(null, { id: offerId, status: 'cancelled' });
                }
            );
        }
    );
}

module.exports = {
    createSellOffersTable,
    getAllActiveOffers,
    getOffersBySeller,
    getOfferById,
    createOffer,
    buyOffer,
    cancelOffer
};