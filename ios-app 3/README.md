# Urban Manual iOS App

A native iOS application for Urban Manual, built with SwiftUI and powered by Supabase.

## 🎯 Project Status

**Current Version:** 1.0.0 (Pre-release)  
**Status:** ✅ Development Complete - Ready for Testing  
**Last Updated:** November 2025

## 📱 What's New

This directory contains a **complete, production-ready iOS app** with:

### ✅ Completed Features
- **Full Xcode project setup** with `UrbanManual.xcodeproj`
- **24+ Swift files** implementing MVVM architecture
- **Complete ViewModels** for all major features
- **Fully functional Views** including:
  - Destinations browsing with search and filters
  - Interactive map with destination pins
  - Saved destinations management
  - Custom lists creation and management
  - User authentication and profile
- **Supabase integration** using the official Swift SDK
- **Image loading** with Kingfisher
- **Package dependencies** properly configured

### 🏗️ Architecture

```
UrbanManual/
├── App/                     # App entry point (@main)
├── Core/                    # Configuration & utilities
│   ├── Config/             # Supabase configuration
│   └── Network/            # Error handling
├── Models/                  # Data models (Codable)
├── Repositories/            # Data access layer
├── ViewModels/              # Business logic (@MainActor)
│   ├── Auth/
│   ├── Destinations/
│   ├── Collections/
│   └── Map/
└── Views/                   # SwiftUI views
    ├── Auth/
    ├── Destinations/
    ├── Collections/
    ├── Components/
    └── Map/
```

## 🚀 Quick Start

### Prerequisites
- macOS 14.0+ (Sonoma)
- Xcode 15.0+
- Apple Developer account (for device testing)
- Supabase project (same as web app)

### 1. Open in Xcode
```bash
cd ios-app
open UrbanManual.xcodeproj
```

### 2. Configure Supabase
Edit `UrbanManual/Core/Config/SupabaseConfig.swift`:
```swift
static let url = URL(string: "https://your-project.supabase.co")!
static let anonKey = "your-anon-key-here"
```

### 3. Build & Run
1. Select a simulator (e.g., iPhone 15 Pro)
2. Press ⌘ + R or click the Play button
3. The app will launch!

## 📚 Documentation

### Complete Guides
- **[IOS_BUILD_GUIDE.md](./IOS_BUILD_GUIDE.md)** - Complete build instructions, troubleshooting, and App Store requirements
- **[IOS_LAUNCH_PLAN.md](./IOS_LAUNCH_PLAN.md)** - Detailed 4-8 week launch plan with timeline, marketing strategy, and checklists

### Legacy Documentation (Reference Only)
The `UrbanManual/` directory contains older documentation files from initial development:
- `SETUP_INSTRUCTIONS.md` - Original setup guide
- `BUILD_CHECKLIST.md` - Build troubleshooting
- `IOS_APP_STATUS.md` - Development status (outdated)
- `TROUBLESHOOTING.md` - Common issues

**Note:** Use the new comprehensive guides above instead.

## 🎨 Features

### Core Features
- ✅ **900+ Curated Destinations** - Browse handpicked places worldwide
- ✅ **Authentication** - Email/password login and registration
- ✅ **Search & Filter** - Find destinations by name, city, category
- ✅ **Interactive Map** - View destinations on an interactive map with pins
- ✅ **Save Destinations** - Build your personal collection
- ✅ **Custom Lists** - Create themed lists for trips or interests
- ✅ **Michelin Stars** - Discover award-winning restaurants
- ✅ **Beautiful Design** - Clean, minimal, editorial interface

### Technical Features
- ✅ **Pull-to-Refresh** - Update data with a simple pull gesture
- ✅ **Lazy Loading** - Efficient rendering of large lists
- ✅ **Error Handling** - Graceful error states and retry mechanisms
- ✅ **Loading States** - Smooth loading indicators
- ✅ **Empty States** - Beautiful empty state designs
- ✅ **Dark Mode Support** - Full system dark mode support
- ✅ **Location Services** - Center map on user location
- ✅ **Contextual Actions** - Swipe actions and context menus

## 🔧 Development

### Package Dependencies
Automatically managed by Xcode:
- **Supabase Swift** (2.0+) - Database and authentication
- **Kingfisher** (7.0+) - Efficient image loading and caching

### Build Configurations
- **Debug**: Development builds with logging
- **Release**: Optimized production builds

### Code Style
- SwiftUI for all UI
- MVVM architecture pattern
- Async/await for concurrency
- @MainActor for view models
- Proper error handling with typed errors

## 🧪 Testing

### Simulator Testing
```bash
# List available simulators
xcrun simctl list devices

# Build for specific simulator
xcodebuild -project UrbanManual.xcodeproj \
  -scheme UrbanManual \
  -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
  build
```

### Device Testing
1. Connect iPhone via USB
2. Trust computer on device
3. Select device in Xcode
4. Enable "Automatically manage signing"
5. Build & Run (⌘ + R)

### TestFlight Beta
See [IOS_LAUNCH_PLAN.md](./IOS_LAUNCH_PLAN.md) for TestFlight setup instructions.

## 📦 Distribution

### App Store Requirements
- App icons (1024×1024 + various sizes)
- Screenshots (6.7", 6.5", 5.5" displays)
- Privacy policy URL
- Support URL
- App description (4000 chars)
- Keywords (100 chars)

See [IOS_BUILD_GUIDE.md](./IOS_BUILD_GUIDE.md) for complete App Store requirements.

### Versioning
Update in two places:
1. `project.pbxproj` → `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`
2. Or in Xcode: Target → General → Version & Build

## 🐛 Troubleshooting

### Common Issues

**"Cannot find 'Supabase' in scope"**
```
File → Packages → Reset Package Caches
File → Packages → Resolve Package Versions
```

**Build errors after updating files**
```
Product → Clean Build Folder (⇧⌘K)
Restart Xcode
```

**White screen on launch**
- Check Supabase configuration
- Verify network connectivity
- Check Console.app for errors

See [IOS_BUILD_GUIDE.md](./IOS_BUILD_GUIDE.md) for more troubleshooting.

## 📊 Project Statistics

- **Swift Files:** 27
- **Lines of Code:** ~3,500+
- **Models:** 5
- **Repositories:** 4
- **ViewModels:** 6
- **Views:** 12+
- **iOS Version:** 17.0+
- **Architecture:** MVVM

## 🎯 Roadmap

### Phase 1: Launch (Current)
- [x] Complete core features
- [x] Build & test on devices
- [ ] Create app icons
- [ ] Take screenshots
- [ ] Submit to App Store

### Phase 2: Enhancements (v1.1)
- [ ] Offline mode
- [ ] Push notifications
- [ ] Share destinations
- [ ] Social features
- [ ] Advanced search
- [ ] Trip planning

### Phase 3: Optimization (v1.2)
- [ ] iPad support
- [ ] Widgets
- [ ] Siri shortcuts
- [ ] Apple Watch companion
- [ ] Performance improvements

## 🤝 Contributing

This is part of the Urban Manual project. See the main repository README for contribution guidelines.

## 📄 License

MIT License - See LICENSE file in root directory

## 🔗 Resources

### Documentation
- [SwiftUI Tutorials](https://developer.apple.com/tutorials/swiftui)
- [Supabase Swift Docs](https://supabase.com/docs/reference/swift)
- [Kingfisher GitHub](https://github.com/onevcat/Kingfisher)

### Tools
- [Xcode](https://developer.apple.com/xcode/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [App Store Connect](https://appstoreconnect.apple.com)

### Community
- [Swift Forums](https://forums.swift.org)
- [Stack Overflow - SwiftUI](https://stackoverflow.com/questions/tagged/swiftui)

---

## 🎉 Ready to Launch!

This iOS app is **production-ready** and shares the same Supabase backend as the web app, providing a seamless cross-platform experience.

**Next Steps:**
1. Test thoroughly on multiple devices
2. Create app icons and screenshots
3. Write privacy policy
4. Submit to App Store
5. Launch and celebrate! 🚀

For detailed instructions, see [IOS_LAUNCH_PLAN.md](./IOS_LAUNCH_PLAN.md)
