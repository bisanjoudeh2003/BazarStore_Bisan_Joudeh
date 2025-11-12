const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());


const DB_FILE = path.join(__dirname, 'catalog.db');


const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('Error opening database:', err.message);
  else console.log('Connected to catalog.db');
});

// --- Routes ---


app.get('/search/:topic', (req, res) => {
  const topicParam = req.params.topic;
  if (!topicParam) return res.status(400).json({ error: 'Topic is required' });

  const topic = topicParam.toLowerCase();
  const sql = `SELECT book_id, book_title FROM books WHERE LOWER(book_topic)=?`;
  db.all(sql, [topic], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


app.get('/info/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM books WHERE book_id=?`;
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Book not found' });
    res.json(row);
  });
});


app.post('/purchase/:id', (req, res) => {
  const id = req.params.id;

 
  db.get(`SELECT book_quantity, book_title FROM books WHERE book_id=?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Book not found' });
    if (row.book_quantity < 1) return res.status(400).json({ error: 'Out of stock' });

    
    const newQty = row.book_quantity - 1;
    db.run(`UPDATE books SET book_quantity=? WHERE book_id=?`, [newQty, id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ status: 'ok', book: row.book_title, remaining: newQty });
    });
  });
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Catalog service running at http://localhost:${PORT}`));
