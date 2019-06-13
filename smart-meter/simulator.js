const faker = require("faker");
const Influx = require('influx');
const request = require("request");
const amqp = require("amqplib");
const open = amqp.connect({ protocol: 'amqp', hostname: '54.193.110.125', port: 5672, username: 'admin', password: 'pass', vhost: '/' });

const influxConsumption = new Influx.InfluxDB({
  host: 'localhost',
  database: 'energytracking',
  schema: [
    {
      measurement: 'consumption1',
      fields: {
        meterId: Influx.FieldType.STRING,
        reading: Influx.FieldType.STRING
      },
      tags: []
    }
  ]
})

const influxProduction = new Influx.InfluxDB({
  host: 'localhost',
  database: 'energytracking',
  schema: [
    {
      measurement: 'production1',
      fields: {
        meterId: Influx.FieldType.STRING,
        reading: Influx.FieldType.STRING
      },
      tags: []
    }
  ]
})

const METER_CONSUME = "METER_CONSUME";
const METER_PRODUCE = "METER_PRODUCE";

const activeMeters = {};

const generate = tuner => {
  const reading = faker.finance.amount(tuner[0], tuner[1], 4);
  const timestamp = new Date().getTime();
  return { reading, timestamp };
};

let calculateConsumptionReading = async (meterId, cb) => {
  //console.log(newTime);
  //console.log(oldTime);
  return await influxConsumption.query(`
  select * from consumption1 where meterId=\'${meterId}\' order by time desc LIMIT 1`).then(result => {
      //console.log(parseFloat(result[result.length-1].reading)-parseFloat(result[0].reading));
      let calculation = 0;
      if (result)
        calculation = result[0].reading;
      //console.error(`calculation ${calculation}`);
      return calculation;
    })
    .catch(err => {
      return 0;
    })
}

let calculateProductionReading = async (meterId, cb) => {
  //console.log(newTime);
  //console.log(oldTime);
  return await influxProduction.query(`
  select * from consumption1 where meterId=\'${meterId}\' order by time desc LIMIT 1`).then(result => {
      //console.log(parseFloat(result[result.length-1].reading)-parseFloat(result[0].reading));
      let calculation = 0;
      if (result)
        calculation = result[0].reading;
      //console.error(`calculation ${calculation}`);
      return calculation;
    })
    .catch(err => {
      return 0;
    })
}

const store = async (meterId, tuner, orderData, type = "consume") => {
  const { reading, timestamp } = generate(tuner);
  activeMeters[meterId][type].push(generate(tuner));
  if( type === "consume") {
    console.debug('Storing')
    request.post(`http://localhost:3000/transaction/submit`, {
      form: { Action: 'trackEnergy', Data: { meterId, [type]: { reading, timestamp }, orderData } }
    }, (err, res, body) => {
      console.log(`${meterId}-${type}-Order:${reading} ${timestamp}`)
    });
    let prevReading = await calculateConsumptionReading(meterId);
    let totalReading = parseFloat(prevReading) + parseFloat(reading);
  
    influxConsumption.writePoints([
      {
        measurement: 'consumption1',
        fields: { meterId: meterId, reading: `${totalReading}` }
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  }
  else {
    console.debug('Storing')
    request.post(`http://localhost:3000/transaction/submit`, {
      form: { Action: 'trackEnergy', Data: { meterId, [type]: { reading, timestamp }, orderData } }
    }, (err, res, body) => {
      console.log(`${meterId}-${type}-${orderData}-Order:${orderData} ${timestamp}`)
    });
    let prevReading = await calculateProductionReading(meterId);
    let totalReading = parseFloat(prevReading) + parseFloat(reading);
  
    influxProduction.writePoints([
      {
        measurement: 'production1',
        fields: { meterId: meterId, reading: `${totalReading}` }
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`)
    })
  }
};

const observeQueue = (ch, q) => {
  ch.assertQueue(q).then(function (ok) {
    return ch.consume(
      q,
      function (msg) {
        if (msg !== null) {
          const data = JSON.parse(msg.content.toString());
          const { meterId, orderData, velocity } = data;
          if (!activeMeters[meterId]) {
            activeMeters[meterId] = {
              consume: [],
              produce: [],
              orderData
            };
          }
          let type;
          if (q === METER_CONSUME) {
            type = "consume";
            store(meterId, velocity.consumptionVelocity, orderData, type);
          } else if (q === METER_PRODUCE) {
            type = "produce";
            store(meterId, velocity.productionVelocity, orderData, type);
          }
          request.post(`http://localhost:4000/start/${type}/${meterId}`);
        }
      },
      {
        noAck: true
      }
    );
  });
};

// Consumer
open
  .then(function (conn) {
    console.log("Connection Obtained");
    return conn.createChannel();
  })
  .then(ch => {
    console.log("Queue Observing Started");
    observeQueue(ch, METER_CONSUME);
    observeQueue(ch, METER_PRODUCE);
  })
  .catch(console.warn);

process.on('error', (err) => console.error(err))