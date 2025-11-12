const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());

const DB_FILE = path.join(__dirname, "orders.db");

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error("Error opening database:", err.message);
  else console.log("Connected to orders.db");
});




app.post("/orders/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  const quantity = parseInt(req.body.quantity) || 1;

  try {
    const info = await axios.get(`http://catalog:5001/info/${bookId}`);
    const book = info.data;

    if (!book) return res.status(404).json({ error: "Book not found" });
    if (book.book_quantity < quantity)
      return res.status(400).json({ error: "Not enough stock" });

    
    for (let i = 0; i < quantity; i++) {
      await axios.post(`http://catalog:5001/purchase/${bookId}`);
    }

    
    const sql = `
      INSERT INTO orders (book_title, book_price, book_quantity)
      VALUES (?, ?, ?)
    `;
    db.run(sql, [book.book_title, book.book_price, quantity], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        status: "success",
        order_id: this.lastID,
        message: `Ordered ${quantity} of "${book.book_title}"`
      });
    });

  } catch (err) {
    if (err.response && err.response.status === 404)
      return res.status(404).json({ error: "Book not found" });
    if (err.response && err.response.status === 400)
      return res.status(400).json({ error: "Out of stock" });
    console.error(err.message);
    res.status(500).json({ error: "Internal error" });
  }
});


app.get("/orders/list", (req, res) => {
  const sql = `SELECT * FROM orders ORDER BY order_id`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

const PORT = 5002;
app.listen(PORT, () => console.log(` Order service running at http://localhost:${PORT}`));
