# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-06

### Fixed
- **🔧 HTTP 400 Bad Request Errors**: Resolved authentication issues that caused sporadic API failures
  - Enhanced token lifecycle management with automatic expiry detection
  - Implemented circuit breaker pattern to prevent cascading failures
  - Added comprehensive authentication validation before API calls
  - Improved error handling with specific status code detection (400, 401, 403, 404, 429, 5xx)
  - Enhanced debugging with detailed request/response logging

- **🔄 Duplicate Command Execution**: Fixed issue where fan commands were sent twice
  - Implemented intelligent request throttling to prevent identical commands within 1-second window
  - Added command tracking with timestamps to filter duplicate requests
  - Enhanced debugging with stack traces and execution flow tracking
  - Preserved all error handling and authentication features

### Added
- **📊 Enhanced Debugging**: Comprehensive logging system for troubleshooting
  - Detailed LG API request/response logging
  - Authentication state monitoring
  - Circuit breaker status tracking
  - Command execution flow tracing
  - Stack trace identification for API calls

- **🛡️ Robust Error Recovery**: Auto-recovery mechanisms for common issues
  - Automatic authentication refresh on token expiry
  - Circuit breaker with 5-minute auto-recovery
  - Proactive token validation
  - Enhanced error context with device/operation identification

- **📖 Documentation**: Added comprehensive troubleshooting guide
  - `DEBUGGING_IMPROVEMENTS.md` with detailed explanations
  - Log examples and interpretation guide
  - Recovery procedures for common issues
  - Child Bridge configuration warnings

### Improved
- **🔐 Authentication Reliability**: More stable connection to LG ThinQ API
  - Periodic authentication health checks every 15 minutes
  - Enhanced token refresh logic
  - Better handling of authentication edge cases

- **⚡ Performance**: Reduced unnecessary API calls and improved responsiveness
  - Smart command throttling without blocking legitimate requests
  - Optimized status update cycles
  - Better resource management

## [1.1.0] - 2025-01-01

### Added
- **🎯 Built-in Authentication UI**: Easy setup through Homebridge Config UI X
  - Automatic LG ThinQ authentication with username/password
  - Automatic refresh token generation and saving
  - Device discovery and configuration
  - Token validation and testing
- **Custom UI Server**: Dedicated server for authentication flow
- **Enhanced Configuration Schema**: Improved UI with helpful descriptions
- **One-Click Setup**: Complete plugin configuration through the UI

### Features
- **Authentication Interface**
  - Clean, responsive web interface
  - Country and language selection
  - Real-time authentication status
  - Automatic token copying and saving
- **Device Discovery Interface**
  - Visual device listing with online/offline status
  - Automatic ceiling fan detection
  - One-click device configuration
- **Configuration Management**
  - Automatic config file updates
  - Validation and error handling
  - Progress indicators and user feedback

### Technical Improvements
- Added `@homebridge/plugin-ui-utils` dependency
- Custom UI server with Express-like routing
- Comprehensive error handling for authentication flow
- Enhanced security with proper token management

## [1.0.0] - 2025-01-01

### Added
- Initial release of homebridge-lg-ceilingfan
- Full fan control support (on/off, speed, direction)
- Light control support (on/off, brightness)
- Auto-discovery of LG ceiling fans
- Manual device configuration
- Support for LG ThinQ API v2
- Token-based and credential-based authentication
- Real-time status updates
- HomeKit integration through Homebridge
- Comprehensive configuration options
- Debug logging support
- TypeScript implementation

### Features
- **Fan Control**
  - Power on/off
  - Variable speed control (0-100%)
- **Device Management**
  - Auto-discovery from LG ThinQ account
  - Manual configuration for specific devices
  - Custom device names and settings
- **Status Monitoring**
  - Periodic status updates
  - Real-time synchronization with HomeKit
  - Configurable polling intervals
- **Authentication**
  - Refresh token authentication
  - Username/password authentication
  - Multiple country and language support

### Technical Details
- Built with TypeScript for better type safety
- Comprehensive error handling and logging
- Modular architecture for easy maintenance
- Full ESLint configuration for code quality
- Detailed configuration schema for Homebridge Config UI X

### Documentation
- Complete README with installation and configuration instructions
- Troubleshooting guide
- Configuration examples
- API token acquisition methods

## [Unreleased]

