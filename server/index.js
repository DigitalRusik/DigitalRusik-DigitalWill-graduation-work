
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

const wills = [];

app.post('/api/wills', async (req, res) => {
  const { owner, recipient, dataHash, unlockTime } = req.body;
  const newWill = {owner, recipient, dataHash, unlockTime};
  wills.push(newWill);
  console.log('Создано завещание:', newWill);
  res.json({ status: 'ok' });
});

app.get('/api/wills', (req, res) => {
  res.json(wills);
});

app.listen(PORT, () => console.log(`Backend запущен на http://localhost:${PORT}`));
