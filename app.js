var express = require('express');
var assert = require('assert');
var bodyParser = require('body-parser');
var async = require('async')
const crypto = require('crypto')
const hash = crypto.createHash('sha256');
var monk = require('monk')
//var favicon = require('serve-favicon')

var port = 3001;
var app = express()
var mongo = require('mongodb')
const db = monk('localhost:27017/gorilladb')


// Connection URL
var url = 'mongodb://localhost:27017/gorilladb';
app.use(express.static('public'))
app.use(bodyParser.json())
//app.use(favicon(__dirname + '/favicon.ico'))
app.get('/', function (req, res) {
    res.sendFile('index.html')
})
// Use connect method to connect to the server

/*var findDocuments = function (db, collection, constraints, callback) {
    db.collection(collection).find(constraints).toArray((err, storetypesArray) => {
        callback(err, storetypesArray)
    })

}*/
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST");
    if ('OPTIONS' === req.method) {
        res.status(204).send();
    }
    else {
        next();
    }
});
app.use(function (req, res, next) {
    req.db = db;
    next();
});


/*check version*/
app.use('/api/:version', (req, res, next) => {
    if (req.params.version !== 'v1') {

        res.json(JSON.stringify({
            "success": false,
            "error": "Unsupported API version, please check the documentation"
        }))
        res.end()
    }
    else next();
});


/*get storetypes*/

app.get('/api/:version/storetypes', (req, res) => {
    res.set('Content-Type', 'application/json')

    const storetypes = db.get('storetypes');

    storetypes.find({}, {sort: {_id: 1}}).then((storetypesArray) => {
        if (req.query.city === undefined) {

           

            var storetypesJSON = {
                storetypes: storetypesArray
            }
            res.json(storetypesJSON)
            res.end()
        }

        else {
            var result = [];
            const stores = db.get('stores');
            async.series([ 
                function(callback) {
                    async.eachOfSeries(storetypesArray, function(item, index, innercallback) {
                        stores.find({ "cityId": monk.id(req.query.city.toString()), "typeId": item._id }).then((storesArray) => {
                            if (storesArray.length !== 0) {
                                result.push(item);

                            }

                            if (index == storetypesArray.length - 1) {
                                callback()
                            }
                            innercallback()

                        })
                    })
                }
                ,
                function (callback) {
                   

                    var storetypesJSON = {
                        storetypes: result
                    }
                    res.json(storetypesJSON)
                    res.end()
                    callback()
                }
            ]);


        }
    })
}



)
/*get stores/ stores by city/id*/
app.get('/api/:version/stores', (req, res) => {
    const stores = db.get('stores');
    res.set('Content-Type', 'application/json')
    if (req.query.city === undefined && req.query.type === undefined && req.query.id === undefined) {
        stores.find({}).then((storesArray) => {
            
            var storesJSON = {
                stores: storesArray
            }
            res.json((storesJSON))
            res.end()
        })
    }
    else if (req.query.city !== undefined && req.query.type === undefined && req.query.id === undefined) {
        stores.find({ "cityId": monk.id(req.query.city.toString()) }).then((storesArray) => {
            var storesJSON = {
                stores: storesArray
            }
            res.json((storesJSON))
            res.end()
        })
    }
    else if (req.query.city === undefined && req.query.type !== undefined){

    }
    else if (req.query.city === undefined && req.query.type === undefined && req.query.id !== undefined){
        stores.find({"_id": monk.id(req.query.id.toString())}).then((storesArray) => {
            var storesJSON = {
                stores: storesArray
            }
            res.json((storesJSON))
            res.end()
        })
    }
    else {
        stores.find({"cityId": monk.id(req.query.city.toString()), "typeId": monk.id(req.query.type.toString())}).then((storesArray) => {
            var storesJSON = {
                stores: storesArray
            }
            res.json((storesJSON))
            res.end()
        })
    }

})

/*get items by store*/
app.get('/api/:version/items', (req, res) => {
    const items = db.get('items');
    res.set('Content-Type', 'application/json')
    if (req.query.store === undefined) {
        items.find({}).then((itemsArray) => {
            var itemsJSON = {
                items: itemsArray
            }
            res.json(itemsJSON)
            res.end()
        })
    }
    else {
        items.find({ "storeId": monk.id(req.query.store.toString()) }).then((itemsArray) => {
            var itemsJSON = {
                items: itemsArray
            }
            res.json(itemsJSON)
            res.end()
        })
    }
})

/*get cities*/
app.get('/api/:version/cities', (req, res) => {
    const cities = db.get('cities');
    res.set('Content-Type', 'application/json')
    if (req.query.city === undefined) {
        cities.find({}).then((citiesArray) => {
            var citiesJSON = {
                cities: citiesArray
            }
            res.json(citiesJSON)
            res.end()
        })
    }
    else {
        cities.find({ "_id": monk.id(req.query.city.toString()) }).then((citiesArray) => {
            var citiesJSON = {
                cities: citiesArray
            }
            res.json(citiesJSON)
            res.end()
        })
    }
})

/*add new order*/
app.post('/api/:version/orders', (req, res) => {
    if (!req.body) return res.sendStatus(400)
    const orders = db.get('orders');
    let order = req.body;
    var phoneRegExp = /^(?:\+?38)?0\d{9}$/;
    
    if (order.sum <= 0 || order.customerInfo.name === '' || order.customerInfo.street === '' || order.customerInfo.house === '' || !phoneRegExp.test(order.customerInfo.phone_number)) {
        return res.sendStatus(400);
    }
    orders.insert(order)
    console.log(order.customerInfo);
    res.end();
})


/*register new user*/
app.post('/api/:version/users', (req, res) => {
    function getGeneratedSalt (length) {
        return Math.random().toString(36).substr(2, length);
    }
    if (!req.body) return res.sendStatus(400);
    const users = db.get('users');
    const roles = db.get('roles');
    let user = req.body;
    var phoneRegExp = /^(?:\+?38)?0\d{9}$/;
    if (user.regEmail === '' || user.regHouse === '' || user.RegName === '' || user.regPassword === '' || !phoneRegExp.test(user.regPhoneNumber) || user.regStreet === '') {
        return res.sendStatus(400);
    }
    var userSalt = getGeneratedSalt(6);
    hash.update(user.regPassword)
        .update(userSalt);
    roles.findOne({name: 'User'}).then(function (role) {
        var registeredUser = {
            name: user.regName,
            password: hash.digest('hex'),
            salt: userSalt,
            email: user.regEmail,
            phone: user.regPhoneNumber,
            roleId: role._id,
            cityId: monk.id(user.city)
        }
        users.insert(registeredUser);
        res.end();
    })
    
})

app.listen(port, function () {
    console.log('app listening on port ' + port)
})