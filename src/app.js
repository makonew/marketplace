require('dotenv').config();
const express = require('express');
const session = require('express-session');
const expressEjsLayouts = require('express-ejs-layouts');
const path = require('path');
const { connectDB } = require('./data/db');
const { createUsersTable } = require('./models/userModel');
const { createItemsTable } = require('./models/itemModel');
const { createItemOwnersTable } = require('./models/itemOwnerModel');
const { createTradesTable, createTradeItemsTable } = require('./models/tradeModel');
const { createSellOffersTable } = require('./models/sellOfferModel');

const app = express();

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

app.use(expressEjsLayouts);

app.use('/', require('./routes/mainRouter'));
app.use('/', require('./routes/itemRouter'));
app.use('/', require('./routes/tradeRouter'));
app.use('/', require('./routes/sellOfferRouter'));

connectDB(() => {
    createUsersTable();
    createItemsTable();
    createItemOwnersTable();
    createTradesTable();
    createTradeItemsTable();
    createSellOffersTable();

    app.listen(PORT, () => {
        console.log(`http://localhost:${PORT}`);
    });
});
