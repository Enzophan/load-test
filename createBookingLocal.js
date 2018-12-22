// var request = require('request');
var request = require('request-promise');
var _ = require('lodash');
var async = require('async');
var uuid = require('uuid');
var redis = require('redis');
var locks = require('locks');
var urlAPI = require('./config/configAPI');


var redisSetting = redis.createClient(6379, "localhost");
redisSetting.select(2);
redisSetting.on('error', function (err) {
    console.log(new Date().toISOString() + ' redisSetting connection error to - ' + err);
    process.exit(1);
});
redisSetting.on('ready', function () {
    console.log(new Date().toISOString() + ' redisSetting connection ready');


    var initialValue = 1;  // amount of resources available 
    var sem = locks.createSemaphore(initialValue);

    var accessKey = "fc40c7bffc35508c2c2f64451705c4aa7f19ea4e"
    var count = 0;

    async.whilst(
        function () { return count < 2; },
        function (callback) {
            async.parallel([
                function (cback) {
                    redisSetting.SRANDMEMBER('geo_example_dn', function (err, data) {
                        cback(null, {
                            "address": data || '108.13348710536957,16.101309025991455',
                            "geo": data ? data.split(",") : [108.13348710536957, 16.101309025991455],
                            "timezone": "Asia/Saigon"
                        })
                    })
                },
                function (cback) {
                    redisSetting.SRANDMEMBER('geo_example_dn', function (err, data) {
                        cback(null, {
                            "address": data || '108.24387073516846,16.055917831642677',
                            "geo": data ? data.split(",") : [108.24387073516846, 16.055917831642677],
                            "timezone": "Asia/Saigon"
                        })
                    })
                }
            ], function (err, locs) {

                var apiUrl = urlAPI.api;
                console.log("apiUrl: " + apiUrl);

                var optionsLocal = {
                    method: 'POST',
                    uri: apiUrl + '/oauth/token',
                    body: {
                        "grant_type": "password",
                        "username": "auto_test",
                        "password": "demo@12345",
                        "client_id": "hoanglocal",
                        "client_secret": "222999888"
                    },
                    json: true // Automatically stringifies the body to JSON
                };

                function requestBookIng(token, callback) {

                    var paramsBooking = {
                        "psgInfo": {
                            "phone": "+12058889999",
                            "firstName": "Auto Test",
                            "lastName": "Demo 123",
                            "email": "tester.qup@gmail.com",
                            "creditInfo": {
                                "cardNumber": "5555555555554444",
                                "cardHolder": "Auto",
                                "postalCode": "98789",
                                "expiredDate": "12/2022",
                                "cvv": "123"
                            }
                        },
                        "request": {
                            "pickup": {
                                "address": "3 Tháng 2, Hải Châu, Đà Nẵng",
                                "geo": [
                                    108.2189982,
                                    16.0856233
                                ],
                                "timezone": "Asia/Saigon"
                            },
                            "destination": {
                                "address": "Hyatt Regency Danang Resort and Spa, Hòa Hải, Danang, Đà Nẵng",
                                "geo": [
                                    108.2637083,
                                    16.0131183
                                ],
                                "timezone": "Asia/Saigon"
                            },
                            "pickUpTime": "Now",
                            "vehicleTypeRequest": "Bike",
                            "type": 0,
                            "paymentType": 2,
                            "note": "Auto test api",
                            "promo": "",
                            "rideSharing": false,
                            "tip": 13,
                            "packageRateId": ""
                        },
                        "dispatch3rd": false,
                        "corporateInfo": {
                            "division": "",
                            "managerEmail": "",
                            "corpId": "",
                            "managerName": "",
                            "costCentre": "",
                            "department": "",
                            "corporateId": "",
                            "clientCaseMatter": "",
                            "chargeCode": ""
                        }
                    };

                    var booking = {
                        method: 'POST',
                        // uri: 'https://dispatch.beta.qup.vn/api/v2/agent/booking/create',
                        uri: apiUrl + '/api/v2/agent/booking/create',
                        headers: {
                            'content-type': 'application/json',
                            'authorization': 'Bearer ' + token
                        },
                        body: paramsBooking,
                        json: true // Automatically parses the JSON string in the response
                    };

                    request(booking)
                        .then(function (response) {
                            console.log(response.response.bookId);
                            // callback();

                        })
                        .catch(function (err) {
                            console.log(err);
                        });

                };

                sem.wait(function () {
                    console.log('request: ' + count);
                    request(optionsLocal)
                        .then(function (parsedBody) {
                            // console.log("parsedBody.access_token:", parsedBody.access_token);
                            token = _.get(parsedBody, ["access_token"], "");
                            console.log("token: ", token);
                            requestBookIng(token);
                            sem.signal();

                        })
                        .catch(function (err) {

                            console.log(err);
                        });
                    count++;
                    setTimeout(function () {
                        callback();
                    }, 10)
                });



            })

        },
        function () {
            console.log('DONE');
        }
    );
});
