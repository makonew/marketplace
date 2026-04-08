require('dotenv').config();
const express = require('express');
const session = require('express-session');
const layouts = require('express-ejs-layouts');
const path = require('path');
const { connectDB } = require('./data/db');
const { createUsersTable } = require('./models/userModel');
const { createItemsTable } = require('./models/itemModel');
const { createItemOwnersTable } = require('./models/itemOwnerModel');
const { createTransactionsTable } = require('./models/transactionModel');
const expressEjsLayouts = require('express-ejs-layouts');

const app = express();

const PORT = process.env.port || 3000

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set(layouts);
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitalized: false
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
})

app.use(expressEjsLayouts)

app.use(express.static('public'))
app.use('/', require('./routes/mainRouter'))
app.use('/', require('./routes/itemRouter'))
app.use('/', require('./routes/transactionRouter'))


connectDB();
createUsersTable();
createItemsTable();
createItemOwnersTable();
createTransactionsTable();

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`)
})

