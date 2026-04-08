const Product = require('../models/productModel')

exports.addProduct = (req, res) => {
    const { name, price } = req.body

    const seller = req.session.user.id;

    Product.addProduct({ name, price, seller })

    res.redirect('/')
}

exports.productForm = (req, res) => {
    res.render('pages/product/add')
}

exports.listProducts = async(req, res) => {
    const products = await Product.findProductByFilters({})
    res.render('pages/product/list', {products})
}