const {
    TransactionProcessor
} = require('sawtooth-sdk/processor');
const env = require('./env');
const Handler = require('./handler');

//Register TP 
const transactionProcessor = new TransactionProcessor(env.validatorUrl);
//Add Transaction Processor Handler to TP
transactionProcessor.addHandler(new Handler());
//Start Transaction Processor
transactionProcessor.start();

//Handle Stop Process
process.on('SIGUSR2', () => {
    //Unregister the TP 
    transactionProcessor._handleShutdown();
})