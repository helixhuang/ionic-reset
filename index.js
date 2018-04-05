var fs = require('fs-extra');
var path = require('path');
var colors = require('colors');
var _ = require('underscore');
var Q = require('q');
var exec = require('child_process').exec;
var Spinner = require('cli-spinner').Spinner;

/**
 * @var {Object} console utils
 */
var display = {};
display.success = function (str) {
    str = '✓  '.green + str;
    console.log('  ' + str);
};
display.error = function (str) {
    str = '✗  '.red + str;
    console.log('  ' + str);
};
display.warn = function (str) {
    str = '!  '.magenta + str;
    console.log('  ' + str);
};
display.header = function (str) {
    console.log('');
    console.log(' ' + str.cyan.underline);
    console.log('');
};

var pkg = {};

var readPackage = function () {
    var deferred = Q.defer();
    fs.readJson("package.json", function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            display.success("Read package.json")
            pkg = data;
            deferred.resolve();
        }
    });
    return deferred.promise;
};

var copyConfig = function () {
    var deferred = Q.defer();
    fs.writeFile("temp.json", JSON.stringify(pkg, null, 2), {}, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            display.success("Save package.json to temp.json")
            deferred.resolve();
        }
    });
    return deferred.promise;
};

var removePlatforms = function () {
    var promise_chain = Q.fcall(function () {});
    pkg.cordova.platforms.forEach(platform => {
        var removePlatform = function () {
            var deferred = Q.defer();
            var spinner = new Spinner(('  %s  Removing platform ' + platform + ' .. ').yellow);
            spinner.setSpinnerString('|/-\\');
            spinner.start();
            exec("cordova platform remove " + platform, function (err) {
                spinner.stop(true);
                if (err) {
                    deferred.resolve(err);
                } else {
                    display.success("Success remove platform " + platform);
                    deferred.resolve();
                }
            });
            return deferred.promise;
        }
        promise_chain = promise_chain.then(removePlatform);
    });
    return promise_chain;
};

var removePlugins = function () {
    var promise_chain = Q.fcall(function () {});
    Object.keys(pkg.cordova.plugins).forEach(plugin => {
        var removePlugin = function () {
            var deferred = Q.defer();
            var spinner = new Spinner(('  %s  Removing plugin ' + plugin + ' .. ').yellow);
            spinner.setSpinnerString('|/-\\');
            spinner.start();
            exec("cordova plugin remove " + plugin, function (err) {
                spinner.stop(true);
                if (err) {
                    if (err.code == 1) {
                        display.warn("Plugin " + plugin + " is not present");
                        deferred.resolve();
                    } else {
                        deferred.reject(err);
                    }
                } else {
                    display.success("Success remove plugin " + plugin);
                    deferred.resolve();
                }
            });
            return deferred.promise;
        }
        promise_chain = promise_chain.then(removePlugin);
    });
    return promise_chain;
};

var addPlatforms = function () {
    var promise_chain = Q.fcall(function () {});
    pkg.cordova.platforms.forEach(platform => {
        var addPlatform = function () {
            var deferred = Q.defer();
            var spinner = new Spinner(('  %s  Adding platform ' + platform + ' .. ').yellow);
            spinner.setSpinnerString('|/-\\');
            spinner.start();
            exec("cordova platform add " + platform, function (err) {
                spinner.stop(true);
                if (err) {
                    deferred.reject(err);
                } else {
                    display.success("Success add platform " + platform);
                    deferred.resolve();
                }
            });
            return deferred.promise;
        }
        promise_chain = promise_chain.then(addPlatform);
    });
    return promise_chain;
};

var addPlugins = function () {
    var promise_chain = Q.fcall(function () {});
    Object.keys(pkg.cordova.plugins).forEach(plugin => {
        var addPlugin = function () {
            var deferred = Q.defer();
            var spinner = new Spinner(('  %s  Adding plugin ' + plugin + '.. ').yellow);
            spinner.setSpinnerString('|/-\\');
            spinner.start();
            var varStr = "";
            for(var k in pkg.cordova.plugins[plugin]) {
                var v = pkg.cordova.plugins[plugin][k];
                varStr = varStr + ' --variable ' + k + '="' + v + '" ';
            }
            exec("cordova plugin add " + plugin + varStr, function (err) {
                spinner.stop(true);
                if (err) {
                    deferred.reject(err);
                } else {
                    display.success("Success add plugin " + plugin);
                    deferred.resolve();
                }
            });
            return deferred.promise;
        }
        promise_chain = promise_chain.then(addPlugin);
    });
    return promise_chain;
};

var clearConfig = function () {
    var deferred = Q.defer();
    fs.unlink("temp.json", function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise;
};

display.header('Reset Cordova Platforms & Plugins');
readPackage()
    .then(copyConfig)
    .then(removePlatforms)
    .then(removePlugins)
    .then(addPlatforms)
    .then(addPlugins)
    .then(clearConfig)
    .catch(function (err) {
        if (err) {
            console.log(err);
        }
    }).then(function () {
        console.log('');
    });