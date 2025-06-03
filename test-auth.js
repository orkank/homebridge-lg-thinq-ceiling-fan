#!/usr/bin/env node

const axios = require('axios');

// LG ThinQ API Constants (updated to match working plugin)
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

// Known working country/language combinations
const SUPPORTED_REGIONS = [
  { country: 'US', language: 'en-US', name: 'United States' },
  { country: 'KR', language: 'ko-KR', name: 'South Korea' },
  { country: 'EU', language: 'en-GB', name: 'Europe (UK)' },
  { country: 'EU', language: 'de-DE', name: 'Europe (Germany)' },
  { country: 'EU', language: 'fr-FR', name: 'Europe (France)' },
  { country: 'EU', language: 'it-IT', name: 'Europe (Italy)' },
  { country: 'EU', language: 'es-ES', name: 'Europe (Spain)' },
  { country: 'CA', language: 'en-CA', name: 'Canada' },
  { country: 'AU', language: 'en-AU', name: 'Australia' },
  { country: 'MY', language: 'en-MY', name: 'Malaysia' },
  { country: 'TH', language: 'th-TH', name: 'Thailand' },
  { country: 'SG', language: 'en-SG', name: 'Singapore' },
];

class LGThinQTester {
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
   * Test multiple regions to find a working one
   */
  async findWorkingRegion() {
    this.log('Testing supported regions...');

    for (const region of SUPPORTED_REGIONS) {
      try {
        this.log(`\nTrying ${region.name} (${region.country}/${region.language})...`);
        const gatewayInfo = await this.getGatewayInfo(region.country, region.language, false);
        if (gatewayInfo) {
          this.log(`✅ SUCCESS: ${region.name} is supported!`);
          return region;
        }
      } catch (error) {
        this.log(`❌ FAILED: ${region.name} - ${error.message}`);
      }
    }

    throw new Error('No supported regions found');
  }

  /**
   * Get gateway information for the specified country and language
   */
  async getGatewayInfo(country = 'US', language = 'en-US', throwOnError = true) {
    try {
      this.log(`Getting gateway info for ${country}/${language}...`);

      // Build headers exactly like the working plugin (no query parameters!)
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

      this.log(`Request headers: ${JSON.stringify(headers, null, 2)}`);

      // Use GET request with NO query parameters, just headers (like the working plugin)
      const response = await axios.get(LG_API_CONSTANTS.GATEWAY_URL, {
        timeout: 30000,
        headers: headers,
      });

      this.log(`Response status: ${response.status}`);
      this.log(`Response data: ${JSON.stringify(response.data, null, 2)}`);

      // Check the response structure - the working plugin expects .result
      if (response.data?.result) {
        this.gatewayInfo = {
          countryCode: country,
          languageCode: language,
          thinq2Uri: response.data.result.thinq2Uri,
          empUri: response.data.result.empTermsUri, // Note: empTermsUri, not empUri
          empSpxUri: response.data.result.empSpxUri,
          thinq1Uri: response.data.result.thinq1Uri,
        };

        this.log('Gateway info obtained successfully:');
        this.log(`  ThinQ2 URI: ${this.gatewayInfo.thinq2Uri}`);
        this.log(`  EMP Terms URI: ${this.gatewayInfo.empUri}`);
        this.log(`  EMP SPX URI: ${this.gatewayInfo.empSpxUri}`);
        this.log(`  ThinQ1 URI: ${this.gatewayInfo.thinq1Uri}`);

        return this.gatewayInfo;
      } else {
        const errorMsg = `Gateway request failed: ${response.data?.lgedmRoot?.returnMsg || 'Unknown error'} (Code: ${response.data?.resultCode || 'Unknown'})`;
        if (throwOnError) {
          throw new Error(errorMsg);
        }
        this.log(errorMsg);
        return null;
      }
    } catch (error) {
      const errorMessage = `Failed to get gateway info: ${error.message}`;
      if (throwOnError) {
        this.error(errorMessage);
        if (error.response) {
          this.error(`Response status: ${error.response.status}`);
          this.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        throw error;
      } else {
        this.log(errorMessage);
        return null;
      }
    }
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
   * Create signature for OAuth requests (like the working plugin)
   */
  createSignature(message, secret) {
    const crypto = require('crypto');
    return crypto.createHmac('sha1', secret).update(message).digest('base64');
  }

  /**
   * Authenticate with LG ThinQ using username and password
   */
  async authenticate(username, password, country = 'US', language = 'en-US') {
    try {
      this.log(`Authenticating user: ${username} for ${country}/${language}...`);

      if (!this.gatewayInfo) {
        await this.getGatewayInfo(country, language);
      }

      // Step 1: Hash the password (like the working plugin)
      const crypto = require('crypto');
      const hash = crypto.createHash('sha512');
      const hashedPassword = hash.update(password).digest('hex');

      this.log('Step 1: Performing preLogin...');

      // Default EMP headers (like the working plugin)
      const defaultEmpHeaders = {
        'Accept': 'application/json',
        'X-Application-Key': LG_API_CONSTANTS.APPLICATION_KEY,
        'X-Client-App-Key': LG_API_CONSTANTS.CLIENT_ID,
        'X-Lge-Svccode': 'SVC709',
        'X-Device-Type': 'M01',
        'X-Device-Platform': 'ADR',
        'X-Device-Language-Type': 'IETF',
        'X-Device-Publish-Flag': 'Y',
        'X-Device-Country': country,
        'X-Device-Language': language,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      // PreLogin request (like the working plugin)
      const preLoginData = {
        'user_auth2': hashedPassword,
        'log_param': 'login request / user_id : ' + username + ' / third_party : null / svc_list : SVC202,SVC710 / 3rd_service : ',
      };

      const qs = require('querystring');
      const preLoginResponse = await axios.post(
        this.gatewayInfo.empSpxUri + '/preLogin',
        qs.stringify(preLoginData),
        {
          headers: defaultEmpHeaders,
          timeout: 30000
        }
      );

      if (!preLoginResponse.data?.signature || !preLoginResponse.data?.tStamp) {
        throw new Error('PreLogin failed - missing signature or timestamp');
      }

      this.log('PreLogin successful, proceeding with main login...');

      // Step 2: Main login with signature and timestamp
      const loginHeaders = {
        ...defaultEmpHeaders,
        'X-Signature': preLoginResponse.data.signature,
        'X-Timestamp': preLoginResponse.data.tStamp,
      };

      const loginData = {
        'user_auth2': preLoginResponse.data.encrypted_pw,
        'password_hash_prameter_flag': 'Y',
        'svc_list': 'SVC202,SVC710',
      };

      const loginUrl = `${this.gatewayInfo.empUri}/emp/v2.0/account/session/${encodeURIComponent(username)}`;
      this.log(`Making login request to: ${loginUrl}`);

      const loginResponse = await axios.post(
        loginUrl,
        qs.stringify(loginData),
        {
          headers: loginHeaders,
          timeout: 30000
        }
      );

      if (!loginResponse.data?.account) {
        throw new Error('Invalid credentials or account not found');
      }

      this.log('EMP authentication successful!');
      this.log(`Account info: ${JSON.stringify(loginResponse.data.account, null, 2)}`);

      // Step 3: Get OAuth2 authorization code (like the working plugin)
      this.log('Step 3: Getting OAuth2 authorization code...');

      const account = loginResponse.data.account;

      // Get secret key for EMP signature (like the working plugin)
      const empSearchKeyUrl = this.gatewayInfo.empSpxUri + '/searchKey?key_name=OAUTH_SECRETKEY&sever_type=OP';
      const secretKeyResponse = await axios.get(empSearchKeyUrl);
      const secretKey = secretKeyResponse.data.returnData;

      this.log('Retrieved OAuth secret key');

      // Prepare EMP OAuth data (like the working plugin)
      const empOAuthData = {
        account_type: account.userIDType,
        client_id: LG_API_CONSTANTS.CLIENT_ID,
        country_code: account.country,
        redirect_uri: 'lgaccount.lgsmartthinq:/',
        response_type: 'code',
        state: '12345',
        username: account.userID,
      };

      // Build EMP OAuth URL (like the working plugin)
      const empOAuthUrl = new URL('https://emp-oauth.lgecloud.com/emp/oauth2/authorize/empsession?' + qs.stringify(empOAuthData));

      // Create signature for EMP OAuth request
      const luxon = require('luxon');
      const timestamp = luxon.DateTime.utc().toRFC2822();
      const signature = this.createSignature(`${empOAuthUrl.pathname}${empOAuthUrl.search}\n${timestamp}`, secretKey);

      const empOAuthHeaders = {
        'lgemp-x-app-key': LG_API_CONSTANTS.OAUTH_CLIENT_KEY,
        'lgemp-x-date': timestamp,
        'lgemp-x-session-key': account.loginSessionID,
        'lgemp-x-signature': signature,
        'Accept': 'application/json',
        'X-Device-Type': 'M01',
        'X-Device-Platform': 'ADR',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Access-Control-Allow-Origin': '*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36 Edg/93.0.961.44',
      };

      // Get authorization code
      const authorizeResponse = await axios.get(empOAuthUrl.href, {
        headers: empOAuthHeaders,
        timeout: 30000
      });

      if (authorizeResponse.data.status !== 1) {
        throw new Error('Authorization failed: ' + (authorizeResponse.data.message || 'Unknown error'));
      }

      this.log('Got authorization response, extracting code...');

      // Extract authorization code from redirect URI
      const redirectUri = new URL(authorizeResponse.data.redirect_uri);
      const authCode = redirectUri.searchParams.get('code');
      const oauthBackendUrl = redirectUri.searchParams.get('oauth2_backend_url');

      if (!authCode || !oauthBackendUrl) {
        throw new Error('Failed to extract authorization code or backend URL');
      }

      this.log('Step 4: Exchanging authorization code for tokens...');

      // Exchange authorization code for tokens (like the working plugin)
      const tokenData = {
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: empOAuthData.redirect_uri,
      };

      const requestUrl = '/oauth/1.0/oauth2/token?' + qs.stringify(tokenData);
      const tokenResponse = await axios.post(
        oauthBackendUrl + 'oauth/1.0/oauth2/token',
        qs.stringify(tokenData),
        {
          headers: {
            'x-lge-app-os': 'ADR',
            'x-lge-appkey': LG_API_CONSTANTS.CLIENT_ID,
            'x-lge-oauth-signature': this.createSignature(`${requestUrl}\n${timestamp}`, LG_API_CONSTANTS.OAUTH_SECRET_KEY),
            'x-lge-oauth-date': timestamp,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000
        }
      );

      if (!tokenResponse.data?.access_token) {
        throw new Error('Failed to obtain access token');
      }

      this.authData = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        userId: tokenResponse.data.user_number || '',
        countryCode: country,
        languageCode: language,
        lgeapiUrl: decodeURIComponent(tokenResponse.data.oauth2_backend_url),
      };

      this.log('OAuth2 authentication successful!');
      this.log(`Access Token: ${this.authData.accessToken.substring(0, 20)}...`);
      this.log(`Refresh Token: ${this.authData.refreshToken}`);
      this.log(`User ID: ${this.authData.userId}`);
      this.log(`LGE API URL: ${this.authData.lgeapiUrl}`);

      // Step 5: Get user number (like the working plugin)
      this.log('Step 5: Getting user number...');
      const userId = await this.getUserNumber();
      this.authData.userId = userId;
      this.log(`Updated User ID: ${this.authData.userId}`);

      return this.authData;

    } catch (error) {
      this.error(`Authentication failed: ${error.message}`);
      if (error.response) {
        this.error(`Response status: ${error.response.status}`);
        this.error(`Response headers: ${JSON.stringify(error.response.headers, null, 2)}`);
        this.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  }

  /**
   * Test refresh token (like the working plugin)
   */
  async testRefreshToken(refreshToken = null) {
    try {
      const tokenToTest = refreshToken || this.authData?.refreshToken;
      if (!tokenToTest) {
        throw new Error('No refresh token available to test');
      }

      this.log('Testing refresh token...');

      // Use the exact same approach as the working plugin
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: tokenToTest,
      };

      const response = await axios.post(`${this.authData.lgeapiUrl}oauth/1.0/oauth2/token`, tokenData, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'x-lge-app-os': 'ADR',
          'x-lge-appkey': LG_API_CONSTANTS.CLIENT_ID,
          'Accept': 'application/json',
        },
      });

      if (response.data?.access_token) {
        this.log('Refresh token is valid!');
        this.log(`New Access Token: ${response.data.access_token.substring(0, 20)}...`);

        // Update our access token for subsequent calls
        this.authData.accessToken = response.data.access_token;
        return true;
      } else {
        throw new Error('Invalid token response');
      }

    } catch (error) {
      this.error(`Token test failed: ${error.message}`);
      if (error.response) {
        this.error(`Response status: ${error.response.status}`);
        this.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      return false;
    }
  }

  /**
   * Discover devices (like the working plugin)
   */
  async discoverDevices() {
    try {
      if (!this.authData) {
        throw new Error('Not authenticated. Call authenticate() first.');
      }

      this.log('Discovering devices...');

      // Step 1: Get homes first (like the working plugin)
      const homesResponse = await axios.get(`${this.gatewayInfo.thinq2Uri}/service/homes`, {
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
      });

      const homes = homesResponse.data?.result?.item || [];
      this.log(`Found ${homes.length} homes`);

      // Step 2: Get devices from each home (like the working plugin)
      const allDevices = [];
      for (const home of homes) {
        this.log(`Getting devices from home: ${home.homeId}`);

        const devicesResponse = await axios.get(`${this.gatewayInfo.thinq2Uri}/service/homes/${home.homeId}`, {
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
        });

        const homeDevices = devicesResponse.data?.result?.devices || [];
        allDevices.push(...homeDevices);
      }

      this.log(`Found ${allDevices.length} total devices:`);

      allDevices.forEach((device, index) => {
        this.log(`\nDevice ${index + 1}:`);
        this.log(`  Device ID: ${device.deviceId}`);
        this.log(`  Alias: ${device.alias}`);
        this.log(`  Type: ${device.applianceType}`);
        this.log(`  Device Code: ${device.deviceCode}`);
        this.log(`  Online: ${device.online}`);
        this.log(`  Platform: ${device.platformType}`);
        this.log(`  State: ${device.deviceState}`);

        // Check if it might be a ceiling fan
        const isFan = this.isCeilingFan(device);
        this.log(`  Likely Ceiling Fan: ${isFan ? 'YES' : 'NO'}`);
      });

      const ceilingFans = allDevices.filter(device => this.isCeilingFan(device));
      this.log(`\nFound ${ceilingFans.length} potential ceiling fans:`);
      ceilingFans.forEach(fan => {
        this.log(`  - ${fan.alias} (${fan.deviceId})`);
      });

      return allDevices;

    } catch (error) {
      this.error(`Device discovery failed: ${error.message}`);
      if (error.response) {
        this.error(`Response status: ${error.response.status}`);
        this.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  }

  /**
   * Check if a device is likely a ceiling fan
   */
  isCeilingFan(device) {
    const deviceType = device.applianceType?.toLowerCase() || '';
    const deviceCode = device.deviceCode?.toLowerCase() || '';
    const alias = device.alias?.toLowerCase() || '';

    // Look for ceiling fan indicators
    const fanKeywords = ['fan', 'ceiling', 'air_circulator', 'ventilator', 'vantilatör', 'tavan'];

    return fanKeywords.some(keyword =>
      deviceType.includes(keyword) ||
      deviceCode.includes(keyword) ||
      alias.includes(keyword)
    );
  }

  /**
   * Get user number (like the working plugin)
   */
  async getUserNumber() {
    try {
      const luxon = require('luxon');
      const timestamp = luxon.DateTime.utc().toRFC2822();
      const signature = this.createSignature(`/users/profile\n${timestamp}`, LG_API_CONSTANTS.OAUTH_SECRET_KEY);

      const headers = {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + this.authData.accessToken,
        'X-Lge-Svccode': 'SVC202',
        'X-Application-Key': LG_API_CONSTANTS.APPLICATION_KEY,
        'lgemp-x-app-key': LG_API_CONSTANTS.CLIENT_ID,
        'X-Device-Type': 'M01',
        'X-Device-Platform': 'ADR',
        'x-lge-oauth-date': timestamp,
        'x-lge-oauth-signature': signature,
      };

      const response = await axios.get(`${this.authData.lgeapiUrl}users/profile`, {
        headers: headers,
        timeout: 30000
      });

      if (response.data?.status === 2) {
        throw new Error(response.data.message || 'Failed to get user profile');
      }

      return response.data.account.userNo;
    } catch (error) {
      this.error(`Failed to get user number: ${error.message}`);
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

    if (!this.authData || !this.gatewayInfo) {
      throw new Error('Not authenticated');
    }

    // First, get current status to understand the device structure
    await this.getDetailedDeviceStatus(deviceId);

    // Test different data keys and values for speed control
    const speedTests = [
      // Common ceiling fan speed data keys
      // { dataKey: 'airState.windStrength', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'fanState.windStrength', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'fanState.speed', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'basicCtrl.speed', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'speed', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'windStrength', values: [0, 1, 2, 3, 4] },

      // // Alternative value ranges
      // { dataKey: 'airState.windStrength', values: [0, 1, 2, 3] },
      // { dataKey: 'fanState.windStrength', values: [0, 1, 2, 3] },

      // // Percentage values
      // { dataKey: 'airState.windStrength', values: [0, 25, 50, 75, 100] },
      // { dataKey: 'fanState.windStrength', values: [0, 25, 50, 75, 100] },

      // // String values
      // { dataKey: 'airState.windStrength', values: ['0', '1', '2', '3', '4'] },
      // { dataKey: 'fanState.windStrength', values: ['0', '1', '2', '3', '4'] },

      // // Alternative data keys from other LG devices
      // { dataKey: 'airState.reservation.sleepTime', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'airState.quality.overall', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'airState.operation', values: [0, 1] }, // Just on/off test

      // // Based on search results - AC wind direction and additional keys
      // { dataKey: 'airState.wDir.vStep', values: [0, 1, 2, 3, 4, 5, 6] },
      // { dataKey: 'airState.wDir.hStep', values: [0, 1, 2, 3, 4, 5, 6] },
      // { dataKey: 'airState.wMode.jet', values: [0, 1] },
      // { dataKey: 'airState.wMode.airClean', values: [0, 1] },
      // { dataKey: 'airState.powerSave.basic', values: [0, 1] },

      // // More ceiling fan specific attempts
      // { dataKey: 'fanState.operation', values: [0, 1] },
      // { dataKey: 'fanState.mode', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'fanState.level', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'fanState.intensity', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'airState.fanSpeed', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'airState.fanLevel', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'airState.fanMode', values: [0, 1, 2, 3, 4] },

      // // Try control keys that might be specific to fans
      // { dataKey: 'circulator.speed', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'circulator.operation', values: [0, 1] },
      // { dataKey: 'airCirculator.speed', values: [0, 1, 2, 3, 4] },
      // { dataKey: 'airCirculator.operation', values: [0, 1] },

      // Try with different control keys (not just basicCtrl)
      // { dataKey: 'airState.windStrength', values: [0, 1, 2, 3, 4], ctrlKey: 'airCtrl' },
      // { dataKey: 'fanState.windStrength', values: [0, 1, 2, 3, 4], ctrlKey: 'fanCtrl' },
      // { dataKey: 'airState.windStrength', values: [0, 1, 2, 3, 4], ctrlKey: 'circulator' },

      // // Alternative command structures
      // { dataKey: 'windStrength', values: [0, 1, 2, 3, 4], command: 'Control' },
      // { dataKey: 'fanSpeed', values: [0, 1, 2, 3, 4], command: 'Control' },

      // // From search results - fan control with 6 levels
      { dataKey: 'airState.windStrength', values: [2, 4, 6, 7] }, // Even numbers like in search
      // { dataKey: 'fanState.windStrength', values: [0, 2, 4, 6] },
    ];

    const successfulCommands = [];
    const failedCommands = [];

    for (const test of speedTests) {
      this.log(`\n--- Testing dataKey: ${test.dataKey} ---`);

      for (const value of test.values) {
        try {
          this.log(`Trying ${test.dataKey} = ${value}...`);

          const command = {
            dataKey: test.dataKey,
            dataValue: value,
            ctrlKey: test.ctrlKey,
            command: test.command,
          };

          const result = await this.sendCommand(deviceId, command);

          if (result && !result.error) {
            this.log(`✅ SUCCESS: ${test.dataKey} = ${value} worked!`);
            successfulCommands.push({ dataKey: test.dataKey, dataValue: value, result });

            // Wait a bit and check if status changed
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.getDetailedDeviceStatus(deviceId);
          } else {
            this.log(`❌ FAILED: ${test.dataKey} = ${value} - ${JSON.stringify(result)}`);
            failedCommands.push({ dataKey: test.dataKey, dataValue: value, error: result });
          }

          // Wait between commands to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          this.log(`❌ ERROR: ${test.dataKey} = ${value} - ${error.message}`);
          failedCommands.push({ dataKey: test.dataKey, dataValue: value, error: error.message });
        }
      }
    }

    // Summary
    this.log(`\n=== SPEED CONTROL TEST SUMMARY ===`);
    this.log(`Successful commands: ${successfulCommands.length}`);
    this.log(`Failed commands: ${failedCommands.length}`);

    if (successfulCommands.length > 0) {
      this.log(`\n✅ WORKING COMMANDS:`);
      successfulCommands.forEach(cmd => {
        this.log(`  ${cmd.dataKey} = ${cmd.dataValue}`);
      });
    }

    return { successful: successfulCommands, failed: failedCommands };
  }

  /**
   * Test various on/off commands
   */
  async testPowerControl(deviceId) {
    this.log(`\n=== TESTING POWER CONTROL FOR DEVICE ${deviceId} ===`);

    const powerTests = [
      { dataKey: 'airState.operation', values: [0, 1] },
      // { dataKey: 'fanState.operation', values: [0, 1] },
      // { dataKey: 'basicCtrl.operation', values: [0, 1] },
      // { dataKey: 'operation', values: [0, 1] },
      // { dataKey: 'power', values: [0, 1] },
      // { dataKey: 'airState.power', values: [0, 1] },
      // { dataKey: 'fanState.power', values: [0, 1] },

      // // Boolean values
      // { dataKey: 'airState.operation', values: [false, true] },
      // { dataKey: 'fanState.operation', values: [false, true] },

      // // String values
      // { dataKey: 'airState.operation', values: ['0', '1'] },
      // { dataKey: 'fanState.operation', values: ['0', '1'] },
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
        ctrlKey: command.ctrlKey || 'basicCtrl',
        command: command.command || 'Set',
        dataKey: command.dataKey,
        dataValue: command.dataValue,
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
   * Test all device control functions for a specific device
   */
  async testDeviceControls(deviceId) {
    this.log(`\n████████████████████████████████████████████████████████████████`);
    this.log(`██  COMPREHENSIVE DEVICE CONTROL TESTING FOR ${deviceId}  ██`);
    this.log(`████████████████████████████████████████████████████████████████`);

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

      this.log(`Speed control commands that worked: ${speedResults.successful.length}`);
      if (speedResults.successful.length > 0) {
        speedResults.successful.forEach(cmd => {
          this.log(`  ✅ ${cmd.dataKey} = ${cmd.dataValue}`);
        });
      }

      if (powerResults.length === 0 && speedResults.successful.length === 0) {
        this.log(`❌ No working control commands found. This might not be a controllable ceiling fan.`);
      }

      return {
        deviceId,
        powerCommands: powerResults,
        speedCommands: speedResults.successful,
        allSpeedTests: speedResults
      };

    } catch (error) {
      this.error(`Device control testing failed: ${error.message}`);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node test-auth.js <username> <password> [country] [language]');
    console.log('Example: node test-auth.js your.email@example.com yourpassword');
    console.log('Example: node test-auth.js your.email@example.com yourpassword US en-US');
    console.log('\nNote: If country/language are not specified, the script will test multiple regions to find a working one.');
    console.log('\nAfter authentication, you will be able to test individual devices for control commands.');
    process.exit(1);
  }

  const [username, password, country, language] = args;

  const tester = new LGThinQTester();

  try {
    console.log('='.repeat(60));
    console.log('LG ThinQ Authentication & Device Testing');
    console.log('='.repeat(60));

    let workingRegion = null;

    if (country && language) {
      // User specified region - test it first
      try {
        console.log(`\nTesting user-specified region: ${country}/${language}`);
        await tester.getGatewayInfo(country, language);
        workingRegion = { country, language, name: `${country}/${language}` };
      } catch (error) {
        console.log(`\nUser-specified region ${country}/${language} failed: ${error.message}`);
        console.log('Will try to find a working region automatically...');
      }
    }

    if (!workingRegion) {
      // Find a working region
      workingRegion = await tester.findWorkingRegion();
    }

    console.log(`\nUsing region: ${workingRegion.name} (${workingRegion.country}/${workingRegion.language})`);

    // Make sure gateway info is set with the working region
    if (!tester.gatewayInfo || tester.gatewayInfo.countryCode !== workingRegion.country) {
      await tester.getGatewayInfo(workingRegion.country, workingRegion.language);
    }

    // Step 2: Authenticate
    const authData = await tester.authenticate(username, password, workingRegion.country, workingRegion.language);

    // Step 3: Test refresh token
    await tester.testRefreshToken();

    // Step 4: Discover devices
    const devices = await tester.discoverDevices();

    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS! Authentication and device discovery completed.');
    console.log('='.repeat(60));
    console.log(`\nWorking Region: ${workingRegion.name}`);
    console.log(`Country Code: ${workingRegion.country}`);
    console.log(`Language Code: ${workingRegion.language}`);
    console.log('\nYour refresh token for the plugin configuration:');
    console.log(authData.refreshToken);

    // Interactive device testing
    if (devices && devices.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('DEVICE CONTROL TESTING');
      console.log('='.repeat(60));

      console.log('\nAvailable devices for testing:');
      devices.forEach((device, index) => {
        const fanIndicator = tester.isCeilingFan(device) ? ' 🌪️ (Potential Fan)' : '';
        console.log(`${index + 1}. ${device.alias} (${device.deviceId})${fanIndicator}`);
        console.log(`   Model: ${device.modelName || 'Unknown'}`);
        console.log(`   Type: ${device.deviceType || 'Unknown'}`);
      });

      // For non-interactive environments, test all potential fans automatically
      const potentialFans = devices.filter(device => tester.isCeilingFan(device));

      if (potentialFans.length > 0) {
        console.log(`\n🌪️  Found ${potentialFans.length} potential ceiling fan(s). Testing automatically...`);

        const allResults = [];

        for (const device of potentialFans) {
          try {
            console.log(`\n${'='.repeat(80)}`);
            console.log(`Testing device: ${device.alias} (${device.deviceId})`);
            console.log(`${'='.repeat(80)}`);

            const result = await tester.testDeviceControls(device.deviceId);
            allResults.push(result);

            // Wait between device tests
            await new Promise(resolve => setTimeout(resolve, 3000));

          } catch (error) {
            console.error(`Failed to test device ${device.deviceId}: ${error.message}`);
          }
        }

        // Final summary
        console.log(`\n${'█'.repeat(80)}`);
        console.log(`██  FINAL SUMMARY - ALL DEVICE TESTS COMPLETED  ██`);
        console.log(`${'█'.repeat(80)}`);

        allResults.forEach(result => {
          console.log(`\nDevice: ${result.deviceId}`);
          console.log(`Power Commands: ${result.powerCommands.length} working`);
          result.powerCommands.forEach(cmd => {
            console.log(`  ✅ ${cmd.dataKey} = ${cmd.dataValue}`);
          });

          console.log(`Speed Commands: ${result.speedCommands.length} working`);
          result.speedCommands.forEach(cmd => {
            console.log(`  ✅ ${cmd.dataKey} = ${cmd.dataValue}`);
          });

          if (result.powerCommands.length === 0 && result.speedCommands.length === 0) {
            console.log(`  ❌ No working commands found`);
          }
        });

        // Provide recommendations
        const workingDevices = allResults.filter(result =>
          result.powerCommands.length > 0 || result.speedCommands.length > 0
        );

        if (workingDevices.length > 0) {
          console.log(`\n🎉 SUCCESS! Found ${workingDevices.length} controllable device(s).`);
          console.log(`\nRecommendations for your Homebridge plugin configuration:`);

          workingDevices.forEach(result => {
            console.log(`\nDevice ID: ${result.deviceId}`);
            if (result.powerCommands.length > 0) {
              console.log(`  Power Control: Use "${result.powerCommands[0].dataKey}" with values 0/1`);
            }
            if (result.speedCommands.length > 0) {
              console.log(`  Speed Control: Use "${result.speedCommands[0].dataKey}" with values 0-4`);
            }
          });
        } else {
          console.log(`\n❌ No controllable devices found. The devices may not support the tested control methods.`);
        }

      } else {
        console.log(`\n❓ No potential ceiling fans detected automatically.`);
        console.log(`You can manually test any device by running:`);
        console.log(`  node test-device.js <device_id> <refresh_token> <country> <language>`);
      }

    } else {
      console.log('\n❓ No devices found in your LG ThinQ account.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('TESTING COMPLETED');
    console.log('='.repeat(60));
    console.log('\nYou can now use the working commands in your Homebridge configuration.');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('FAILED! Test completed with errors.');
    console.log('='.repeat(60));
    console.error('\nError:', error.message);

    if (error.message.includes('No supported regions found')) {
      console.log('\nTip: LG ThinQ may not be available in your region, or your account might be registered in a different region.');
      console.log('Try creating an LG account in a supported region (US, Europe, Korea, etc.)');
    }

    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main();
}