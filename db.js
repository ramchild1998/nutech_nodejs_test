const mysql = require('mysql');

// Konfigurasi koneksi ke database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Ganti dengan username MySQL
    password: 'root', // Ganti dengan password MySQL
    database: 'nutech_test' // Ganti dengan nama database yang tertera pada file yang terlampir
});

// Membuat koneksi ke database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ' + err.stack);
        return;
    }
    console.log('Connected to database as ID ' + connection.threadId);
});

module.exports = connection;