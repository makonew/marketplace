const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

router.get('/items', itemController.listItems);
router.get('/items/:id/owners', itemController.itemOwners);

router.get('/users', itemController.listUsers);
router.get('/users/:id/items', itemController.userItems);

module.exports = router;