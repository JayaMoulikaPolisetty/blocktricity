const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let TrackEnergyModelSchema = new Schema({
    meter_id: {
        type: String,
        unique:true
    },
    consumption: [{
        timestamp: {
            type: String
        },
        reading: {
            type: Number
        }
    }],
    production: [{
        timestamp: {
            type: String
        },
        reading: {
            type: Number
        }
    }]

});

module.exports = { TrackEnergyModelSchema };
