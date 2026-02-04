# App Icon Setup Guide

## Current Status

A **placeholder app icon** has been created to allow the project to build successfully. The current icon is a simple solid blue-gray color (#59758A).

## Creating Your Custom App Icon

Before submitting to the App Store, you need to replace the placeholder with a proper app icon.

### Option 1: Using Online Tools (Recommended)

1. **Design your icon** (1024×1024 PNG)
   - Use Figma, Sketch, Photoshop, or any design tool
   - Export as PNG at 1024×1024 pixels
   - Make sure it follows [Apple's Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)

2. **Generate all required sizes**
   - Go to [AppIcon.co](https://appicon.co) or [MakeAppIcon](https://makeappicon.com)
   - Upload your 1024×1024 PNG
   - Download the generated asset catalog
   - Replace the contents of `Assets.xcassets/AppIcon.appiconset/` with the generated files

### Option 2: Using Xcode

1. **Design your icon** (1024×1024 PNG)

2. **Add to Xcode**
   - Open the project in Xcode
   - In the Project Navigator, select `Assets.xcassets`
   - Click on `AppIcon`
   - Drag your 1024×1024 PNG into the "App Store iOS 1024pt" slot
   - Xcode will automatically generate all required sizes

### Required Icon Sizes

According to Apple's guidelines, you need:

| Size | Usage |
|------|-------|
| 1024×1024 | App Store (required) |
| 180×180 | iPhone @3x |
| 120×120 | iPhone @2x |
| 87×87 | Settings @3x |
| 80×80 | Spotlight @2x |
| 60×60 | iPhone @1x |
| 58×58 | Settings @2x |
| 40×40 | Spotlight @1x |
| 29×29 | Settings @1x |

**Note:** Xcode can auto-generate these from your 1024×1024 master icon.

## Design Guidelines

### Do's
- ✅ Use simple, recognizable imagery
- ✅ Keep design centered
- ✅ Use a consistent color palette
- ✅ Make it visually distinct
- ✅ Test on various backgrounds (light/dark)

### Don'ts
- ❌ Don't include text (it won't be readable at small sizes)
- ❌ Don't use photos (use illustrations/icons instead)
- ❌ Don't include transparency (iOS adds its own mask)
- ❌ Don't add rounded corners (iOS does this automatically)

## Icon Ideas for Urban Manual

Consider these concepts:
- 📍 Location pin with map background
- 🗺️ Stylized map or compass
- ✈️ Travel-themed icon
- 🌍 Globe or world map
- 📱 Phone with destination marker

## Current Placeholder

The current placeholder is located at:
```
ios-app/UrbanManual/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
```

Simply replace this file with your designed icon (keeping the same filename), or use one of the methods above.

## Verification

After adding your icon:
1. Clean build: Product → Clean Build Folder (⇧⌘K)
2. Build and run
3. Check the icon on the simulator/device home screen
4. Verify it looks good at different sizes

## App Store Requirements

Before submission:
- Must have a 1024×1024 icon
- Must be in PNG or JPG format
- Must not include transparency
- Must not include Apple products
- Must follow Apple's Human Interface Guidelines

---

**Next:** After creating your icon, proceed with the rest of the App Store submission process outlined in [IOS_LAUNCH_PLAN.md](../IOS_LAUNCH_PLAN.md).
