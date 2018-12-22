var request = require('request');
var async = require('async');
var uuid = require('uuid');
var redis = require('redis');
var locks = require('locks');
var redisSetting = redis.createClient(6379, "localhost");
redisSetting.select(2);
redisSetting.on('error', function (err) {
    console.log(new Date().toISOString()+ ' redisSetting connection error to - ' + err);
    process.exit(1);
});
redisSetting.on('ready', function () {
    console.log(new Date().toISOString()+ ' redisSetting connection ready');
    
    
    var initialValue = 1;  // amount of resources available 
    var sem = locks.createSemaphore(initialValue);
      
      
      
    
      
    var accessKey = "fc40c7bffc35508c2c2f64451705c4aa7f19ea4e"
    var count = 0;
    async.whilst(
    function () { return count < 1000000; },
    function (callback) {
        async.parallel([
            function(cback){
                redisSetting.SRANDMEMBER('geo_example_dn', function(err, data){
                    cback(null,{
                        "address": data || '108.13348710536957,16.101309025991455',
                        "geo": data ? data.split(",") : [108.13348710536957,16.101309025991455],
                        "timezone": "Asia/Saigon"
                    })
                })
            },
            function(cback){
                redisSetting.SRANDMEMBER('geo_example_dn', function(err, data){
                    cback(null,{
                        "address": data || '108.24387073516846,16.055917831642677',
                        "geo": data ? data.split(",") : [108.24387073516846,16.055917831642677],
                        "timezone": "Asia/Saigon"
                    })
                })
            }
        ], function(err, locs){
            // var body = {
            //     "psgInfo":
            //         {
            //             "phone":"+12013334444",
            //             "firstName":"Hoang",
            //             "lastName":"Demo 123",
            //             "email":"qa.qupworld@gmail.com"
            //         },
            //     "request":
            //         {
            //             "pickup": locs[0],
            //             "destination": locs[1],
            //             "pickUpTime":"Now",
            //             "vehicleTypeRequest":"Taxi",
            //             "type":0,
            //             "paymentType":1,
            //             "note": new Date().toTimeString(),
            //             "promo":"",
            //             "rideSharing":false,
            //             "tip":50
            //         },
            //     "dispatch3rd":false
            // }
            // request.post({
            //     url: 'https://dispatcher.lab.qup.vn/api/v2/agent/booking/create', body: body, json: true, timeout: 30000, headers: {
            //         'x-request-id': uuid.v4(),
            //         "Authorization": "Bearer " + accessKey

            //     }}, function(error, response, body){
            //     console.log(body);
            //     count++;
            //     setTimeout(function(){
            //         callback();
            //     }, 2000)
            // })

            var body = {
                "psgInfo":
                  {
                    "phone":"+84905997022",
                    "firstName":"vinh",
                    "lastName":"tran",
                    "email":"vinh@gmail.com"
                  },
                "request":
                  {
                  "pickup": locs[0],
                  "destination": locs[1],
                  "pickUpTime":"Now",
                  "vehicleTypeRequest":"BlackCar",
                  "type":0,
                  "paymentType":1,
                  "note": new Date().toTimeString(),
                  "promo":"",
                  "rideSharing":false,
                  "tip":50
                  },
                "dispatch3rd":false
              };
              
              sem.wait(function () {
                var ports = [1337,1338,1339,1340,1341,1342,1343,1344,1345,1346];
                var dispatchURL = "http://52.74.144.184:" + ports[(count % 10)];
                console.log('request: ' + dispatchURL + " : " + count)
                request.post({
                    url: dispatchURL+'/api/v2/agent/booking/create', body: body, json: true, timeout: 30000, headers: {
                        'x-request-id': uuid.v4(),
                        "Authorization": "Bearer " + accessKey
                
                    }}, function(error, response, body){
                        console.log(JSON.stringify(body));
                        if (error) {
                            console.log(error);
                        }
                    sem.signal();    
                    
                })
                count++;
                setTimeout(function(){
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
