Start the application by running 

`docker-compose build`
and then 
`docker-compose up`

once it's running start number of simulators required
`cd smart-meter && node simulator.js`

# Register Meter To Blockchain
`http://localhost:3000/transaction/submit`
`
{
	"Action": "registerMeter",
	"Data": {
		"meterId":"10",
		"userId":"JohnS"
	}
}
`
# Track Energy to Meter in Blockchain
`
{
	"Action": "trackEnergy",
	"Data": {
		"meterId":"1",
		"consume": { 
			"timestamp": "1234567",
			"reading": ".0013"
		},
        "produce": { 
			"timestamp": "1234567",
			"reading": ".0013"
		}
	}
}
`

`
Start Consumption and Record in Blockchain which call trackEnergy call
`http://localhost:4000/start/consume/10`
Modify the Frequency of simulator in seconds
`http://localhost:4000/frequency/1`



# Smart meter blockchain data viewer using explorer
`cd sawtooth-explorer`
`docker-compose up`
