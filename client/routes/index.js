const router = require('express').Router();
var { SimpleWalletClient } = require('./SawtoothWalletClient')

const userId = process.env.CLIENT_USER || 'john';
const simpleWalletClient = new SimpleWalletClient(userId);
router.post('/submit', (req, res) => {
    simpleWalletClient.submit(req.body);
    res.end();
})

module.exports = router;