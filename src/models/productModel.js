const { getDB } = require('../data/db')


async function findProductById(id) {
    return await getDB().collection('products').findOne({ id })
}

async function findProductByFilters(filters) {
    let f = {};
    for (t in filters)
        f[t] = filters[t]
    return await getDB().collection('products').find().toArray()
}

async function addProduct(product) {
    const { name, price, seller } = product
    return await getDB().collection('products').insertOne({ name, price, seller })
}

module.exports = { findProductByFilters, findProductById, addProduct }