const app = require('express')();
const env = require('./env');
const routes = require('./routes');
const cors = require('cors')
const morgan = require('morgan');
const parser = require('body-parser');

app.use(morgan('combined'))
app.use(parser.json());
app.use(parser.urlencoded({ extended: true }));
app.use(cors());
app.use('/transaction', routes);

//Express application will listen to port mentioned in our configuration
app.listen(env.api.port, '0.0.0.0', function (err) {
    if (err) throw err;
    console.log("App listening on port " + env.api.port);
});