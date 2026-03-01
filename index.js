const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./database');

const userRoutes = require('./routes/users');
const productsRouter = require('./routes/products');
const cartRoutes = require('./routes/cart');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRoutes);


// Routes
app.get('/', (req, res) => {
  res.json({ message: "Welcome to the API, " + (process.env.DB_PASSWORD != null ? ` Api Is Ready` : 'Api Is Failed') });
});

// Start the server
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});