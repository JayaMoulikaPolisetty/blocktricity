
const { createHash } = require('crypto')
const { CryptoFactory, createContext } = require('sawtooth-sdk/signing')
const protobuf = require('sawtooth-sdk/protobuf')
const fs = require('fs')
const fetch = require('node-fetch');
const { Secp256k1PrivateKey } = require('sawtooth-sdk/signing/secp256k1')
const cbor = require('cbor');

const env = require('./../../contract/env');

function hash(v) {
    return createHash('sha512').update(v).digest('hex');
}

class SimpleWalletClient {
    constructor(userid) {
        const privateKeyStrBuf = this.getUserPriKey(userid);
        const privateKeyStr = privateKeyStrBuf.toString().trim();
        const context = createContext('secp256k1');
        const privateKey = Secp256k1PrivateKey.fromHex(privateKeyStr);
        this.signer = new CryptoFactory(context).newSigner(privateKey);
        this.publicKey = this.signer.getPublicKey().asHex();
        this.address = env.family.prefix;
        console.log("Storing at: " + this.address);
    }

    submit(payload) {
        this._wrap_and_send(payload)
    }

    getUserPriKey(userid) {
        console.log(userid);
        console.log("Current working directory is: " + process.cwd());
        var userprivkeyfile = '/root/.sawtooth/keys/' + userid + '.priv';
        return fs.readFileSync(userprivkeyfile);
    }

    getUserPubKey(userid) {
        console.log(userid);
        console.log("Current working directory is: " + process.cwd());
        var userpubkeyfile = '/root/.sawtooth/keys/' + userid + '.pub';
        return fs.readFileSync(userpubkeyfile);
    }

    _wrap_and_send(payload) {
        const address = this.address;
        console.log("wrapping for: " + env.familyAddress);
        var inputAddressList = env.familyAddress;
        var outputAddressList = env.familyAddress;
        const payloadBytes = Buffer.from(new String(JSON.stringify(payload)));
        const transactionHeaderBytes = protobuf.TransactionHeader.encode({
            familyName: env.family.name,
            familyVersion: env.family.version,
            inputs: inputAddressList,
            outputs: outputAddressList,
            signerPublicKey: this.signer.getPublicKey().asHex(),
            nonce: "" + Math.random(),
            batcherPublicKey: this.signer.getPublicKey().asHex(),
            dependencies: [],
            payloadSha512: hash(payloadBytes),
        }).finish();
        const transaction = protobuf.Transaction.create({
            header: transactionHeaderBytes,
            headerSignature: this.signer.sign(transactionHeaderBytes),
            payload: payloadBytes
        });
        const transactions = [transaction];
        const batchHeaderBytes = protobuf.BatchHeader.encode({
            signerPublicKey: this.signer.getPublicKey().asHex(),
            transactionIds: transactions.map((txn) => txn.headerSignature),
        }).finish();
        const batchSignature = this.signer.sign(batchHeaderBytes);
        const batch = protobuf.Batch.create({
            header: batchHeaderBytes,
            headerSignature: batchSignature,
            transactions: transactions,
        });
        const batchListBytes = protobuf.BatchList.encode({
            batches: [batch]
        }).finish();
        this._send_to_rest_api(batchListBytes);
    }

    _send_to_rest_api(batchListBytes) {
        if (batchListBytes == null) {
            var geturl = 'http://rest-api:8008/state/' + this.address
            console.log("Getting from: " + geturl);
            return fetch(geturl, {
                method: 'GET',
            })
                .then((response) => response.json())
                .then((responseJson) => {
                    var data = responseJson.data;
                    var amount = new Buffer(data, 'base64').toString();
                    return amount;
                })
                .catch((error) => {
                    console.error(error);
                });
        }
        else {
            fetch('http://rest-api:8008/batches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: batchListBytes
            })
                .then((response) => response.json())
                .then((responseJson) => {
                    console.log(responseJson);
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    }
}
module.exports.SimpleWalletClient = SimpleWalletClient;
