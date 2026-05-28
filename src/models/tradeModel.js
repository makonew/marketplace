const { getConnection } = require('../data/db');

function createTradesTable() {
    const conn = getConnection();
    const sql = `
        CREATE TABLE IF NOT EXISTS trades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            creator_id INT NOT NULL,
            target_id INT NOT NULL,
            status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
            creator_money DECIMAL(10, 2) DEFAULT 0.00,
            target_money DECIMAL(10, 2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `;
    conn.query(sql, (err) => {
        if (err) { console.error('Error creating trades table:', err); return; }
        console.log('Trades table created or already exists');
    });
}

function createTradeItemsTable() {
    const conn = getConnection();
    const sql = `
        CREATE TABLE IF NOT EXISTS trade_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            trade_id INT NOT NULL,
            giver_id INT NOT NULL,
            item_id INT NOT NULL,
            FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
            FOREIGN KEY (giver_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        )
    `;
    conn.query(sql, (err) => {
        if (err) { console.error('Error creating trade_items table:', err); return; }
        console.log('TradeItems table created or already exists');
    });
}

function createTrade({ creator_id, target_id, creator_items, target_items, creator_money, target_money }, callback) {
    const conn = getConnection();

    conn.beginTransaction((err) => {
        if (err) return callback(err);

        conn.query(
            'INSERT INTO trades (creator_id, target_id, creator_money, target_money) VALUES (?, ?, ?, ?)',
            [creator_id, target_id, creator_money || 0, target_money || 0],
            (err, result) => {
                if (err) {
                    return conn.rollback(() => callback(err));
                }

                const tradeId = result.insertId;
                const items = [
                    ...(creator_items || []).map(itemId => [tradeId, creator_id, itemId]),
                    ...(target_items || []).map(itemId => [tradeId, target_id, itemId])
                ];

                if (items.length === 0) {
                    return conn.rollback(() => callback(new Error('At least one item is required')));
                }

                let completed = 0;
                let failed = false;

                items.forEach((item) => {
                    conn.query(
                        'INSERT INTO trade_items (trade_id, giver_id, item_id) VALUES (?, ?, ?)',
                        item,
                        (err) => {
                            if (err && !failed) {
                                failed = true;
                                return conn.rollback(() => callback(err));
                            }
                            completed++;
                            if (completed === items.length && !failed) {
                                conn.commit((err) => {
                                    if (err) return conn.rollback(() => callback(err));
                                    callback(null, { id: tradeId, creator_id, target_id, status: 'pending' });
                                });
                            }
                        }
                    );
                });
            }
        );
    });
}

function getTradeById(tradeId, callback) {
    const conn = getConnection();

    conn.query('SELECT * FROM trades WHERE id = ?', [tradeId], (err, trades) => {
        if (err) return callback(err);
        if (trades.length === 0) return callback(new Error('Trade not found'));

        const trade = trades[0];

        conn.query(
            `SELECT ti.*, i.name as item_name
             FROM trade_items ti
             INNER JOIN items i ON ti.item_id = i.id
             WHERE ti.trade_id = ?`,
            [tradeId],
            (err, items) => {
                if (err) return callback(err);
                trade.items = items;
                callback(null, trade);
            }
        );
    });
}

function getUserTrades(userId, callback) {
    const conn = getConnection();

    conn.query(
        `SELECT t.*,
                creator.login as creator_name,
                target.login as target_name
         FROM trades t
         INNER JOIN users creator ON t.creator_id = creator.id
         INNER JOIN users target ON t.target_id = target.id
         WHERE t.creator_id = ? OR t.target_id = ?
         ORDER BY
            CASE WHEN t.status = 'pending' THEN 0 ELSE 1 END,
            t.created_at DESC`,
        [userId, userId],
        (err, trades) => {
            if (err) return callback(err);
            callback(null, trades);
        }
    );
}

function acceptTrade(tradeId, callback) {
    const conn = getConnection();

    conn.beginTransaction((err) => {
        if (err) return callback(err);

        conn.query('SELECT * FROM trades WHERE id = ? FOR UPDATE', [tradeId], (err, trades) => {
            if (err || trades.length === 0) {
                return conn.rollback(() => callback(new Error('Trade not found')));
            }

            const trade = trades[0];

            if (trade.status !== 'pending') {
                return conn.rollback(() => callback(new Error('Trade is not pending')));
            }

            conn.query(
                'SELECT ti.* FROM trade_items ti WHERE ti.trade_id = ?',
                [tradeId],
                (err, items) => {
                    if (err || items.length === 0) {
                        return conn.rollback(() => callback(new Error('Trade has no items')));
                    }

                    function getReceiver(giverId) {
                        if (giverId === trade.creator_id) return trade.target_id;
                        if (giverId === trade.target_id) return trade.creator_id;
                        return null;
                    }

                    function verifyOwnership(itemList, index, done) {
                        if (index >= itemList.length) return done(null);

                        const item = itemList[index];
                        conn.query(
                            'SELECT * FROM item_owners WHERE owner_id = ? AND item_id = ? FOR UPDATE',
                            [item.giver_id, item.item_id],
                            (err, rows) => {
                                if (err || rows.length === 0) {
                                    return done(new Error(`User ${item.giver_id} does not own item ${item.item_id}`));
                                }
                                verifyOwnership(itemList, index + 1, done);
                            }
                        );
                    }

                    function verifyBalances(itemList, index, done) {
                        if (index >= 2) return done(null); // Both balances checked

                        if (index === 0 && trade.creator_money > 0) {
                            conn.query('SELECT money FROM users WHERE id = ? FOR UPDATE', [trade.creator_id], (err, rows) => {
                                if (err || rows.length === 0) return done(new Error('Creator not found'));
                                if (parseFloat(rows[0].money) < parseFloat(trade.creator_money)) {
                                    return done(new Error('Creator does not have enough money'));
                                }
                                verifyBalances(itemList, index + 1, done);
                            });
                        } else if (index === 1 && trade.target_money > 0) {
                            conn.query('SELECT money FROM users WHERE id = ? FOR UPDATE', [trade.target_id], (err, rows) => {
                                if (err || rows.length === 0) return done(new Error('Target not found'));
                                if (parseFloat(rows[0].money) < parseFloat(trade.target_money)) {
                                    return done(new Error('Target does not have enough money'));
                                }
                                verifyBalances(itemList, index + 1, done);
                            });
                        } else {
                            verifyBalances(itemList, index + 1, done);
                        }
                    }

                    verifyOwnership(items, 0, (err) => {
                        if (err) return conn.rollback(() => callback(err));

                        verifyBalances(null, 0, (err) => {
                            if (err) return conn.rollback(() => callback(err));

                            function transferItems(itemList, index, done) {
                                if (index >= itemList.length) return done(null);

                                const item = itemList[index];
                                const receiverId = getReceiver(item.giver_id);

                                conn.query(
                                    'DELETE FROM item_owners WHERE owner_id = ? AND item_id = ?',
                                    [item.giver_id, item.item_id],
                                    (err) => {
                                        if (err) return done(err);
                                        conn.query(
                                            'INSERT INTO item_owners (owner_id, item_id) VALUES (?, ?)',
                                            [receiverId, item.item_id],
                                            (err) => {
                                                if (err) return done(err);
                                                transferItems(itemList, index + 1, done);
                                            }
                                        );
                                    }
                                );
                            }

                            transferItems(items, 0, (err) => {
                                if (err) return conn.rollback(() => callback(err));

                                let moneyOps = [];
                                if (parseFloat(trade.creator_money) > 0) {
                                    moneyOps.push({ from: trade.creator_id, to: trade.target_id, amount: parseFloat(trade.creator_money) });
                                }
                                if (parseFloat(trade.target_money) > 0) {
                                    moneyOps.push({ from: trade.target_id, to: trade.creator_id, amount: parseFloat(trade.target_money) });
                                }

                                function transferMoney(index, done) {
                                    if (index >= moneyOps.length) return done(null);

                                    const op = moneyOps[index];
                                    conn.query(
                                        'UPDATE users SET money = money - ? WHERE id = ?',
                                        [op.amount, op.from],
                                        (err) => {
                                            if (err) return done(err);
                                            conn.query(
                                                'UPDATE users SET money = money + ? WHERE id = ?',
                                                [op.amount, op.to],
                                                (err) => {
                                                    if (err) return done(err);
                                                    transferMoney(index + 1, done);
                                                }
                                            );
                                        }
                                    );
                                }

                                transferMoney(0, (err) => {
                                    if (err) return conn.rollback(() => callback(err));

                                    conn.query(
                                        'UPDATE trades SET status = "accepted" WHERE id = ?',
                                        [tradeId],
                                        (err) => {
                                            if (err) return conn.rollback(() => callback(err));
                                            conn.commit((err) => {
                                                if (err) return conn.rollback(() => callback(err));
                                                callback(null, { id: tradeId, status: 'accepted' });
                                            });
                                        }
                                    );
                                });
                            });
                        });
                    });
                }
            );
        });
    });
}

function rejectTrade(tradeId, callback) {
    const conn = getConnection();

    conn.query('SELECT * FROM trades WHERE id = ?', [tradeId], (err, trades) => {
        if (err) return callback(err);
        if (trades.length === 0) return callback(new Error('Trade not found'));
        if (trades[0].status !== 'pending') return callback(new Error('Trade is not pending'));

        conn.query(
            'UPDATE trades SET status = "rejected" WHERE id = ?',
            [tradeId],
            (err) => {
                if (err) return callback(err);
                callback(null, { id: tradeId, status: 'rejected' });
            }
        );
    });
}

module.exports = {
    createTradesTable,
    createTradeItemsTable,
    createTrade,
    getTradeById,
    getUserTrades,
    acceptTrade,
    rejectTrade
};
