# Fix: Package Dependency Error

## Error
"unexpectedly did not find the new dependency in the package graph: supabase-swift 3.0.0"

## Solution

### Problem
The error shows it's looking for version 3.0.0, but the correct version for Supabase Swift SDK is 2.0.0+.

### Fix Steps

#### Step 1: Remove Package.swift (if it exists)
**Package.swift is NOT needed for Xcode iOS projects!**

1. In Xcode project navigator
2. Find `Package.swift` file
3. **Right-click > Delete** (Move to Trash)
4. It's causing conflicts

**⚠️ If you get "missing package file" error after deletion:**
- See `FIX_MISSING_PACKAGE.md` for detailed fix steps
- Quick fix: Remove Package.swift references from project, reset caches, re-add packages via UI

#### Step 2: Add Packages in Xcode (Correct Method)

1. **Select your project** (top of navigator)
2. **Select your app target** (UrbanManual)
3. Go to **Package Dependencies** tab (next to Info, Build Settings)
4. Click **+** button at bottom left
5. Add packages:

**Supabase Swift:**
- Enter URL: `https://github.com/supabase/supabase-swift`
- Choose version: **Up to Next Major Version: 2.0.0**
- Click **Add Package**
- Make sure checkbox next to "UrbanManual" is checked
- Click **Add Package** again

**Kingfisher:**
- Enter URL: `https://github.com/onevcat/Kingfisher`
- Choose version: **Up to Next Major Version: 7.0.0**
- Click **Add Package**
- Make sure checkbox next to "UrbanManual" is checked
- Click **Add Package** again

#### Step 3: Verify Packages Added

**In Package Dependencies tab, you should see:**
- ✅ Supabase (supabase-swift)
- ✅ Kingfisher

**Check Build Settings:**
1. Go to **Build Settings** tab
2. Search for "Framework Search Paths"
3. Should include paths to packages

#### Step 4: Clean and Rebuild

```
Product > Clean Build Folder (Shift + Cmd + K)
Product > Build (Cmd + B)
```

#### Step 5: Resolve Package Versions

If still showing error:

1. **File > Packages > Reset Package Caches**
2. **File > Packages > Resolve Package Versions**
3. Wait for packages to resolve
4. Rebuild

### Important Notes

- **DO NOT** create Package.swift for iOS apps
- Xcode manages packages through the UI
- Version 2.0.0 is correct for Supabase Swift SDK (not 3.0.0)
- Packages must be added to the target explicitly

### Verify Package Resolution

**In Xcode:**
1. Report Navigator (Cmd + 9)
2. Look for "Package Resolution" entries
3. Should show packages resolving successfully

### Alternative: Remove and Re-add Packages

If packages are stuck:

1. **Package Dependencies** tab
2. Select Supabase package
3. Click **-** button to remove
4. Do same for Kingfisher
5. Close Xcode
6. Delete DerivedData: `rm -rf ~/Library/Developer/Xcode/DerivedData/UrbanManual-*`
7. Reopen Xcode
8. Re-add packages (Step 2 above)

### Still Having Issues?

**Check:**
1. Internet connection (packages download from GitHub)
2. Xcode version (15.0+ required)
3. GitHub access (if behind firewall/VPN)

**Try:**
1. Xcode > Settings > Accounts
2. Add GitHub account if needed
3. Try downloading packages again

