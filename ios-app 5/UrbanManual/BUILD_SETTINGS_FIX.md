# Fix: Missing Bundle Executable

## Error
"UrbanManual.app is missing its bundle executable"

## Solution

### 1. Check Target Product Type

**In Xcode:**
1. Select your project in navigator
2. Select **UrbanManual** target
3. Go to **General** tab
4. Under **Identity**, check:
   - **Type:** Should be "Application" (not Framework, Library, etc.)
   
If it's not "Application":
1. Go to **Build Settings** tab
2. Search for "Product Type"
3. Should be `com.apple.product-type.application`
4. If wrong, change it

### 2. Verify Build Settings

**In Build Settings (search for these):**

**Product Name:**
- Should be: `UrbanManual`

**Executable Name:**
- Should be: `UrbanManual` (or `$(EXECUTABLE_NAME)`)

**Mach-O Type:**
- Should be: `Executable` (not Static Library, Dynamic Library, etc.)

**Strip Debug Symbols During Copy:**
- Should be: `YES` (for Release) or `NO` (for Debug)

### 3. Check Info.plist

**Verify Info.plist exists:**
1. In project navigator, should see `Info.plist`
2. If missing, create one or check Build Settings > Info.plist File path

**Info.plist should have:**
- `CFBundleExecutable` = `$(EXECUTABLE_NAME)` or `UrbanManual`
- `CFBundleIdentifier` = your bundle ID
- `CFBundleName` = `$(PRODUCT_NAME)` or `UrbanManual`

### 4. Verify @main Entry Point

**Only ONE file should have `@main`:**
- Check `UrbanManualApp.swift` has `@main`
- Delete any other `@main` attributes

### 5. Clean & Rebuild

```bash
# Clean DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/UrbanManual-*

# In Xcode:
Product > Clean Build Folder (Shift + Cmd + K)
Product > Build (Cmd + B)
```

### 6. Check Scheme Executable

1. Click scheme selector
2. **Edit Scheme...**
3. **Run** > **Info**
4. **Executable:** Should be "UrbanManual.app"
5. If it says "Ask on Launch", select "UrbanManual.app"

### 7. Verify Build Phase

**Check Build Phases:**
1. Select target > **Build Phases** tab
2. Should have:
   - Compile Sources (with your Swift files)
   - Link Binary With Libraries (with frameworks)
   - Copy Bundle Resources (if any)

### 8. Check for Build Errors

Even if build "succeeds", check:
1. Report Navigator (Cmd + 9)
2. Look for warnings that might prevent executable creation
3. Check for linker errors

### 9. Nuclear Option - Recreate Target

If nothing works:
1. Create new Xcode project
2. Copy Swift files
3. Add dependencies
4. Build incrementally

## Quick Test

**Check if executable exists after build:**

```bash
# After building, check:
ls -la ~/Library/Developer/Xcode/DerivedData/UrbanManual-*/Build/Products/Debug-iphonesimulator/UrbanManual.app/

# Should see:
# - UrbanManual (executable)
# - Info.plist
# - ... other resources
```

If `UrbanManual` executable is missing → Build failed silently
If `UrbanManual` executable exists → Different issue

