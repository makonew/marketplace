const router = require('express').Router()
const controller = require('../controllers/productController')
const requireLogin = require('../middleware/requireLogin')
const requireRole = require('../middleware/requireRole')

router.get('/', controller.listProducts)

router.get('/add', requireLogin, requireRole('seller'), controller.productForm)
router.post('/add', requireLogin, requireRole('seller'), controller.addProduct)


module.exports = router