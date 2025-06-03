#!/usr/bin/env node

const axios = require('axios');

// LG ThinQ API Constants
const LG_API_CONSTANTS = {
  GATEWAY_URL: 'https://route.lgthinq.com:46030/v1/service/application/gateway-uri',
  SVC_CODE: 'SVC202',
  CLIENT_ID: 'LGAO221A02',
  OAUTH_SECRET_KEY: 'c053c2a6ddeb7ad97cb0eed0dcb31cf8',
  OAUTH_CLIENT_KEY: 'LGAO722A02',
  APPLICATION_KEY: '6V1V8H2BN5P9ZQGOI5DAQ92YZBDO3EK9',
  DATE_FORMAT: 'EEE, dd MMM yyyy HH:mm:ss z',
  DEFAULT_COUNTRY: 'US',
  DEFAULT_LANGUAGE: 'en-US',
};

class LGDeviceTester {
  constructor() {
    this.gatewayInfo = null;
    this.authData = null;
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  error(message) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
  }

  /**
   * Generate random string for x-message-id header
   */
  generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * Create signature for OAuth requests
   */
  createSignature(message, secret) {
    const crypto = require('crypto');
    return crypto.createHmac('sha1', secret).update(message).digest('base64');
  }

  /**
   * Get gateway information
   */
  async getGatewayInfo(country = 'US', language = 'en-US') {
    try {
      this.log(`Getting gateway info for ${country}/${language}...`);

      const headers = {
        'x-api-key': 'VGhpblEyLjAgU0VSVklDRQ==',
        'x-thinq-app-ver': '3.6.1200',
        'x-thinq-app-type': 'NUTS',
        'x-thinq-app-level': 'PRD',
        'x-thinq-app-os': 'ANDROID',
        'x-thinq-app-logintype': 'LGE',
        'x-service-code': 'SVC202',
        'x-country-code': country,
        'x-language-code': language,
        'x-service-phase': 'OP',
        'x-origin': 'app-native',
        'x-model-name': 'samsung/SM-G930L',
        'x-os-version': 'AOS/7.1.2',
        'x-app-version': 'LG ThinQ/3.6.12110',
        'x-message-id': this.generateRandomString(22),
        'user-agent': 'okhttp/3.14.9',
        'x-client-id': 'c713ea8e50f657534ff8b9d373dfebfc2ed70b88285c26b8ade49868c0b164d9',
      };

      const response = await axios.get(LG_API_CONSTANTS.GATEWAY_URL, {
        timeout: 30000,
        headers: headers,
      });

      if (response.data?.result) {
        this.gatewayInfo = {
          countryCode: country,
          languageCode: language,
          thinq2Uri: response.data.result.thinq2Uri,
          empUri: response.data.result.empTermsUri,
          empSpxUri: response.data.result.empSpxUri,
          thinq1Uri: response.data.result.thinq1Uri,
        };
        return this.gatewayInfo;
      } else {
        throw new Error(`Gateway request failed: ${response.data?.lgedmRoot?.returnMsg || 'Unknown error'}`);
      }
    } catch (error) {
      throw new Error(`Failed to get gateway info: ${error.message}`);
    }
  }

  /**
   * Authenticate using refresh token
   */
  async authenticateWithToken(refreshToken, country = 'US', language = 'en-US') {
    try {
      this.log('Authenticating with refresh token...');

      if (!this.gatewayInfo) {
        await this.getGatewayInfo(country, language);
      }

      const qs = require('querystring');
      const { DateTime } = require('luxon');

      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      };

      const timestamp = DateTime.utc().toRFC2822();
      const requestUrl = '/oauth/1.0/oauth2/token?' + qs.stringify(tokenData);

      const headers = {
        'x-lge-app-os': 'ADR',
        'x-lge-appkey': LG_API_CONSTANTS.CLIENT_ID,
        'x-lge-oauth-signature': this.createSignature(`${requestUrl}\n${timestamp}`, LG_API_CONSTANTS.OAUTH_SECRET_KEY),
        'x-lge-oauth-date': timestamp,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const lgeapiUrl = `https://${country.toLowerCase()}.lgeapi.com/`;

      const response = await axios.post(
        `${lgeapiUrl}oauth/1.0/oauth2/token`,
        qs.stringify(tokenData),
        { headers }
      );

      if (response.data?.access_token) {
        this.authData = {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || refreshToken,
          userId: 'unknown', // We'll skip getUserNumber for simplicity
          countryCode: country,
          languageCode: language,
          lgeapiUrl: response.data.oauth2_backend_url ? decodeURIComponent(response.data.oauth2_backend_url) : lgeapiUrl,
        };

        this.log('Authentication successful!');
        return this.authData;
      } else {
        throw new Error('Authentication failed: Invalid response');
      }
    } catch (error) {
      throw new Error(`Token authentication failed: ${error.message}`);
    }
  }

  /**
   * Get detailed device status with full data structure analysis
   */
  async getDetailedDeviceStatus(deviceId) {
    try {
      this.log(`\n=== GETTING DETAILED STATUS FOR DEVICE ${deviceId} ===`);

      const response = await axios.get(
        `${this.gatewayInfo.thinq2Uri}/service/devices/${deviceId}`,
        {
          timeout: 30000,
          headers: {
            'x-api-key': 'VGhpblEyLjAgU0VSVklDRQ==',
            'x-thinq-app-ver': '3.6.1200',
            'x-thinq-app-type': 'NUTS',
            'x-thinq-app-level': 'PRD',
            'x-thinq-app-os': 'ANDROID',
            'x-thinq-app-logintype': 'LGE',
            'x-service-code': 'SVC202',
            'x-country-code': this.authData.countryCode,
            'x-language-code': this.authData.languageCode,
            'x-service-phase': 'OP',
            'x-origin': 'app-native',
            'x-model-name': 'samsung/SM-G930L',
            'x-os-version': 'AOS/7.1.2',
            'x-app-version': 'LG ThinQ/3.6.12110',
            'x-message-id': this.generateRandomString(22),
            'user-agent': 'okhttp/3.14.9',
            'x-emp-token': this.authData.accessToken,
            'x-user-no': this.authData.userId,
            'x-client-id': LG_API_CONSTANTS.CLIENT_ID,
          },
        },
      );

      const status = response.data?.result || {};
      this.log(`Full device status: ${JSON.stringify(status, null, 2)}`);

      // Analyze the snapshot data in detail
      if (status.snapshot) {
        this.log(`\n--- SNAPSHOT ANALYSIS ---`);
        const snapshot = status.snapshot;

        Object.keys(snapshot).forEach(key => {
          const value = snapshot[key];
          this.log(`${key}: ${JSON.stringify(value)} (type: ${typeof value})`);
        });

        // Look for common fan-related keys
        const fanKeys = Object.keys(snapshot).filter(key =>
          key.toLowerCase().includes('wind') ||
          key.toLowerCase().includes('speed') ||
          key.toLowerCase().includes('operation') ||
          key.toLowerCase().includes('power') ||
          key.toLowerCase().includes('fan') ||
          key.toLowerCase().includes('air')
        );

        if (fanKeys.length > 0) {
          this.log(`\n--- POTENTIAL FAN CONTROL KEYS ---`);
          fanKeys.forEach(key => {
            this.log(`${key}: ${JSON.stringify(snapshot[key])}`);
          });
        }
      }

      // Check device model and type info
      if (status.deviceInfo) {
        this.log(`\n--- DEVICE INFO ---`);
        this.log(`Model: ${status.deviceInfo.modelName}`);
        this.log(`Type: ${status.deviceInfo.deviceType}`);
        this.log(`Network Type: ${status.deviceInfo.networkType}`);
      }

      return status;
    } catch (error) {
      this.error(`Failed to get device status: ${error.message}`);
      if (error.response) {
        this.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  }

  /**
   * Send command to device with detailed logging
   */
  async sendCommand(deviceId, command) {
    try {
      const requestData = {
        ctrlKey: 'basicCtrl',
        command: 'Set',
        ...command,
      };

      this.log(`Sending command: ${JSON.stringify(requestData, null, 2)}`);

      const response = await axios.post(
        `${this.gatewayInfo.thinq2Uri}/service/devices/${deviceId}/control-sync`,
        requestData,
        {
          timeout: 30000,
          headers: {
            'x-api-key': 'VGhpblEyLjAgU0VSVklDRQ==',
            'x-thinq-app-ver': '3.6.1200',
            'x-thinq-app-type': 'NUTS',
            'x-thinq-app-level': 'PRD',
            'x-thinq-app-os': 'ANDROID',
            'x-thinq-app-logintype': 'LGE',
            'x-service-code': 'SVC202',
            'x-country-code': this.authData.countryCode,
            'x-language-code': this.authData.languageCode,
            'x-service-phase': 'OP',
            'x-origin': 'app-native',
            'x-model-name': 'samsung/SM-G930L',
            'x-os-version': 'AOS/7.1.2',
            'x-app-version': 'LG ThinQ/3.6.12110',
            'x-message-id': this.generateRandomString(22),
            'user-agent': 'okhttp/3.14.9',
            'x-emp-token': this.authData.accessToken,
            'x-user-no': this.authData.userId,
            'x-client-id': LG_API_CONSTANTS.CLIENT_ID,
            'Content-Type': 'application/json',
          },
        },
      );

      this.log(`Command response: ${JSON.stringify(response.data, null, 2)}`);
      return response.data?.result || response.data;
    } catch (error) {
      this.error(`Command failed: ${error.message}`);
      if (error.response) {
        this.error(`Response status: ${error.response.status}`);
        this.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  }

  /**
   * Test various speed control commands to find the correct one
   */
  async testSpeedControl(deviceId) {
    this.log(`\n=== TESTING SPEED CONTROL FOR DEVICE ${deviceId} ===`);

    // Test different data keys and values for speed control
    const speedTests = [
      // Common ceiling fan speed data keys
      { dataKey: 'airState.windStrength', values: [0, 1, 2, 3, 4] },
      { dataKey: 'fanState.windStrength', values: [0, 1, 2, 3, 4] },
      { dataKey: 'fanState.speed', values: [0, 1, 2, 3, 4] },
      { dataKey: 'basicCtrl.speed', values: [0, 1, 2, 3, 4] },
      { dataKey: 'speed', values: [0, 1, 2, 3, 4] },
      { dataKey: 'windStrength', values: [0, 1, 2, 3, 4] },

      // Alternative value ranges
      { dataKey: 'airState.windStrength', values: [0, 1, 2, 3] },
      { dataKey: 'fanState.windStrength', values: [0, 1, 2, 3] },

      // Percentage values
      { dataKey: 'airState.windStrength', values: [0, 25, 50, 75, 100] },
      { dataKey: 'fanState.windStrength', values: [0, 25, 50, 75, 100] },

      // String values
      { dataKey: 'airState.windStrength', values: ['0', '1', '2', '3', '4'] },
      { dataKey: 'fanState.windStrength', values: ['0', '1', '2', '3', '4'] },
    ];

    const successfulCommands = [];

    for (const test of speedTests) {
      this.log(`\n--- Testing dataKey: ${test.dataKey} ---`);

      for (const value of test.values) {
        try {
          this.log(`Trying ${test.dataKey} = ${value}...`);

          const command = {
            dataKey: test.dataKey,
            dataValue: value,
          };

          const result = await this.sendCommand(deviceId, command);

          if (result && !result.error) {
            this.log(`✅ SUCCESS: ${test.dataKey} = ${value} worked!`);
            successfulCommands.push({ dataKey: test.dataKey, dataValue: value, result });

            // Wait and check status
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.getDetailedDeviceStatus(deviceId);
          } else {
            this.log(`❌ FAILED: ${test.dataKey} = ${value}`);
          }

          // Wait between commands
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          this.log(`❌ ERROR: ${test.dataKey} = ${value} - ${error.message}`);
        }
      }
    }

    return successfulCommands;
  }

  /**
   * Test various on/off commands
   */
  async testPowerControl(deviceId) {
    this.log(`\n=== TESTING POWER CONTROL FOR DEVICE ${deviceId} ===`);

    const powerTests = [
      { dataKey: 'airState.operation', values: [0, 1] },
      { dataKey: 'fanState.operation', values: [0, 1] },
      { dataKey: 'basicCtrl.operation', values: [0, 1] },
      { dataKey: 'operation', values: [0, 1] },
      { dataKey: 'power', values: [0, 1] },
      { dataKey: 'airState.power', values: [0, 1] },
      { dataKey: 'fanState.power', values: [0, 1] },
    ];

    const successfulCommands = [];

    for (const test of powerTests) {
      this.log(`\n--- Testing power dataKey: ${test.dataKey} ---`);

      for (const value of test.values) {
        try {
          this.log(`Trying ${test.dataKey} = ${value}...`);

          const command = {
            dataKey: test.dataKey,
            dataValue: value,
          };

          const result = await this.sendCommand(deviceId, command);

          if (result && !result.error) {
            this.log(`✅ SUCCESS: ${test.dataKey} = ${value} worked!`);
            successfulCommands.push({ dataKey: test.dataKey, dataValue: value, result });

            // Wait and check status
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.getDetailedDeviceStatus(deviceId);
          } else {
            this.log(`❌ FAILED: ${test.dataKey} = ${value}`);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          this.log(`❌ ERROR: ${test.dataKey} = ${value} - ${error.message}`);
        }
      }
    }

    return successfulCommands;
  }

  /**
   * Run comprehensive device tests
   */
  async runTests(deviceId) {
    this.log(`\n${'█'.repeat(80)}`);
    this.log(`██  COMPREHENSIVE DEVICE TESTING FOR ${deviceId}  ██`);
    this.log(`${'█'.repeat(80)}`);

    try {
      // 1. Get initial status
      this.log(`\n🔍 Step 1: Getting initial device status...`);
      await this.getDetailedDeviceStatus(deviceId);

      // 2. Test power control
      this.log(`\n⚡ Step 2: Testing power control...`);
      const powerResults = await this.testPowerControl(deviceId);

      // 3. Test speed control
      this.log(`\n🌪️  Step 3: Testing speed control...`);
      const speedResults = await this.testSpeedControl(deviceId);

      // 4. Final status check
      this.log(`\n🔍 Step 4: Getting final device status...`);
      await this.getDetailedDeviceStatus(deviceId);

      // Generate report
      this.log(`\n📊 FINAL REPORT FOR DEVICE ${deviceId}`);
      this.log(`===============================================`);
      this.log(`Power control commands that worked: ${powerResults.length}`);
      if (powerResults.length > 0) {
        powerResults.forEach(cmd => {
          this.log(`  ✅ ${cmd.dataKey} = ${cmd.dataValue}`);
        });
      }

      this.log(`Speed control commands that worked: ${speedResults.length}`);
      if (speedResults.length > 0) {
        speedResults.forEach(cmd => {
          this.log(`  ✅ ${cmd.dataKey} = ${cmd.dataValue}`);
        });
      }

      if (powerResults.length === 0 && speedResults.length === 0) {
        this.log(`❌ No working control commands found. This device may not be controllable.`);
      } else {
        this.log(`\n🎉 SUCCESS! Found working control commands for this device.`);
        this.log(`\nFor your Homebridge plugin configuration:`);
        if (powerResults.length > 0) {
          this.log(`  Power Control: Use "${powerResults[0].dataKey}" with values 0/1`);
        }
        if (speedResults.length > 0) {
          this.log(`  Speed Control: Use "${speedResults[0].dataKey}" with appropriate values`);
        }
      }

      return {
        deviceId,
        powerCommands: powerResults,
        speedCommands: speedResults
      };

    } catch (error) {
      this.error(`Device testing failed: ${error.message}`);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log('Usage: node test-device.js <device_id> <refresh_token> <country> <language>');
    console.log('Example: node test-device.js abc123def456 your_refresh_token_here US en-US');
    console.log('\nThis script will test various control commands on a specific LG device to find working ones.');
    process.exit(1);
  }

  const [deviceId, refreshToken, country, language] = args;

  const tester = new LGDeviceTester();

  try {
    console.log('='.repeat(60));
    console.log('LG Device Control Testing');
    console.log('='.repeat(60));
    console.log(`Device ID: ${deviceId}`);
    console.log(`Country: ${country}`);
    console.log(`Language: ${language}`);

    // Step 1: Get gateway info
    await tester.getGatewayInfo(country, language);

    // Step 2: Authenticate with refresh token
    await tester.authenticateWithToken(refreshToken, country, language);

    // Step 3: Run comprehensive tests
    const results = await tester.runTests(deviceId);

    console.log('\n' + '='.repeat(60));
    console.log('TESTING COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('TESTING FAILED');
    console.log('='.repeat(60));
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main();
}