
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const axios = require("axios");

const app = express();
app.use(express.json());


const DB_FILE = path.join(__dirname, "orders1.db");
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) console.error("Error opening database:", err.message);
  else console.log("Connected to orders1.db");
});


db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_title TEXT NOT NULL,
    book_price REAL NOT NULL,
    book_quantity INTEGER NOT NULL
  )
`);


app.post("/orders/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  const quantity = parseInt(req.body.quantity) || 1;

  try {
   
    const info = await axios.get(`http://localhost:5001/info/${bookId}`);
    
  
    const book = info.data.data || info.data;

    if (!book || !book.book_title) {
      return res.status(404).json({ error: "Book not found" });
    }

    if (book.book_quantity < quantity) {
      return res.status(400).json({ error: "Not enough stock" });
    }

   
    const purchaseResponse = await axios.post(`http://localhost:5001/purchase/${bookId}`, { quantity });
    const updatedBook = purchaseResponse.data;
    const remainingQty = updatedBook.remaining || updatedBook.data?.book_quantity || 0;

  
    const orderData = {
      book_title: book.book_title,
      book_price: book.book_price,
      quantity: quantity
    };

    
    const sql = `INSERT INTO orders (book_title, book_price, book_quantity) VALUES (?, ?, ?)`;
    db.run(sql, [orderData.book_title, orderData.book_price, orderData.quantity], function(err) {
      if (err) return res.status(500).json({ error: err.message });

   
      axios.post('http://localhost:5004/order-replica-sync', { orderData })
        .then(() => console.log('Order replica updated'))
        .catch(err => console.error('Error updating order replica:', err.message));

     
      res.json({
        status: "success",
        order_id: this.lastID,
        catalog: {
          ...updatedBook,
          remaining: remainingQty
        },
        message: `Ordered ${quantity} of "${book.book_title}"`
      });
    });

  } catch (err) {
    console.error(err.message);
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
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

app.post('/order-replica-sync', (req, res) => {
  const { orderData } = req.body;

  if (!orderData || !orderData.book_title || !orderData.book_price || !orderData.quantity) {
    return res.status(400).json({ error: "Incomplete order data" });
  }

  const sql = `INSERT INTO orders (book_title, book_price, book_quantity) VALUES (?, ?, ?)`;
  db.run(sql, [orderData.book_title, orderData.book_price, orderData.quantity], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'replica updated' });
  });
});


const PORT = 5002;
app.listen(PORT, () => console.log(`Order service running at http://localhost:${PORT}`));
