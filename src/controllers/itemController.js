const Item = require('../models/itemModel');
const ItemOwner = require('../models/itemOwnerModel');
const User = require('../models/userModel');

exports.listItems = (req, res) => {
    Item.findAllItems((err, items) => {
        if (err) return res.status(500).send('Error fetching items');
        res.render('pages/item/list', { items });
    });
};

exports.listUsers = (req, res) => {
    const conn = require('../data/db').getConnection();
    conn.query('SELECT id, login, money FROM users', (err, users) => {
        if (err) return res.status(500).send('Error fetching users');
        res.render('pages/user/list', { users });
    });
};

exports.userItems = (req, res) => {
    const userId = req.params.id;
    
    User.findUserById(userId, (err, user) => {
        if (err || !user) return res.status(404).send('User not found');
        
        ItemOwner.getItemsByOwner(userId, (err, items) => {
            if (err) return res.status(500).send('Error fetching items');
            res.render('pages/user/items', { user, items });
        });
    });
};

exports.itemOwners = (req, res) => {
    const itemId = req.params.id;
    
    Item.findItemById(itemId, (err, item) => {
        if (err || !item) return res.status(404).send('Item not found');
        
        ItemOwner.getOwnersByItem(itemId, (err, owners) => {
            if (err) return res.status(500).send('Error fetching owners');
            res.render('pages/item/owners', { item, owners });
        });
    });
};