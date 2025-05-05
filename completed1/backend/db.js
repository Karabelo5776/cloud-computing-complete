const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',  
    user: 'root',       
    password: '901017181',       
    database: 'iwb'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

module.exports = db;
