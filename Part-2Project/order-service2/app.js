const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(express.json());

const DB_FILE = path.join(__dirname, "orders2.db");

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error("Error opening database:", err.message);
  else console.log("Connected to orders.db");
});


app.post("/orders/:bookId", (req, res) => {
  return res.status(403).json({ error: "Purchases should go through main replica" });
});


app.post('/order-replica-sync', (req, res) => {
  const { orderData } = req.body;
  const sql = `INSERT INTO orders (book_title, book_price, book_quantity) VALUES (?, ?, ?)`;
  db.run(sql, [orderData.book_title, orderData.book_price, orderData.quantity], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'replica updated' });
  });
});

app.get("/orders/list", (req, res) => {
  const sql = `SELECT * FROM orders ORDER BY order_id`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = 5004;
app.listen(PORT, () => console.log(`Order replica running at http://localhost:${PORT}`));
