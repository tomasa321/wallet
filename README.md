## What is needed for project testing:

* bitcoind (tested with v0.18.1)
* Node.js (tested with v12.10.0)
* NPM (tested with 6.10.3)
* Postman

Project developed and tested on Windows 10 machine.

## How to test:

* Install bitcoind and add config file from "test-configs" folder named "bitcoin.conf".
* Install Postman and import collection file from "test-configs" folder named "Local-Wallet.postman_collection.json".
* Run Command Promt in project root directory.
* Install npm dependencies running command ```npm install```.
* To start project run command ```node app```.
* To get new bitcoin address make request "New address" from Postman collection.
* Make a transaction to received address. "New transaction found!" notification should apear in Command Promt window. Once the transaction is confirmed "Transaction is confirmed!" notification will be shown.
* To make a transaction with fixed fee (total transaction cost in bitcoins) go to request called "Tx send with fixed fee" and in the body change object property ```fromAddress``` value to your received bitcoin address in the first request. Fixed fee can be changed in "config.js" file.
* To make a transaction with fee defined in satoshies per byte (total transaction cost will be calculated according to its size in bytes) go to request called "Tx send with fee satoshi per byte" and in the body change object property ```fromAddress``` value to your received bitcoin address in the first request.