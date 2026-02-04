# Should We Move iOS App to Separate Repo?

## ✅ Recommendation: YES, Move to Separate Repo

### Current Situation
- iOS app is already excluded from Vercel builds (`.vercelignore`)
- iOS app is a native Swift app, completely separate from Next.js web app
- No shared code dependencies (different languages: Swift vs TypeScript)
- Different build systems (Xcode vs Next.js)
- Different deployment pipelines (App Store vs Vercel)

### Benefits of Separate Repo

1. **Cleaner Separation**
   - Web app repo focuses on Next.js/React/TypeScript
   - iOS app repo focuses on Swift/SwiftUI
   - Easier to navigate and understand each codebase

2. **Independent Development**
   - Different teams can work independently
   - Different release cycles (web updates vs iOS app updates)
   - No risk of breaking one when working on the other

3. **Smaller Repo Size**
   - Web repo doesn't need iOS-specific files
   - Faster clones and builds
   - Better CI/CD performance

4. **Different CI/CD**
   - Web: Vercel deployments
   - iOS: Xcode Cloud, GitHub Actions for iOS builds, TestFlight
   - Separate workflows and configurations

5. **Better Organization**
   - iOS-specific documentation in iOS repo
   - Web-specific documentation in web repo
   - Clearer ownership and responsibilities

### What They Share

**Only Shared Resource:**
- Supabase database (same schema, same data)
- This is fine - both apps connect to the same backend

**No Shared Code:**
- Different languages (Swift vs TypeScript)
- Different models (Swift structs vs TypeScript interfaces)
- No code dependencies between them

### Migration Steps

1. **Create New Repo**
   ```bash
   # Create new GitHub repo: urban-manual-ios
   ```

2. **Move iOS App**
   ```bash
   # In current repo
   git subtree push --prefix=ios-app origin ios-app
   
   # Or manually:
   # 1. Create new repo
   # 2. Copy ios-app/ folder
   # 3. Initialize git in new repo
   # 4. Commit and push
   ```

3. **Update Documentation**
   - Update README in iOS repo
   - Update any references to iOS app location
   - Add note in main repo README pointing to iOS repo

4. **Clean Up**
   - Remove ios-app/ from main repo
   - Keep .vercelignore (in case you add other mobile apps later)
   - Update any scripts that reference ios-app/

### Alternative: Git Subtree or Submodule

If you want to keep them linked but separate:

**Option 1: Git Subtree** (Recommended)
- Keep iOS app in separate repo
- Can pull updates into main repo if needed
- Better for independent development

**Option 2: Git Submodule**
- More complex to manage
- Requires submodule updates
- Not recommended unless you need tight coupling

### Recommendation

**Move to separate repo** because:
- ✅ No code dependencies
- ✅ Different build/deploy systems
- ✅ Already excluded from builds
- ✅ Cleaner organization
- ✅ Independent development cycles

The only thing they share is the Supabase database, which is perfect - both apps can connect to the same backend independently.

