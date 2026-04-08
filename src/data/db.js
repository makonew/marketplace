require('dotenv').config();
const mysql = require('mysql2');

let conn;

function connectDB() {
    conn = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'marketplace',
        port: process.env.DB_PORT || 3306
    });

    conn.connect((err) => {
        if (err) {
            console.error('Error connecting to database:', err);
            return;
        }
        console.log('Connected to MySQL database');
    });
}

function getConnection() {
    return conn;
}

module.exports = { connectDB, getConnection };


/*
=============================
Users
============================
 id | login | password | money
-----------------------

*/

/* 
=================
Items
=================
id | name
------------------


=================
ItemOwners
==================
id | owner_id | item_id


==================
Transactions
=====================
id | item_ | buyer | seller | price/value | approved

=================
Offers
=================
id | offerer_id | offered_id

===============
OfferItems
===============
id | offer_id | offerer/offered 

*/