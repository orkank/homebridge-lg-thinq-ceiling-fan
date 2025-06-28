# Homebridge LG Ceiling Fan


![version](https://img.shields.io/npm/v/homebridge-lg-thinq-ceiling-fan/latest?label=latest) ![NPM Downloads](https://img.shields.io/npm/d18m/homebridge-lg-thinq-ceiling-fan?label=npm%20downloads)


A Homebridge plugin for controlling LG ceiling fans via the LG ThinQ platform.

<img src="lg-ceiling-fan.webp" alt="LG Ceiling Fan Plugin" width="300">

## Features

- **4-Speed Discrete Control**: Shows as 4 distinct speed buttons in Home app (Off, Low, Medium, High, Turbo)
- **Power Control**: Turn ceiling fan on/off
- **Status Monitoring**: Real-time status updates from LG ThinQ
- **Automatic Authentication**: Handles LG ThinQ API authentication
- **🎯 Easy Setup**: Built-in UI for automatic LG ThinQ authentication and device discovery
- **Auto-Discovery**: Automatically discovers LG ceiling fans from your ThinQ account
- **Manual Configuration**: Configure specific devices with custom settings
- **HomeKit Integration**: Native HomeKit support through Homebridge

## Requirements

- Node.js 14.18.1 or later
- Homebridge 1.3.5 or later
- LG ThinQ account with registered ceiling fans
- LG ThinQ API v2 compatible ceiling fans

## Installation

You can install this plugin in two ways:

### Option 1: Homebridge Config UI X (Recommended)

1. Install via Homebridge Config UI X by searching for "homebridge-lg-thinq-ceiling-fan"
2. Configure using the user-friendly setup interface (see Configuration section below)

### Option 2: Manual Installation

```bash
npm install -g homebridge-lg-thinq-ceiling-fan
```

## Configuration

### Easy Setup (Recommended)

This plugin includes a custom user interface for easy configuration. After installation:

1. Go to Homebridge Config UI X
2. Navigate to the plugin settings for "LG Ceiling Fan"
3. Use the authentication interface to:
   - Enter your LG ThinQ credentials
   - Automatically obtain refresh token
   - Discover and configure your ceiling fans
   - Save configuration with automatic token refresh

### ⚠️ Important: Child Bridge Warning

**IMPORTANT NOTICE**: If you move this plugin to a **Child Bridge**, the plugin configuration UI becomes inaccessible and **there is no way to get back to the configuration interface**. This is a known Homebridge issue, not a plugin issue.

**Before moving to Child Bridge:**
- ✅ Complete all configuration using the plugin UI while it's still in the main bridge
- ✅ Test that authentication and device discovery work properly
- ✅ Ensure all settings are correct and saved
- ✅ Make note of your refresh token and device IDs

**If you need to reconfigure after moving to Child Bridge:**
- You will need to manually edit the `config.json` file
- Or temporarily move the plugin back to the main bridge to access the UI

**We strongly recommend completing all initial setup before considering Child Bridge separation.**

### Automatic Token Refresh

The plugin supports automatic token refresh to prevent authentication failures:

**Features:**
- **Auto-Refresh**: Automatically refreshes expired tokens without manual intervention
- **Credential Storage**: Optionally saves your username/password securely for seamless re-authentication
- **Fallback Authentication**: If refresh token fails, automatically re-authenticates with stored credentials
- **Smart Error Handling**: Gracefully handles token expiry and network issues

**Configuration Options:**
- `auto_refresh`: Enable automatic token refresh (default: true)
- `save_credentials`: Save username/password for automatic re-authentication (recommended)
- When enabled, the plugin will automatically handle token expiry without requiring manual intervention

**Security Note:** Credentials are stored securely in your Homebridge configuration and only used for automatic token refresh when needed.

### Manual Configuration

If you prefer to configure manually, add the following to your Homebridge config.json:

```json
{
  "platforms": [
    {
      "name": "LG Ceiling Fan",
      "platform": "LGCeilingFan",
      "auth_mode": "token",
      "refresh_token": "your_refresh_token_here",
      "country": "US",
      "language": "en-US",
      "auto_refresh": true,
      "save_credentials": true,
      "username": "your_email@example.com",
      "password": "your_password",
      "devices": [
        {
          "id": "your_device_id",
          "name": "Living Room Ceiling Fan",
          "model": "LG Ceiling Fan",
          "max_speed": 4
        }
      ],
      "polling_interval": 30,
      "debug": false
    }
  ]
}
```

**Configuration Parameters:**
- `auth_mode`: Authentication method (`"token"` recommended)
- `refresh_token`: LG ThinQ refresh token (get via Custom UI)
- `country`: Your country code (e.g., "US", "TR", "KR")
- `language`: Your language code (e.g., "en-US", "tr-TR", "ko-KR")
- `auto_refresh`: Enable automatic token refresh (default: true, recommended)
- `save_credentials`: Save credentials for automatic re-authentication (recommended)
- `username`: LG ThinQ username/email (required if save_credentials is true)
- `password`: LG ThinQ password (required if save_credentials is true)
- `devices`: Array of ceiling fan configurations
- `polling_interval`: Status update interval in seconds (default: 30)
- `debug`: Enable debug logging (default: false)

## Configuration Options

### Authentication

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `auth_mode` | string | Yes | Authentication method: `token` or `account` |
| `refresh_token` | string | If `auth_mode` = `token` | LG ThinQ refresh token (use UI to get automatically) |
| `username` | string | If `auth_mode` = `account` | LG ThinQ username |
| `password` | string | If `auth_mode` = `account` | LG ThinQ password |
| `country` | string | Yes | Country code (e.g., "US", "KR") |
| `language` | string | Yes | Language code (e.g., "en-US", "ko-KR") |

### Device Configuration

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `devices` | array | No | [] | List of devices to configure (empty = auto-discover) |
| `devices[].id` | string | Yes | - | Device ID from LG ThinQ |
| `devices[].name` | string | No | Device alias | Custom name for the fan |
| `devices[].model` | string | No | Device type | Fan model name |
| `devices[].max_speed` | number | No | 5 | Maximum fan speed (1-10) |

### Auto-Refresh Configuration

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `auto_refresh` | boolean | No | true | Enable automatic token refresh |
| `save_credentials` | boolean | No | false | Save credentials for automatic re-authentication |
| `username` | string | If `save_credentials` = true | - | LG ThinQ username for auto-refresh |
| `password` | string | If `save_credentials` = true | - | LG ThinQ password for auto-refresh |

### Advanced Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `polling_interval` | number | No | 30 | Status update interval (seconds) |
| `debug` | boolean | No | false | Enable debug logging |

## Getting Your Refresh Token

### Method 1: Using the Built-in UI (Recommended)

The easiest way to get your refresh token is through the plugin's built-in UI:

1. Install the plugin
2. Go to plugin settings in Homebridge Config UI X
3. Click "Plugin Config"
4. Enter your LG ThinQ credentials
5. Click "Login & Get Refresh Token"
6. The token will be automatically saved to your configuration

### Method 2: Using Developer Tools

---

## Device Discovery

The plugin can automatically discover LG ceiling fans in two ways:

### Auto-Discovery (Recommended)
Use the built-in UI or leave the `devices` array empty:
1. The plugin fetches all devices from your LG ThinQ account
2. Filters devices that appear to be ceiling fans
3. Automatically configures them with default settings

## Supported Features

### Fan Control
- **Power**: Turn fan on/off
- **Speed**: 4 discrete speed steps (Off, Low, Medium, High, Turbo)

## Troubleshooting

### Token Issues

**Token Expired Error:**
- Enable `auto_refresh` and `save_credentials` in your configuration
- If auto-refresh fails, use the Custom UI to get a new refresh token
- Check your username/password are correct in the configuration

**Authentication Failures:**
- Verify your LG ThinQ credentials are correct
- Check your country and language codes match your LG account region
- Try using the Custom UI to re-authenticate and get a fresh token

**Auto-Refresh Not Working:**
- Ensure `auto_refresh: true` and `save_credentials: true` in config
- Verify `username` and `password` are set correctly
- Check Homebridge logs for authentication error details

### Common Issues

**Authentication Failed**
- Use the built-in UI for automatic authentication
- Verify your LG ThinQ credentials are correct
- Check country and language codes match your LG account
- Try using account authentication instead of token

**No Devices Found**
- Use the device discovery feature in the UI
- Ensure your ceiling fans are registered in the LG ThinQ app
- Check that devices are online and accessible
- Try specifying device IDs manually in configuration

**Device Not Responding**
- Check your internet connection
- Verify the ceiling fan is connected to WiFi
- Use the "Test Token" feature in the UI
- Increase the polling interval to reduce API load

**HomeKit Shows "No Response"**
- Check Homebridge logs for errors
- Restart Homebridge
- Verify device configuration is correct
- Use the built-in UI to test your authentication

### Debug Mode

Enable debug logging by setting `debug: true` in your configuration. This will provide detailed logs about:
- API authentication
- Device discovery
- Status updates
- Command execution

### Getting Device IDs

To find your device IDs:

1. Use the built-in UI device discovery feature (recommended)
2. Enable debug mode in the plugin configuration
3. Restart Homebridge
4. Check the logs for discovered devices
5. Use the device IDs shown in the logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the Apache-2.0 License - see the [LICENSE](LICENSE) file for details.

## Credits

Plugin by [orkank](https://github.com/orkank/homebridge-lg-thinq-ceiling-fan)

## Disclaimer

This plugin is not officially supported by LG Electronics. It uses reverse-engineered APIs that may change without notice. Use at your own risk.

## Support

If you encounter issues:
1. Try the built-in UI for easy setup and testing
2. Check the troubleshooting section above
3. Enable debug mode and check logs
4. Search existing GitHub issues
5. Create a new issue with logs and configuration details

For questions and discussion, please use GitHub Discussions.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.
