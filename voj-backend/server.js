const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

const db = new sqlite3.Database('./voj.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database (voj.db)');
  }
});

db.run(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movie TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    seats TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    totalPrice INTEGER NOT NULL,
    paymentMethod TEXT NOT NULL,
    paymentStatus TEXT DEFAULT 'Success',
    paymentId TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('✅ Bookings table ready');
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: '🎬 VOJ Movie Booking API is running!',
    status: 'active'
  });
});

app.get('/api/bookings', (req, res) => {
  console.log('📥 Fetching all bookings...');
  
  const query = 'SELECT * FROM bookings ORDER BY id DESC';
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
      res.status(500).json({ error: err.message });
    } else {
      console.log('✅ Found', rows.length, 'bookings');
      
      const bookings = rows.map(row => ({
        ...row,
        seats: JSON.parse(row.seats)
      }));
      
      res.json({ 
        success: true,
        count: bookings.length,
        bookings: bookings 
      });
    }
  });
});

app.post('/api/bookings', (req, res) => {
  console.log('📤 Saving new booking...');
  
  const { movie, date, time, seats, user, totalPrice, paymentMethod, paymentId } = req.body;
  
  if (!movie || !date || !time || !seats || !user || !totalPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const seatsString = JSON.stringify(seats);
  
  const query = `
    INSERT INTO bookings (
      movie, date, time, seats, name, email, phone, 
      totalPrice, paymentMethod, paymentId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(
    query,
    [movie, date, time, seatsString, user.name, user.email, user.phone, totalPrice, paymentMethod, paymentId || 'N/A'],
    function(err) {
      if (err) {
        console.error('Error:', err.message);
        res.status(500).json({ error: err.message });
      } else {
        console.log('✅ Booking saved! ID:', this.lastID);
        res.status(201).json({ 
          success: true,
          message: 'Booking saved!',
          bookingId: this.lastID
        });
      }
    }
  );
});

app.delete('/api/bookings', (req, res) => {
  console.log('🗑️ Clearing all bookings...');
  
  db.run('DELETE FROM bookings', [], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      console.log('✅ Deleted', this.changes, 'bookings');
      res.json({ 
        success: true,
        deletedCount: this.changes 
      });
    }
  });
});

app.listen(PORT, () => {
  console.log('\n🎬 ========================================');
  console.log('🚀 VOJ Backend Server is running!');
  console.log('📡 URL: http://localhost:' + PORT);
  console.log('💾 Database: SQLite (voj.db)');
  console.log('🎬 ========================================\n');
});