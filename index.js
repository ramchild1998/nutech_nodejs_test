const jwt = require('jsonwebtoken');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db'); // Import modul koneksi database

const app = express();
app.use(bodyParser.json());

app.use(express.json())


app.get('/', (req, res) => {
    res.json({
        message: "ini adalah root"
    })
})

app.post('/', (req, res) => {
    res.json({
        message: "ini adalah post"
    })
})

app.post('/registration', (req, res) => {
    // Ambil data dari body request
    const { email, first_name, last_name, password } = req.body;

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ status: 102, message: 'Parameter email tidak sesuai format', data: null });
    }

    // Validasi panjang password
    if (password.length < 8) {
        return res.status(400).json({ status: 102, message: 'Panjang password minimal 8 karakter', data: null });
    }

    // Validasi first_name dan last_name tidak kosong
    if (!first_name || !last_name) {
        return res.status(400).json({ status: 102, message: 'Nama depan dan belakang harus diisi', data: null });
    }

    // Query untuk menyimpan data pengguna baru ke dalam tabel users
    const insertQuery = 'INSERT INTO users (email, first_name, last_name, password) VALUES (?, ?, ?, ?)';
    const values = [email, first_name, last_name, password];

    // Eksekusi kueri SQL
    db.query(insertQuery, values, (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        // Handle response sesuai dengan spesifikasi
        return res.status(200).json({ status: 0, message: 'Registrasi berhasil silahkan login', data: null });
    });
});


app.post('/login', (req, res) => {
    // Mendapatkan email dan password dari request body
    const { email, password } = req.body;

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ status: 102, message: 'Parameter email tidak sesuai format', data: null });
    }

    // Validasi panjang password
    if (password.length < 8) {
        return res.status(400).json({ status: 102, message: 'Panjang password minimal 8 karakter', data: null });
    }

    // Query untuk mendapatkan pengguna dengan email yang sesuai dari tabel users
    const selectUserQuery = 'SELECT * FROM users WHERE email = ? LIMIT 1';

    // Eksekusi kueri SQL
    db.query(selectUserQuery, [email], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        // Jika pengguna tidak ditemukan, kirim respons Unauthorized
        if (result.length === 0) {
            return res.status(401).json({ status: 103, message: 'Username atau password salah', data: null });
        }

        const user = result[0];

        // Bandingkan password yang diberikan dengan password yang disimpan di database
        if (password !== user.password) {
            return res.status(401).json({ status: 103, message: 'Username atau password salah', data: null });
        }

        // Generate JWT dengan payload email dan expiration 12 jam
        const token = jwt.sign({ email }, 'rahasia', { expiresIn: '12h' });

        // Response dengan JWT
        res.status(200).json({ status: 0, message: 'Login Sukses', data: { token } });
    });
});

// Fungsi middleware untuk memeriksa token JWT
function verifyToken(req, res, next) {
    // Mendapatkan token dari header Authorization
    const bearerHeader = req.headers['authorization'];

    // Check jika token ada
    if (typeof bearerHeader !== 'undefined') {
        // Split header untuk mendapatkan token
        const bearer = bearerHeader.split(' ');
        // Ambil token dari array
        const token = bearer[1];

        // Verifikasi token
        jwt.verify(token, 'rahasia', (err, authData) => {
            if (err) {
                res.status(401).json({ status: 108, message: 'Token tidak valid atau kadaluwarsa', data: null });
            } else {
                // Set data autentikasi ke dalam request untuk digunakan di endpoint
                req.authData = authData;
                next();
            }
        });
    } else {
        // Jika token tidak ada, kirim response Unauthorized
        res.status(401).json({ status: 108, message: 'Token tidak valid atau kadaluwarsa', data: null });
    }
}

app.get('/profile', verifyToken, (req, res) => {
    jwt.verify(req.token, 'rahasia', (err, authData) => {
        if (err) {
            return res.status(401).json({ status: 108, message: 'Token tidak valid atau kadaluwarsa', data: null });
        } else {
            // Ambil email dari payload JWT
            const email = authData.email;

            // Lakukan query ke database untuk mengambil informasi profil pengguna
            const query = `SELECT * FROM users WHERE email = '${email}'`;

            connection.query(query, (err, result) => {
                if (err) {
                    console.error('Error querying database:', err);
                    return res.status(500).json({ status: 500, message: 'Internal Server Error', data: null });
                }

                // Pastikan ada hasil dari query
                if (result.length === 0) {
                    return res.status(404).json({ status: 404, message: 'User tidak ditemukan', data: null });
                }

                // Ambil data profil pengguna dari hasil query
                const userProfile = {
                    email: result[0].email,
                    first_name: result[0].first_name,
                    last_name: result[0].last_name,
                    profile_image: result[0].profile_image
                };

                // Kirim respons dengan data profil pengguna
                res.status(200).json({ status: 0, message: 'Sukses', data: userProfile });
            });
        }
    });
});

// Endpoint untuk memperbarui profil
app.put('/profile/update', verifyToken, (req, res) => {
    jwt.verify(req.token, 'rahasia', (err, authData) => {
        if (err) {
            return res.status(401).json({ status: 108, message: 'Token tidak valid atau kadaluwarsa', data: null });
        } else {
            // Mengambil data dari payload JWT
            const { email } = authData;

            // Mengambil data yang ingin diupdate dari request body
            const { first_name, last_name } = req.body;

            // Lakukan proses update profil di sini, misalnya menyimpan ke database atau sumber data lainnya
            // Query update ke tabel users
            const query = `UPDATE users SET first_name = ?, last_name = ? WHERE email = ?`;

            // Lakukan query update ke database
            connection.query(query, [first_name, last_name, email], (err, result) => {
                if (err) {
                    console.error('Error updating profile:', err);
                    return res.status(500).json({ status: 500, message: 'Internal Server Error', data: null });
                }

                // Pastikan ada baris yang diupdate
                if (result.affectedRows === 0) {
                    return res.status(404).json({ status: 404, message: 'User tidak ditemukan', data: null });
                }

                // Kirim respons dengan data profil yang telah diupdate
                const updatedProfile = {
                    email,
                    first_name,
                    last_name,
                    profile_image: 'https://yoururlapi.com/profile.jpeg' //  Ganti dengan URL gambar profil sesuai kebutuhan
                };

                res.status(200).json({ status: 0, message: 'Update Profile berhasil', data: updatedProfile });
            });
        }
    });
});

// Endpoint untuk mengupdate gambar profil
app.put('/profile/image', verifyToken, (req, res) => {
    jwt.verify(req.token, 'rahasia', (err, authData) => {
        if (err) {
            return res.status(401).json({ status: 108, message: 'Token tidak valid atau kadaluwarsa', data: null });
        } else {
            // Mengambil data dari payload JWT
            const { email } = authData;

            // Mendapatkan file dari request body
            const file = req.body.file;

            // Mendapatkan ekstensi file
            const fileExt = file ? file.substring(file.indexOf('/') + 1, file.indexOf(';')) : null;

            // Cek apakah ekstensi file sesuai dengan yang diizinkan
            if (!file || (fileExt !== 'jpeg' && fileExt !== 'png')) {
                return res.status(400).json({ status: 102, message: 'Format Image tidak sesuai', data: null });
            }

            // Menyimpan gambar ke database
            const updateQuery = 'UPDATE user_profiles SET profile_image = ? WHERE email = ?';

            // Eksekusi kueri SQL
            db.query(updateQuery, [file, email], (err, result) => {
                if (err) {
                    console.error('Error executing query:', err);
                    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
                }

                // Jika berhasil disimpan, respons dengan data profil yang telah diperbarui
                const updatedProfile = {
                    email,
                    first_name: 'User Edited',
                    last_name: 'Nutech Edited',
                    profile_image: 'https://yoururlapi.com/profile-updated.jpeg' // Anda dapat mengganti URL ini dengan URL gambar yang baru disimpan di database
                };

                res.status(200).json({ status: 0, message: 'Update Profile Image berhasil', data: updatedProfile });
            });
        }
    });
});

app.get('/banner', (req, res) => {
    // Query untuk mendapatkan semua data dari tabel banners
    const selectBannersQuery = 'SELECT * FROM banners';

    // Eksekusi query SQL untuk mendapatkan data banner
    db.query(selectBannersQuery, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        // Jika data banner tidak ditemukan, kirim respons not found
        if (results.length === 0) {
            return res.status(404).json({ status: 404, message: 'Data banner tidak ditemukan', data: null });
        }

        // Kirim respons dengan data list banner yang berhasil diambil dari database
        res.status(200).json({ status: 0, message: 'Sukses', data: results });
    });
});


// Endpoint untuk mendapatkan data layanan dari database
app.get('/services', (req, res) => {
    // Query untuk mendapatkan semua data dari tabel services
    const selectServicesQuery = 'SELECT * FROM services';

    // Eksekusi query SQL untuk mendapatkan data layanan
    db.query(selectServicesQuery, (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        // Jika data layanan tidak ditemukan, kirim respons not found
        if (results.length === 0) {
            return res.status(404).json({ status: 404, message: 'Data layanan tidak ditemukan', data: null });
        }

        // Kirim respons dengan data list layanan yang berhasil diambil dari database
        res.status(200).json({ status: 0, message: 'Sukses', data: results });
    });
});



// MODULE TRANSACTION
// Endpoint untuk mendapatkan saldo pengguna

// Terapkan verifikasi token dan dapatkan email pengguna
app.get('/balance', verifyToken, (req, res) => {
    const email = req.authData.email;

    // Query untuk mengambil saldo dari tabel user_balances berdasarkan email
    const selectBalanceQuery = 'SELECT balance FROM user_balances WHERE email = ?';

    db.query(selectBalanceQuery, [email], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        if (result.length === 0) {
            return res.status(404).json({ status: 404, message: 'Data saldo pengguna tidak ditemukan', data: null });
        }

        const balance = result[0].balance;

        // Kirim respons dengan saldo yang diambil dari database
        res.status(200).json({ status: 0, message: 'Get Balance Berhasil', data: { balance } });
    });
});

app.post('/topup', verifyToken, (req, res) => {
    const email = req.authData.email;
    const topUpAmount = req.body.top_up_amount;

    if (isNaN(topUpAmount) || topUpAmount < 0) {
        return res.status(400).json({ status: 102, message: 'Parameter amount hanya boleh angka dan tidak boleh lebih kecil dari 0', data: null });
    }

    // Query untuk memperbarui saldo pengguna
    const updateBalanceQuery = 'UPDATE user_balances SET balance = balance + ? WHERE email = ?';

    db.query(updateBalanceQuery, [topUpAmount, email], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        // Ambil saldo yang telah diperbarui dari database
        const selectBalanceQuery = 'SELECT balance FROM user_balances WHERE email = ?';

        db.query(selectBalanceQuery, [email], (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
            }

            if (result.length === 0) {
                return res.status(404).json({ status: 404, message: 'Data saldo pengguna tidak ditemukan', data: null });
            }

            const updatedBalance = result[0].balance;

            // Kirim respons dengan saldo yang telah diperbarui
            res.status(200).json({ status: 0, message: 'Top Up Balance berhasil', data: { balance: updatedBalance } });
        });
    });
});

// Endpoint untuk melakukan transaksi
app.post('/transaction', verifyToken, (req, res) => {
    // Ambil email dari payload JWT
    const email = req.authData.email;

    // Ambil kode layanan dari body permintaan
    const serviceCode = req.body.service_code;

    // Query untuk mendapatkan informasi layanan berdasarkan service_code
    const selectServiceQuery = 'SELECT * FROM services WHERE service_code = ?';

    // Eksekusi query SQL untuk mendapatkan informasi layanan
    db.query(selectServiceQuery, [serviceCode], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        // Periksa apakah layanan tersedia
        if (results.length === 0) {
            return res.status(400).json({ status: 102, message: 'Service atau Layanan tidak ditemukan', data: null });
        }

        // Ambil informasi layanan dari hasil query
        const { service_name, service_tariff } = results[0];

        // Query untuk mendapatkan saldo pengguna
        const selectBalanceQuery = 'SELECT balance FROM user_balances WHERE email = ?';

        // Eksekusi query SQL untuk mendapatkan saldo pengguna
        db.query(selectBalanceQuery, [email], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
            }

            // Periksa apakah saldo pengguna mencukupi
            if (results.length === 0 || results[0].balance < service_tariff) {
                return res.status(400).json({ status: 102, message: 'Saldo tidak mencukupi', data: null });
            }

            // Kurangi saldo pengguna
            const newBalance = results[0].balance - service_tariff;

            // Query untuk mengupdate saldo pengguna
            const updateBalanceQuery = 'UPDATE user_balances SET balance = ? WHERE email = ?';

            // Eksekusi query SQL untuk mengupdate saldo pengguna
            db.query(updateBalanceQuery, [newBalance, email], (err, results) => {
                if (err) {
                    console.error('Error executing query:', err);
                    return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
                }

                // Generate nomor invoice (contoh)
                const invoiceNumber = `INV${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-001`;

                // Kirim respons dengan informasi transaksi
                res.status(200).json({
                    status: 0,
                    message: 'Transaksi berhasil',
                    data: {
                        invoice_number: invoiceNumber,
                        service_code: serviceCode,
                        service_name: service_name,
                        transaction_type: "PAYMENT",
                        total_amount: service_tariff,
                        created_on: new Date().toISOString()
                    }
                });
            });
        });
    });
});


// Endpoint untuk mendapatkan informasi history transaksi
app.get('/transaction/history', verifyToken, (req, res) => {
    // Ambil email dari payload JWT
    const email = req.authData.email;

    // Mendapatkan parameter offset dari query string (jika ada)
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;

    // Mendapatkan parameter limit dari query string (jika ada)
    let limit = req.query.limit ? parseInt(req.query.limit) : undefined;

    // Set nilai default untuk parameter limit jika tidak diberikan
    if (!limit || isNaN(limit) || limit <= 0) {
        limit = 3; // batasi jumlah data yang ditampilkan menjadi 3 jika limit tidak diberikan
    }

    // Query untuk mendapatkan data history transaksi dari database
    const selectTransactionQuery = 'SELECT * FROM transaction_history WHERE email = ? ORDER BY created_on DESC LIMIT ?, ?';

    // Eksekusi query SQL untuk mendapatkan data history transaksi
    db.query(selectTransactionQuery, [email, offset, limit], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).json({ status: 500, message: 'Terjadi kesalahan server', data: null });
        }

        // Kirim respons dengan data history transaksi
        res.status(200).json({
            status: 0,
            message: 'Get History Berhasil',
            data: {
                offset: offset,
                limit: limit,
                records: results
            }
        });
    });
});





app.listen(1500,() => {
    console.log("Aplikasi ini berjalan pada port 1500");
})