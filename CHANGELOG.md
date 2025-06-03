# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

