import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());


const cache = {};
const CACHE_LIMIT = 50;
const cacheKeys = [];

function addToCache(key, value) {
  if (!cache[key]) {
    cacheKeys.push(key);
    if (cacheKeys.length > CACHE_LIMIT) {
      const oldestKey = cacheKeys.shift();
      delete cache[oldestKey];
    }
  }
  cache[key] = value;
}



// Catalog replicas
const catalogReplicas = [
  'http://localhost:5001',
  'http://localhost:5003',
];
let nextCatalogReplicaIndex = 0;

function getNextCatalogReplica() {
  const replica = catalogReplicas[nextCatalogReplicaIndex];
  nextCatalogReplicaIndex =
    (nextCatalogReplicaIndex + 1) % catalogReplicas.length;
  return replica;
}


const orderReplicas = [
  'http://localhost:5002',
  'http://localhost:5004',
];
let nextOrderReplicaIndex = 0;

function getNextOrderReplica() {
  const replica = orderReplicas[nextOrderReplicaIndex];
  nextOrderReplicaIndex =
    (nextOrderReplicaIndex + 1) % orderReplicas.length;
  return replica;
}


app.get('/search/:topic', async (req, res) => {
  const topic = req.params.topic.toLowerCase();
  const start = Date.now();

  if (cache[`search_${topic}`]) {
    console.log(`[Cache HIT] search_${topic}`);
    return res.json({
      cache: 'HIT',
      replica: 'cache',
      responseTime: Date.now() - start,
      data: cache[`search_${topic}`],
    });
  }

  console.log(`[Cache MISS] search_${topic}`);

  try {
    const replica = getNextCatalogReplica();
    const response = await axios.get(`${replica}/search/${topic}`);
    addToCache(`search_${topic}`, response.data);

    console.log(`[Catalog] Response from ${replica}`);

    res.json({
      cache: 'MISS',
      replica,
      responseTime: Date.now() - start,
      data: response.data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error searching books' });
  }
});


app.get('/info/:id', async (req, res) => {
  const id = req.params.id;
  const start = Date.now();

  if (cache[id]) {
    console.log(`[Cache HIT] book ${id}`);
    return res.json({
      cache: 'HIT',
      replica: 'cache',
      responseTime: Date.now() - start,
      data: cache[id],
    });
  }

  console.log(`[Cache MISS] book ${id}`);

  try {
    const replica = getNextCatalogReplica();
    const response = await axios.get(`${replica}/info/${id}`);
    addToCache(id, response.data);

    console.log(`[Catalog] Response from ${replica}`);

    res.json({
      cache: 'MISS',
      replica,
      responseTime: Date.now() - start,
      data: response.data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching book info' });
  }
});


app.post('/purchase/:id', async (req, res) => {
  const id = req.params.id;
  const quantity = parseInt(req.body.quantity) || 1;
  const start = Date.now();

  try {
   
    const orderReplica = orderReplicas[0];

    const response = await axios.post(
      `${orderReplica}/orders/${id}`,
      { quantity }
    );

    console.log(`[Order] Purchase handled by ${orderReplica}`);


    if (cache[id]) {
      delete cache[id];
      console.log(`[Cache Invalidated] Book ID ${id}`);
    }

 
    Object.keys(cache).forEach(key => {
      if (key.startsWith('search_')) {
        delete cache[key];
      }
    });
    console.log('[Cache Invalidated] Search cache cleared');

    res.json({
      type: 'purchase',
      replica: orderReplica,
      responseTime: Date.now() - start,
      data: response.data,
    });

  } catch (err) {
    if (err.response)
      return res.status(err.response.status).json(err.response.data);
    res.status(500).json({ error: 'Purchase failed' });
  }
});


app.get('/orders/list', async (req, res) => {
  const start = Date.now();

  try {
    const replica = getNextOrderReplica();
    const response = await axios.get(`${replica}/orders/list`);

    console.log(`[Order] List fetched from ${replica}`);

    res.json({
      replica,
      responseTime: Date.now() - start,
      data: response.data,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching orders' });
  }
});


const PORT = 4000;
app.listen(PORT, () =>
  console.log(`Front-End Server running at http://localhost:${PORT}`)
);
