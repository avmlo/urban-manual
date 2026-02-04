# Quick Terminal Commands for iOS App Fixes

## Where to Run These Commands

**Open Terminal:**
- Press `Cmd + Space` (Spotlight)
- Type "Terminal" and press Enter
- OR: Finder → Applications → Utilities → Terminal

**You can run these commands from ANY directory** - they don't need to be in your project folder.

---

## Clear Derived Data

Removes cached build data that might have stale package references:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/UrbanManual-*
```

**When to use:** After deleting Package.swift or changing package dependencies

---

## Find Package.swift Files

Check if any Package.swift files still exist:

```bash
cd ~/Documents/urban-manual-1
find . -name "Package.swift" -type f
```

**If found, delete them:**
```bash
find . -name "Package.swift" -type f -delete
```

---

## Clear All Xcode Derived Data (Nuclear Option)

If you want to clear ALL projects' derived data:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

⚠️ **Warning:** This will clear derived data for ALL Xcode projects, not just UrbanManual

---

## Check Package Swift Cache Location

See where Xcode stores package caches:

```bash
ls -la ~/Library/Developer/Xcode/DerivedData/
```

---

## Reset Swift Package Manager Cache

Clear SwiftPM's local package cache:

```bash
rm -rf ~/Library/Caches/org.swift.swiftpm
```

---

## Verify Commands Worked

After clearing derived data, verify it's gone:

```bash
ls ~/Library/Developer/Xcode/DerivedData/ | grep UrbanManual
```

If no output, it means the derived data was cleared successfully.

