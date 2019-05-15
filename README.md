# Homebridge Air Conditioner with LIRC

The plugin was modified from [homebridge-anavi-infrared-aircon](https://github.com/zwaldowski/homebridge-anavi-infrared-aircon).

(AUTO mode was set to be the same as OFF mode because SIRI will set AUTO mode when be asked to turn off.)

## Prerequisites

Make LIRC worked with your AC.

Make sure LIRC command works:
 - OFF MODE:  `irsend SEND_ONCE YOUR_DEVICE_NAME off`
 - HEAT MODE: `irsend SEND_ONCE YOUR_DEVICE_NAME heat_CELSIUS_TEMP` (ex: heat_24)
 - COOL MODE: `irsend SEND_ONCE YOUR_DEVICE_NAME cool_CELSIUS_TEMP` (ex: cool_19)

## Installation

```shell
# npm install -g homebridge-lirc-aircon
```

# Config example

- `minSetpoint` and `maxSetpoint` make the range you can set in Homekit.

- `defaultSetpoint` set the default temperature when Homebridge starts.

- `temp` set the way to get current room temperature(ex：DS18B20 module), remove `temp` node and it will be set to 20℃.


```json
{
  "accessories": [
    {
      "accessory": "aircon-ir-remote",
      "name": "Air Conditioner",
      "minSetpoint": 16,
      "defaultSetpoint": 20,
      "maxSetpoint": 30,
      "ir": {
        "name": "lirc_device_name"
      },
      "temp": {
        "command": "cat /sys/bus/w1/devices/28-01131650xxx/w1_slave |grep t= | cut -d '=' -f 2",
        "multiple": 1000
      }
    }
  ]
}
```
# More

See https://github.com/zwaldowski/homebridge-anavi-infrared-aircon/blob/master/README.md
