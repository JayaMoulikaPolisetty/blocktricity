const express = require("express");
const bodyParser = require("body-parser");
// const open = require("amqplib").connect(
//   "amqp://block:block@13.127.136.185/blocktricity"
// );
const amqp = require("amqplib");
const open = amqp.connect({ protocol: 'amqp', hostname: '54.193.110.125', port: 5672, username: 'admin', password: 'pass', vhost: '/' });
const METER_CONSUME = "METER_CONSUME";
const METER_PRODUCE = "METER_PRODUCE";

const app = express();
app.use(bodyParser.json());

const range = {
  C0: [0.0, 0.0],
  C1: [0.001, 0.002],
  C2: [0.002, 0.003],
  C3: [0.003, 0.004],
  P0: [0.0, 0.0],
  P1: [0.001, 0.002],
  P2: [0.002, 0.003],
  P3: [0.003, 0.004]
};

const velocity = {
  consumptionVelocity: range.C2,
  productionVelocity: range.P2
};
let frequency = 15000;

let inactiveMeters = [];
let ch;
open
  .then(function(conn) {
    return conn.createChannel();
  })
  .then(function(_ch) {
    ch = _ch;
    ch.purgeQueue(METER_CONSUME).then(() => {});
    ch.purgeQueue(METER_PRODUCE).then(() => {});
  })
  .catch(console.warn);

let meterOrderMap = {};

const start = (meterId, orderData, q) => {
  if (!inactiveMeters.indexOf(meterId) > -1)
    ch.assertQueue(q).then(function(ok) {
      ch.sendToQueue(q, Buffer.from(JSON.stringify({ meterId, orderData, velocity })));
    });
};

app.post("/start/consume/:meterId", async (req, res) => {
  const { meterId } = req.params;
  let orderData;
  //setTimeout(function () {}, 5000);
  //orderData = await JSON.stringify(req.body);
  orderData = req.body;
  if(!meterOrderMap[meterId]) {
    meterOrderMap[meterId] = orderData;
  }
  //console.log('OrderDataConsume:' + orderData);
  res.end();
  console.debug(`${meterId}`)
  setTimeout(() => {
    start(meterId, meterOrderMap[meterId], METER_CONSUME);
    //start(meterId, meterOrderMap[meterId]|| { "sourceOfEnergy": "solar", "pricePerUnit": 0.27, "pincode": 10115, "consumer_meter_id": "1048221", "prosumer_meter_id": "1039666" } || { "sourceOfEnergy": "solar", "pricePerUnit": 0.24, "pincode": 10115, "consumer_meter_id": "105732", "prosumer_meter_id": "1448973" } || { "sourceOfEnergy": "solar", "pricePerUnit": 0.26, "pincode": 10115, "consumer_meter_id": "1058497", "prosumer_meter_id": "144989" }, METER_PRODUCE);
  }, frequency);
});

app.post("/start/produce/:meterId", async (req, res) => {
  const { meterId } = req.params;
  let orderData;
  setTimeout(function () {}, 5000);
  //orderData = await JSON.stringify(req.body);
  orderData = req.body;
  if(!meterOrderMap[meterId]) {
    meterOrderMap[meterId] = orderData;
  }
  //console.log('OrderDataProduce:' + orderData);
  res.end();
  setTimeout(() => {
    start(meterId, meterOrderMap[meterId], METER_PRODUCE);
    //start(meterId, meterOrderMap[meterId]|| { "sourceOfEnergy": "solar", "pricePerUnit": 0.27, "pincode": 10115, "consumer_meter_id": "1034707", "prosumer_meter_id": "1038353" } || { "sourceOfEnergy": "solar", "pricePerUnit": 0.24, "pincode": 10115, "consumer_meter_id": "1039666", "prosumer_meter_id": "105732" } || { "sourceOfEnergy": "solar", "pricePerUnit": 0.26, "pincode": 10115, "consumer_meter_id": "144989", "prosumer_meter_id": "1058497" }, METER_PRODUCE);
  }, frequency);
});

app.put("/resume/:meterId", (req, res) => {
  const { meterId } = req.params;
  inactiveMeters = inactiveMeters.filter(_meterId => meterId !== _meterId);
  res.json(inactiveMeters).end();
});

app.put("/pause/:meterId", (req, res) => {
  const { meterId } = req.params;
  inactiveMeters.push(meterId);
  res.json(inactiveMeters).end();
});

app.put("/velocity", (req, res) => {
  const { productionVelocity, consumptionVelocity } = req.body;
  if (productionVelocity || consumptionVelocity) {
    if (consumptionVelocity && range[`C${consumptionVelocity}`]) {
      velocity.consumptionVelocity = range[`C${consumptionVelocity}`];
    }
    if (productionVelocity && range[`P${productionVelocity}`]) {
      velocity.productionVelocity = range[`P${productionVelocity}`];
    }
    res.json(velocity).end();
  } else {
    res.status(400).end();
  }
});

app.put("/frequency/:seconds", (req, res) => {
  const { seconds } = req.params;
  if (seconds >= 1) {
    frequency = seconds * 1000;
  }
  res.end();
});

app.listen(4000, "0.0.0.0", () => {
  console.log("started simulator API on 4000");
});
