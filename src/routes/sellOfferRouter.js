const express = require('express');
const router = express.Router();
const sellOfferController = require('../controllers/sellOfferController');
const requireLogin = require('../middleware/requireLogin');

router.get('/offers', sellOfferController.listOffers);
router.get('/offers/my', requireLogin, sellOfferController.myOffers);
router.get('/offers/new', requireLogin, sellOfferController.createOfferForm);
router.post('/offers', requireLogin, sellOfferController.createOffer);
router.post('/offers/:id/buy', requireLogin, sellOfferController.buyOffer);
router.post('/offers/:id/cancel', requireLogin, sellOfferController.cancelOffer);

module.exports = router;