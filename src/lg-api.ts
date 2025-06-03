import axios, { AxiosInstance } from 'axios';
import { DateTime } from 'luxon';
import * as crypto from 'crypto';
import * as qs from 'querystring';
import { LG_API_CONSTANTS, AuthData, GatewayInfo, LGDevice } from './settings';

export class LGApi {
  private axiosInstance: AxiosInstance;
  private authData: AuthData | null = null;
  private gatewayInfo: GatewayInfo | null = null;
  private country: string;
  private language: string;

  constructor(country: string = LG_API_CONSTANTS.DEFAULT_COUNTRY, language: string = LG_API_CONSTANTS.DEFAULT_LANGUAGE) {
    this.country = country;
    this.language = language;
    this.axiosInstance = axios.create({
      timeout: 30000,
    });
  }

  /**
   * Generate random string for x-message-id header
   */
  private generateRandomString(length: number): string {
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
  private createSignature(message: string, secret: string): string {
    return crypto.createHmac('sha1', secret).update(message).digest('base64');
  }

  /**
   * Get gateway information for the specified country and language
   */
  async getGatewayInfo(): Promise<GatewayInfo> {
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
        'x-country-code': this.country,
        'x-language-code': this.language,
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
      const response = await this.axiosInstance.get(LG_API_CONSTANTS.GATEWAY_URL, {
        headers: headers,
      });

      // Check the response structure - the working plugin expects .result
      if (response.data?.result) {
        this.gatewayInfo = {
          countryCode: this.country,
          languageCode: this.language,
          thinq2Uri: response.data.result.thinq2Uri,
          empUri: response.data.result.empTermsUri, // Note: empTermsUri, not empUri
          empSpxUri: response.data.result.empSpxUri,
          thinq1Uri: response.data.result.thinq1Uri,
        };
        return this.gatewayInfo;
      } else {
        const errorMsg = response.data?.lgedmRoot?.returnMsg || 'Unknown error';
        const errorCode = response.data?.resultCode || 'Unknown';
        throw new Error(`Gateway request failed: ${errorMsg} (Code: ${errorCode})`);
      }
    } catch (error) {
      throw new Error(`Failed to get gateway info: ${error}`);
    }
  }

  /**
   * Get user number from profile API
   */
  private async getUserNumber(): Promise<string> {
    try {
      const timestamp = DateTime.utc().toRFC2822();
      const signature = this.createSignature(`/users/profile\n${timestamp}`, LG_API_CONSTANTS.OAUTH_SECRET_KEY);

      const headers = {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + this.authData!.accessToken,
        'X-Lge-Svccode': 'SVC202',
        'X-Application-Key': LG_API_CONSTANTS.APPLICATION_KEY,
        'lgemp-x-app-key': LG_API_CONSTANTS.CLIENT_ID,
        'X-Device-Type': 'M01',
        'X-Device-Platform': 'ADR',
        'x-lge-oauth-date': timestamp,
        'x-lge-oauth-signature': signature,
      };

      const response = await this.axiosInstance.get(`${this.authData!.lgeapiUrl}users/profile`, {
        headers: headers,
      });

      if (response.data?.status === 2) {
        throw new Error(response.data.message || 'Failed to get user profile');
      }

      return response.data.account.userNo;
    } catch (error) {
      throw new Error(`Failed to get user number: ${error}`);
    }
  }

  /**
   * Authenticate using refresh token (working method)
   */
  async authenticateWithToken(refreshToken: string): Promise<AuthData> {
    try {
      if (!this.gatewayInfo) {
        await this.getGatewayInfo();
      }

      // Use the exact same approach as the working plugin
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      };

      // Use the exact same headers and URL format as our working test
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

      // Determine the correct API URL based on country
      const lgeapiUrl = `https://${this.country.toLowerCase()}.lgeapi.com/`;

      const response = await this.axiosInstance.post(
        `${lgeapiUrl}oauth/1.0/oauth2/token`,
        qs.stringify(tokenData), // Send as form data, not JSON
        { headers },
      );

      if (response.data?.access_token) {
        this.authData = {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token || refreshToken,
          userId: '', // Will be updated below
          countryCode: this.country,
          languageCode: this.language,
          lgeapiUrl: response.data.oauth2_backend_url ? decodeURIComponent(response.data.oauth2_backend_url) : lgeapiUrl,
        };

        // Get user number like the working plugin
        try {
          this.authData.userId = await this.getUserNumber();
        } catch (error) {
          // If getUserNumber fails, try to continue without it
          // Note: getUserNumber failure is not critical for basic functionality
        }

        return this.authData;
      } else {
        throw new Error('Authentication failed: Invalid response');
      }
    } catch (error: any) {
      if (error.response?.status === 415) {
        throw new Error('Token authentication failed: Unsupported Media Type - check request format');
      } else if (error.response?.status === 401) {
        throw new Error('Token authentication failed: Invalid or expired refresh token');
      } else {
        throw new Error(`Token authentication failed: ${error}`);
      }
    }
  }

  /**
   * Authenticate using username and password (working 2-step method)
   */
  async authenticateWithCredentials(username: string, password: string): Promise<AuthData> {
    try {
      if (!this.gatewayInfo) {
        await this.getGatewayInfo();
      }

      if (!this.gatewayInfo || !this.gatewayInfo.empSpxUri || !this.gatewayInfo.empUri) {
        throw new Error('Gateway information incomplete - missing required URIs');
      }

      // Step 1: Hash the password
      const hashedPassword = crypto.createHash('sha512').update(password).digest('hex');

      // Step 2: PreLogin
      const defaultEmpHeaders = {
        'Accept': 'application/json',
        'X-Application-Key': LG_API_CONSTANTS.APPLICATION_KEY,
        'X-Client-App-Key': LG_API_CONSTANTS.CLIENT_ID,
        'X-Lge-Svccode': 'SVC709',
        'X-Device-Type': 'M01',
        'X-Device-Platform': 'ADR',
        'X-Device-Language-Type': 'IETF',
        'X-Device-Publish-Flag': 'Y',
        'X-Device-Country': this.country,
        'X-Device-Language': this.language,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
      };

      const preLoginData = {
        'user_auth2': hashedPassword,
        'log_param': 'login request / user_id : ' + username + ' / third_party : null / svc_list : SVC202,SVC710 / 3rd_service : ',
      };

      const preLoginResponse = await this.axiosInstance.post(
        this.gatewayInfo.empSpxUri + '/preLogin',
        qs.stringify(preLoginData),
        { headers: defaultEmpHeaders },
      );

      if (!preLoginResponse.data?.signature || !preLoginResponse.data?.tStamp) {
        throw new Error('PreLogin failed - missing signature or timestamp');
      }

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

      const loginUrl = `${this.gatewayInfo.empUri}/emp/v2.0/account/session/${encodeURIComponent(username)}`;
      const loginResponse = await this.axiosInstance.post(
        loginUrl,
        qs.stringify(loginData),
        { headers: loginHeaders },
      );

      if (!loginResponse.data?.account) {
        throw new Error('Invalid credentials or account not found');
      }

      // Step 4: Get OAuth2 authorization code
      const account = loginResponse.data.account;

      // Get secret key for EMP signature
      if (!this.gatewayInfo.empSpxUri) {
        throw new Error('EMP SPX URI not available');
      }
      const empSearchKeyUrl = this.gatewayInfo.empSpxUri + '/searchKey?key_name=OAUTH_SECRETKEY&sever_type=OP';
      const secretKeyResponse = await this.axiosInstance.get(empSearchKeyUrl);
      const secretKey = secretKeyResponse.data.returnData;

      // Prepare EMP OAuth data
      const empOAuthData = {
        account_type: account.userIDType,
        client_id: LG_API_CONSTANTS.CLIENT_ID,
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36 Edg/93.0.961.44',
      };

      // Get authorization code
      const authorizeResponse = await this.axiosInstance.get(empOAuthUrl.href, {
        headers: empOAuthHeaders,
      });

      if (authorizeResponse.data.status !== 1) {
        throw new Error('Authorization failed: ' + (authorizeResponse.data.message || 'Unknown error'));
      }

      // Extract authorization code from redirect URI
      const redirectUri = new URL(authorizeResponse.data.redirect_uri);
      const authCode = redirectUri.searchParams.get('code');
      const oauthBackendUrl = redirectUri.searchParams.get('oauth2_backend_url');

      if (!authCode || !oauthBackendUrl) {
        throw new Error('Failed to extract authorization code or backend URL');
      }

      // Step 5: Exchange authorization code for tokens
      const tokenData = {
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: empOAuthData.redirect_uri,
      };

      const requestUrl = '/oauth/1.0/oauth2/token?' + qs.stringify(tokenData);
      const tokenResponse = await this.axiosInstance.post(
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
        },
      );

      if (!tokenResponse.data?.access_token) {
        throw new Error('Failed to obtain access token');
      }

      this.authData = {
        accessToken: tokenResponse.data.access_token,
        refreshToken: tokenResponse.data.refresh_token,
        userId: '', // Will be updated below
        countryCode: this.country,
        languageCode: this.language,
        lgeapiUrl: decodeURIComponent(tokenResponse.data.oauth2_backend_url),
      };

      // Step 6: Get user number
      this.authData.userId = await this.getUserNumber();

      return this.authData;
    } catch (error) {
      throw new Error(`Credential authentication failed: ${error}`);
    }
  }

  /**
   * Get list of registered devices (working method)
   */
  async getDevices(): Promise<LGDevice[]> {
    try {
      if (!this.authData || !this.gatewayInfo) {
        throw new Error('Not authenticated');
      }

      // Step 1: Get homes first (like the working plugin)
      const homesResponse = await this.axiosInstance.get(`${this.gatewayInfo.thinq2Uri}/service/homes`, {
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

      // Step 2: Get devices from each home (like the working plugin)
      const allDevices: LGDevice[] = [];
      for (const home of homes) {
        const devicesResponse = await this.axiosInstance.get(`${this.gatewayInfo.thinq2Uri}/service/homes/${home.homeId}`, {
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

      return allDevices;
    } catch (error) {
      throw new Error(`Failed to get devices: ${error}`);
    }
  }

  /**
   * Get device status
   */
  async getDeviceStatus(deviceId: string): Promise<any> {
    try {
      if (!this.authData || !this.gatewayInfo) {
        throw new Error('Not authenticated');
      }

      const response = await this.axiosInstance.get(
        `${this.gatewayInfo.thinq2Uri}/service/devices/${deviceId}`,
        {
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

      return response.data?.result || {};
    } catch (error) {
      throw new Error(`Failed to get device status: ${error}`);
    }
  }

  /**
   * Send command to device
   */
  async sendCommand(deviceId: string, command: any): Promise<any> {
    try {
      if (!this.authData || !this.gatewayInfo) {
        throw new Error('Not authenticated');
      }

      // Use the working command structure discovered in testing
      const requestData = {
        ctrlKey: 'basicCtrl',
        command: 'Set',
        dataKey: command.dataKey,
        dataValue: command.dataValue,
      };

      const response = await this.axiosInstance.post(
        `${this.gatewayInfo.thinq2Uri}/service/devices/${deviceId}/control-sync`,
        requestData,
        {
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

      return response.data?.result || {};
    } catch (error: any) {
      throw new Error(`Failed to send command: ${error}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.authData) {
      throw new Error('No authentication data available');
    }

    try {
      const updatedAuth = await this.authenticateWithToken(this.authData.refreshToken);
      this.authData = updatedAuth;
    } catch (error) {
      throw new Error(`Failed to refresh access token: ${error}`);
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authData !== null && this.authData.accessToken !== '';
  }

  /**
   * Get authentication data
   */
  getAuthData(): AuthData | null {
    return this.authData;
  }
}