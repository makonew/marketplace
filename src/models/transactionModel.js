const { getConnection } = require('../data/db');

function createTransactionsTable() {
    const conn = getConnection();
    const sql = `
        CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            item_id INT NOT NULL,
            buyer_id INT NOT NULL,
            seller_id INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            approved BOOLEAN DEFAULT FALSE, 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
            FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    conn.query(sql, (err, result) => {
        if (err) {
            console.error('Error creating transactions table:', err);
            return;
        }
        console.log('Transactions table created or already exists');
    });
}

function getAllTransactions(callback) {
    const conn = getConnection();
    const sql = `
        SELECT t.id, t.price, t.approved, t.created_at, 
               t.buyer_id, t.seller_id,
               i.name as item_name, 
               buyer.login as buyer_name, 
               seller.login as seller_name
        FROM transactions t
        INNER JOIN items i ON t.item_id = i.id
        INNER JOIN users buyer ON t.buyer_id = buyer.id
        INNER JOIN users seller ON t.seller_id = seller.id
        ORDER BY t.created_at DESC
    `;
    conn.query(sql, (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results);
    });
}

function getTransactionsByBuyer(buyerId, callback) {
    const conn = getConnection();
    const sql = `
        SELECT t.id, t.price, t.created_at, 
               i.name as item_name, 
               seller.login as seller_name
        FROM transactions t
        INNER JOIN items i ON t.item_id = i.id
        INNER JOIN users seller ON t.seller_id = seller.id
        WHERE t.buyer_id = ?
        ORDER BY t.created_at DESC
    `;
    conn.query(sql, [buyerId], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results);
    });
}

function getTransactionsBySeller(sellerId, callback) {
    const conn = getConnection();
    const sql = `
        SELECT t.id, t.price, t.created_at, 
               i.name as item_name, 
               buyer.login as buyer_name
        FROM transactions t
        INNER JOIN items i ON t.item_id = i.id
        INNER JOIN users buyer ON t.buyer_id = buyer.id
        WHERE t.seller_id = ?
        ORDER BY t.created_at DESC
    `;
    conn.query(sql, [sellerId], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results);
    });
}

function createTransaction(transaction, callback) {
    const conn = getConnection();
    const sql = 'INSERT INTO transactions (item_id, buyer_id, seller_id, price) VALUES (?, ?, ?, ?)';
    conn.query(sql, [transaction.item_id, transaction.buyer_id, transaction.seller_id, transaction.price], (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, { id: result.insertId, ...transaction });
    });
}

function getTransactionById(transactionId, callback) {
    const conn = getConnection();
    const sql = `
        SELECT t.*, 
               i.name as item_name, 
               buyer.login as buyer_name, 
               seller.login as seller_name
        FROM transactions t
        INNER JOIN items i ON t.item_id = i.id
        INNER JOIN users buyer ON t.buyer_id = buyer.id
        INNER JOIN users seller ON t.seller_id = seller.id
        WHERE t.id = ?
    `;
    conn.query(sql, [transactionId], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        if (results.length === 0) {
            callback(new Error('Transaction not found'), null);
            return;
        }
        callback(null, results[0]);
    });
}

function getUserPropositions(userId, callback) {
    const conn = getConnection();
    const sql = `
        SELECT t.id, t.price, t.approved, t.created_at,
               t.buyer_id, t.seller_id,
               i.id as item_id, i.name as item_name,
               buyer.login as buyer_name,
               seller.login as seller_name,
               CASE WHEN t.buyer_id = ? THEN 'offer_sent' ELSE 'offer_received' END as proposition_type
        FROM transactions t
        INNER JOIN items i ON t.item_id = i.id
        INNER JOIN users buyer ON t.buyer_id = buyer.id
        INNER JOIN users seller ON t.seller_id = seller.id
        WHERE t.buyer_id = ? OR t.seller_id = ?
        ORDER BY t.created_at DESC
    `;
    conn.query(sql, [userId, userId, userId], (err, results) => {
        if (err) {
            callback(err, null);
            return;
        }
        callback(null, results);
    });
}

function approveTransaction(transactionId, approverId, callback) {
    const conn = getConnection();

    conn.query(
        'SELECT * FROM transactions WHERE id = ?',
        [transactionId],
        (err, transactions) => {
            if (err) return callback(err);
            if (transactions.length === 0) return callback(new Error('Transaction not found'));

            const transaction = transactions[0];
            
            // Only the seller (the person the offer is made to) can approve
            if (transaction.seller_id !== approverId) {
                return callback(new Error('Only the recipient of the offer can approve it'));
            }

            if (transaction.approved) {
                return callback(new Error('Transaction is already approved'));
            }

            conn.query(
                'UPDATE transactions SET approved = true WHERE id = ?',
                [transactionId],
                (err, result) => {
                    if (err) return callback(err);
                    callback(null, { id: transactionId, approved: true });
                }
            );
        }
    );
}

function commitTransaction(transactionId, callback) {
    const conn = getConnection();

    conn.beginTransaction((err) => {
        if (err) return callback(err);

        conn.query(
            'SELECT * FROM transactions WHERE id = ?',
            [transactionId],
            (err, transactions) => {
                if (err || transactions.length === 0) {
                    return conn.rollback(() => callback(new Error('Transaction not found')));
                }

                const transaction = transactions[0];

                // Check if transaction is approved
                if (!transaction.approved) {
                    return conn.rollback(() => callback(new Error('Transaction must be approved before committing')));
                }

                const { item_id, buyer_id, seller_id, price } = transaction;
                const priceValue = parseFloat(price);

                conn.query(
                    'SELECT * FROM item_owners WHERE owner_id = ? AND item_id = ?',
                    [seller_id, item_id],
                    (err, ownership) => {
                        if (err || ownership.length === 0) {
                            return conn.rollback(() => callback(new Error('Seller does not own this item')));
                        }

                        conn.query('SELECT money FROM users WHERE id = ?', [buyer_id], (err, users) => {
                            if (err || users.length === 0) {
                                return conn.rollback(() => callback(new Error('Buyer not found')));
                            }

                            const buyerMoney = parseFloat(users[0].money);
                            if (buyerMoney < priceValue) {
                                return conn.rollback(() => callback(new Error('Buyer does not have enough money')));
                            }

                            conn.query('DELETE FROM item_owners WHERE owner_id = ? AND item_id = ?', [seller_id, item_id], (err) => {
                                if (err) {
                                    return conn.rollback(() => callback(new Error('Error removing item from seller')));
                                }

                                conn.query('INSERT INTO item_owners (owner_id, item_id) VALUES (?, ?)', [buyer_id, item_id], (err) => {
                                    if (err) {
                                        return conn.rollback(() => callback(new Error('Error adding item to buyer')));
                                    }

                                    conn.query('UPDATE users SET money = money - ? WHERE id = ?', [priceValue, buyer_id], (err) => {
                                        if (err) {
                                            return conn.rollback(() => callback(new Error('Error deducting buyer money')));
                                        }

                                        conn.query('UPDATE users SET money = money + ? WHERE id = ?', [priceValue, seller_id], (err) => {
                                            if (err) {
                                                return conn.rollback(() => callback(new Error('Error adding seller money')));
                                            }

                                            conn.commit((err) => {
                                                if (err) {
                                                    return conn.rollback(() => callback(new Error('Error committing transaction')));
                                                }
                                                callback(null, { id: transactionId });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }
                );
            }
        );
    });
}

module.exports = {
    createTransactionsTable,
    getAllTransactions,
    getTransactionsByBuyer,
    getTransactionsBySeller,
    createTransaction,
    commitTransaction,
    approveTransaction,
    getTransactionById,
    getUserPropositions
};
