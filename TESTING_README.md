# LG Ceiling Fan API Testing Guide

This guide will help you test your LG ceiling fan with the LG ThinQ API to find the correct control commands before configuring the Homebridge plugin.

## Overview

The testing scripts will help you:
- Authenticate with LG ThinQ
- Discover your devices
- Test various control commands to find working ones
- Get the exact data keys and values needed for your Homebridge configuration

## Prerequisites

1. **Node.js** installed on your system
2. **LG ThinQ account** with your ceiling fan registered
3. **Required packages**: Install dependencies first:
   ```bash
   npm install axios luxon querystring crypto
   ```

## Step 1: Full Authentication & Device Testing

Use the main test script to authenticate and automatically test all potential ceiling fans:

```bash
node test-auth.js <your_email> <your_password> [country] [language]
```

### Examples:
```bash
# Let the script find your region automatically
node test-auth.js your.email@example.com yourpassword

# Specify your region (recommended)
node test-auth.js your.email@example.com yourpassword US en-US
node test-auth.js your.email@example.com yourpassword KR ko-KR
node test-auth.js your.email@example.com yourpassword EU en-GB
```

### What this script does:
1. **Finds working region** - Tests multiple regions to find one that works
2. **Authenticates** - Gets your access token and refresh token
3. **Discovers devices** - Lists all your LG devices
4. **Identifies fans** - Automatically detects potential ceiling fans
5. **Tests controls** - Runs comprehensive tests on each fan
6. **Provides results** - Shows working commands and configuration recommendations

### Sample Output:
```
🌪️ Found 1 potential ceiling fan(s). Testing automatically...

================================================================================
Testing device: Master Bedroom Fan (abc123def456)
================================================================================

=== TESTING POWER CONTROL FOR DEVICE abc123def456 ===
✅ SUCCESS: airState.operation = 1 worked!

=== TESTING SPEED CONTROL FOR DEVICE abc123def456 ===
✅ SUCCESS: airState.windStrength = 1 worked!
✅ SUCCESS: airState.windStrength = 2 worked!
✅ SUCCESS: airState.windStrength = 3 worked!
✅ SUCCESS: airState.windStrength = 4 worked!

📊 FINAL REPORT FOR DEVICE abc123def456
===============================================
Power control commands that worked: 1
  ✅ airState.operation = 0
  ✅ airState.operation = 1

Speed control commands that worked: 4
  ✅ airState.windStrength = 1
  ✅ airState.windStrength = 2
  ✅ airState.windStrength = 3
  ✅ airState.windStrength = 4

🎉 SUCCESS! Found 1 controllable device(s).

Recommendations for your Homebridge plugin configuration:
Device ID: abc123def456
  Power Control: Use "airState.operation" with values 0/1
  Speed Control: Use "airState.windStrength" with values 0-4
```

## Step 2: Individual Device Testing (Optional)

If you want to test a specific device, use the individual device test script:

```bash
node test-device.js <device_id> <refresh_token> <country> <language>
```

### Example:
```bash
node test-device.js abc123def456 your_refresh_token_here US en-US
```

### When to use this:
- You already have a refresh token
- You want to test a specific device ID
- You want to re-test after making changes
- The automatic detection didn't work properly

## Understanding the Results

### Power Control
The scripts test various data keys for turning the fan on/off:
- `airState.operation` - Most common for LG fans
- `fanState.operation` - Alternative for some models
- `basicCtrl.operation` - Basic control method
- Values: `0` (off), `1` (on)

### Speed Control
The scripts test different data keys and value ranges:
- `airState.windStrength` - Most common for LG fans
- `fanState.windStrength` - Alternative for some models
- Values tested: `0-4`, `0-3`, `0/25/50/75/100`, string values

### Device Status Analysis
The scripts also analyze the device status to show you:
- Current device state and available data points
- All snapshot keys and their current values
- Device model, type, and network information
- Potential fan-related keys in the data structure

## Using Results in Homebridge

Once you find working commands, update your Homebridge plugin configuration:

### 1. Update the Plugin Code
Edit `src/ceiling-fan-accessory.ts` to use the working data keys:

```typescript
// For power control, replace in setOn() method:
await this.lgApi.sendCommand(this.config.id, {
  dataKey: 'airState.operation', // Use your working power data key
  dataValue: isOn ? 1 : 0,
});

// For speed control, replace in setRotationSpeed() method:
await this.lgApi.sendCommand(this.config.id, command);
// Where command uses your working speed data key, e.g.:
// { dataKey: 'airState.windStrength', dataValue: lgSpeed }
```

### 2. Update Configuration
Add your device to the Homebridge config:

```json
{
  "platforms": [
    {
      "name": "LG Ceiling Fan",
      "platform": "LGCeilingFan",
      "auth_mode": "token",
      "refresh_token": "your_refresh_token_from_test",
      "country": "US",
      "language": "en-US",
      "devices": [
        {
          "id": "abc123def456",
          "name": "Master Bedroom Fan",
          "model": "LG Ceiling Fan Pro",
          "enable_light": false,
          "max_speed": 4,
          "reverse_supported": false
        }
      ]
    }
  ]
}
```

## Troubleshooting

### No Working Commands Found
If no commands work:
1. **Check device type** - Make sure it's actually a controllable ceiling fan
2. **Try different regions** - Your account might be in a different region
3. **Check device status** - Look at the raw device data for clues
4. **Try manual commands** - Test specific data keys you see in the device status

### Authentication Fails
If authentication fails:
1. **Check credentials** - Make sure email/password are correct
2. **Try different regions** - LG accounts are region-specific
3. **Check ThinQ app** - Make sure you can log into the mobile app
4. **Two-factor auth** - Disable 2FA temporarily if enabled

### Device Not Detected as Fan
If your fan isn't detected automatically:
1. **Check device type** - Look at `deviceType` in the discovery output
2. **Manual testing** - Use `test-device.js` with your specific device ID
3. **Check model name** - Some fans have unexpected model names

### Commands Don't Work
If commands are sent but don't control the fan:
1. **Check return codes** - Look for error responses in the output
2. **Try different values** - Some fans use different value ranges
3. **Check timing** - Add delays between commands
4. **Verify device state** - Make sure the device is online and responsive

## Common Working Patterns

Based on testing, these are common working patterns for LG ceiling fans:

### Pattern 1: Air State (Most Common)
```
Power: airState.operation (0/1)
Speed: airState.windStrength (0-4)
```

### Pattern 2: Fan State
```
Power: fanState.operation (0/1)
Speed: fanState.windStrength (0-4)
```

### Pattern 3: Basic Control
```
Power: basicCtrl.operation (0/1)
Speed: basicCtrl.speed (0-4)
```

## Advanced Testing

### Custom Data Keys
If standard patterns don't work, you can modify the test scripts to try additional data keys:

1. Edit `test-device.js`
2. Add your custom data keys to the `speedTests` or `powerTests` arrays
3. Run the test again

### Value Range Testing
If you suspect different value ranges, modify the `values` arrays in the test scripts:

```javascript
// Example: Test 1-5 instead of 0-4
{ dataKey: 'airState.windStrength', values: [1, 2, 3, 4, 5] }

// Example: Test percentage values
{ dataKey: 'airState.windStrength', values: [0, 20, 40, 60, 80, 100] }
```

## Support

If you're still having issues:
1. Run the tests with full debug output
2. Check the device status data for clues about available controls
3. Compare with other working LG ThinQ integrations
4. Consider that some devices may not support remote control

The goal is to find the exact data keys and values that work with your specific LG ceiling fan model, which you can then use in the Homebridge plugin configuration.