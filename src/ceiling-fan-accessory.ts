import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { LGCeilingFanPlatform } from './platform';
import { LGApi } from './lg-api';
import { DeviceConfig, CeilingFanStatus } from './settings';

/**
 * LG Ceiling Fan Accessory
 * Handles the HomeKit integration for LG ceiling fans
 */
export class LGCeilingFanAccessory {
  private service: Service;
  private fanStatus: CeilingFanStatus = {
    isOn: false,
    fanSpeed: 0,
    maxSpeed: 4, // LG ceiling fan has 4 speeds: low(2), med(4), high(6), turbo(7)
  };

  constructor(
    private readonly platform: LGCeilingFanPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly config: DeviceConfig,
    private readonly lgApi: LGApi,
  ) {

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'LG')
      .setCharacteristic(this.platform.Characteristic.Model, config.model || 'Ceiling Fan')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, config.id);

    // Get or create the Fan service
    this.service = this.accessory.getService(this.platform.Service.Fan) ||
                   this.accessory.addService(this.platform.Service.Fan);

    // Set the service name
    this.service.setCharacteristic(this.platform.Characteristic.Name, config.name || 'Ceiling Fan');

    // Fan On/Off
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    // Fan Speed with 4 discrete steps (0, 25%, 50%, 75%, 100%)
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      .setProps({
        minValue: 0,
        maxValue: 100,
        minStep: 25, // This creates 4 discrete speed steps plus off
      })
      .onSet(this.setRotationSpeed.bind(this))
      .onGet(this.getRotationSpeed.bind(this));

    // Remove any existing light service since this fan doesn't have lights
    const existingLightService = this.accessory.getService(this.platform.Service.Lightbulb);
    if (existingLightService) {
      this.accessory.removeService(existingLightService);
    }

    this.platform.log.info(`LG Ceiling Fan accessory initialized: ${config.name} (4 speed steps: 2,4,6,7, no light, no reverse)`);
  }

  /**
   * Handle requests to set the "On" characteristic
   */
  async setOn(value: CharacteristicValue) {
    const isOn = value as boolean;

    try {
      // Send command to LG API using working command structure
      await this.lgApi.sendCommand(this.config.id, {
        dataKey: 'airState.operation',
        dataValue: isOn ? 1 : 0,
      });

      this.fanStatus.isOn = isOn;
      this.platform.log.info(`Set fan power: ${isOn ? 'ON' : 'OFF'}`);
    } catch (error) {
      this.platform.log.error(`Failed to set fan power: ${error}`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle requests to get the current value of the "On" characteristic
   */
  async getOn(): Promise<CharacteristicValue> {
    await this.updateStatus();
    return this.fanStatus.isOn;
  }

  /**
   * Handle requests to set the "RotationSpeed" characteristic
   * Maps HomeKit discrete steps (0%, 25%, 50%, 75%, 100%) to LG speed levels (0,2,4,6,7)
   */
  async setRotationSpeed(value: CharacteristicValue) {
    const percentage = value as number;

    // Map discrete percentage steps to LG speed levels using working values
    let lgSpeed: number;
    let actualPercentage: number;

    if (percentage === 0) {
      lgSpeed = 0; // Off
      actualPercentage = 0;
    } else if (percentage <= 25) {
      lgSpeed = 2; // Low (working value)
      actualPercentage = 25;
    } else if (percentage <= 50) {
      lgSpeed = 4; // Med (working value)
      actualPercentage = 50;
    } else if (percentage <= 75) {
      lgSpeed = 6; // High (working value)
      actualPercentage = 75;
    } else {
      lgSpeed = 7; // Turbo (working value)
      actualPercentage = 100;
    }

    try {
      this.platform.log.info(`Setting fan speed to ${actualPercentage}% (LG Level: ${lgSpeed})`);

      // Use the working command structure discovered in testing
      const command = {
        dataKey: 'airState.windStrength',
        dataValue: lgSpeed,
      };

      await this.lgApi.sendCommand(this.config.id, command);

      this.fanStatus.fanSpeed = actualPercentage;

      // If setting speed > 0, also turn on the fan
      if (lgSpeed > 0 && !this.fanStatus.isOn) {
        this.platform.log.info('Fan speed > 0, turning on fan...');
        await this.setOn(true);
      }

      this.platform.log.info(`Successfully set fan speed: ${actualPercentage}% (LG Level: ${lgSpeed})`);
    } catch (error) {
      this.platform.log.error(`Failed to set fan speed: ${error}`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  /**
   * Handle requests to get the current value of the "RotationSpeed" characteristic
   */
  async getRotationSpeed(): Promise<CharacteristicValue> {
    await this.updateStatus();
    return this.fanStatus.fanSpeed;
  }

  /**
   * Update device status from LG API
   */
  async updateStatus(): Promise<void> {
    try {
      const status = await this.lgApi.getDeviceStatus(this.config.id);

      // Parse fan status from LG API response
      const snapshot = status?.snapshot || {};
      const airState = snapshot['airState.operation'] || snapshot.operation;
      const windStrength = snapshot['airState.windStrength'] || snapshot.windStrength;

      // Update power status
      this.fanStatus.isOn = airState === 1 || airState === '1';

      // Convert LG speed (0,2,4,6,7) to HomeKit discrete percentage steps (0%, 25%, 50%, 75%, 100%)
      if (typeof windStrength === 'number' || typeof windStrength === 'string') {
        const lgSpeed = parseInt(windStrength.toString());
        switch (lgSpeed) {
          case 0:
            this.fanStatus.fanSpeed = 0; // Off
            break;
          case 2:
            this.fanStatus.fanSpeed = 25; // Low
            break;
          case 4:
            this.fanStatus.fanSpeed = 50; // Med
            break;
          case 6:
            this.fanStatus.fanSpeed = 75; // High
            break;
          case 7:
            this.fanStatus.fanSpeed = 100; // Turbo
            break;
          default:
            this.fanStatus.fanSpeed = 0;
            this.platform.log.warn(`Unknown LG speed value: ${lgSpeed}, defaulting to off`);
        }
      }

      if (this.platform.config.debug) {
        this.platform.log.debug(`Status updated: Power=${this.fanStatus.isOn}, Speed=${this.fanStatus.fanSpeed}%`);
      }

    } catch (error) {
      this.platform.log.error(`Failed to update device status: ${error}`);
    }
  }

  /**
   * Periodic status update
   */
  startStatusUpdates(): void {
    const interval = (this.platform.config.polling_interval || 30) * 1000;

    setInterval(async () => {
      try {
        await this.updateStatus();

        // Update HomeKit characteristics
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.fanStatus.isOn);
        this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.fanStatus.fanSpeed);

      } catch (error) {
        this.platform.log.error(`Status update failed: ${error}`);
      }
    }, interval);

    this.platform.log.info(`Started status updates every ${interval / 1000} seconds`);
  }
}