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
        for (var i = 0; i < json.result.items.length;i++) {
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
                adapter.log.debug("tagName : " + j + "/" + arrFound.tagValues[j].tagName)
            }
            adapter.setState('bc.TemperatureBattery',parseInt(arrFound.tagValues.TemperatureBattery.value,10));
            adapter.log.debug('bc.TemperatureBattery: ' + arrFound.tagValues.TemperatureBattery.value);

            adapter.setState('bc.StateOfCharge',parseInt(arrFound.tagValues.StateOfCharge.value,10));
            adapter.log.debug('bc.StateOfCharge: ' + arrFound.tagValues.StateOfCharge.value);

            adapter.setState('bc.VoltageBatteryString',parseInt(arrFound.tagValues.VoltageBatteryString.value,10));
            adapter.log.debug('bc.VoltageBatteryString: ' + arrFound.tagValues.VoltageBatteryString.value);

            adapter.setState('bc.CurrentBatteryOut',parseInt(arrFound.tagValues.CurrentBatteryOut.value,10));
            adapter.log.debug('bc.CurrentBatteryOut: ' + arrFound.tagValues.CurrentBatteryOut.value);

            adapter.setState('bc.StateOfHealth',parseInt(arrFound.tagValues.StateOfHealth.value,10));
            adapter.log.debug('bc.StateOfHealth: ' + arrFound.tagValues.StateOfHealth.value);

            adapter.setState('bc.PowerACOut',parseInt(arrFound.tagValues.PowerACOut.value,10));
            adapter.log.debug('bc.PowerACOut: ' + arrFound.tagValues.PowerACOut.value);

            adapter.setState('bc.PowerACIn',parseInt(arrFound.tagValues.PowerACIn.value,10));
            adapter.log.debug('bc.PowerACIn: ' + arrFound.tagValues.PowerACIn.value);

            adapter.setState('bc.VoltageGRMIn',parseInt(arrFound.tagValues.VoltageGRMIn.value,10));
            adapter.log.debug('bc.VoltageGRMIn: ' + arrFound.tagValues.VoltageGRMIn.value);

            adapter.setState('bc.CurrentGRMIn',parseInt(arrFound.tagValues.CurrentGRMIn.value,10));
            adapter.log.debug('bc.CurrentGRMIn: ' + arrFound.tagValues.CurrentGRMIn.value);

            adapter.setState('bc.CurrentGRMOut',parseInt(arrFound.tagValues.VoltageGRMIn.value,10));
            adapter.log.debug('bc.CurrentGRMOut: ' + arrFound.tagValues.VoltageGRMIn.value);

            adapter.setState('bc.VoltageGRMOut',parseInt(arrFound.tagValues.VoltageGRMOut.value,10));
            adapter.log.debug('bc.VoltageGRMOut: ' + arrFound.tagValues.VoltageGRMOut.value);

            adapter.setState('bc.CurrentBatteryIn',parseInt(arrFound.tagValues.VoltageGRMIn.value,10));
            adapter.log.debug('bc.CurrentBatteryIn: ' + arrFound.tagValues.VoltageGRMIn.value);

            adapter.setState('bc.WorkACOut',parseInt(arrFound.tagValues.WorkACOut.value,10));
            adapter.log.debug('bc.WorkACOut: ' + arrFound.tagValues.WorkACOut.value);

            adapter.setState('bc.WorkACIn',parseInt(arrFound.tagValues.WorkACIn.value,10));
            adapter.log.debug('bc.WorkACIn: ' + arrFound.tagValues.WorkACIn.value);
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
                adapter.log.debug("tagName : " + j + "/" + arrFound.tagValues[j].tagName)
            }
            adapter.setState('inv.ACPower',parseInt(arrFound.tagValues.ACPower.value,10));
            adapter.log.debug('inv.ACPower: ' + arrFound.tagValues.ACPower.value);

            adapter.setState('inv.PowerACOut',parseInt(arrFound.tagValues.PowerACOut.value,10));
            adapter.log.debug('inv.PowerACOut: ' + arrFound.tagValues.PowerACOut.value);

            adapter.setState('inv.PowerACOutLimit',parseInt(arrFound.tagValues.PowerACOutLimit.value,10));
            adapter.log.debug('inv.PowerACOutLimit: ' + arrFound.tagValues.PowerACOutLimit.value);

            adapter.setState('inv.PowerACOutMax',parseInt(arrFound.tagValues.PowerACOutMax.value,10));
            adapter.log.debug('inv.PowerACOutMax: ' + arrFound.tagValues.PowerACOutMax.value);
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
                adapter.log.debug("tagName : "  j + "/" + arrFound.tagValues[j].tagName)
                adapter.log.debug("type : " + type);
            }
            adapter.setState('pl.PowerBuffered',parseInt(arrFound.tagValues.PowerBuffered.value,10));
            adapter.log.debug('pl.PowerBuffered: ' + arrFound.tagValues.PowerBuffered.value);

            adapter.setState('pl.WorkConsumedFromStorage',parseInt(arrFound.tagValues.WorkConsumedFromStorage.value,10));
            adapter.log.debug('pl.WorkConsumedFromStorage: ' + arrFound.tagValues.WorkConsumedFromStorage.value);

            adapter.setState('pl.WorkProduced',parseInt(arrFound.tagValues.WorkProduced.value,10));
            adapter.log.debug('pl.WorkProduced: ' + arrFound.tagValues.WorkProduced.value);

            adapter.setState('pl.WorkSelfSupplied',parseInt(arrFound.tagValues.WorkSelfSupplied.value,10));
            adapter.log.debug('pl.WorkSelfSupplied: ' + arrFound.tagValues.WorkSelfSupplied.value);

            adapter.setState('pl.PowerConsumedFromGrid',parseInt(arrFound.tagValues.PowerConsumedFromGrid.value,10));
            adapter.log.debug('pl.PowerConsumedFromGrid: ' + arrFound.tagValues.PowerConsumedFromGrid.value);

            adapter.setState('pl.WorkOut',parseInt(arrFound.tagValues.WorkOut.value,10));
            adapter.log.debug('pl.WorkOut: ' + arrFound.tagValues.WorkOut.value);

            adapter.setState('pl.PowerProduced',parseInt(arrFound.tagValues.PowerProduced.value,10));
            adapter.log.debug('pl.PowerProduced: ' + arrFound.tagValues.PowerProduced.value);

            adapter.setState('pl.PowerOut',parseInt(arrFound.tagValues.PowerOut.value,10));
            adapter.log.debug('pl.PowerOut: ' + arrFound.tagValues.PowerOut.value);

            adapter.setState('pl.WorkOutFromProducers',parseInt(arrFound.tagValues.WorkOutFromProducers.value,10));
            adapter.log.debug('pl.WorkOutFromProducers: ' + arrFound.tagValues.WorkOutFromProducers.value);

            adapter.setState('pl.PowerConsumedFromStorage',parseInt(arrFound.tagValues.PowerConsumedFromStorage.value,10));
            adapter.log.debug('pl.PowerConsumedFromStorage: ' + arrFound.tagValues.PowerConsumedFromStorage.value);

            adapter.setState('pl.PowerBufferedFromProducers',parseInt(arrFound.tagValues.PowerBufferedFromProducers.value,10));
            adapter.log.debug('pl.PowerBufferedFromProducers: ' + arrFound.tagValues.PowerBufferedFromProducers.value);

            adapter.setState('pl.PowerOutFromStorage',parseInt(arrFound.tagValues.PowerOutFromStorage.value,10));
            adapter.log.debug('pl.PowerOutFromStorage: ' + arrFound.tagValues.PowerOutFromStorage.value);

            adapter.setState('pl.PowerSelfSupplied',parseInt(arrFound.tagValues.PowerSelfSupplied.value,10));
            adapter.log.debug('pl.PowerSelfSupplied: ' + arrFound.tagValues.PowerSelfSupplied.value);

            adapter.setState('pl.PowerOutFromProducers',parseInt(arrFound.tagValues.PowerOutFromProducers.value,10));
            adapter.log.debug('pl.PowerOutFromProducers: ' + arrFound.tagValues.PowerOutFromProducers.value);

            adapter.setState('pl.WorkIn',parseInt(arrFound.tagValues.WorkIn.value,10));
            adapter.log.debug('pl.WorkIn: ' + arrFound.tagValues.WorkIn.value);

            adapter.setState('pl.WorkBuffered',parseInt(arrFound.tagValues.WorkBuffered.value,10));
            adapter.log.debug('pl.WorkBuffered: ' + arrFound.tagValues.WorkBuffered.value);

            adapter.setState('pl.PowerBufferedFromGrid',parseInt(arrFound.tagValues.PowerBufferedFromGrid.value,10));
            adapter.log.debug('pl.PowerBufferedFromGrid: ' + arrFound.tagValues.PowerBufferedFromGrid.value);

            adapter.setState('pl.WorkReleased',parseInt(arrFound.tagValues.WorkReleased.value,10));
            adapter.log.debug('pl.WorkReleased: ' + arrFound.tagValues.WorkReleased.value);

            adapter.setState('pl.PowerConsumed',parseInt(arrFound.tagValues.PowerConsumed.value,10));
            adapter.log.debug('pl.PowerConsumed: ' + arrFound.tagValues.PowerConsumed.value);

            adapter.setState('pl.WorkBufferedFromProducers',parseInt(arrFound.tagValues.WorkBufferedFromProducers.value,10));
            adapter.log.debug('pl.WorkBufferedFromProducers: ' + arrFound.tagValues.WorkBufferedFromProducers.value);

            adapter.setState('pl.PowerIn',parseInt(arrFound.tagValues.PowerIn.value,10));
            adapter.log.debug('pl.PowerIn: ' + arrFound.tagValues.PowerIn.value);
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
