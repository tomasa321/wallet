const express = require('express');

const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const Client = require('bitcoin-core');
const config = require('./config.js');

const client = new Client({
  host: config.wallet.host,
  port: config.wallet.port,
  username: config.wallet.user,
  password: config.wallet.pass,
});

function handleError(err, res) {
  if (err && err.code === 'ECONNREFUSED') {
    console.log(err);
    res.status(400).json({ message: 'Bitcoin node is not running.' });
  } else {
    console.log(err);
    res.sendStatus(400);
  }
}

app.get('/', async (req, res) => {
  try {
    const address = await client.getNewAddress();
    res.json({ address });
  } catch (err) {
    handleError(err, res);
  }
});

app.get('/tx', (req, res) => {
  const txId = req.query.txid;
  client.getTransaction(txId).then((txData) => {
    console.log(`TxId: ${txData.txid}`);
    if (txData.confirmations > 0) {
      console.log('Transaction is confirmed!');
    } else {
      console.log('New transaction found!');
    }
    res.sendStatus(200);
  }).catch((err) => {
    handleError(err, res);
  });
});

function collectInputs(inputsArray, target) {
  return new Promise((resolve, reject) => {
    const result = [];
    const formatedInputs = [];
    let sum = 0;
    for (let i = 0; i < inputsArray.length; i += 1) {
      if (sum < target) {
        result.push(inputsArray[i]);
        formatedInputs.push({ txid: inputsArray[i].txid, vout: inputsArray[i].vout });
        sum += inputsArray[i].amount;
      }
    }
    if (sum >= target) {
      resolve({ result, formatedInputs, sum: sum.toFixed(8) });
    } else {
      reject({ message: 'Not enouth funds.' });
    }
  });
}

app.post('/send', async (req, res) => {
  const { fromAddress, amount, toAddress } = req.body;
  try {
    const unspentTxs = await client.listUnspent(0, 999999999, [fromAddress]);
    const inputsToSend = await collectInputs(unspentTxs, amount + config.fixedFee);
    const outputsArray = [];
    const destination = {};
    destination[toAddress] = (amount).toFixed(8);
    outputsArray.push(destination);
    if (amount + config.fixedFee < Number(inputsToSend.sum)) {
      const change = {};
      change[fromAddress] = (Number(inputsToSend.sum) - amount - config.fixedFee).toFixed(8);
      outputsArray.push(change);
    }
    const rawTx = await client.createRawTransaction(inputsToSend.formatedInputs, outputsArray);
    const signedTx = await client.signRawTransactionWithWallet(rawTx);
    if (signedTx.hex) {
      const txId = await client.sendRawTransaction(signedTx.hex);
      res.json({ txId });
    } else {
      handleError({ message: 'Something went wrong.' }, res);
    }
  } catch (err) {
    handleError(err, res);
  }
});

async function getRawTransaction(fromAddress, amount, toAddress, fee) {
  try {
    const unspentTxs = await client.listUnspent(0, 999999999, [fromAddress]);
    const inputsToSend = await collectInputs(unspentTxs, amount + config.fixedFee);
    const outputsArray = [];
    const destination = {};
    destination[toAddress] = (amount).toFixed(8);
    outputsArray.push(destination);
    if (amount + config.fixedFee < Number(inputsToSend.sum)) {
      const change = {};
      change[fromAddress] = (Number(inputsToSend.sum) - amount - fee).toFixed(8);
      outputsArray.push(change);
    }
    const rawTx = await client.createRawTransaction(inputsToSend.formatedInputs, outputsArray);
    return await client.signRawTransactionWithWallet(rawTx);
  } catch (err) {
    return Promise.reject(err);
  }
}

app.post('/sendwithfee', async (req, res) => {
  const {
    fromAddress, amount, toAddress, feeSatoshiPerByte,
  } = req.body;
  try {
    let signedTx = await getRawTransaction(fromAddress, amount, toAddress, config.fixedFee);
    if (signedTx && signedTx.hex) {
      const estimatedFee = ((signedTx.hex.length / 2) * feeSatoshiPerByte) / 100000000;
      signedTx = await getRawTransaction(fromAddress, amount, toAddress, estimatedFee);
      if (signedTx && signedTx.hex) {
        const txId = await client.sendRawTransaction(signedTx.hex);
        res.json({ txId });
      } else {
        handleError({ message: 'Something went wrong.' }, res);
      }
    } else {
      handleError({ message: 'Something went wrong.' }, res);
    }
  } catch (err) {
    handleError(err, res);
  }
});

app.listen(config.port);
console.log('Listening on port:', config.port);
