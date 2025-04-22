HealthSyncApp – React Native Health Data Integration

This is a React Native project that integrates with Health Connect (Android) and Apple Health (iOS) to sync health data (steps, heart rate, sleep). Bootstrapped using @react-native-community/cli.

Health Data Sync Demo (Optional: Add screenshot/demo link)
📋 Prerequisites

    Environment Setup:
    Complete the official React Native Environment Guide for:

        macOS (iOS development)

        Android Studio (Android development)

    Device Requirements:

        Android: Device/emulator with API 28+ (Android 9+) and Health Connect installed

        iOS: Physical iPhone (HealthKit doesn’t work on simulators)

🚀 Quick Start
1. Install Dependencies
bash
Copy

# Install Node modules
npm install

# Install CocoaPods (iOS only)
cd ios && pod install && cd ..

2. Start Metro Bundler
bash
Copy

npm start
# Or: yarn start

3. Run the App
Android
bash
Copy

npm run android
# Ensure emulator is running or device is connected via USB debugging

iOS
bash
Copy

npm run ios
# Requires physical iPhone connected via USB

🔧 Advanced Setup
Android-Specific

    Health Connect Permissions:
    Add to android/app/src/main/AndroidManifest.xml:
    xml
    Copy

    <uses-permission android:name="android.permission.health.READ_STEPS"/>
    <uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
    <uses-permission android:name="android.permission.health.READ_SLEEP"/>

    Run HTML

iOS-Specific

    HealthKit Entitlements:

        Enable in Xcode: Signing & Capabilities → + Capability → HealthKit

        Add to Info.plist:
        xml
        Copy

        <key>NSHealthShareUsageDescription</key>
        <string>We need access to your health data</string>

        Run HTML

🛠 Troubleshooting
Issue	Solution
adb: command not found	Install Android Platform Tools: brew install android-platform-tools
No emulators found	Create AVD: avdmanager create avd -n Pixel_5 -k "system-images;android-33;google_apis;x86_64"
HealthKit permissions not showing	Ensure you’re using a physical iOS device
CocoaPods errors	Run arch -x86_64 pod install for M1/M2 Macs
📚 Documentation
Topic	Link
Health Connect (Android)	Developer Guide
HealthKit (iOS)	Apple Documentation
React Native Bridging	Native Modules Guide
🎯 Features

    Cross-platform health data sync

    Real-time updates for steps, heart rate, and sleep

    Permission management UI