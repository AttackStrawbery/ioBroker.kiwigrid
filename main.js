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
/*   adapter.log.debug('energyManager : ' + energyManager);
  adapter.log.debug('batteryConverterUrn : ' + batteryConverterUrn);
  adapter.log.debug('gridConverterUrn : ' + gridConverterUrn);
  adapter.log.debug('locationUrn : ' + locationUrn); */

  rp(options)
    .then(function (json) {
        var group;
        for (var i in json.result.items) {
            /*
                deviceClass[0] => com.kiwigrid.lib.device.Device
                deviceClass[1] => com.kiwigrid.devices.inverter.Inverter|com.kiwigrid.devices.simpleswitcher.SimpleSwitcher|com.kiwigrid.devices.location.Location....
                deviceClass[2] => Vendor specific driver
            adapter.log.debug("deviceclass : "+ json.result.items[i].deviceModel[json.result.items[i].deviceModel.length -1].deviceClass);
/*             for (var c in json.result.items[i].deviceModel) {
                adapter.log.debug("class["+ i +"] : " + json.result.items[i].deviceModel[c].deviceClass);
            } */


            switch(json.result.items[i].deviceModel[1].deviceClass) {
                case "com.kiwigrid.devices.inverter.Inverter":
                    group=json.result.items[i].deviceModel[2].deviceClass.split(".").pop();
                break;

                case "com.kiwigrid.devices.powermeter.PowerMeter":
                    group=json.result.items[i].deviceModel[2].deviceClass.split(".").pop();
                break;

                default:
                    group=json.result.items[i].deviceModel[1].deviceClass.split(".").pop();
                break;
            }
            for ( var j in json.result.items[i].tagValues) {
                var value = json.result.items[i].tagValues[j].value;
                var type = typeof value;


                switch (type) {
                    case "number":
                        updateObject(group,json.result.items[i].tagValues[j].tagName,type,value,"value");
                    break;

                    case "boolean":
                        updateObject(group,json.result.items[i].tagValues[j].tagName,type,value,"value");
                    break;

                    case "string":
                        updateObject(group,json.result.items[i].tagValues[j].tagName,type,value,"value");
                    break;
                    
                    case "object":
                    break;

                    default:
                        adapter.log.debug("tagName : " + j + "/" + json.result.items[i].tagValues[j].tagName);
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
