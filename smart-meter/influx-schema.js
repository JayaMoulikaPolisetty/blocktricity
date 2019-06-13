const Influx = require('influx');

const influx = new Influx.InfluxDB({
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

module.exports = {
    influx
}