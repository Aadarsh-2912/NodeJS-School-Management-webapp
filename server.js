const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();

const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        ca: fs.readFileSync(path.resolve(__dirname, process.env.SSL_CERT_PATH))
    }
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database.');
});

connection.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Lost connection to the database. Attempting to reconnect...');
        connection.connect((err) => {
            if (err) {
                console.error('Failed to reconnect to the database:', err);
            } else {
                console.log('Reconnected to the database.');
            }
        });
    } else {
        throw err;
    }
});

app.get('/', (req, res) => {
    res.send('Hello from School Management API!');
});

app.post('/addSchool', (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
    connection.query(query, [name, address, latitude, longitude], (err, results) => {
        if (err) {
            console.error('Error inserting school:', err);
            return res.status(500).json({ error: 'Internal server error.', details: err.message });
        }
        res.status(201).json({ message: 'School added successfully.', id: results.insertId });
    });
});

app.get('/listSchools', (req, res) => {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const query = `
        SELECT *, (
            6371 * acos(
                cos(radians(?)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(latitude))
            )
        ) AS distance
        FROM schools
        ORDER BY distance
    `;

    connection.query(query, [latitude, longitude, latitude], (err, results) => {
        if (err) {
            console.error('Error fetching schools:', err);
            return res.status(500).json({ error: 'Internal server error.', details: err.message });
        }
        res.json(results);
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
