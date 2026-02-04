# Supabase Configuration Guide

## 🔐 Keeping Your Keys Secure

Your Supabase keys should **never** be committed to GitHub. Here are the best practices for managing them:

---

## ✅ Recommended: Environment Variables (Current Setup)

The app is already configured to use environment variables, which is the most secure approach.

### How It Works

The `SupabaseConfig.swift` file uses:
```swift
static let url = URL(string: ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "YOUR_SUPABASE_URL")!
static let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "YOUR_SUPABASE_ANON_KEY"
```

This means:
1. It first tries to read from environment variables
2. If not found, it falls back to placeholder values
3. **You never commit your actual keys to the repository** ✅

### Setting Up Environment Variables in Xcode

**Step 1: Edit Scheme**
1. In Xcode, click the scheme selector (next to the device selector)
2. Select **Edit Scheme...**
3. Go to **Run** → **Arguments** tab
4. Under **Environment Variables**, click **+** to add:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | `your-anon-key-here` |

**Step 2: Save**
- Click **Close**
- These settings are saved in your local `.xcscheme` file
- ✅ This file is **not** committed to git (it's in `.gitignore`)

**Step 3: Verify**
Build and run - the app will use your environment variables!

### Benefits
- ✅ Keys never appear in source code
- ✅ Safe to pull/push to GitHub
- ✅ Different keys for different team members
- ✅ Different keys for Debug vs Release builds

---

## Alternative 1: Config.xcconfig File (Also Secure)

Create a local configuration file that's ignored by git.

**Step 1: Create Config File**
```bash
cd ios-app/UrbanManual
nano Config.xcconfig
```

**Step 2: Add Your Keys**
```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_ANON_KEY = your-anon-key-here
```

**Step 3: Update .gitignore**
Add to `ios-app/.gitignore`:
```
Config.xcconfig
```

**Step 4: Update SupabaseConfig.swift**
You'd need to access these via `Bundle.main.object(forInfoDictionaryKey:)` or similar.

---

## Alternative 2: Info.plist (Less Recommended)

Add keys to Info.plist, but **don't commit** the Info.plist file.

**Not recommended because:**
- Info.plist contains other important settings
- Hard to exclude from git while keeping other changes
- Error-prone

---

## 🚫 What NOT to Do

### ❌ Don't Hardcode Keys
```swift
// DON'T DO THIS!
static let url = URL(string: "https://myproject.supabase.co")!
static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

This commits your keys to GitHub permanently (even if you delete them later, they remain in git history).

### ❌ Don't Use .env Files Without Proper Setup
iOS doesn't natively support `.env` files like Node.js does. You'd need additional build scripts.

---

## 📝 Working with Git After Setting Up

### When You Pull Updates

Your keys remain safe because:
1. Environment variables are stored in your local Xcode scheme (not in git)
2. You can pull updates freely:
   ```bash
   git pull origin copilot/rebuild-ios-app-files
   ```
3. Your local environment variables persist ✅

### If SupabaseConfig.swift Changes

If the file is updated in a pull request:
1. Pull the changes
2. Your environment variables still work (they're separate from the code)
3. No need to re-enter your keys ✅

### When Working on Multiple Machines

On each machine:
1. Clone the repository
2. Set up environment variables in Xcode (one-time setup per machine)
3. Build and run

---

## 🔍 Verification

### Check Your Setup
1. Open `SupabaseConfig.swift`
2. Verify it says `YOUR_SUPABASE_URL` (not your actual URL)
3. Check environment variables in Xcode scheme
4. Build - if it connects to Supabase, you're good! ✅

### Check What's in Git
```bash
cd ios-app
git status
git diff UrbanManual/Core/Config/SupabaseConfig.swift
```

Should show no uncommitted changes with actual keys.

---

## 🚀 For Production/App Store

### TestFlight & App Store Builds

For production builds, use Xcode Cloud or Fastlane with:
1. **Xcode Cloud**: Set environment variables in Xcode Cloud settings
2. **Fastlane**: Use `.env` files (gitignored) with Fastlane configuration
3. **GitHub Actions**: Store keys in GitHub Secrets

### CI/CD Example (GitHub Actions)
```yaml
- name: Build iOS App
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  run: xcodebuild ...
```

---

## ✅ Quick Setup Checklist

- [x] Code already uses environment variables ✅
- [ ] Set environment variables in Xcode scheme (Edit Scheme → Run → Arguments)
- [ ] Verify build works
- [ ] Confirm `SupabaseConfig.swift` doesn't contain actual keys
- [ ] Safe to pull/push to GitHub ✅

---

## 🆘 Troubleshooting

### "App can't connect to Supabase"
- Check environment variables are set in Xcode scheme
- Verify variable names match exactly: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Rebuild the project (⇧⌘K, then ⌘B)

### "Keys show as YOUR_SUPABASE_URL"
This is normal in the source code! The actual values come from environment variables.

### "Accidentally committed keys"
1. Remove them from the code immediately
2. Push the fix
3. **Rotate your keys** in Supabase dashboard (issue new ones)
4. Update your local environment variables

---

## 📚 Best Practices Summary

1. ✅ **Use environment variables** (current setup)
2. ✅ **Never commit actual keys** to git
3. ✅ **Different keys per environment** (dev, staging, prod)
4. ✅ **Rotate keys** if accidentally exposed
5. ✅ **Document the setup** for team members

Your keys stay on your machine, in Xcode scheme settings. Safe to pull from GitHub anytime! 🎉
