import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME, LGCeilingFanConfig, DeviceConfig } from './settings';
import { LGApi } from './lg-api';
import { LGCeilingFanAccessory } from './ceiling-fan-accessory';

/**
 * LG Ceiling Fan Platform
 * Discovers and manages LG ceiling fan devices
 */
export class LGCeilingFanPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // Track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  private readonly fanAccessories: Map<string, LGCeilingFanAccessory> = new Map();
  private lgApi!: LGApi;
  private isAuthenticated = false;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig & LGCeilingFanConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    // Validate configuration
    if (!this.isValidConfig(this.config)) {
      this.log.error('Invalid configuration. Please check your config.json file.');
      return;
    }

    // Initialize LG API
    this.lgApi = new LGApi(this.config.country, this.config.language);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();

      // Start authentication health monitoring
      this.startAuthenticationHealthCheck();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  /**
   * Validate platform configuration
   */
  private isValidConfig(config: any): config is LGCeilingFanConfig {
    if (!config.auth_mode) {
      this.log.error('auth_mode is required in configuration');
      return false;
    }

    if (config.auth_mode === 'token' && !config.refresh_token) {
      this.log.error('refresh_token is required when using token authentication');
      return false;
    }

    if (config.auth_mode === 'account' && (!config.username || !config.password)) {
      this.log.error('username and password are required when using account authentication');
      return false;
    }

    if (!config.country) {
      this.log.error('country is required in configuration');
      return false;
    }

    if (!config.language) {
      this.log.error('language is required in configuration');
      return false;
    }

    return true;
  }

  /**
   * Authenticate with LG ThinQ API
   */
  private async authenticate(): Promise<boolean> {
    try {
      this.log.info('Authenticating with LG ThinQ API...');

      if (this.config.auth_mode === 'token') {
        await this.lgApi.authenticateWithToken(this.config.refresh_token!);
      } else {
        await this.lgApi.authenticateWithCredentials(this.config.username!, this.config.password!);
      }

      this.isAuthenticated = true;
      this.log.info('Successfully authenticated with LG ThinQ API');
      return true;
    } catch (error) {
      this.log.error('Failed to authenticate with LG ThinQ API:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Authenticate with auto-refresh support
   */
  private async authenticateWithAutoRefresh(): Promise<boolean> {
    try {
      this.log.info('Authenticating with LG ThinQ API...');

      if (this.config.auth_mode === 'token') {
        // Use auto-refresh if credentials are saved
        if (this.config.auto_refresh !== false && this.config.save_credentials && this.config.username && this.config.password) {
          this.log.debug('Auto-refresh enabled with saved credentials');
          await this.lgApi.autoRefreshWithCredentials(this.config.username, this.config.password);
        } else {
          // Standard token authentication
          await this.lgApi.authenticateWithToken(this.config.refresh_token!);
        }
      } else {
        await this.lgApi.authenticateWithCredentials(this.config.username!, this.config.password!);
      }

      this.isAuthenticated = true;
      this.log.info('Successfully authenticated with LG ThinQ API');

      // Save updated refresh token if it changed
      const authData = this.lgApi.getAuthData();
      if (authData && authData.refreshToken !== this.config.refresh_token) {
        this.log.debug('Refresh token updated');
        // Note: In a real implementation, you might want to update the config file
        // This would require filesystem access which should be done carefully
      }

      return true;
    } catch (error) {
      this.log.error('Failed to authenticate with LG ThinQ API:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Execute API call with auto-retry on token expiry
   */
  private async executeWithAutoRefresh<T>(apiCall: () => Promise<T>): Promise<T> {
    if (!this.config.auto_refresh || !this.config.save_credentials || !this.config.username || !this.config.password) {
      // No auto-refresh configured, just execute normally
      return await apiCall();
    }

    return await this.lgApi.executeWithRetry(apiCall, this.config.username, this.config.password);
  }

  /**
   * Discover devices and create accessories
   */
  async discoverDevices() {
    try {
      // Authenticate first (with auto-refresh support)
      if (!await this.authenticateWithAutoRefresh()) {
        this.log.error('Authentication failed. Cannot discover devices.');
        return;
      }

      // Get devices from LG API (with auto-refresh support)
      const devices = await this.executeWithAutoRefresh(() => this.lgApi.getDevices());
      this.log.info(`Found ${devices.length} devices from LG ThinQ API`);

      // Filter devices based on configuration
      const configuredDevices = this.getConfiguredDevices(devices);
      this.log.info(`Configuring ${configuredDevices.length} ceiling fans`);

      // Create or update accessories
      for (const deviceConfig of configuredDevices) {
        await this.createOrUpdateAccessory(deviceConfig);
      }

      // Remove accessories that are no longer configured
      this.removeUnusedAccessories(configuredDevices);

    } catch (error) {
      this.log.error('Failed to discover devices:', error);
    }
  }

  /**
   * Filter and map devices based on configuration
   */
  private getConfiguredDevices(apiDevices: any[]): DeviceConfig[] {
    const configuredDevices: DeviceConfig[] = [];

    // If specific devices are configured, use only those
    if (this.config.devices && this.config.devices.length > 0) {
      for (const deviceConfig of this.config.devices) {
        const apiDevice = apiDevices.find(d => d.deviceId === deviceConfig.id);
        if (apiDevice) {
          configuredDevices.push({
            id: deviceConfig.id,
            name: deviceConfig.name || apiDevice.alias,
            model: deviceConfig.model || apiDevice.applianceType,
            max_speed: 4, // LG ceiling fan has 4 speeds: low, med, high, turbo
          });
        } else {
          this.log.warn(`Device ${deviceConfig.id} not found in LG ThinQ account`);
        }
      }
    } else {
      // Auto-discover ceiling fans
      for (const apiDevice of apiDevices) {
        // Try to identify ceiling fans based on device type or model
        if (this.isCeilingFan(apiDevice)) {
          configuredDevices.push({
            id: apiDevice.deviceId,
            name: apiDevice.alias,
            model: apiDevice.applianceType,
            max_speed: 4, // LG ceiling fan has 4 speeds: low, med, high, turbo
          });
        }
      }
    }

    return configuredDevices;
  }

  /**
   * Check if a device is a ceiling fan
   */
  private isCeilingFan(device: any): boolean {
    const deviceType = device.applianceType?.toLowerCase() || '';
    const deviceCode = device.deviceCode?.toLowerCase() || '';
    const alias = device.alias?.toLowerCase() || '';

    // Look for ceiling fan indicators in device information (including Turkish terms)
    const fanKeywords = ['fan', 'ceiling', 'air_circulator', 'ventilator', 'vantilatör', 'tavan', 'havalandırma'];

    return fanKeywords.some(keyword =>
      deviceType.includes(keyword) ||
      deviceCode.includes(keyword) ||
      alias.includes(keyword),
    );
  }

  /**
   * Create or update accessory for a device
   */
  private async createOrUpdateAccessory(deviceConfig: DeviceConfig) {
    try {
      // Generate UUID for accessory
      const uuid = this.api.hap.uuid.generate(deviceConfig.id);

      // Check if accessory already exists
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        // Update existing accessory
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // Update accessory context
        existingAccessory.context.device = deviceConfig;

        // Create fan accessory handler
        const fanAccessory = new LGCeilingFanAccessory(this, existingAccessory, deviceConfig, this.lgApi);
        this.fanAccessories.set(deviceConfig.id, fanAccessory);
        fanAccessory.startStatusUpdates();

        // Update reachability
        this.api.updatePlatformAccessories([existingAccessory]);
      } else {
        // Create new accessory
        this.log.info(`Adding new LG ceiling fan: ${deviceConfig.name}`);
        const accessory = new this.api.platformAccessory(deviceConfig.name || `LG Ceiling Fan ${deviceConfig.id}`, uuid);
        accessory.context.device = deviceConfig;

        // Create the accessory handler
        const fanAccessory = new LGCeilingFanAccessory(this, accessory, deviceConfig, this.lgApi);
        this.fanAccessories.set(deviceConfig.id, fanAccessory);
        fanAccessory.startStatusUpdates();

        // Add to accessories array and register with homebridge
        this.accessories.push(accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    } catch (error) {
      this.log.error(`Failed to create accessory for device ${deviceConfig.id}:`, error);
    }
  }

  /**
   * Remove accessories that are no longer configured
   */
  private removeUnusedAccessories(configuredDevices: DeviceConfig[]) {
    const configuredIds = new Set(configuredDevices.map(d => d.id));
    const accessoriesToRemove: PlatformAccessory[] = [];

    for (const accessory of this.accessories) {
      const deviceId = accessory.context.device?.id;
      if (deviceId && !configuredIds.has(deviceId)) {
        this.log.info('Removing unused accessory:', accessory.displayName);

        // Clean up fan accessory
        this.fanAccessories.delete(deviceId);
        accessoriesToRemove.push(accessory);
      }
    }

    if (accessoriesToRemove.length > 0) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove);
    }
  }

  /**
   * Get platform configuration as typed interface
   */
  get platformConfig(): LGCeilingFanConfig {
    return this.config;
  }

  /**
   * Get LG API instance (with auto-refresh support for accessories)
   */
  getLgApi(): LGApi {
    return this.lgApi;
  }

  /**
   * Execute API call with auto-refresh (public method for accessories)
   */
  async executeApiWithAutoRefresh<T>(apiCall: () => Promise<T>): Promise<T> {
    return await this.executeWithAutoRefresh(apiCall);
  }

  /**
   * Start authentication health monitoring
   */
  private startAuthenticationHealthCheck() {
    if (!this.config.auto_refresh || !this.config.save_credentials) {
      this.log.info('Authentication health monitoring disabled (auto_refresh or save_credentials not enabled)');
      return;
    }

    const healthCheckInterval = 15 * 60 * 1000; // Check every 15 minutes

    setInterval(async () => {
      try {
        console.log('[Platform DEBUG] Running authentication health check');

        if (!this.lgApi.isAuthenticated()) {
          console.log('[Platform DEBUG] Authentication appears invalid, attempting refresh');
          this.log.warn('Authentication token appears expired, attempting auto-refresh');

          if (this.config.username && this.config.password) {
            try {
              await this.lgApi.autoRefreshWithCredentials(this.config.username, this.config.password);
              this.log.info('Authentication auto-refresh successful');
              console.log('[Platform DEBUG] Authentication health check: refresh successful');
            } catch (error: any) {
              this.log.error(`Authentication auto-refresh failed: ${error.message}`);
              console.error('[Platform ERROR] Authentication health check failed:', error.message);
            }
          } else {
            this.log.error('Authentication invalid but no credentials available for auto-refresh');
          }
        } else {
          console.log('[Platform DEBUG] Authentication health check: token appears valid');
        }

      } catch (error: any) {
        console.error('[Platform ERROR] Authentication health check error:', error.message);
        this.log.error(`Authentication health check error: ${error.message}`);
      }
    }, healthCheckInterval);

    this.log.info(`Started authentication health monitoring (checking every ${healthCheckInterval / 60000} minutes)`);
  }
}