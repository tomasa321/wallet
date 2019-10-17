const express = require('express');

const app = express();
const Client = require('bitcoin-core');
const config = require('./config.js');

const client = new Client({
  host: config.wallet.host,
  port: config.wallet.port,
  username: config.wallet.user,
  password: config.wallet.pass,
});

function handleError(err, res) {
  if (err.code === 'ECONNREFUSED') {
    console.log(err);
    res.status(400).json({ message: 'Bitcoin node is not running.' });
  } else {
    console.log(err);
    res.sendStatus(400);
  }
}

function getNewAddress() {
  return client.getNewAddress();
}
function getTransaction(txId) {
  return client.getTransaction(txId);
}
app.get('/', async (req, res) => {
  try {
    const address = await getNewAddress();
    res.json({ address });
  } catch (err) {
    handleError(err, res);
  }
});

app.get('/tx', (req, res) => {
  const txId = req.query.txid;
  let txData = {};
  getTransaction(txId).then((receivedTxData) => {
    txData = receivedTxData;
    console.log(`TxId: ${txData.txid}`);
    if (txData.confirmations > 0) {
      console.log('Transaction is confirmed!');
    } else {
      console.log('New transaction received!');
    }
    res.sendStatus(200);
  }).catch((err) => {
    handleError(err, res);
  });
});

app.listen(3000);
console.log('Listening on port:', 3000);
