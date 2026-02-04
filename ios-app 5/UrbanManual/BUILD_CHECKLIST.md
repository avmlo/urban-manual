# Build Checklist - Fix "Executable Path is a Directory"

## Step-by-Step Fix

### Step 1: Check Build Log (CRITICAL)
1. In Xcode, press **Cmd + B** to build
2. Open the **Report Navigator** (Cmd + 9)
3. Look for **red errors**
4. **Copy the exact error messages** - these tell us what's wrong

### Step 2: Verify Package Dependencies

**In Xcode:**
1. Project Navigator > Select your project
2. Select your app target
3. Go to **Package Dependencies** tab
4. Should show:
   - ✅ Supabase (supabase-swift)
   - ✅ Kingfisher

**If missing:**
- Click **+** button
- Add: `https://github.com/supabase/supabase-swift`
- Add: `https://github.com/onevcat/Kingfisher`

### Step 3: Clean Build

```
Product > Clean Build Folder (Shift + Cmd + K)
```

### Step 4: Delete DerivedData

```bash
# Run in terminal:
rm -rf ~/Library/Developer/Xcode/DerivedData/UrbanManual-*
```

Or manually:
- Go to ~/Library/Developer/Xcode/DerivedData
- Delete the UrbanManual folder
- Restart Xcode

### Step 5: Verify Target Configuration

1. Select project > Select target
2. **General** tab:
   - Bundle Identifier: `com.yourname.UrbanManual`
   - Version: 1.0
   - Build: 1
   - iOS Deployment Target: 17.0

3. **Build Settings** tab:
   - Search "Product Name" → Should be "UrbanManual"
   - Search "Executable Name" → Should be "UrbanManual"

### Step 6: Check Scheme

1. Click scheme selector (top toolbar)
2. **Edit Scheme...**
3. **Run** > **Info**
4. **Executable:** Select "UrbanManual.app" (not "Ask on Launch")

### Step 7: Verify @main

- Only ONE file should have `@main`
- Check: `UrbanManualApp.swift` has `@main`
- Delete any other `@main` files (like default ContentView.swift)

### Step 8: Test Minimal Build

If still failing, try the minimal version:

1. Rename `UrbanManualApp.swift` to `UrbanManualApp_BACKUP.swift`
2. Rename `UrbanManualApp_MINIMAL.swift` to `UrbanManualApp.swift`
3. Build again (Cmd + B)
4. If this builds, the issue is with dependencies or other files

### Step 9: Common Errors & Fixes

**"Cannot find 'Supabase' in scope"**
→ Re-add Supabase package to target

**"Cannot find 'Kingfisher' in scope"**
→ Re-add Kingfisher package to target

**"Type 'Auth.Session' has no member..."**
→ Supabase API might be different - need to check actual SDK

**"Cannot find type 'AuthChangeEvent'"**
→ Simplified in latest code - should work now

**"Value of type 'SupabaseClient' has no member 'auth'"**
→ Check Supabase package version - might need to update

### Step 10: Get Help

**Share with me:**
1. Exact error messages from build log
2. Xcode version
3. macOS version
4. Which packages are installed

Then I can fix the specific issues!

## Quick Test

**Minimal working app (no dependencies):**

```swift
import SwiftUI

@main
struct UrbanManualApp: App {
    var body: some Scene {
        WindowGroup {
            Text("Urban Manual")
                .font(.largeTitle)
        }
    }
}
```

If this doesn't build → Project configuration issue
If this builds → Dependency or API issue

