const Trade = require('../models/tradeModel');
const User = require('../models/userModel');
const { getConnection } = require('../data/db');

exports.showTrade = (req, res) => {
    const tradeId = parseInt(req.params.id);
    const userId = req.session.user.id;

    Trade.getTradeById(tradeId, (err, trade) => {
        if (err) return res.status(404).send('Trade not found');
        res.render('pages/trade/show', { trade, userId });
    });
};

exports.listTrades = (req, res) => {
    const userId = req.session.user.id;

    Trade.getUserTrades(userId, (err, trades) => {
        if (err) return res.status(500).send('Error fetching trades');
        res.render('pages/trade/list', { trades, userId });
    });
};

exports.createTradeForm = (req, res) => {
    const userId = req.session.user.id;
    const targetId = req.query.target ? parseInt(req.query.target) : null;

    const conn = getConnection();

    conn.query(
        `SELECT i.id, i.name FROM items i
         INNER JOIN item_owners io ON i.id = io.item_id
         WHERE io.owner_id = ?`,
        [userId],
        (err, myItems) => {
            if (err) return res.status(500).send('Error fetching items');

            conn.query(
                'SELECT id, login FROM users WHERE id != ?',
                [userId],
                (err, users) => {
                    if (err) return res.status(500).send('Error fetching users');

                    if (targetId) {
                        conn.query(
                            `SELECT i.id, i.name FROM items i
                             INNER JOIN item_owners io ON i.id = io.item_id
                             WHERE io.owner_id = ?`,
                            [targetId],
                            (err, targetItems) => {
                                if (err) return res.status(500).send('Error fetching target items');
                                res.render('pages/trade/new', {
                                    users,
                                    myItems,
                                    targetItems,
                                    targetId,
                                    targetName: users.find(u => u.id === targetId)?.login
                                });
                            }
                        );
                    } else {
                        res.render('pages/trade/new', {
                            users,
                            myItems,
                            targetItems: [],
                            targetId: null,
                            targetName: null
                        });
                    }
                }
            );
        }
    );
};

exports.createTrade = (req, res) => {
    const creatorId = req.session.user.id;
    const { target_id, creator_money, target_money } = req.body;
    let creator_items = req.body.creator_items || [];
    let target_items = req.body.target_items || [];

    if (!Array.isArray(creator_items)) creator_items = [creator_items];
    if (!Array.isArray(target_items)) target_items = [target_items];

    if (!target_id) return res.status(400).send('Select a user to trade with');

    Trade.createTrade({
        creator_id: creatorId,
        target_id: parseInt(target_id),
        creator_items: creator_items.map(id => parseInt(id)).filter(id => id),
        target_items: target_items.map(id => parseInt(id)).filter(id => id),
        creator_money: parseFloat(creator_money) || 0,
        target_money: parseFloat(target_money) || 0
    }, (err, trade) => {
        if (err) return res.status(400).send(err.message);
        res.redirect('/trades');
    });
};

exports.acceptTrade = (req, res) => {
    const tradeId = parseInt(req.params.id);
    const userId = req.session.user.id;

    Trade.getTradeById(tradeId, (err, trade) => {
        if (err) return res.status(404).send('Trade not found');
        if (trade.target_id !== userId) return res.status(403).send('Only the recipient can accept');
        if (trade.status !== 'pending') return res.status(400).send('Trade is not pending');

        Trade.acceptTrade(tradeId, (err) => {
            if (err) return res.status(400).send(err.message);
            res.redirect('/trades');
        });
    });
};

exports.rejectTrade = (req, res) => {
    const tradeId = parseInt(req.params.id);
    const userId = req.session.user.id;

    Trade.getTradeById(tradeId, (err, trade) => {
        if (err) return res.status(404).send('Trade not found');
        if (trade.target_id !== userId) return res.status(403).send('Only the recipient can reject');
        if (trade.status !== 'pending') return res.status(400).send('Trade is not pending');

        Trade.rejectTrade(tradeId, (err) => {
            if (err) return res.status(400).send(err.message);
            res.redirect('/trades');
        });
    });
};
