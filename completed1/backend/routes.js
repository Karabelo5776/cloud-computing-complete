const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();

// User Registration
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
    db.query(query, [name, email, hashedPassword, role], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.status(201).json({ message: "User registered successfully" });
    });
});

// User Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email = ?`;
    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err });
        if (results.length === 0) return res.status(400).json({ message: "User not found" });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user.id, role: user.role }, "secretkey", { expiresIn: '1h' });
        res.json({ token, user });
    });
});

// Get All Sales
router.get('/sales', (req, res) => {
    const query = `SELECT * FROM sales`;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

module.exports = router;
