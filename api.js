let express = require('express'),
    router = express.Router(),
    monk = require('monk'),
    mongo = require('mongodb'),
    bodyParser = require('body-parser'),
    crypto = require('crypto');

const db = monk('localhost:27017/gorilladb');

const restrictedPaths = {
    GET: ['orders'],
    POST: [],
    PUT: ['users'],
    DELETE: ['session']
};
const phoneRegExp = /^(?:\+?38)?0\d{9}$/;

router.use(bodyParser.json());

router.use((req, res, next) => {
    res.set('Content-Type', 'application/json');
    next();
})

/*check version*/
router.use('/:version', (req, res, next) => {
    if (req.params.version !== 'v1') {
        res.status(400);
        res.json({"error": "Unsupported API version, please check the documentation"});
        res.end();
    }
    else {
        next();
    }
});

router.use('/:version/:path', (req, res, next) => {
    if (restrictedPaths[req.method].includes(req.params.path) && !req.session.user) {
        res.sendStatus(403);
    }
    else {
        next();
    }
})

function mongify(object, properties) {
    let mongified = object;
    for (let i = 0, pl = properties.length; i < pl; i++) {
        if (object.hasOwnProperty(properties[i])) {
            mongified[properties[i]] = monk.id(object[properties[i]]);
        }
    }
    return mongified;
}

function calcHash (password, salt, type = 'sha256') {
    const hash = crypto.createHash(type);
    hash.update(password)
        .update(salt);
    return hash.digest('hex');
}

function genSalt(length = 6) {
    return Math.random().toString(36).substr(2, length);
}

/*get storetypes*/
router.get('/:version/storetypes', (req, res) => {
    db.get('stores').find(mongify(req.query, ['cityId'])).then((stores) => {
        let typeIds = Array.from(new Set(stores.map(store => store.typeId)))  //array of unique types existing for this city
        db.get('storetypes').find({_id: {$in: typeIds}}).then((storetypes) => {
            res.json({storetypes: storetypes});
            res.end();
        });
    });
})

/*get stores/ stores by city/id*/
router.get('/:version/stores', (req, res) => {
    db.get('stores').find(mongify(req.query, ['_id', 'cityId', 'typeId'])).then(stores => {
        res.json({stores: stores});
        res.end();
    });
})

/*get items by store*/
router.get('/:version/items', (req, res) => {
    db.get('items').find(mongify(req.query, ['storeId'])).then((items) => {
        res.json({items: items});
        res.end();
    });
})

/*get cities*/
router.get('/:version/cities', (req, res) => {
    db.get('cities').find(mongify(req.query, ['cityId'])).then((cities) => {
        res.json({cities: cities});
        res.end();
    });
})

/*get orders of user*/
router.get('/:version/orders', (req, res) => {
    db.get('orders').find({'customerInfo.userId': monk.id(req.session.user.id)}, {sort: {'createdAt': -1}}).then((orders) => {
        res.json({orders: orders});
        res.end();
    })
})

/*add new order*/
router.post('/:version/orders', (req, res) => {
    let order = req.body;
    if (    order.sum <= 0 || 
            order.customerInfo.name === '' || 
            order.customerInfo.street === '' || 
            order.customerInfo.house === '' || 
            !phoneRegExp.test(order.customerInfo.phone_number)) {
        return res.sendStatus(400);
    }
    if (req.session.user) {
        order.customerInfo.userId = monk.id(req.session.user.id);
    }
    order.createdAt = new Date();
    order.status = 'processing';
    db.get('orders').insert(order);
    res.end();
})

/**/
router.get('/:version/users', (req,res) => {
    db.get('users').findOne({_id: monk.id(req.session.user.id)}).then((user) => {
        res.json(user);
        res.end();
    })
})

/*register new user*/
router.post('/:version/users', (req, res) => {
    let user = req.body;
    let errorResponse = {
        fields: [],
        reason: ''
    };
    for (var property in user) {
        if (user.hasOwnProperty(property)) {
            if (property != 'phoneNumber'  && user.property === '') {
                errorResponse.fields.push(property)
            }
            else if (property == 'phoneNumber' && !phoneRegExp.test(user.phoneNumber)) {
                errorResponse.fields.push(property);
            }
        }
    }
    if (errorResponse.fields.length !== 0) {
        res.status(400);
        errorResponse.reason = 'invalidData';
        res.json(errorResponse);
        res.end();
    }
    
    user = mongify(user, ['cityId']);
    db.get('roles').findOne({name: 'User'}).then(role => {
        user.salt = genSalt();
        user.password = calcHash(user.password, user.salt);
        user.roleId = role._id;
        db.get('users').insert(user).then(() => {            
            req.session.user = user;
            res.end();
        }, err => {
            res.status(400);
            if (err.code == 11000 || err.code == 11001) {
                let regex = /index\:\ (?:.*\.)?\$?(?:([_a-z0-9]*)(?:_\d*)|([_a-z0-9]*))\s*dup key/i;
                let match =  err.message.match(regex);
                let indexName = match[1] || match[2];
                errorResponse.fields.push(indexName);
                errorResponse.reason = 'duplicate';
                res.json(errorResponse);
            }
            res.end();
        })      
    })
})

/*update user*/
router.put('/:version/users', (req,res) => {
    db.get('users').update({_id: monk.id(req.session.user.id)}, {$set: req.body}).then(() => {
        res.sendStatus(200);
    }, (err) => {
        res.sendStatus(400);
    });
})

/*login user*/
router.post('/:version/session', (req, res) => {
    db.get('users').findOne({ email: req.body.email }).then((user) => {
        if (user != null) {
            if (calcHash(req.body.password, user.salt) == user.password) {
                req.body.id = user._id;
                req.session.user = req.body;
                res.sendStatus(200);
            }
            else {
                res.sendStatus(400);
            }
        }
        else {
            res.sendStatus(400);
        }
    })
})

/*logout*/
router.delete('/:version/session', (req,res) => {
    if(req.session) {
        req.session.destroy(err => {
            if (err) {
                res.sendStatus(401);
            }
            res.end();
        })
    }
    else {
        res.sendStatus(400);
    }
})

/*get session status*/
router.get('/:version/session/status', (req, res) => {
    res.json({authorized: (req.session.user != undefined)});
    res.end();
})

module.exports = router;