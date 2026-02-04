# iOS App Troubleshooting Guide

## Error: "Executable Path is a Directory"

This error means Xcode couldn't build the app properly. The `.app` bundle exists but isn't a valid executable.

### Common Causes & Solutions

#### 1. Build Errors (Most Common)

**Check Xcode Build Log:**
1. Open Xcode
2. Go to View > Navigators > Reports (Cmd + 9)
3. Look for red error messages
4. Fix all compilation errors

**Common Build Errors:**

**Error: "Cannot find 'Supabase' in scope"**
- Solution: Make sure Supabase package is added
  - File > Add Package Dependencies
  - Add: `https://github.com/supabase/supabase-swift`
  - Select version 2.0.0 or later
  - Make sure it's added to your app target

**Error: "Cannot find 'Kingfisher' in scope"**
- Solution: Add Kingfisher package
  - File > Add Package Dependencies
  - Add: `https://github.com/onevcat/Kingfisher`
  - Select version 7.0.0 or later

**Error: "Cannot find type 'Session' or 'AuthChangeEvent'"**
- Solution: These might not exist in Supabase Swift SDK 2.0
- I've simplified the code - try rebuilding

#### 2. Clean Build Folder

**Step 1: Clean Build Folder**
1. Product > Clean Build Folder (Shift + Cmd + K)
2. Wait for it to complete

**Step 2: Delete DerivedData**
1. Go to ~/Library/Developer/Xcode/DerivedData
2. Delete the `UrbanManual-*` folder
3. Restart Xcode

**Step 3: Rebuild**
1. Product > Build (Cmd + B)
2. Check for errors in the build log

#### 3. Target Configuration

**Check Target Settings:**
1. Select your project in Xcode
2. Select your app target
3. Go to **General** tab
4. Verify:
   - **Bundle Identifier:** Should be unique (e.g., `com.yourname.UrbanManual`)
   - **Version:** Should be set (e.g., 1.0)
   - **Build:** Should be set (e.g., 1)

**Check Build Settings:**
1. Go to **Build Settings** tab
2. Search for "Product Name"
3. Should be "UrbanManual"
4. Search for "Executable Name"
5. Should be "UrbanManual"

#### 4. Scheme Configuration

**Check Run Scheme:**
1. Click on the scheme selector (next to stop button)
2. Select "Edit Scheme..."
3. Go to **Run** > **Info**
4. **Executable:** Should be "UrbanManual.app"
5. If it says "Ask on Launch", select "UrbanManual.app" from dropdown

#### 5. Missing @main Attribute

**Check App File:**
- `UrbanManualApp.swift` must have `@main` attribute
- Only ONE file in your app should have `@main`
- Delete any other files with `@main` (like default `ContentView.swift`)

#### 6. Dependencies Not Linked

**Check Package Dependencies:**
1. Select project in navigator
2. Select your app target
3. Go to **General** tab
4. Scroll to **Frameworks, Libraries, and Embedded Content**
5. Should see:
   - Supabase
   - Kingfisher
6. If missing, re-add packages

#### 7. Build Settings Issues

**Minimum iOS Version:**
1. Build Settings > iOS Deployment Target
2. Should be 17.0 or later

**Swift Language Version:**
1. Build Settings > Swift Language Version
2. Should be Swift 5 or later

### Quick Fix Steps (Try These First)

1. **Clean Everything:**
   ```bash
   # In terminal
   rm -rf ~/Library/Developer/Xcode/DerivedData/UrbanManual-*
   ```

2. **In Xcode:**
   - Product > Clean Build Folder (Shift + Cmd + K)
   - Product > Build (Cmd + B)
   - Check for errors

3. **If Still Failing:**
   - Close Xcode completely
   - Delete DerivedData folder manually
   - Reopen Xcode
   - Rebuild

4. **Nuclear Option (Start Fresh):**
   - Create new Xcode project
   - Copy Swift files one by one
   - Add dependencies
   - Build incrementally

### Minimal Test Version

If nothing works, try this minimal version first:

**Replace `UrbanManualApp.swift` with:**

```swift
import SwiftUI

@main
struct UrbanManualApp: App {
    var body: some Scene {
        WindowGroup {
            VStack {
                Text("Urban Manual")
                    .font(.largeTitle)
                Text("iOS App")
                    .foregroundColor(.secondary)
            }
        }
    }
}
```

If this builds, then gradually add features back.

### Still Having Issues?

1. Check Xcode build log for specific errors
2. Share the exact error messages
3. Verify all dependencies are installed
4. Make sure you're using Xcode 15.0 or later
5. Ensure macOS is up to date

### Verification Checklist

Before running, verify:
- [ ] No compilation errors in build log
- [ ] All packages added and linked
- [ ] Bundle identifier is set
- [ ] Only one @main file exists
- [ ] DerivedData cleaned
- [ ] Build succeeds (Cmd + B) before running (Cmd + R)

