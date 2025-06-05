/* eslint-env node */

const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const qs = require('querystring');
const { DateTime } = require('luxon');

class LGCeilingFanUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    // LG ThinQ API Constants (updated to match working plugin)
    this.LG_API_CONSTANTS = {
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

    // Setup API routes
    this.onRequest('/auth', this.authenticateWithLG.bind(this));
    this.onRequest('/test-token', this.testRefreshToken.bind(this));
    this.onRequest('/discover', this.discoverDevices.bind(this));
    this.onRequest('/config', this.handleConfig.bind(this));

    this.ready();
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
    return crypto.createHmac('sha1', secret).update(message).digest('base64');
  }

  /**
   * Get gateway information for the specified country and language (working method)
   */
  async getGatewayInfo(country = 'US', language = 'en-US') {
    try {
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

      // Use GET request with NO query parameters, just headers (like the working plugin)
      const response = await axios.get(this.LG_API_CONSTANTS.GATEWAY_URL, {
        timeout: 30000,
        headers: headers,
      });

      // Check the response structure - the working plugin expects .result
      if (response.data?.result) {
        return {
          countryCode: country,
          languageCode: language,
          thinq2Uri: response.data.result.thinq2Uri,
          empUri: response.data.result.empTermsUri, // Note: empTermsUri, not empUri
          empSpxUri: response.data.result.empSpxUri,
          thinq1Uri: response.data.result.thinq1Uri,
        };
      } else {
        throw new Error(`Gateway request failed: ${response.data?.lgedmRoot?.returnMsg || 'Unknown error'} (Code: ${response.data?.resultCode || 'Unknown'})`);
      }
    } catch (error) {
      this.logger(`Failed to get gateway info: ${error.message}`);
      throw new RequestError('Failed to connect to LG ThinQ servers', { status: 500 });
    }
  }

  /**
   * Get user number from profile API (like working plugin)
   */
  async getUserNumber(accessToken, lgeapiUrl) {
    try {
      const timestamp = DateTime.utc().toRFC2822();
      const signature = this.createSignature(`/users/profile\n${timestamp}`, this.LG_API_CONSTANTS.OAUTH_SECRET_KEY);

      const headers = {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
        'X-Lge-Svccode': 'SVC202',
        'X-Application-Key': this.LG_API_CONSTANTS.APPLICATION_KEY,
        'lgemp-x-app-key': this.LG_API_CONSTANTS.CLIENT_ID,
        'X-Device-Type': 'M01',
        'X-Device-Platform': 'ADR',
        'x-lge-oauth-date': timestamp,
        'x-lge-oauth-signature': signature,
      };

      const response = await axios.get(`${lgeapiUrl}users/profile`, {
        headers: headers,
        timeout: 30000
      });

      if (response.data?.status === 2) {
        throw new Error(response.data.message || 'Failed to get user profile');
      }

      return response.data.account.userNo;
    } catch (error) {
      this.logger(`Failed to get user number: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate with LG ThinQ using username and password (working 2-step method)
   */
  async authenticateWithLG(payload) {
    const { username, password, country = 'US', language = 'en-US' } = payload;

    if (!username || !password) {
      throw new RequestError('Username and password are required', { status: 400 });
    }

    try {
      this.logger(`Received payload: ${JSON.stringify(payload)}`);
      this.logger(`Authenticating user: ${username} for country: ${country}, language: ${language}`);

      // Get gateway information
      this.logger('Step 1: Getting gateway information...');
      const gatewayInfo = await this.getGatewayInfo(country, language);
      this.logger(`Gateway info obtained successfully - empUri: ${gatewayInfo.empUri}`);

      // Step 1: Hash the password
      const hashedPassword = crypto.createHash('sha512').update(password).digest('hex');

      // Step 2: PreLogin
      this.logger('Step 2: Starting PreLogin...');
      const defaultEmpHeaders = {
        'Accept': 'application/json',
        'X-Application-Key': this.LG_API_CONSTANTS.APPLICATION_KEY,
        'X-Client-App-Key': this.LG_API_CONSTANTS.CLIENT_ID,
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

      const preLoginData = {
        'user_auth2': hashedPassword,
        'log_param': 'login request / user_id : ' + username + ' / third_party : null / svc_list : SVC202,SVC710 / 3rd_service : ',
      };

      const preLoginResponse = await axios.post(
        gatewayInfo.empSpxUri + '/preLogin',
        qs.stringify(preLoginData),
        {
          headers: defaultEmpHeaders,
          timeout: 30000
        }
      );

      if (!preLoginResponse.data?.signature || !preLoginResponse.data?.tStamp) {
        this.logger(`PreLogin response: ${JSON.stringify(preLoginResponse.data)}`);
        throw new Error('PreLogin failed - missing signature or timestamp');
      }

      this.logger('PreLogin successful, proceeding with main login...');

      // Step 3: Main login with signature and timestamp
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

      const loginUrl = `${gatewayInfo.empUri}/emp/v2.0/account/session/${encodeURIComponent(username)}`;
      this.logger(`Step 3: Main login to: ${loginUrl}`);

      const loginResponse = await axios.post(
        loginUrl,
        qs.stringify(loginData),
        {
          headers: loginHeaders,
          timeout: 30000
        }
      );

      if (!loginResponse.data?.account) {
        this.logger(`Login response: ${JSON.stringify(loginResponse.data)}`);
        throw new Error('Invalid credentials or account not found');
      }

      this.logger('EMP authentication successful!');

      // Step 4: Get OAuth2 authorization code
      const account = loginResponse.data.account;

      // Get secret key for EMP signature
      this.logger('Step 4: Getting OAuth secret key...');
      const empSearchKeyUrl = gatewayInfo.empSpxUri + '/searchKey?key_name=OAUTH_SECRETKEY&sever_type=OP';
      const secretKeyResponse = await axios.get(empSearchKeyUrl);
      const secretKey = secretKeyResponse.data.returnData;

      // Prepare EMP OAuth data
      const empOAuthData = {
        account_type: account.userIDType,
        client_id: this.LG_API_CONSTANTS.CLIENT_ID,
        country_code: account.country,
        redirect_uri: 'lgaccount.lgsmartthinq:/',
        response_type: 'code',
        state: '12345',
        username: account.userID,
      };

      // Build EMP OAuth URL
      const empOAuthUrl = new URL('https://emp-oauth.lgecloud.com/emp/oauth2/authorize/empsession?' + qs.stringify(empOAuthData));

      // Create signature for EMP OAuth request
      const timestamp = DateTime.utc().toRFC2822();
      const signature = this.createSignature(`${empOAuthUrl.pathname}${empOAuthUrl.search}\n${timestamp}`, secretKey);

      const empOAuthHeaders = {
        'lgemp-x-app-key': this.LG_API_CONSTANTS.OAUTH_CLIENT_KEY,
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
      this.logger('Step 5: Getting authorization code...');
      const authorizeResponse = await axios.get(empOAuthUrl.href, {
        headers: empOAuthHeaders,
        timeout: 30000
      });

      if (authorizeResponse.data.status !== 1) {
        this.logger(`Authorization response: ${JSON.stringify(authorizeResponse.data)}`);
        throw new Error('Authorization failed: ' + (authorizeResponse.data.message || 'Unknown error'));
      }

      // Extract authorization code from redirect URI
      const redirectUri = new URL(authorizeResponse.data.redirect_uri);
      const authCode = redirectUri.searchParams.get('code');
      const oauthBackendUrl = redirectUri.searchParams.get('oauth2_backend_url');

      if (!authCode || !oauthBackendUrl) {
        throw new Error('Failed to extract authorization code or backend URL');
      }

      this.logger('Got authorization response, extracting code...');

      // Step 5: Exchange authorization code for tokens
      const tokenData = {
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: empOAuthData.redirect_uri,
      };

      const requestUrl = '/oauth/1.0/oauth2/token?' + qs.stringify(tokenData);
      this.logger('Step 6: Exchanging code for tokens...');

      const tokenResponse = await axios.post(
        oauthBackendUrl + 'oauth/1.0/oauth2/token',
        qs.stringify(tokenData),
        {
          headers: {
            'x-lge-app-os': 'ADR',
            'x-lge-appkey': this.LG_API_CONSTANTS.CLIENT_ID,
            'x-lge-oauth-signature': this.createSignature(`${requestUrl}\n${timestamp}`, this.LG_API_CONSTANTS.OAUTH_SECRET_KEY),
            'x-lge-oauth-date': timestamp,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 30000
        }
      );

      if (!tokenResponse.data?.access_token) {
        this.logger(`Token response: ${JSON.stringify(tokenResponse.data)}`);
        throw new Error('Failed to obtain access token');
      }

      this.logger('OAuth2 authentication successful!');

      // Step 6: Get user number
      const lgeapiUrl = decodeURIComponent(tokenResponse.data.oauth2_backend_url);
      const userId = await this.getUserNumber(tokenResponse.data.access_token, lgeapiUrl);

      return {
        refresh_token: tokenResponse.data.refresh_token,
        access_token: tokenResponse.data.access_token,
        user_number: userId,
        countryCode: country,
        languageCode: language,
        lgeapiUrl: lgeapiUrl,
      };

    } catch (error) {
      this.logger(`Authentication failed: ${error.message}`);
      this.logger(`Error details: ${JSON.stringify({
        name: error.name,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.response?.config?.url
      })}`);

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        throw new RequestError('Network connection failed. Please check your internet connection and try again.', { status: 500 });
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        throw new RequestError('Invalid username or password', { status: 401 });
      } else if (error.response?.status === 406) {
        throw new RequestError(`Request format not accepted by LG servers. Please check your country/language settings. URL: ${error.response?.config?.url}`, { status: 406 });
      } else if (error.response?.status === 429) {
        throw new RequestError('Too many authentication attempts. Please try again later.', { status: 429 });
      } else if (error.message.includes('PreLogin failed')) {
        throw new RequestError('Authentication service is temporarily unavailable. Please try again later.', { status: 503 });
      } else if (error.message.includes('Gateway request failed')) {
        throw new RequestError('Unable to connect to LG ThinQ servers. Please check your country/language settings.', { status: 502 });
      } else {
        throw new RequestError(`Authentication failed: ${error.message}`, { status: 500 });
      }
    }
  }

  /**
   * Test a refresh token
   */
  async testRefreshToken(payload) {
    const { refresh_token, country = 'US', language = 'en-US' } = payload;

    if (!refresh_token) {
      throw new RequestError('Refresh token is required', { status: 400 });
    }

    try {
      this.logger('Testing refresh token validity');

      // Use the same request format as our working plugin
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      };

      const timestamp = DateTime.utc().toRFC2822();
      const requestUrl = '/oauth/1.0/oauth2/token?' + qs.stringify(tokenData);

      const headers = {
        'x-lge-app-os': 'ADR',
        'x-lge-appkey': this.LG_API_CONSTANTS.CLIENT_ID,
        'x-lge-oauth-signature': this.createSignature(`${requestUrl}\n${timestamp}`, this.LG_API_CONSTANTS.OAUTH_SECRET_KEY),
        'x-lge-oauth-date': timestamp,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      // Determine the correct API URL based on country
      const lgeapiUrl = `https://${country.toLowerCase()}.lgeapi.com/`;

      const response = await axios.post(
        `${lgeapiUrl}oauth/1.0/oauth2/token`,
        qs.stringify(tokenData), // Send as form data, not JSON
        {
          headers: headers,
          timeout: 30000
        }
      );

      if (response.data?.access_token) {
        this.logger('Refresh token is valid');
        return { valid: true, message: 'Refresh token is valid' };
      } else {
        throw new Error('Invalid token response');
      }

    } catch (error) {
      this.logger(`Token test failed: ${error.message}`);

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new RequestError('Refresh token is invalid or expired', { status: 401 });
      } else if (error.response?.status === 415) {
        throw new RequestError('Invalid request format', { status: 415 });
      } else {
        throw new RequestError('Failed to validate refresh token', { status: 500 });
      }
    }
  }

  /**
   * Discover LG devices
   */
  async discoverDevices(payload) {
    const { refresh_token, country = 'US', language = 'en-US' } = payload;

    if (!refresh_token) {
      throw new RequestError('Refresh token is required', { status: 400 });
    }

    try {
      this.logger('Discovering LG devices');

      // Get gateway information
      const gatewayInfo = await this.getGatewayInfo(country, language);

      // Get access token from refresh token using same method as working plugin
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      };

      const timestamp = DateTime.utc().toRFC2822();
      const requestUrl = '/oauth/1.0/oauth2/token?' + qs.stringify(tokenData);

      const headers = {
        'x-lge-app-os': 'ADR',
        'x-lge-appkey': this.LG_API_CONSTANTS.CLIENT_ID,
        'x-lge-oauth-signature': this.createSignature(`${requestUrl}\n${timestamp}`, this.LG_API_CONSTANTS.OAUTH_SECRET_KEY),
        'x-lge-oauth-date': timestamp,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      };

      const lgeapiUrl = `https://${country.toLowerCase()}.lgeapi.com/`;

      const tokenResponse = await axios.post(
        `${lgeapiUrl}oauth/1.0/oauth2/token`,
        qs.stringify(tokenData),
        {
          headers: headers,
          timeout: 30000
        }
      );

      if (!tokenResponse.data?.access_token) {
        throw new Error('Failed to obtain access token');
      }

      const accessToken = tokenResponse.data.access_token;
      const userId = await this.getUserNumber(accessToken, tokenResponse.data.oauth2_backend_url ? decodeURIComponent(tokenResponse.data.oauth2_backend_url) : lgeapiUrl);

      // Step 1: Get homes first (like the working plugin)
      const homesResponse = await axios.get(`${gatewayInfo.thinq2Uri}/service/homes`, {
        headers: {
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
          'x-emp-token': accessToken,
          'x-user-no': userId,
          'x-client-id': this.LG_API_CONSTANTS.CLIENT_ID,
        },
        timeout: 30000
      });

      const homes = homesResponse.data?.result?.item || [];

      // Step 2: Get devices from each home (like the working plugin)
      const allDevices = [];
      for (const home of homes) {
        const devicesResponse = await axios.get(`${gatewayInfo.thinq2Uri}/service/homes/${home.homeId}`, {
          headers: {
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
            'x-emp-token': accessToken,
            'x-user-no': userId,
            'x-client-id': this.LG_API_CONSTANTS.CLIENT_ID,
          },
          timeout: 30000
        });

        const homeDevices = devicesResponse.data?.result?.devices || [];
        allDevices.push(...homeDevices);
      }

      this.logger(`Found ${allDevices.length} devices`);

      // Filter and format devices
      const formattedDevices = allDevices.map(device => ({
        deviceId: device.deviceId,
        alias: device.alias,
        deviceType: device.deviceType,
        deviceCode: device.deviceCode,
        applianceType: device.applianceType,
        online: device.online === true,
        platformType: device.platformType,
        deviceState: device.deviceState,
        isCeilingFan: this.isCeilingFan(device),
      }));

      return {
        devices: formattedDevices,
        total: formattedDevices.length,
      };

    } catch (error) {
      this.logger(`Device discovery failed: ${error.message}`);

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new RequestError('Authentication failed. Refresh token may be invalid.', { status: 401 });
      } else {
        throw new RequestError('Failed to discover devices', { status: 500 });
      }
    }
  }

  /**
   * Check if a device is likely a ceiling fan
   */
  isCeilingFan(device) {
    const deviceType = device.applianceType?.toLowerCase() || '';
    const deviceCode = device.deviceCode?.toLowerCase() || '';
    const alias = device.alias?.toLowerCase() || '';

    // Look for ceiling fan indicators (including Turkish terms)
    const fanKeywords = ['fan', 'ceiling', 'air_circulator', 'ventilator', 'vantilatör', 'tavan', 'havalandırma'];

    return fanKeywords.some(keyword =>
      deviceType.includes(keyword) ||
      deviceCode.includes(keyword) ||
      alias.includes(keyword)
    );
  }

  /**
   * Handle configuration get/set
   */
  async handleConfig(payload) {
    if (!payload || Object.keys(payload).length === 0) {
      // Return current configuration (GET equivalent)
      try {
        this.logger('Getting current plugin configuration...');
        // Server side can't access plugin config directly, so return empty for now
        // The frontend will handle getting the actual config
        return {};
      } catch (error) {
        this.logger(`Failed to get config: ${error.message}`);
        return {};
      }
    } else {
      // Prepare configuration data for frontend to save (POST equivalent)
      try {
        this.logger(`Preparing configuration: ${JSON.stringify(payload)}`);
        const config = payload;

        // Validate required fields
        if (!config.refresh_token) {
          throw new RequestError('Refresh token is required', { status: 400 });
        }

        // Create the plugin configuration that the frontend should save
        const pluginConfig = {
          name: 'LG Ceiling Fan',
          platform: 'LGCeilingFan',
          auth_mode: 'token',
          refresh_token: config.refresh_token,
          country: config.country || 'US',
          language: config.language || 'en-US',
          auto_refresh: config.auto_refresh !== false, // Default to true
          save_credentials: config.save_credentials || false,
          username: config.save_credentials ? (config.username || '') : '',
          password: config.save_credentials ? (config.password || '') : '',
          devices: config.devices || [],
          polling_interval: 30,
          debug: false,
        };

        this.logger(`Returning plugin config for frontend to save: ${JSON.stringify(pluginConfig)}`);

        // Return the config for the frontend to save
        return {
          success: true,
          message: 'Configuration prepared successfully',
          config: pluginConfig
        };

      } catch (error) {
        this.logger(`Failed to prepare config: ${error.message}`);
        if (error.stack) {
          this.logger(`Stack trace: ${error.stack}`);
        }
        throw new RequestError(`Failed to prepare configuration: ${error.message}`, { status: 500 });
      }
    }
  }

  /**
   * Logger helper
   */
  logger(message) {
    console.log(`[LG Ceiling Fan UI] ${new Date().toISOString()}: ${message}`);
  }
}

// Start the server
(() => {
  return new LGCeilingFanUiServer();
})();