var request = require('request-promise');
var async = require('async');
var _ = require('lodash');
var config = require('./config/configAPI');

var loginCC = {
    method: 'POST',
    uri: config.cc + '/api/user/login',
    body: {
        "username": "auto_migratecard",
        "password": "demo@12345"
    },
    json: true // Automatically stringifies the body to JSON
};

request(loginCC)
    .then(function (parsedBody) {
        // console.log("parsedBody:", JSON.stringify(parsedBody));
        token = _.get(parsedBody.res, ["token"], "");
        console.log("token: ", token);
        requestCancel(token);
    })
    .catch(function (err) {
        console.log(err);
    });

// Find all booking
function requestCancel(token) {
    var body = {
        "limit": 300,
        "page": 0,
        "sort": {
            "time": -1
        },
        "query": {
            "txtSearch": "",
            "bookingService": "all",
            "supportService": "all",
            "corporateId": null,
            "bookingType": "all",
            "rideType": "all",
            "dateFrom": null,
            "dateTo": null,
            "operator": "",
            "bookFrom": [],
            "carType": [],
            "status": [
                "pending",
                "pre",
                "queue",
                "offered",
                "confirmed",
                "booked",
                "engaged",
                "droppedOff",
                "arrived",
                "action",
                "accepted"
            ],
            "fleetId": "migratecard",
            "vip": null
        }
    };

    var requestBody = {
        method: 'POST',
        uri: config.cc + '/api/booking/find',
        headers: {
            'content-type': 'application/json',
            'authorization': token
        },
        body: body,
        json: true // Automatically parses the JSON string in the response
    };

    request(requestBody)
        .then(function (response) {
            lists = response.res.list;
            lists.map(data => {
                var bookId = data.bookId;
                console.log("BookID: " + bookId);

                var loginAgent = {
                    method: 'POST',
                    uri: config.api + '/oauth/token',
                    body: {
                        "grant_type": "password",
                        "username": "auto_migratecard",
                        "password": "demo@12345",
                        "client_id": "migratecard",
                        "client_secret": "222999888"
                    },
                    json: true // Automatically stringifies the body to JSON
                };

                function cancelBooking(agentToken) {
                    var cancelBooking = {
                        method: "POST",
                        uri: config.api + "/api/v2/agent/booking/cancel",
                        headers: {
                            'content-type': 'application/json',
                            'authorization': 'Bearer ' + agentToken
                        },
                        body: {
                            "bookId": bookId
                        },
                        json: true
                    };

                    return request(cancelBooking)
                        .then(function (response) {
                            console.log(response);
                            return;
                        })
                        .catch(function (err) {
                            console.log("err: " + JSON.stringify(err));
                        });
                };


                request(loginAgent)
                    .then(function (response) {
                        agentToken = _.get(response, ["access_token"], "");
                        console.log("agentToken: " + agentToken);
                        cancelBooking(agentToken);
                    })
                    .catch(function (err) {
                        console.log(err);
                    });

            });
        })
        .catch(function (err) {
            console.log(err);
        });


};
