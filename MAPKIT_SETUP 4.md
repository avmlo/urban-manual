# Apple MapKit JS Setup Guide
## Get Interactive Maps Working

**Status:** MapKit credentials required for maps to work
**Priority:** Optional (maps will show fallback UI if not configured)

---

## 🗺️ What is Apple MapKit JS?

Apple MapKit JS lets you embed interactive Apple Maps in your web app:
- Beautiful, native-looking maps
- 3D views and satellite imagery
- Geocoding and search
- Custom markers and overlays
- Route planning

---

## 📝 Setup Steps

### 1. Get Apple Developer Account
- Go to https://developer.apple.com/
- Sign up or sign in
- You'll need: **$99/year membership** for MapKit JS

### 2. Create MapKit JS Key

1. **Go to Apple Developer Portal:**
   - Visit: https://developer.apple.com/account/
   - Navigate to: **Certificates, Identifiers & Profiles**

2. **Create a Maps ID:**
   - Go to **Identifiers** → **App IDs**
   - Click **+** to create a new identifier
   - Select **Maps IDs**
   - Enter a description (e.g., "The Urban Manual Maps")
   - Click **Continue** → **Register**

3. **Create a MapKit JS Key:**
   - Go to **Keys** section
   - Click **+** to create a new key
   - Give it a name (e.g., "Urban Manual MapKit JS Key")
   - Check **MapKit JS**
   - Click **Continue** → **Register**

4. **Download the Key:**
   - **IMPORTANT:** Download the `.p8` file immediately!
   - You can only download it once
   - Save it securely (you'll need it for env vars)

5. **Note Your Credentials:**
   - **Team ID:** Find it in Account → Membership
   - **Key ID:** Shown after creating the key (10-character string)
   - **Private Key:** Contents of the `.p8` file you downloaded

### 3. Add to Environment Variables

Create or update your `.env.local` file:

```bash
# Apple MapKit JS Configuration
MAPKIT_TEAM_ID=ABC123XYZ          # Your 10-character Team ID
MAPKIT_KEY_ID=DEF456GHI           # Your 10-character Key ID
MAPKIT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSMNSgEiAQIUAOCAQEArBZ...
[Your full private key here - keep on multiple lines]
...ending with...
-----END PRIVATE KEY-----
```

**Tips for Private Key:**
- Keep the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Include all newlines (`\n`) between them
- The key should be ~1600 characters long

### 4. Test It Works

1. Restart your development server:
```bash
npm run dev
```

2. Open any page with a map (destination page, map view)

3. You should see:
   - ✅ Interactive map loads
   - ✅ Markers show for destinations
   - ✅ You can zoom, pan, rotate

4. If not working:
   - Check browser console for errors
   - Verify env vars are set correctly
   - Ensure private key format is correct (with newlines)

---

## 🔍 Troubleshooting

### "Map unavailable" Error

**Cause:** MapKit credentials not configured or invalid

**Fix:**
1. Check `.env.local` has all three variables
2. Restart dev server after adding env vars
3. Verify Team ID and Key ID are correct
4. Check private key format (needs newlines, headers)

### "Token request failed: 401"

**Cause:** Invalid credentials or key expired

**Fix:**
1. Verify Team ID matches your Apple Developer account
2. Check Key ID matches the key you created
3. Ensure private key is from the correct `.p8` file
4. Key might be revoked - create a new one if needed

### "Token request failed: 500"

**Cause:** Server error generating JWT token

**Fix:**
1. Check private key format (common issue!)
2. Ensure newlines are preserved in env var
3. Try regenerating the key and updating env vars

### Map Shows But No Markers

**Cause:** Coordinates might be incorrect or geocoding failed

**Fix:**
1. Check destination has valid latitude/longitude in database
2. Verify query string format for geocoding
3. Look in browser console for geocoding errors

---

## 💰 Cost

**Apple Developer Program:**
- $99/year membership required
- No additional cost for MapKit JS API calls
- Unlimited map loads and API requests
- Good deal compared to Google Maps pricing!

**Alternative if you don't want to pay:**
- Maps will show a fallback UI
- Users can click "Open in Apple Maps" to view externally
- Still get all other features of the app

---

## 🎯 Optional: Restrict to Your Domain

For security, restrict your MapKit key to your domain:

1. Go to your key in Apple Developer Portal
2. Edit the key settings
3. Add allowed domains:
   - `localhost` (for development)
   - `yourdomain.com` (for production)
   - `*.vercel.app` (if deploying to Vercel)

This prevents others from using your key on their sites.

---

## 📚 Resources

- [Apple MapKit JS Documentation](https://developer.apple.com/documentation/mapkitjs)
- [MapKit JS Getting Started](https://developer.apple.com/maps/web/)
- [MapKit JS Examples](https://developer.apple.com/maps/web/examples/)

---

## ✅ Verification Checklist

- [ ] Apple Developer account created
- [ ] Maps ID registered
- [ ] MapKit JS Key created
- [ ] `.p8` file downloaded and saved
- [ ] Team ID, Key ID, Private Key copied
- [ ] Added to `.env.local`
- [ ] Dev server restarted
- [ ] Maps loading on site
- [ ] Markers appearing correctly
- [ ] No console errors

---

**Status:** Follow these steps to enable maps
**Priority:** Optional - app works without it (with fallback UI)
**Time:** ~30 minutes to set up
**Created:** Nov 4, 2025
