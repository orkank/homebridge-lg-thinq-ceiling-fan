/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'LGCeilingFan';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-lg-ceilingfan';

/**
 * LG ThinQ API Constants
 */
export const LG_API_CONSTANTS = {
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

/**
 * Platform configuration interface
 */
export interface LGCeilingFanConfig {
  name: string;
  auth_mode: 'token' | 'account';
  refresh_token?: string;
  username?: string;
  password?: string;
  country: string;
  language: string;
  auto_refresh?: boolean; // Enable automatic token refresh
  save_credentials?: boolean; // Save credentials for auto-refresh
  devices: DeviceConfig[];
  polling_interval?: number;
  debug?: boolean;
}

/**
 * Device configuration interface
 */
export interface DeviceConfig {
  id: string;
  name?: string;
  model?: string;
  max_speed?: number; // Will be set to 4 for LG ceiling fans
}

/**
 * Device status interface for ceiling fans
 */
export interface CeilingFanStatus {
  isOn: boolean;
  fanSpeed: number;
  maxSpeed: number;
  temperature?: number;
  humidity?: number;
}

/**
 * LG ThinQ Device Information
 */
export interface LGDevice {
  deviceId: string;
  deviceType: number;
  deviceCode: string;
  alias: string;
  deviceState: string;
  deviceRegDate: string;
  order: number;
  online: boolean;
  platformType: string;
  modelJsonVer: string;
  modelJsonUri: string;
  applianceType: string;
  snapshot?: any;
  tftImageUrl?: string;
  groupableDevices?: any[];
}

/**
 * LG ThinQ API Response
 */
export interface LGApiResponse {
  resultCode: string;
  result: any;
}

/**
 * Authentication data
 */
export interface AuthData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  countryCode: string;
  languageCode: string;
  lgeapiUrl?: string;
}

/**
 * Gateway information
 */
export interface GatewayInfo {
  countryCode: string;
  languageCode: string;
  thinq2Uri: string;
  empUri: string;
  empSpxUri?: string;
  thinq1Uri?: string;
}