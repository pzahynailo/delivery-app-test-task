let express = require('express');
let session = require('express-session');

let port = 3002;
let app = express();
let favicon = require('serve-favicon');
let api = require('./api');

app.use(express.static('public'));

app.use(favicon(__dirname + '/favicon.ico'));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));
app.use('/api', api);


app.get('/', function (req, res) {
    res.sendFile('index.html');
})


app.listen(port);