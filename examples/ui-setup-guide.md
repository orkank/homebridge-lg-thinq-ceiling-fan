# UI Setup Guide - LG Ceiling Fan Plugin

This guide walks you through setting up the homebridge-lg-ceilingfan plugin using the built-in authentication UI.

## Prerequisites

- Homebridge with Config UI X installed
- LG ThinQ account with ceiling fans registered
- Internet connection

## Step-by-Step Setup

### 1. Install the Plugin

**Via Homebridge Config UI X:**
1. Open Homebridge Config UI X in your browser
2. Go to the "Plugins" tab
3. Search for "LG Ceiling Fan"
4. Click "Install" on the "homebridge-lg-ceilingfan" plugin
5. Wait for installation to complete

**Via Command Line:**
```bash
npm install -g homebridge-lg-ceilingfan
```

### 2. Access the Plugin Settings

1. In Homebridge Config UI X, go to the "Plugins" tab
2. Find "homebridge-lg-ceilingfan" in your installed plugins
3. Click the "Settings" button
4. You'll see the plugin configuration page

### 3. Open the Custom UI

1. In the plugin settings, look for the **"Open Custom UI"** button
2. Click this button to open the authentication interface
3. A new tab/window will open with the LG Ceiling Fan setup interface

### 4. Authenticate with LG ThinQ

1. **Select your region:**
   - Choose your country from the dropdown (e.g., "US", "KR")
   - Select your language (e.g., "en-US", "ko-KR")

2. **Enter your credentials:**
   - Enter your LG ThinQ username (email)
   - Enter your LG ThinQ password

3. **Authenticate:**
   - Click **"Login & Get Refresh Token"**
   - Wait for the authentication to complete
   - You should see a success message and your refresh token will appear

### 5. Discover Your Devices

1. Once authenticated, the "Device Discovery" section will appear
2. Click **"Discover Ceiling Fans"**
3. The plugin will scan your LG ThinQ account for devices
4. You'll see a list of discovered devices with their status (online/offline)

### 6. Save Configuration

1. Review the discovered devices
2. Click **"Save Configuration"**
3. The plugin will automatically update your Homebridge configuration
4. You'll see a success message

### 7. Restart Homebridge

1. Go back to the main Homebridge Config UI X page
2. Click **"Restart Homebridge"**
3. Wait for Homebridge to restart
4. Your LG ceiling fans should now appear in HomeKit!

## Using the Features

### Testing Your Token

- Use the **"Test Current Token"** button to verify your authentication is working
- This helps troubleshoot connection issues

### Copying Your Token

- Click the **"Copy"** button next to the refresh token field
- This allows you to save your token for backup or manual configuration

### Manual Configuration

If you prefer manual setup:
1. Copy the refresh token from the UI
2. Close the custom UI
3. Use the standard Homebridge Config UI X interface
4. Paste the token into the configuration form

## Troubleshooting

### Authentication Issues

**"Invalid username or password"**
- Double-check your LG ThinQ credentials
- Try logging into the LG ThinQ app to verify your account

**"Too many authentication attempts"**
- Wait 15-30 minutes before trying again
- LG has rate limiting on their authentication API

### Device Discovery Issues

**"No devices found"**
- Ensure your ceiling fans are registered in the LG ThinQ app
- Check that devices are online and connected to WiFi
- Try manually configuring devices if auto-discovery fails

### UI Loading Issues

**Custom UI won't open**
- Make sure you're using Homebridge Config UI X (not just Homebridge)
- Try refreshing the page or restarting your browser
- Check Homebridge logs for errors

**Blank page or errors**
- Clear your browser cache
- Disable browser extensions that might interfere
- Try a different browser

## Advanced Configuration

### Custom Device Settings

After using the UI for initial setup, you can customize device settings:

1. Go back to the plugin settings in Config UI X
2. Manually adjust device configurations:
   - Change device names
   - Enable/disable light control
   - Set maximum fan speeds
   - Configure reverse direction support

### Multiple Country Support

If you have devices in multiple countries:
1. Use the UI to authenticate with your primary account
2. Manually add devices from other regions in the configuration
3. Each device can have different country/language settings

## Configuration Examples

### Auto-Discovery Result
```json
{
  "name": "LG Ceiling Fan",
  "platform": "LGCeilingFan",
  "auth_mode": "token",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "country": "US",
  "language": "en-US",
  "devices": [
    {
      "id": "12345678",
      "name": "Living Room Fan",
      "model": "LG Ceiling Fan",
      "enable_light": true,
      "max_speed": 5,
      "reverse_supported": false
    }
  ],
  "polling_interval": 30,
  "debug": false
}
```

### Manual Device Configuration
```json
{
  "devices": [
    {
      "id": "12345678",
      "name": "Master Bedroom Fan",
      "model": "LG Ceiling Fan Pro",
      "enable_light": true,
      "max_speed": 8,
      "reverse_supported": true
    },
    {
      "id": "87654321",
      "name": "Guest Room Fan",
      "model": "LG Ceiling Fan Basic",
      "enable_light": false,
      "max_speed": 3,
      "reverse_supported": false
    }
  ]
}
```

## Support

If you encounter issues:
1. Check this guide first
2. Review the main README.md troubleshooting section
3. Enable debug mode to get detailed logs
4. Create an issue on GitHub with your logs and configuration

Happy home automation! 🏠✨