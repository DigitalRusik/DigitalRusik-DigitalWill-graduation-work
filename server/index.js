const express = require('express');
const cors = require('cors');
const app = express();

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

require('dotenv').config();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});