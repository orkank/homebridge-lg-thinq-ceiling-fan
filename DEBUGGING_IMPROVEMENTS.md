# Debugging and Error Handling Improvements

## Overview
This document outlines the comprehensive debugging and error handling improvements made to the LG Ceiling Fan HomeKit plugin to address HTTP 400 errors and authentication issues.

## Problem Analysis
The original issue was recurring HTTP 400 errors that could only be resolved by restarting Homebridge, suggesting:
- Authentication token expiration
- Session timeout issues
- Invalid request format due to stale authentication data

## Improvements Made

### 1. Enhanced LG API Debugging (`src/lg-api.ts`)

#### Comprehensive Request/Response Logging
- **Before each API call**: Logs device ID, auth token status, request URL
- **After each API call**: Logs response status and full response data
- **On error**: Detailed error information including:
  - HTTP status code and status text
  - Response headers and data
  - Request URL that failed
  - Authentication token status

#### Enhanced Error Handling
- **HTTP Status Code Detection**: Specific error messages for 400, 401, 403, 404, 429, and 5xx errors
- **Detailed Error Messages**: Instead of generic "AxiosError", now shows specific LG API response data
- **Error Context**: Shows which device and operation failed

#### Token Lifecycle Management
- **Token Expiry Tracking**: Records when tokens are obtained and calculates age
- **Token Validation**: Method to check if current authentication is valid
- **Proactive Token Refresh**: Validates authentication before API calls

#### Circuit Breaker Pattern
- **Consecutive Error Tracking**: Monitors repeated API failures
- **Circuit Breaker**: Temporarily stops API calls after 5 consecutive errors
- **Auto-Recovery**: Resets circuit breaker after 5 minutes

### 2. Enhanced Ceiling Fan Accessory (`src/ceiling-fan-accessory.ts`)

#### Proactive Authentication Validation
- **Pre-API Call Validation**: Checks authentication health before each request
- **Enhanced Logging**: Debug logs for all operations (power, speed, status updates)
- **Raw Data Logging**: Shows actual LG API response data for troubleshooting

#### Better Error Context
- **Operation-Specific Errors**: Clear indication of which operation failed
- **Before/After State Logging**: Shows what was attempted and what succeeded

### 3. Platform-Level Health Monitoring (`src/platform.ts`)

#### Authentication Health Check
- **Periodic Monitoring**: Checks authentication every 15 minutes
- **Proactive Refresh**: Automatically refreshes tokens before they expire
- **Health Reporting**: Logs authentication status and refresh attempts

### 4. Enhanced Error Messages and Guidance

#### HTTP 400 Error Guidance
```
Bad Request (400): This may indicate expired authentication or invalid request format.
Consider restarting Homebridge to re-authenticate.
```

#### Circuit Breaker Messages
```
Circuit breaker is open due to consecutive API failures.
Service will retry automatically in a few minutes.
```

## Debug Log Examples

### Successful API Call
```
[LG API DEBUG] Executing API call with retry capability
[LG API DEBUG] Auth token available: true
[LG API DEBUG] Sending command to device: DEVICE_ID
[LG API DEBUG] Command data: {"ctrlKey":"basicCtrl","command":"Set","dataKey":"airState.operation","dataValue":1}
[LG API DEBUG] Command response status: 200
[Fan Accessory DEBUG] Successfully set power: ON
```

### Authentication Issue Detection
```
[LG API DEBUG] Authentication validation failed, will attempt refresh during API call
[LG API DEBUG] Authentication-related error detected (400), attempting token refresh
[LG API DEBUG] Attempting auto-refresh with credentials
[LG API DEBUG] Auto-refresh successful, retrying original API call
```

### Circuit Breaker Activation
```
[LG API ERROR] Consecutive errors: 5
[LG API WARN] Circuit breaker opened due to 5 consecutive errors
[LG API ERROR] Circuit breaker is open due to consecutive API failures. Service will retry automatically in a few minutes.
```

## Configuration Requirements

For full debugging and auto-recovery features, ensure your config includes:

```json
{
  "auto_refresh": true,
  "save_credentials": true,
  "username": "your_lg_username",
  "password": "your_lg_password",
  "debug": true
}
```

## Monitoring and Troubleshooting

### Log Analysis
1. **Look for DEBUG messages**: Show normal operation flow
2. **Look for WARN messages**: Indicate potential issues (token refresh, circuit breaker)
3. **Look for ERROR messages**: Show actual failures with detailed context

### Common Patterns
- **Token Expiry**: Look for 401/403 errors followed by refresh attempts
- **LG API Issues**: Look for 400 errors with LG-specific error codes in response data
- **Network Issues**: Look for timeout or connection errors
- **Circuit Breaker**: Look for consecutive error patterns

### Recovery Strategies
1. **Automatic**: Built-in token refresh and circuit breaker recovery
2. **Manual**: Restart Homebridge if circuit breaker doesn't resolve issues
3. **Configuration**: Check LG credentials if refresh continues to fail

## Benefits

1. **Faster Issue Resolution**: Detailed logs help identify root cause quickly
2. **Proactive Error Prevention**: Token validation prevents many API failures
3. **Self-Healing**: Automatic token refresh and circuit breaker recovery
4. **Better User Experience**: More informative error messages
5. **Reduced Downtime**: Circuit breaker prevents cascading failures

## Next Steps

When you encounter HTTP 400 errors again:
1. Check the enhanced logs for specific LG API error details
2. Monitor the authentication health check messages
3. Observe if circuit breaker activates and recovers
4. Look for token refresh success/failure patterns

The enhanced debugging will provide much clearer insight into what's happening during API failures.