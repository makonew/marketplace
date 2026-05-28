const SellOffer = require('../models/sellOfferModel');
const { getConnection } = require('../data/db');

exports.listOffers = (req, res) => {
    SellOffer.getAllActiveOffers((err, offers) => {
        if (err) return res.status(500).send('Error fetching offers');
        res.render('pages/sellOffer/list', { offers });
    });
};

exports.myOffers = (req, res) => {
    const userId = req.session.user.id;
    SellOffer.getOffersBySeller(userId, (err, offers) => {
        if (err) return res.status(500).send('Error fetching offers');
        res.render('pages/sellOffer/my', { offers });
    });
};

exports.createOfferForm = (req, res) => {
    const userId = req.session.user.id;
    const conn = getConnection();

    conn.query(
        `SELECT i.id, i.name FROM items i
         INNER JOIN item_owners io ON i.id = io.item_id
         WHERE io.owner_id = ?`,
        [userId],
        (err, items) => {
            if (err) return res.status(500).send('Error fetching items');
            res.render('pages/sellOffer/new', { items });
        }
    );
};

exports.createOffer = (req, res) => {
    const sellerId = req.session.user.id;
    const { item_id, price } = req.body;
    const parsedItemId = parseInt(item_id);
    const parsedPrice = parseFloat(price);

    if (!parsedItemId || !parsedPrice || parsedPrice <= 0) {
        return res.status(400).send('Invalid item or price');
    }

    const conn = getConnection();
    conn.query(
        'SELECT * FROM item_owners WHERE owner_id = ? AND item_id = ?',
        [sellerId, parsedItemId],
        (err, ownership) => {
            if (err || ownership.length === 0) {
                return res.status(400).send('You do not own this item');
            }

            SellOffer.createOffer({
                seller_id: sellerId,
                item_id: parsedItemId,
                price: parsedPrice
            }, (err, offer) => {
                if (err) return res.status(400).send(err.message);
                res.redirect('/offers/my');
            });
        }
    );
};

exports.buyOffer = (req, res) => {
    const offerId = parseInt(req.params.id);
    const buyerId = req.session.user.id;

    SellOffer.buyOffer(offerId, buyerId, (err) => {
        if (err) return res.status(400).send(err.message);
        res.redirect('/items');
    });
};

exports.cancelOffer = (req, res) => {
    const offerId = parseInt(req.params.id);
    const sellerId = req.session.user.id;

    SellOffer.cancelOffer(offerId, sellerId, (err) => {
        if (err) return res.status(400).send(err.message);
        res.redirect('/offers/my');
    });
};