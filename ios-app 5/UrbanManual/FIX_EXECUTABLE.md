# Fix Missing Bundle Executable - Step by Step

## Immediate Actions in Xcode

### Step 1: Verify Target Product Type
1. Project Navigator > Select your project (top item)
2. Select **UrbanManual** target (under TARGETS)
3. **General** tab
4. Check **Type** field
5. **MUST be:** "Application" ✅

If NOT "Application":
1. Go to **Build Settings**
2. Search: "Product Type"
3. Change to: `com.apple.product-type.application`
4. Clean build folder
5. Rebuild

### Step 2: Check Build Phases
1. Select target > **Build Phases** tab
2. **Compile Sources** should list:
   - UrbanManualApp.swift
   - All your other Swift files
3. If files missing, click **+** to add them

### Step 3: Verify @main
Only ONE file should have `@main`:
- ✅ UrbanManualApp.swift has `@main`
- ❌ No other files have `@main`

### Step 4: Check Build Settings
Search for these settings:

**Product Name:**
- Value: `UrbanManual`

**Executable Name:**
- Value: `UrbanManual` or `$(EXECUTABLE_NAME)`

**Mach-O Type:**
- Value: `Executable`

**Info.plist File:**
- Should point to Info.plist

### Step 5: Build and Check
1. **Product > Build (Cmd + B)**
2. Check build succeeds (no errors)
3. Open **Report Navigator (Cmd + 9)**
4. Check latest build for warnings

### Step 6: Verify Executable Created
After successful build, in terminal:
```bash
find ~/Library/Developer/Xcode/DerivedData/UrbanManual-* -name "UrbanManual" -type f 2>/dev/null | head -1
```

Should return a path to the executable file.

### Step 7: Scheme Configuration
1. Click scheme dropdown (next to device selector)
2. **Edit Scheme...**
3. **Run** > **Info** tab
4. **Executable:** Select "UrbanManual.app" from dropdown
5. Click **Close**

## Most Common Cause

**Product Type is wrong** - Make sure it's set to "Application", not "Framework" or "Library".

## If Still Failing

Share:
1. What Product Type shows (General tab)
2. Any build errors/warnings (Report Navigator)
3. Whether executable file exists (terminal command above)

