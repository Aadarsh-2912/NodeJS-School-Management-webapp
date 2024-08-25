const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// MySQL Database Connection
const connection = mysql.createConnection({
    host: 'school-management-server.mysql.database.azure.com',
    user: 'system',
    password: 'Aaan@1229',
    database: 'school_management',
    ssl: {
      ca: fs.readFileSync('DigiCertGlobalRootCA.crt.pem') // Update the path to your certificate file
    }
  });

connection.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL database.');
});

// Add School API
app.post('/addSchool', (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Validate input
  if (!name || !address || !latitude || !longitude) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
  connection.query(query, [name, address, latitude, longitude], (err, results) => {
    if (err) {
      console.error('Error inserting school:', err);
      return res.status(500).json({ error: 'Internal server error.' });
    }
    res.status(201).json({ message: 'School added successfully.', id: results.insertId });
  });
});

// List Schools API
app.get('/listSchools', (req, res) => {
  const { latitude, longitude } = req.query;

  // Validate input
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  // Calculate distance
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
      return res.status(500).json({ error: 'Internal server error.' });
    }
    res.json(results);
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
