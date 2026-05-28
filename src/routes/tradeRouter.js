const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const requireLogin = require('../middleware/requireLogin');

router.get('/trades/new', requireLogin, tradeController.createTradeForm);
router.get('/trades', requireLogin, tradeController.listTrades);
router.get('/trades/:id', requireLogin, tradeController.showTrade);
router.post('/trades', requireLogin, tradeController.createTrade);
router.post('/trades/:id/accept', requireLogin, tradeController.acceptTrade);
router.post('/trades/:id/reject', requireLogin, tradeController.rejectTrade);

module.exports = router;
