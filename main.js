/**
 *
 * kiwigrid adapter
 *
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "kiwigrid",                  // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Node.js kiwigrid Adapter",  // Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <mail@kiwigrid.com>"
 *          ]
 *          "desc":         "kiwigrid adapter",          // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "daemon",                   // possible values "daemon", "schedule", "subscribe"
 *          "materialize":  true,                       // support of admin3
 *          "schedule":     "0 0 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "test1": true,
 *          "test2": 42,
 *          "mySelect": "auto"
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

// http://xxx/rest/kiwigrid/eps/powerValues
// http://xxx/rest/kiwigrid/wizard/devices
// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
var callBackCount = 0;
var waitCount = 0;
var maxWaitCount = 10;


// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.kiwigrid.0
var adapter = new utils.Adapter('kiwigrid');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj === 'object' && obj.message) {
        if (obj.command === 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});



function main() {
  callBackCount++;
  var rp = require('request-promise');
  var energyManager = adapter.config.ip;
  var batteryConverterUrn = adapter.config.batteryConverterUrn;
  var gridConverterUrn = adapter.config.gridConverterUrn;
  var locationUrn = adapter.config.locationUrn;

  var options = {
      uri: 'http://'+ energyManager + '/rest/kiwigrid/wizard/devices',
      headers: {
          'User-Agent': 'Request-Promise'
      },
      json: true // Automatically parses the JSON string in the response
  };
  adapter.log.debug('energyManager : ' + energyManager);
  adapter.log.debug('batteryConverterUrn : ' + batteryConverterUrn);
  adapter.log.debug('gridConverterUrn : ' + gridConverterUrn);
  adapter.log.debug('locationUrn : ' + locationUrn);

  rp(options)
    .then(function (json) {
        var arrFound;
        for (var i in json.result.items) {
            adapter.log.debug("deviceModel : " + json.result.items[i]);
            var lookup = json.result.items[i].deviceModel.filter(function(item) {     
                return item.deviceClass == batteryConverterUrn
            });

            if (lookup != "") {
                adapter.log.debug("found : " + batteryConverterUrn);
                arrFound = json.result.items[i];
            }
        }

        if (arrFound != "" ) {
            for ( var j in arrFound.tagValues) {
                var value = arrFound.tagValues[j].value;
                var type = typeof value;


                switch (type) {
                    case "number":
                        updateObject("bc",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    case "boolean":
                        updateObject("bc",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    case "string":
                        updateObject("bc",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    default:
                        adapter.log.debug("tagName : " + j + "/" + arrFound.tagValues[j].tagName);
                        adapter.log.debug("type : " + type);
                        adapter.log.debug("object : " + value);
                    break;
                }
            }    
        }

        arrFound = "";
        for (var i = 0; i < json.result.items.length;i++) {
            var lookup = json.result.items[i].deviceModel.filter(function(item) {
              return item.deviceClass == gridConverterUrn
            });

            if (lookup != "") {
                adapter.log.debug("found : " + gridConverterUrn);
                arrFound = json.result.items[i];
            }
        }
        if (arrFound != "") {
            for ( var j in arrFound.tagValues) {
                var value = arrFound.tagValues[j].value;
                var type = typeof value;


                switch (type) {
                    case "number":
                        updateObject("inv",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    case "boolean":
                        updateObject("inv",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    case "string":
                        updateObject("inv",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    default:
                        adapter.log.debug("tagName : " + j + "/" + arrFound.tagValues[j].tagName);
                        adapter.log.debug("type : " + type);
                        adapter.log.debug("object : " + value);
                    break;
                }
            }
       }

        arrFound = "";
        for (var i = 0; i < json.result.items.length;i++) {
            var lookup = json.result.items[i].deviceModel.filter(function(item) {
              return item.deviceClass == locationUrn
            });

            if (lookup != "") {
                adapter.log.debug("found : " + locationUrn);
                arrFound = json.result.items[i];
            }
        }

        if (arrFound != "") {
            for ( var j in arrFound.tagValues) {
                var value = arrFound.tagValues[j].value;
                var type = typeof value;


                switch (type) {
                    case "number":
                        updateObject("pl",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    case "boolean":
                        updateObject("pl",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    case "string":
                        updateObject("pl",arrFound.tagValues[j].tagName,type,value,"value");
                    break;

                    default:
                        adapter.log.debug("tagName : " + j + "/" + arrFound.tagValues[j].tagName);
                        adapter.log.debug("type : " + type);
                        adapter.log.debug("object : " + value);
                    break;
                }
            }
      }
    callBackCount--;

    })
    .catch(function (err) {
        // API call failed...
        adapter.log.debug('call failed');
        process.exit(1);
    });
waitCallBack();
}

function updateObject(group,tag,type,value,role) {
    adapter.setObjectNotExists(
        group + "." + tag, {
            type: 'state',
            common: {
                name: tag,
                type: type,
                role: role
            },
            native: {}
        },
        adapter.setState(
            group + "." + tag,
            {val: value, ack: true}
        )
    );
}

function waitCallBack()  {
	//here is the trick, wait until var callbackCount is set number of callback functions
	if (waitCount > maxWaitCount) {
		adapter.log.error("Timeout");
		process.exit(1);
	}
	waitCount++;
	if (callBackCount > 0) {
		adapter.log.debug("wait : "+callBackCount);
		setTimeout(waitCallBack, 1000);
		return;
	}
	process.exit(0);
}
