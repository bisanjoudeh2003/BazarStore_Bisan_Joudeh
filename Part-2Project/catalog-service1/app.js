const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());

const REPLICA_NAME = 'catalog-1';

const DB_FILE = path.join(__dirname, 'catalog1.db');

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('Error opening database:', err.message);
  else console.log('Connected to catalog1.db');
});


// --- Search books by topic ---
app.get('/search/:topic', (req, res) => {
  const topic = req.params.topic.toLowerCase();
  const sql = `SELECT book_id, book_title FROM books WHERE LOWER(book_topic)=?`;

  db.all(sql, [topic], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({
      replica: REPLICA_NAME,
      data: rows
    });
  });
});

// --- Get book info ---
app.get('/info/:id', (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM books WHERE book_id=?`;

  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Book not found' });

    res.json({
      replica: REPLICA_NAME,
      data: row
    });
  });
});

app.post('/purchase/:id', (req, res) => {
  const id = req.params.id;
  const quantity = parseInt(req.body.quantity) || 1;

  db.get(`SELECT book_quantity, book_title FROM books WHERE book_id=?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Book not found' });
    if (row.book_quantity < quantity)
      return res.status(400).json({ error: 'Not enough stock' });

    const newQty = row.book_quantity - quantity;

 
    axios.post('http://localhost:5003/replica-sync/' + id, {
      newQuantity: newQty
    }).catch(err => console.error('Replica sync error:', err.message));


    db.run(
      `UPDATE books SET book_quantity=? WHERE book_id=?`,
      [newQty, id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        res.json({
          replica: REPLICA_NAME,
          status: 'ok',
          book: row.book_title,
          remaining: newQty
        });
      }
    );
  });
});


app.post('/replica-sync/:id', (req, res) => {
  const { newQuantity } = req.body;

  db.run(
    `UPDATE books SET book_quantity=? WHERE book_id=?`,
    [newQuantity, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        replica: REPLICA_NAME,
        status: 'replica updated'
      });
    }
  );
});

const PORT = 5001;
app.listen(PORT, () =>
  console.log(`Catalog Service 1 running at http://localhost:${PORT}`)
);
