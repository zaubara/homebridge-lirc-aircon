'use strict'

const plugin = require('./package')
var Service, Characteristic

module.exports = function (homebridge) {
    Service = homebridge.hap.Service
    Characteristic = homebridge.hap.Characteristic
    homebridge.registerAccessory(plugin.name, "aircon-ir-remote", AirConAccessory)
}

class AirConAccessory {

    constructor(log, config) {
        this.log = log
        this.informationService = this.makeInformationService(config)
        this.thermostatService = this.makeThermostatService(config)
        this.config = config
        //get current temp function
        this.readTemperature = function (callback) {
            if (!config.temp) {
                callback(20)
                return
            }
            var exec = require('child_process').exec;
            exec(config.temp.command,
                function (error, stdout, stderr) {
                    var temperature = Number(stdout) / config.temp.multiple
                    callback(temperature.toFixed(1));

                    if (error !== null) {
                        console.log('exec error: ' + error);
                        callback(0.1);
                    }
                });
        }
        //
        this.celsiusToDevice = Math.round

    }

    identify(callback) {
        this.log('Device identified!')
        callback()
    }

    // device info in homekit
    makeInformationService(config) {
        const service = new Service.AccessoryInformation()

        service
            .setCharacteristic(Characteristic.Manufacturer, config.device && config.device.manufacturer)
            .setCharacteristic(Characteristic.Model, config.device && config.device.model)
            .setCharacteristic(Characteristic.SerialNumber, config.device && config.device.serial)
            .setCharacteristic(Characteristic.FirmwareRevision, (config.device && config.device.revision) || plugin.version)

        return service
    }

    // get room temp
    getCurrentTemperature(callback) {

        this.readTemperature(function (tempInC) {
            callback(null, tempInC)
        })
    }

    // get AC mode
    getCurrentHeatingCoolingState(callback) {
        callback(null, this.heatingCoolingState)
    }

    // set AC mode
    setTargetHeatingCoolingState(value, callback) {
        this.log('Power state to %s.', value)

        if ((value === Characteristic.TargetHeatingCoolingState.COOL) && (this.heatingCoolingState !== Characteristic.TargetHeatingCoolingState.COOL)) {
            this.heatingCoolingState = Characteristic.TargetHeatingCoolingState.COOL
            this.remoteSend(`cool_${this.currentSetpoint}`, function () {
                callback(null, Characteristic.TargetHeatingCoolingState.COOL)
            })
        } else if ((value === Characteristic.TargetHeatingCoolingState.OFF) && (this.heatingCoolingState !== Characteristic.TargetHeatingCoolingState.OFF)) {
            this.heatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF
            this.remoteSend('off', function () {
                callback(null, Characteristic.TargetHeatingCoolingState.OFF)
            })
        } else if ((value === Characteristic.TargetHeatingCoolingState.HEAT) && (this.heatingCoolingState !== Characteristic.TargetHeatingCoolingState.HEAT)) {
            this.heatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT
            this.remoteSend(`cool_${this.currentSetpoint}`, function () {
                callback(null, Characteristic.TargetHeatingCoolingState.HEAT)
            })
        } else if ((value === Characteristic.TargetHeatingCoolingState.AUTO) && (this.heatingCoolingState !== Characteristic.TargetHeatingCoolingState.AUTO)) {
            this.heatingCoolingState = Characteristic.TargetHeatingCoolingState.HEAT
            this.remoteSend(`off`, function () {
                callback(null, Characteristic.TargetHeatingCoolingState.HEAT)
            })
        }
        else {
            callback()
        }
    }

    // get setted temp
    getTargetTemperature(callback) {
        callback(null, this.currentSetpoint)
    }

    tempRemoteSend(temp, mode, callback) {
        this.log(`temp: ${temp},mode: ${mode}`)
        if (mode === Characteristic.TargetHeatingCoolingState.COOL) {
            this.remoteSend('cool_' + String(temp), callback)
        } else if (mode === Characteristic.TargetHeatingCoolingState.HEAT) {
            this.remoteSend('heat_' + String(temp), callback)
        } else {
            callback()
        }

    }

    setTargetTemperature(_newValue, callback) {
        var that = this
        var newValue = this.celsiusToDevice(_newValue)
        this.currentSetpoint = newValue

        this.log('Set temperature to %s.', newValue)

        this.setTargetHeatingCoolingState(Characteristic.TargetHeatingCoolingState.COOL, function (error) {
            if (error) {
                callback(error)
                return
            }

            that.tempRemoteSend(newValue, this.heatingCoolingState, callback)
        }.bind(this))
    }

    makeThermostatService(config) {
        const service = new Service.Thermostat(config.name)

        service
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .setValue(Characteristic.TemperatureDisplayUnits.CELSIUS)
            .on('set', function (value, callback) {
                callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS)
            })

        service
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this))

        if (config.ir && config.ir.name) {
            const lirc = require('lirc_node')
            this.remoteSend = function (button, callback) {
                this.log(`LIRC: ${button}`)
                lirc.irsend.send_once(config.ir.name, button, callback)
            }
        } else {
            throw new Error('Need device name for LIRC.')
        }

        this.heatingCoolingState = Characteristic.TargetHeatingCoolingState.OFF

        service
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .on('get', this.getCurrentHeatingCoolingState.bind(this))

        service
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .setProps({
                validValues: [
                    Characteristic.TargetHeatingCoolingState.OFF,
                    Characteristic.TargetHeatingCoolingState.AUTO,
                    Characteristic.TargetHeatingCoolingState.COOL,
                    Characteristic.TargetHeatingCoolingState.HEAT
                ]
            })
            .updateValue(this.heatingCoolingState)
            .on('set', this.setTargetHeatingCoolingState.bind(this))

        this.currentSetpoint = config.defaultSetpoint || 20

        service
            .getCharacteristic(Characteristic.TargetTemperature)
            .setProps({
                minValue: config.minSetpoint || 10,
                maxValue: config.maxSetpoint || 30,
                minStep: 1
            })
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this))

        return service
    }

    getServices() {
        return [this.informationService, this.thermostatService]
    }

}
