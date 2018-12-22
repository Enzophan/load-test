
var request = require('request');
var async = require('async');
// var redis = require('redis');
// var redisSetting = redis.createClient(6379, "localhost");
// redisSetting.select(2);
var _ = require('lodash');
var redisConnected = false;
// redisSetting.on('error', function (err) {
//     console.log(new Date().toISOString()+ ' redisSetting connection error to - ' + err);
//     process.exit(1);
// });
// redisSetting.on('ready', function () {
//     console.log(new Date().toISOString()+ ' redisSetting connection ready');
//     redisConnected = true;
// });
//var randomLocationList = require('../nylocation');
var randomLocationList = require('./DN-location');
var urlsocket = require('./../config/configSocket');
var lengthRandomLocationList = randomLocationList.length;
var driverRoute = {}
var async = require('async');
var _ = require('underscore');
// setInterval(function(){
var fleetId = "hoanglocal";
var connected = {};
var start = process.argv ? process.argv[2] ? parseInt(process.argv[2]) : 1 : 1;
var end = process.argv ? process.argv[3] ? parseInt(process.argv[3]) : 10 : 10;
console.log(start);
console.log(end);
// return;
async.whilst(
    function () { return start < end; },
    function (callback) {
        // var phone = "+1201" + (9000000 + start);
        // var phone = "+84934789923";
        var phone = "+849010" + (10000 + start);

        createConnection({
            "fleetId": fleetId, "phone": phone, "geo": [16.0604567, 108.2161283], count: start
        }, function () {
            setTimeout(function () {
                start++;
                callback();
            }, 50)
        })
    },
    function (err) {
        console.log('DONE Connect');
        if (err) {
            console.log(err);
        }
    }
);

function getRandomLocation() {
    return randomLocationList[Math.floor((Math.random() * lengthRandomLocationList - 1) + 1)];
};
function getRandomLocationValue(value) {
    return _.sample(randomLocationList, value);
};

function getPercent() {
    return Math.floor((Math.random() * 100) + 1);
};
function getRandomTimeout(max, min) {
    return Math.floor(Math.random() * (max - min + 1) + min)
};

function getRandomInRange(from, to, fixed) {
    var random = (Math.random() * (to - from) + from).toFixed(fixed) * 1;
    // console.log(random);
    return random;
}


function createConnection(drvTmpl, cback) {
    var dispatchURL = urlsocket.socket;

    console.log(dispatchURL);
    var socket = require('socket.io-client')(dispatchURL, { 'force new connection': true, reconnect: false });
    //var self = this
    var drv = driverRoute[drvTmpl.phone]

    socket.on('connect', function () {
        console.log(new Date().toISOString() + ' connected ' + dispatchURL);
        socket.emit('register', {
            "platform": "android",
            "phone": drvTmpl.phone,
            "fleetId": drvTmpl.fleetId,
            "appType": "driver",
            "verifyCode": "1211",
            "ime": '123456789',
            "appName": 'driverplus_d',
            "rv": '4.6.2900',
            "password": 'password'
        });
        //socket.emit('getUserInfo', '54d32c91de99b6e95c5ec55e')
    });
    socket.on('register', function (data) {
        console.log("data: " + JSON.stringify(data));
        if (!connected[drvTmpl.phone]) {
            connected[drvTmpl.phone] = true;
            cback();
        }

        console.log(new Date().toISOString() + ' register ==========================');
        // console.log('register', data);

        socket.sessionInfo = data;

        if (!drv) {
            drv = {}
            drv.currentBooks = []
            driverRoute[drvTmpl.phone] = drv
        }
        drv.geos = []
        console.log(drv.currentGeo)
        if (!drv.currentGeo) {
            drv.currentGeo = [drvTmpl.geo[1], drvTmpl.geo[0]]
        }

        var f1 = [getRandomInRange(16.032500, 16.072932, 6), getRandomInRange(108.205722, 108.222808, 6),];

        socket.emit('f1', f1);

        //update location if moving
        clearInterval(drv.movingInterval)
        drv.movingInterval = setInterval(function () {

            if (drv) {
                var geos = drv.geos
                if (geos && geos.length > 0) {
                    //console.log('f1', geos[0])
                    var books = socket.sessionInfo.operation.currentBook
                    // if (redisConnected) {
                    //     redisSetting.SADD('geo_example_dn', geos[0].toString());
                    // }
                    if (books && books.length == 1) {
                        socket.emit('f1', [
                            geos[0][1], geos[0][0], books[0].bookId
                        ])
                    } else if (books && books.length == 2) {
                        socket.emit('f1', [
                            geos[0][1], geos[0][0], books[0].bookId, books[1].bookId
                        ])
                    } else {
                        socket.emit('f1',
                            [
                                geos[0][1], geos[0][0]
                            ]
                        )
                    }
                    var percent = getPercent()

                    if (geos[0])
                        drv.currentGeo = geos[0]
                    drv.geos.shift()

                } else {//call callback function after moving
                    if (drv.callback) {
                        console.log(`car with driver phone ${drvTmpl.phone} finished moving`)
                        console.log(`Book status and id: ${drv.emitBook ? `${drv.emitBook.status}, ${drv.emitBook.bookId}` : 'N/A'}`)
                        drv.callback()
                        drv.callback = undefined
                    }
                }
            }
        }, 2000) //refresh after 2 s
        if (data.returnCode === 1) {
            if (data.operation.currentBook && data.operation.currentBook.length > 0) {
                if (data.operation.status === 'bookOff') {
                    socket.emit('bookIn');
                }
                var books = data.operation.currentBook
                if (books && books.length > 0) {
                    //find the book that dont need to move (arrived, )
                    var book = books.find(obj => {
                        return obj.status == BookStatus.Arrived
                            || obj.status == BookStatus.Offered
                            || obj.status == BookStatus.DroppedOff
                    })
                    if (book) {
                        if (book.status === BookStatus.Arrived) {
                            book.status == BookStatus.PickUp
                            socket.emit('pickup', { bookId: book.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
                        } else if (book.status == BookStatus.Offered) {
                            book.status == BookStatus.Booked
                            socket.emit('accept', { bookId: book.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
                        } else {
                            book.status == BookStatus.Booked
                            var body = {
                                bookId: book.bookId,
                                distanceTour: getRandomTimeout(6000, 2000), timeValue: 0,
                                geo: [book.request.destination.geo[0], book.request.destination.geo[1]],
                                address: book.request.destination.address,
                                city: "DaNang_VN"
                            }
                            socket.emit('drop', body);
                        }

                    } else {
                        updateSteps(
                            books.map(obj => getPathFromBook(obj, drv)),
                            drv, function (selectedBook) {
                                if (selectedBook.status == BookStatus.Booked) {
                                    selectedBook.status = 'arrived'
                                    socket.emit('arrive', { bookId: selectedBook.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
                                } else if (selectedBook.status == BookStatus.PickUp
                                    || selectedBook.status == BookStatus.Engaged
                                ) {
                                    var body = {
                                        bookId: selectedBook.bookId,
                                        distanceTour: getRandomTimeout(6000, 2000), timeValue: 0,
                                        geo: [selectedBook.request.destination.geo[0], selectedBook.request.destination.geo[1]],
                                        address: selectedBook.request.destination.address,
                                        city: "DaNang_VN"
                                    }
                                    console.log('drop =========', body)
                                    socket.emit('drop', body);
                                }
                            }
                        )
                    }
                }
            }
        }
    });
    socket.on('getMyTrips', function (data) {
        console.log(new Date().toISOString() + ' getMyTrips ==========================');
        if (data && data[0] && data[0].status === 'confirmed') {
            socket.sessionInfo.operation.currentBook = data[0];
            socket.emit('startTrip', data[0].bookId);
        }
    })
    socket.on('rqJobPre', function (data) {
        console.log(new Date().toISOString() + ' rqJobPre ==========================');
        console.log(JSON.stringify(data));
        data.status = 'booked'
        socket.sessionInfo.operation.currentBook.push(data);
        setTimeout(function () {
            // var percent = getPercent();
            // if (percent < 80) {
            //     socket.emit('accept', socket.sessionInfo.operation.currentBook.bookId);
            // } else if (percent >= 80) {
            //     socket.emit('deny', socket.sessionInfo.operation.currentBook.bookId);
            // }
            socket.emit('acceptPre', { bookId: data.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
        }, getRandomTimeout(2 * 1000, 1 * 1000))
    });
    socket.on('rqJob', function (data) {
        console.log(new Date().toISOString() + ' rqJob ==========================');
        console.log(JSON.stringify(data));
        data.status = 'booked'
        socket.sessionInfo.operation.currentBook.push(data);
        //socket.sessionInfo.operation.status = 'booked';
        //drv.currentBooks = socket.sessionInfo.operation.currentBook
        //socket.emit('accept', data.bookId);

        setTimeout(function () {
            // var percent = getPercent();
            // if (percent < 80) {
            //     socket.emit('accept', socket.sessionInfo.operation.currentBook.bookId);
            // } else if (percent >= 80) {
            //     socket.emit('deny', socket.sessionInfo.operation.currentBook.bookId);
            // }
            socket.emit('accept', { bookId: data.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
        }, getRandomTimeout(2 * 1000, 1 * 1000))
    });
    socket.on('accept', function (data) {
        console.log(new Date().toISOString() + ' accept check ==========================');
        console.log(JSON.stringify(data));
        var percent = getPercent();
        //check if it is ride sharing 
        var books = socket.sessionInfo.operation.currentBook
        if (books) {
            updateSteps(
                books.map(obj => getPathFromBook(obj, drv)),
                drv, function (selectedBook) {
                    socket.emit('arrive', { bookId: selectedBook.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
                }
            )
        }
    });
    socket.on('acceptPre', function (data) {// currently not support book revervation
        console.log(new Date().toISOString() + ' acceptPre check ==========================');
        console.log(JSON.stringify(data));
        var books = socket.sessionInfo.operation.currentBook
        if (data && data.code == 1) {
            socket.emit('startTrip', { bookId: data.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] })
        }
    });
    socket.on('arrive', function (data) {
        console.log(new Date().toISOString() + ' arrive check ==========================');
        console.log(JSON.stringify(data));
        var books = socket.sessionInfo.operation.currentBook
        var book = drv.emitBook
        console.log('arrive book:', book.bookId)
        if (!book) {
            if (books && books.length > 1) {// ride sharing 
                book = books.find(obj => { // find first booking that have status is offered
                    return obj.status == 'booked'
                })
                if (!book) {
                    book = books[0]
                }
            } else if (books && books.length == 1) {
                book = books[0]
            } else {
                book = {}
            }
        }
        // object "books" should have at least one book  
        book.status = 'pickup'
        setTimeout(function () {
            socket.emit('pickup', { bookId: book.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]], OTWdistance: 2000 });
        }, getRandomTimeout(6000, 2000));
    });
    socket.on('startTrip', function (data) { // still dont know when this event will be called. default will pickup the first book
        console.log(new Date().toISOString() + ' startTrip ==========================');
        console.log(JSON.stringify(data));
        var books = socket.sessionInfo.operation.currentBook
        if (books) {
            updateSteps(
                books.map(obj => getPathFromBook(obj, drv)),
                drv, function (selectedBook) {
                    socket.emit('arrive', { bookId: selectedBook.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
                }
            )
        }
    });
    socket.on('pickup', function (data) {
        console.log(new Date().toISOString() + ' pickup ==========================');
        console.log(JSON.stringify(data));
        if (data) {
            var books = socket.sessionInfo.operation.currentBook
            console.log('pickup', JSON.stringify(books))
            var book = drv.emitBook
            if (books) {
                console.log('pick up', books)
                if (books.length > 1) {// ride sharing 
                    //start moving to passenger
                    updateSteps(
                        [
                            getPathFromBook(books[0], drv),
                            getPathFromBook(books[1], drv)
                        ], drv, function (selectedBook) {
                            if (selectedBook.status == BookStatus.Booked) {
                                selectedBook.status = 'arrive'
                                socket.emit('arrive', { bookId: selectedBook.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] });
                            } else if (selectedBook.status == BookStatus.PickUp || selectedBook.status == BookStatus.Engaged) {
                                var body = {
                                    bookId: selectedBook.bookId,
                                    distanceTour: getRandomTimeout(6000, 2000), timeValue: 0,
                                    geo: [selectedBook.request.destination.geo[0], selectedBook.request.destination.geo[1]],
                                    address: selectedBook.request.destination.address,
                                    zipCode: "550000",
                                    city: "DaNang_VN"
                                }
                                console.log('drop =========', body)
                                socket.emit('drop', body);
                            }
                        }
                    )
                } else {
                    book = books[0]
                    updateSteps(
                        [
                            getPathFromBook(book, drv),
                        ], drv, function (selectedBook) {
                            var body = {
                                bookId: selectedBook.bookId,
                                distanceTour: getRandomTimeout(6000, 2000), timeValue: 0,
                                geo: [selectedBook.request.destination.geo[0], selectedBook.request.destination.geo[1]],
                                address: selectedBook.request.destination.address,
                                city: "DaNang_VN"
                            }
                            console.log('drop =========', body)
                            socket.emit('drop', body);
                        }
                    )
                }
            }
        }
    });
    socket.on('drop', function (data) {
        console.log(new Date().toISOString() + ' drop ==========================');
        console.log(JSON.stringify(data));
        //remove booking id 

        if (data.returnCode === 200) {
            // check if is available book
            var books = socket.sessionInfo.operation.currentBook
            var bookIndex = books.findIndex(obj => {
                return obj.bookId == data.response.bookId
            })
            console.log('remove book at index', bookIndex)
            if (bookIndex >= 0) {
                //delete finish trip
                books.splice(bookIndex, 1);
            }
            console.log('after drop off==========', books)
            if (books && books.length > 0) { // move to the next destination
                var book = books[0]
                var destination = book.request.destination
                if (book.status == BookStatus.PickUp || book.status == BookStatus.PickUp) { // go to destination
                    if (!book.request.destination || !book.request.destination.geo || book.request.destination.geo.length <= 0) {
                        if (!book.request.destination) destination = {}
                        destination.geo = getRandomLocation()
                    }
                } else if (book.status == BookStatus.Booked || book.status == BookStatus.Offered) {
                    destination = book.request.pickup.geo
                }

                updateSteps([{ start: drv.currentGeo, end: destination.geo, book }], drv, function () {
                    console.log('Finish other book ============', book.bookId, book.status)
                    if (book.status == BookStatus.PickUp || book.status == BookStatus.DroppedOff
                        || book.status == BookStatus.Engaged) {
                        socket.emit('drop', {
                            bookId: book.bookId,
                            distanceTour: getRandomTimeout(6000, 2000), timeValue: 0,
                            geo: [destination.geo[0], destination.geo[1]],
                            address: book.request.destination.address || 'abx',
                            city: "DaNang_VN"
                        });
                    } else if (book.status == BookStatus.Booked || book.status == BookStatus.Offered) {
                        socket.emit('arrive', { bookId: book.bookId, geo: [drv.currentGeo[0], drv.currentGeo[1]] })
                    }
                })
            }
            var total = data.response.fare + data.response.heavyTraffic + data.response.airportSurcharge + data.response.tip + data.response.rushHour + data.response.partnerCommission;
            socket.emit('complete', {
                bookId: data.response.bookId,
                techFee: data.response.techFee,
                partnerCommission: data.response.partnerCommission,
                tip: data.response.tip,
                rushHour: data.response.rushHour,
                paymentType: 0,
                otherFees: 0,
                airportSurcharge: data.response.airportSurcharge,
                heavyTraffic: data.response.heavyTraffic,
                total: total,
                fare: data.response.fare,
                promoCode: '',
                isMinimum: 1,
                promoAmount: data.response.promoAmount
            })

        } else {
            // socket.disconnect();
        }
    });
    socket.on('completeResult', function (data) {
        console.log(new Date().toISOString() + ' completeResult ==========================');
        console.log(JSON.stringify(data));
        if (data && data.returnCode == 200 && data.response && data.response.tiket && data.response.tiket.bookId) {
            socket.sessionInfo.operation.currentBook = _.filter(socket.sessionInfo.operation.currentBook, function (book) {
                return book.bookId == data.response.tiket.bookId;
            });
        }
        //socket.disconnect();
    });

    socket.on('ticketDetail', function (data) {
        console.log(new Date().toISOString() + ' ticketDetail ==========================');
        console.log(JSON.stringify(data));
        // if (data.returnCode === 200) {
        //     var total = data.response.fare + data.response.heavyTraffic + data.response.airportSurcharge + data.response.tip + data.response.rushHour + data.response.partnerCommission;
        //     socket.emit('complete', {
        //         bookId: data.response.bookId,
        //         techFee: data.response.techFee,
        //         partnerCommission: data.response.partnerCommission,
        //         tip: data.response.tip,
        //         rushHour: data.response.rushHour,
        //         paymentType: 0,
        //         otherFees: 0,
        //         airportSurcharge: data.response.airportSurcharge,
        //         heavyTraffic: data.response.heavyTraffic,
        //         total: total,
        //         fare: data.response.fare,
        //         promoCode: '',
        //         isMinimum: 1,
        //         promoAmount: data.response.promoAmount
        //     })
        // } else {
        //     socket.disconnect();
        // }
    });
    socket.on('cancel', function (data) {
        console.log(new Date().toISOString() + ' cancel ==========================');
        console.log(JSON.stringify(data));
        socket.emit('ack', data.id);
        //socket.disconnect();
    });
    socket.on('complete', function (data) {
        console.log(new Date().toISOString() + ' complete ==========================');
        console.log(JSON.stringify(data));
        socket.emit('ack', data.id);
        // socket.disconnect();
    });
    socket.on('bookIn', function (data) {
        console.log(new Date().toISOString() + ' bookIn ==========================');
        console.log(JSON.stringify(data));
    });
    socket.on('setPlate', function (data) {
        console.log(new Date().toISOString() + ' setPlate ==========================');
        console.log(JSON.stringify(data));
        if (data) {
            socket.emit('bookIn')
        }
    });
    socket.on('disconnect', function () {
        console.log('disconnected: ' + drvTmpl.phone);
        // createConnection(drvTmpl, function () { });
    });

}

function getPathFromBook(book, drv) {
    var destination = book.request.destination
    if (book.status == BookStatus.PickUp) {
        if (!book.request.destination || !book.request.destination.geo || book.request.destination.geo.length <= 0) {
            if (!book.request.destination) destination = {}
            destination.geo = getRandomLocation()
        }
    } else if (book.status == BookStatus.Booked) {
        destination = book.request.pickup
    }

    return {
        start: drv.currentGeo,
        end: destination.geo,
        book
    }
}

function updateSteps(paths, drv, cb) {
    if (paths && paths.length == 1) {
        request(buildRequestRouteStepsUrl(paths[0].start, paths[0].end), function (error, response, body) {
            if (error) {
                console.log('updateSteps err', error)
                return
            }
            try {
                if (!drv) drv = {}
                var responseBody = JSON.parse(body)
                drv.geos = parseToGeosListFromApi(responseBody)
                drv.emitBook = paths[0].book
                drv.callback = function () {
                    cb(paths[0].book)
                }
            } catch (ex) {
                if (!drv) drv = {}
                drv.geos = [];
                drv.emitBook = paths[0].book
                drv.callback = function () {
                    cb(paths[0].book)
                }
            }

        });
    } else if (paths && paths.length == 2) {//if there are 2 path, calculate the nearest place to go
        async.parallel({
            path1: function (callback) {
                request(buildRequestRouteStepsUrl(paths[0].start, paths[0].end), function (error, response, body) {
                    if (error) {
                        console.log('updateSteps err', error)
                        callback({})
                    }
                    if (!drv) drv = {};
                    var responseBody = {};
                    try {
                        responseBody = JSON.parse(body)
                    } catch (ex) {

                    }
                    callback(null, responseBody)
                });
            },
            path2: function (callback) {
                request(buildRequestRouteStepsUrl(paths[1].start, paths[1].end), function (error, response, body) {
                    if (error) {
                        console.log('updateSteps err', error)
                        callback({})
                    }
                    if (!drv) drv = {};
                    var responseBody = {};
                    try {
                        responseBody = JSON.parse(body)
                    } catch (ex) {

                    }
                    callback(null, responseBody)
                });
            }
        }, function (err, result) {
            var path1Distance = 0
            var path2Distance = 0
            var route1 = result.path1.routes
            if (route1 && route1.length > 0) {
                route1.map(obj => {
                    path1Distance += obj.distance
                })
            }
            var route2 = result.path2.routes
            if (route2 && route2.length > 0) {
                route2.map(obj => {
                    path2Distance += obj.distance
                })
            }
            // console.log('calculate 2 paths==========')
            // console.log('path1', paths[0].book.bookId, paths[0].book.status, path1Distance)
            // console.log('path2', paths[1].book.bookId, paths[1].book.status, path2Distance)
            try {
                if (path1Distance != 0 && path1Distance <= path2Distance) {
                    drv.geos = parseToGeosListFromApi(result.path1)
                    drv.callback = function () {
                        drv.emitBook = paths[0].book
                        cb(paths[0].book)
                    }
                } else if (path2Distance != 0) {
                    drv.geos = parseToGeosListFromApi(result.path2)
                    drv.callback = function () {
                        drv.emitBook = paths[1].book
                        cb(paths[1].book)
                    }
                }
            } catch (ex) {
                drv.geos = [];
                drv.callback = function () {
                    drv.emitBook = paths[1].book
                    cb(paths[1].book)
                }
            }
        });
    }

}

function buildRequestRouteStepsUrl(start, end) {
    var baseUrl = 'http://router.project-osrm.org/route/v1/driving/'
    console.log(`${baseUrl}${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&steps=true&overview=full`)
    return `${baseUrl}${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&steps=true&overview=full`
}

function addRoute(phone, geos) {
    driverRoute[phone] = geos
}

function parseToGeosListFromApi(body) {
    var result = []
    if (body && body.routes) {
        body.routes.map(route => {
            if (route.geometry && route.geometry.coordinates) {
                route.geometry.coordinates.map(coordinate => {
                    result.push(coordinate)
                })
            }
        })
    }
    return result
}

var BookStatus = {
    Booked: "booked",
    PickUp: "pickup",
    Offered: "offered",
    Arrived: "arrived",
    Engaged: "engaged",
    DroppedOff: "droppedOff"
}
