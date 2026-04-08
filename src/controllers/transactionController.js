const Transaction = require('../models/transactionModel');
const User = require('../models/userModel');
const { getConnection } = require('../data/db');

exports.listTransactions = (req, res) => {
    Transaction.getAllTransactions((err, transactions) => {
        if (err) return res.status(500).send('Error fetching transactions');
        res.render('pages/transaction/list', { transactions });
    });
};

exports.createTransactionForm = (req, res) => {
    const conn = getConnection();

    conn.query(
        `SELECT i.id as item_id, i.name as item_name, u.id as owner_id, u.login as owner_name 
         FROM items i 
         INNER JOIN item_owners io ON i.id = io.item_id 
         INNER JOIN users u ON io.owner_id = u.id`,
        (err, items) => {
            if (err) return res.status(500).send('Error fetching items');
            
            conn.query('SELECT id, login FROM users', (err, users) => {
                if (err) return res.status(500).send('Error fetching users');
                res.render('pages/transaction/new', { items, users });
            });
        }
    );
};

exports.createTransaction = (req, res) => {
    const { item_id, buyer_id, seller_id, price } = req.body;
    const itemId = parseInt(item_id);
    const buyerId = parseInt(buyer_id);
    const sellerId = parseInt(seller_id);
    const priceValue = parseFloat(price);

    Transaction.createTransaction({ item_id: itemId, buyer_id: buyerId, seller_id: sellerId, price: priceValue }, (err, transaction) => {
        if (err) {
            return res.status(400).send(err.message);
        }
        res.redirect('/transactions');
    });
};

exports.approveTransaction = (req, res) => {
    const transactionId = parseInt(req.params.id);
    const approverId = req.body.buyer_id ? parseInt(req.body.buyer_id) : parseInt(req.params.buyerId);

    Transaction.approveTransaction(transactionId, approverId, (err) => {
        if (err) {
            return res.status(400).send(err.message);
        }
        res.redirect('/transactions');
    });
};

exports.commitTransaction = (req, res) => {
    const transactionId = parseInt(req.params.id);

    Transaction.commitTransaction(transactionId, (err) => {
        if (err) {
            return res.status(400).send(err.message);
        }
        res.redirect('/transactions');
    });
};

exports.userPurchases = (req, res) => {
    const userId = req.params.id;
    
    User.findUserById(userId, (err, user) => {
        if (err || !user) return res.status(404).send('User not found');
        
        Transaction.getTransactionsByBuyer(userId, (err, transactions) => {
            if (err) return res.status(500).send('Error fetching transactions');
            res.render('pages/transaction/userPurchases', { user, transactions });
        });
    });
};

exports.userSales = (req, res) => {
    const userId = req.params.id;
    
    User.findUserById(userId, (err, user) => {
        if (err || !user) return res.status(404).send('User not found');
        
        Transaction.getTransactionsBySeller(userId, (err, transactions) => {
            if (err) return res.status(500).send('Error fetching transactions');
            res.render('pages/transaction/userSales', { user, transactions });
        });
    });
};

exports.userPropositions = (req, res) => {
    const userId = req.session.user.id;
    
    Transaction.getUserPropositions(userId, (err, propositions) => {
        if (err) return res.status(500).send('Error fetching propositions');
        res.render('pages/transaction/propositions', { propositions });
    });
};