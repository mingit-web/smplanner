const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup (Back to local file since Railway has persistent storage)
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to SQLite database.');
});

// Table Initialization
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        userId TEXT,
        title TEXT,
        type TEXT,
        dueDate TEXT,
        time TEXT,
        prepTime TEXT,
        notes TEXT,
        status TEXT
    )`);
});

// Authentication Endpoints
app.post('/api/signup', async (req, res) => {
    const { username, password, confirmPassword } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match.' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = Date.now().toString();
        const query = `INSERT INTO users (id, username, password) VALUES (?, ?, ?)`;

        db.run(query, [userId, username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username already exists.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ userId, username });
        });
    } catch (err) {
        res.status(500).json({ error: 'Error securing password.' });
    }
});

app.post('/api/signin', (req, res) => {
    const { username, password } = req.body;
    const query = `SELECT * FROM users WHERE username = ?`;
    
    db.get(query, [username], async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid username or password.' });

        const isMatch = await bcrypt.compare(password, row.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

        res.json({ userId: row.id, username: row.username });
    });
});

// Events Endpoints
app.get('/api/events/:userId', (req, res) => {
    const { userId } = req.params;
    db.all(`SELECT * FROM events WHERE userId = ?`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/events', (req, res) => {
    const { id, userId, title, type, dueDate, time, prepTime, notes, status } = req.body;
    const query = `INSERT INTO events (id, userId, title, type, dueDate, time, prepTime, notes, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET
                   title=excluded.title, type=excluded.type, dueDate=excluded.dueDate,
                   time=excluded.time, prepTime=excluded.prepTime, notes=excluded.notes, status=excluded.status`;
                   
    db.run(query, [id, userId, title, type, dueDate, time, prepTime, notes, status || 'Draft'], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM events WHERE id = ?`, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Restore app.listen for Railway persistent server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});