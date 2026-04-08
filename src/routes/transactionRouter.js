const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

router.get('/transactions/new', transactionController.createTransactionForm);
router.post('/transactions', transactionController.createTransaction);
router.get('/transactions', transactionController.listTransactions);
router.get('/transactions/propositions', transactionController.userPropositions);
router.post('/transactions/:id/approve', transactionController.approveTransaction);
router.post('/transactions/:id/commit', transactionController.commitTransaction);
router.get('/users/:id/purchases', transactionController.userPurchases);
router.get('/users/:id/sales', transactionController.userSales);

module.exports = router;