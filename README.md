# HealthSyncApp – React Native Health Data Integration

![Health Data Sync Demo](demo.gif) *(Optional screenshot)*

Cross-platform health data sync for React Native (Android + iOS) with:
- Health Connect (Android)
- Apple HealthKit (iOS)

## 🚀 Getting Started

### Prerequisites

**For both platforms:**
- Node.js 18+
- React Native CLI
- Watchman (`brew install watchman`)

**iOS-specific:**
- Xcode 15+
- CocoaPods (`sudo gem install cocoapods`)
- Physical iPhone (HealthKit requires real device)

**Android-specific:**
- Java 11
- Android Studio
- Android SDK 33+
- Health Connect app installed

### Installation

1. Clone repository:
   ```bash
   git clone https://github.com/your-repo/HealthSyncApp.git
   cd HealthSyncApp

2. Install dependencies:
npm install
cd ios && pod install && cd ..

3. Configure environment:
# Create Android local.properties
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

🏃 Running the App
Start Metro bundler:
npm start

For iOS (Physical device only):
npm run ios

For Android:
# Start emulator first (or connect device)
emulator -avd Pixel_5 & npm run android

🔧 Configuration
Android Setup

Add permissions to android/app/src/main/AndroidManifest.xml:

<uses-permission android:name="android.permission.health.READ_STEPS"/>
<uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
<uses-permission android:name="android.permission.health.READ_SLEEP"/>

Enable Health Connect in build.gradle:

dependencies {
    implementation "androidx.health.connect:connect-client:1.1.0"
}

iOS Setup

    In Xcode:

        Enable HealthKit capability

        Add privacy descriptions to Info.plist:

        <key>NSHealthShareUsageDescription</key>
        <string>We need access to sync your health data</string>

        Run HTML

🛠 Troubleshooting
Issue	Solution
Xcode build failures	rm -rf ios/Pods && cd ios && pod install
"adb not found"	brew install android-platform-tools
HealthKit permissions not showing	Must use physical iOS device
Gradle sync failed	Verify Java 11 is installed
📚 Documentation

    Health Connect API

    Apple HealthKit

    React Native Bridging

🏗 Project Structure

HealthSyncApp/
├── android/ - Android native code
├── ios/ - iOS native code
├── server/ - API endpoints
└── src/
    ├── api/ - Server communication
    ├── components/ - UI components
    ├── hooks/ - Custom hooks
    └── native/ - Native module bridge

✅ Next Steps

    Set up authentication for production

    Implement background sync

    Add error tracking (Sentry/Crashlytics)



## Critical Verification Steps

1. **Environment Validation**:
   ```bash
   npx react-native doctor

    Manual Xcode Build:

        Open ios/HealthSyncApp.xcworkspace

        Build manually first

    Android Emulator Setup:

    sdkmanager --install "system-images;android-33;google_apis;x86_64"
    avdmanager create avd -n HealthSyncEmu -k "system-images;android-33;google_apis;x86_64"

    Health Connect Installation:

    adb install-multiple -r -t healthconnect.apk