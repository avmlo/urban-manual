# Urban Manual iOS App - Setup Instructions

## Prerequisites

- Xcode 15.0 or later
- macOS Sonoma (14.0) or later
- Apple Developer Account (for device testing)
- Supabase project with Urban Manual database

## Step-by-Step Setup

### 1. Create Xcode Project

1. Open Xcode
2. File > New > Project
3. Select **iOS** > **App**
4. Configure:
   - **Product Name:** UrbanManual
   - **Interface:** SwiftUI
   - **Language:** Swift
   - **Storage:** None
   - **Minimum iOS:** 17.0
5. Choose save location (recommend: save in a separate folder, not inside the web project)

### 2. Copy Swift Files

Copy all Swift files from this directory structure into your Xcode project:

```
Copy these folders into your Xcode project:
├── Core/
│   ├── Config/
│   │   └── SupabaseConfig.swift
│   └── Network/
│       └── NetworkError.swift
├── Models/
│   ├── Destination.swift
│   ├── User.swift
│   ├── SavedDestination.swift
│   ├── List.swift
│   └── ListItem.swift
├── Repositories/
│   ├── DestinationRepository.swift
│   ├── AuthRepository.swift
│   ├── SavedRepository.swift
│   └── ListRepository.swift
├── ViewModels/
│   ├── Auth/
│   │   └── AuthViewModel.swift
│   └── Destinations/
│       ├── DestinationsViewModel.swift
│       └── DestinationDetailViewModel.swift
├── Views/
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
└── App/
    └── UrbanManualApp.swift (Replace the default ContentView with this)
```

**Important:** In Xcode:
- Right-click your project folder
- Select "Add Files to [Project Name]"
- Select the folders above
- Make sure "Copy items if needed" is checked
- Select your app target

### 3. Add Package Dependencies

1. In Xcode, select your project in navigator
2. Select your app target
3. Go to **Package Dependencies** tab
4. Click **+** button
5. Add these packages:

   **Supabase Swift:**
   - URL: `https://github.com/supabase/supabase-swift`
   - Version: `2.0.0` or later

   **Kingfisher:**
   - URL: `https://github.com/onevcat/Kingfisher`
   - Version: `7.0.0` or later

6. Click **Add Package** for each

### 4. Configure Supabase

1. Open `Core/Config/SupabaseConfig.swift`
2. Replace placeholders:
   ```swift
   static let url = URL(string: "YOUR_SUPABASE_URL")!
   static let anonKey = "YOUR_SUPABASE_ANON_KEY"
   ```

   Or use environment variables:
   ```swift
   static let url = URL(string: ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "YOUR_SUPABASE_URL")!
   static let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "YOUR_SUPABASE_ANON_KEY"
   ```

3. Find your Supabase credentials:
   - Go to Supabase Dashboard
   - Settings > API
   - Copy **Project URL** and **anon public** key

### 5. Update App Entry Point

Replace the default `App.swift` or `ContentView.swift` with `UrbanManualApp.swift`.

If Xcode created a default file:
1. Delete the default `ContentView.swift` if it exists
2. Make sure `UrbanManualApp.swift` is set as the entry point
3. The file should have `@main` attribute

### 6. Add Info.plist Permissions

Add to your `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to show nearby destinations on the map.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location to show nearby destinations on the map.</string>
```

Or in Xcode:
1. Select your project
2. Select your app target
3. Go to **Info** tab
4. Add "Privacy - Location When In Use Usage Description"
5. Add "Privacy - Location Always and When In Use Usage Description"

### 7. Import Statements

Make sure all files have correct imports at the top:

```swift
import SwiftUI
import Supabase  // For Supabase files
import Kingfisher  // For image loading files
import MapKit  // For map-related files
```

### 8. Build and Run

1. Select a simulator (iPhone 15 Pro recommended)
2. Press **Cmd + R** or click Run button
3. Resolve any import errors or missing dependencies

### 9. Common Fixes

**Issue: "Cannot find 'Supabase' in scope"**
- Make sure Supabase package is added and linked to target
- Clean build folder: Product > Clean Build Folder (Shift+Cmd+K)
- Restart Xcode

**Issue: "Cannot find 'Kingfisher' in scope"**
- Same as above for Kingfisher package

**Issue: Auth not working**
- Check Supabase URL and key in `SupabaseConfig.swift`
- Ensure Supabase Auth is enabled in your project
- Check network connectivity

**Issue: Images not loading**
- Check image URLs in database
- Ensure Info.plist allows HTTP (if needed)
- Verify Kingfisher is properly imported

### 10. Test the App

1. Run the app
2. You should see the login screen
3. Create a test account (Sign Up)
4. Browse destinations
5. Test save functionality
6. Check destination details

## Next Steps

After basic setup works:

1. Implement SavedView fully
2. Implement ListsView fully
3. Add MapView with markers
4. Add search functionality
5. Add pull-to-refresh
6. Add infinite scroll
7. Implement dark mode
8. Add animations

## Database Setup

Make sure your Supabase database has these tables:
- `destinations`
- `saved_destinations`
- `lists`
- `list_items`

See the main project's migration files for schema details.

## Troubleshooting

### Build Errors

1. **Missing imports:** Add required imports at top of files
2. **Package not found:** Re-add packages, clean build folder
3. **Type errors:** Check model Codable implementations match database schema

### Runtime Errors

1. **Supabase connection fails:** Check URL and key
2. **Auth not working:** Check Supabase Auth settings
3. **Images not loading:** Check URLs and network permissions

### Performance

1. Add image caching (Kingfisher handles this)
2. Implement pagination for large lists
3. Use lazy loading for images

## Support

For issues:
1. Check Xcode console for errors
2. Verify Supabase connection
3. Check database schema matches models
4. Ensure all dependencies are added

## Development Tips

- Use Xcode's preview feature for rapid UI development
- Use breakpoints to debug
- Check Network tab for API calls
- Use Supabase Dashboard to inspect data

Good luck! 🚀

