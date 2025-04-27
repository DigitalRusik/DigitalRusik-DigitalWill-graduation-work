const express = require('express');
const cors = require('cors');
const app = express();

require('dotenv').config();

app.use(cors());
app.use(express.json());

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const containersRouter = require('./routes/containers');
app.use('/api/containers', containersRouter);
const willsRoutes = require('./routes/wills');
app.use('/api/wills', willsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});