let express = require('express');
let session = require('express-session');

let port = 80;
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





/*app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    if ('OPTIONS' === req.method) {
        res.status(204).send();
    }
    else {
        next();
    }
});*/
/*app.use(function (req, res, next) {
    req.db = db;
    next();
});*/