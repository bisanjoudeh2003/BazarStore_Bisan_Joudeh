const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());

const REPLICA_NAME = 'catalog-2';

const DB_FILE = path.join(__dirname, 'catalog2.db');

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error('Error opening database:', err.message);
  else console.log('Connected to catalog2.db');
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
  res.status(403).json({
    error: 'Purchases allowed only on primary replica'
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

const PORT = 5003;
app.listen(PORT, () =>
  console.log(`Catalog Service 2 running at http://localhost:${PORT}`)
);
