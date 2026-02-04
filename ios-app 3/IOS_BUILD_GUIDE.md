# Urban Manual iOS App - Complete Build Guide

## 📱 Overview

This is the native iOS app for Urban Manual, a curated travel guide platform. The app is built with SwiftUI and connects to the same Supabase backend as the web application.

## 🏗️ Project Structure

```
ios-app/
├── UrbanManual.xcodeproj/          # Xcode project file
└── UrbanManual/                    # Source code
    ├── App/                        # App entry point
    │   └── UrbanManualApp.swift
    ├── Core/                       # Core utilities and configuration
    │   ├── Config/
    │   │   └── SupabaseConfig.swift
    │   └── Network/
    │       └── NetworkError.swift
    ├── Models/                     # Data models
    │   ├── Destination.swift
    │   ├── User.swift
    │   ├── SavedDestination.swift
    │   ├── List.swift
    │   └── ListItem.swift
    ├── Repositories/               # Data access layer
    │   ├── AuthRepository.swift
    │   ├── DestinationRepository.swift
    │   ├── SavedRepository.swift
    │   └── ListRepository.swift
    ├── ViewModels/                 # Business logic
    │   ├── Auth/
    │   │   └── AuthViewModel.swift
    │   └── Destinations/
    │       ├── DestinationsViewModel.swift
    │       └── DestinationDetailViewModel.swift
    ├── Views/                      # UI components
    │   ├── Auth/
    │   │   ├── LoginView.swift
    │   │   └── ProfileView.swift
    │   ├── Destinations/
    │   │   ├── DestinationsListView.swift
    │   │   └── DestinationDetailView.swift
    │   ├── Collections/
    │   │   ├── SavedView.swift
    │   │   └── ListsView.swift
    │   ├── Components/
    │   │   └── DestinationCard.swift
    │   └── MainTabView.swift
    ├── Assets.xcassets/            # Images and colors
    └── Info.plist                  # App configuration
```

## ✅ Prerequisites

### Required Software
- **macOS** 14.0 (Sonoma) or later
- **Xcode** 15.0 or later (download from Mac App Store)
- **iOS** 17.0+ (for testing on device)

### Required Accounts
- **Apple Developer Account** (free for testing, $99/year for App Store)
- **Supabase Project** (same as web app)

### Check Your Setup
```bash
# Check Xcode installation
xcodebuild -version

# Check Swift version
swift --version
```

## 🚀 Quick Start

### 1. Open the Project in Xcode

```bash
cd /path/to/urban-manual/ios-app
open UrbanManual.xcodeproj
```

### 2. Configure Supabase Credentials

Open `UrbanManual/Core/Config/SupabaseConfig.swift` and update with your Supabase credentials:

```swift
static let url = URL(string: "https://your-project.supabase.co")!
static let anonKey = "your-anon-key-here"
```

**Where to find these:**
1. Go to your Supabase Dashboard
2. Navigate to Settings → API
3. Copy:
   - **Project URL** → use for `url`
   - **anon public** key → use for `anonKey`

### 3. Wait for Package Dependencies

When you first open the project, Xcode will automatically:
- Download Supabase Swift SDK (v2.0+)
- Download Kingfisher (v7.0+) for image loading

This may take a few minutes. Watch the progress in the status bar.

### 4. Select a Simulator

In the Xcode toolbar:
1. Click the device selector (next to the scheme)
2. Choose an iPhone simulator (e.g., "iPhone 15 Pro")

### 5. Build and Run

Press `⌘ + R` or click the ▶️ Play button.

The app should launch in the simulator!

## 📝 Configuration Options

### Development Team (Required for Device Testing)

To run on a physical iPhone:

1. In Xcode, select the project in the navigator
2. Select the "UrbanManual" target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (add your Apple ID in Xcode → Preferences → Accounts)

### Bundle Identifier

The default bundle ID is `com.urbanmanual.app`. To change it:

1. Select project → Target → General
2. Update **Bundle Identifier**
3. Must be unique (use reverse domain notation)

### Environment Variables (Optional)

Instead of hardcoding credentials, you can use environment variables:

In `SupabaseConfig.swift`:
```swift
static let url = URL(string: ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "https://your-project.supabase.co")!
static let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "your-anon-key"
```

Then in Xcode:
1. Product → Scheme → Edit Scheme
2. Run → Arguments tab
3. Add Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

## 🛠️ Building for Production

### 1. Archive the App

1. Select **Any iOS Device** (not simulator) in device selector
2. Go to **Product** → **Archive**
3. Wait for build to complete
4. The Organizer window will open

### 2. Validate the Archive

1. Select your archive
2. Click **Validate App**
3. Follow the prompts
4. Fix any issues that appear

### 3. Distribute to App Store Connect

1. Click **Distribute App**
2. Select **App Store Connect**
3. Choose **Upload**
4. Follow the prompts to upload

## 📱 Testing

### On Simulator

```bash
# From command line
xcodebuild -project UrbanManual.xcodeproj \
  -scheme UrbanManual \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  build
```

### On Physical Device

1. Connect iPhone via USB
2. Trust the computer on your iPhone
3. Select your device in Xcode
4. Press ⌘ + R to build and run

### TestFlight (Beta Testing)

1. Upload build to App Store Connect (see above)
2. Go to App Store Connect → TestFlight
3. Add internal or external testers
4. Submit for beta review (external testers only)

## 🎨 Customization

### App Icon

1. Create icons in required sizes:
   - 1024×1024 (App Store)
   - Various smaller sizes for devices

2. Use a tool like [AppIcon.co](https://appicon.co) to generate all sizes

3. Drag icons into `Assets.xcassets/AppIcon.appiconset` in Xcode

### Launch Screen

The app uses a generated launch screen. To customize:

1. Edit `Info.plist`
2. Modify `UILaunchScreen` dictionary
3. Or create a custom Launch Screen storyboard

### Colors

Edit `Assets.xcassets/AccentColor.colorset/Contents.json` to change the app's accent color.

## 🐛 Troubleshooting

### Package Dependencies Not Loading

**Solution:**
```
File → Packages → Reset Package Caches
File → Packages → Resolve Package Versions
```

### Build Errors

**"Cannot find 'Supabase' in scope"**
- Wait for packages to download completely
- Clean build folder: Product → Clean Build Folder (⇧ ⌘ K)
- Restart Xcode

**"Code signing error"**
- Add your Apple ID: Xcode → Preferences → Accounts
- Enable "Automatically manage signing" in Signing & Capabilities

### Runtime Errors

**White screen on launch**
- Check Supabase configuration
- Verify network connectivity
- Check Console.app for crash logs

**Auth not working**
- Verify Supabase URL and anon key
- Check Supabase Auth is enabled in dashboard
- Ensure email confirmation is disabled for testing

## 📊 App Store Requirements

### Metadata Required

- App Name: Urban Manual
- Subtitle (optional): Curated Travel Guide
- Description (4000 chars max)
- Keywords (100 chars max)
- Support URL
- Privacy Policy URL
- Category: Travel

### Screenshots Required

You need screenshots for:
- 6.7" Display (iPhone 15 Pro Max): 1290×2796
- 6.5" Display (iPhone 11 Pro Max): 1242×2688
- 5.5" Display (iPhone 8 Plus): 1242×2208

**Tip:** Use Xcode's simulator to take screenshots:
1. Run app in simulator
2. ⌘ + S to save screenshot
3. Screenshots saved to Desktop

### Privacy Policy

Required because app uses:
- User location (for map features)
- User authentication
- Cloud storage (Supabase)

Create a simple privacy policy explaining:
- What data you collect
- How you use it
- How long you keep it
- How users can delete their data

## 🚀 Deployment Checklist

### Pre-Submission

- [ ] Test on multiple devices (iPhone and iPad)
- [ ] Test all user flows (login, browse, save, etc.)
- [ ] Verify all images load correctly
- [ ] Test offline behavior
- [ ] Check for crashes or errors
- [ ] Verify app icons and launch screen
- [ ] Update version number and build number
- [ ] Create App Store screenshots
- [ ] Write/update app description
- [ ] Prepare privacy policy
- [ ] Set up App Store Connect listing

### Submission

- [ ] Archive the app
- [ ] Upload to App Store Connect
- [ ] Complete metadata in App Store Connect
- [ ] Submit for review
- [ ] Respond to any reviewer questions
- [ ] Release to App Store once approved

### Post-Launch

- [ ] Monitor crash reports (Xcode Organizer)
- [ ] Respond to user reviews
- [ ] Track analytics
- [ ] Plan updates and improvements

## 🔗 Resources

### Official Documentation
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [Supabase Swift Documentation](https://supabase.com/docs/reference/swift)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Tools
- [Xcode](https://developer.apple.com/xcode/)
- [TestFlight](https://developer.apple.com/testflight/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [SF Symbols](https://developer.apple.com/sf-symbols/) (Free icons)

### Community
- [Swift Forums](https://forums.swift.org)
- [Stack Overflow - SwiftUI](https://stackoverflow.com/questions/tagged/swiftui)
- [r/iOSProgramming](https://reddit.com/r/iOSProgramming)

## 📄 License

MIT License - See LICENSE file in root directory

## 🆘 Support

For issues or questions:
1. Check this documentation
2. Check existing Swift files for examples
3. Review Supabase documentation
4. Search Stack Overflow
5. Ask in Swift forums

---

**Happy Building! 🎉**

This iOS app shares the same data as the web app, making it easy for users to access their saved destinations and lists across devices.
