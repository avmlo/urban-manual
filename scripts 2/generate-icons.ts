import sharp from 'sharp';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const sourceImage = join(process.cwd(), 'Image.jpg');
const publicDir = join(process.cwd(), 'public');
const iosIconDir = join(process.cwd(), 'ios/App/App/Assets.xcassets/AppIcon.appiconset');

async function generateIcons() {
  console.log('Generating icons from source image...');
  
  if (!existsSync(sourceImage)) {
    console.error(`Source image not found: ${sourceImage}`);
    process.exit(1);
  }

  // Ensure directories exist
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }
  if (!existsSync(iosIconDir)) {
    mkdirSync(iosIconDir, { recursive: true });
  }

  const image = sharp(sourceImage);

  // Generate web icons
  console.log('Generating web icons...');
  await Promise.all([
    // Favicons
    image.clone().resize(16, 16).toFile(join(publicDir, 'favicon-16x16.png')),
    image.clone().resize(32, 32).toFile(join(publicDir, 'favicon-32x32.png')),
    image.clone().resize(48, 48).toFile(join(publicDir, 'favicon-48x48.png')),
    // Generate ICO file (multi-size)
    image.clone().resize(16, 16).toFile(join(publicDir, 'favicon-16.ico')),
    image.clone().resize(32, 32).toFile(join(publicDir, 'favicon-32.ico')),
    // PWA icons
    image.clone().resize(192, 192).toFile(join(publicDir, 'icon-192.png')),
    image.clone().resize(512, 512).toFile(join(publicDir, 'icon-512.png')),
    // Apple touch icon
    image.clone().resize(180, 180).toFile(join(publicDir, 'apple-touch-icon.png')),
    // General icon
    image.clone().resize(512, 512).toFile(join(publicDir, 'icon.png')),
    // Logo for header (larger size)
    image.clone().resize(200, 200, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toFile(join(publicDir, 'logo.png')),
  ]);

  // Generate favicon.ico (combine 16 and 32)
  // Note: sharp doesn't support ICO directly, so we'll use PNG as favicon
  // Most modern browsers support PNG favicons
  await image.clone().resize(32, 32).toFile(join(publicDir, 'favicon.ico'));

  // Generate iOS app icons
  console.log('Generating iOS app icons...');
  const iosSizes = [
    { size: 1024, filename: 'AppIcon-512@2x.png' }, // 1024x1024 for App Store
  ];
  
  // iOS requires multiple sizes, but we'll generate the main one
  // Xcode can generate the rest from the 1024x1024 icon
  await Promise.all(
    iosSizes.map(({ size, filename }) =>
      image.clone().resize(size, size).toFile(join(iosIconDir, filename))
    )
  );

  console.log('✅ All icons generated successfully!');
  console.log('\nGenerated files:');
  console.log('  - public/favicon.ico');
  console.log('  - public/favicon-16x16.png');
  console.log('  - public/favicon-32x32.png');
  console.log('  - public/favicon-48x48.png');
  console.log('  - public/icon-192.png');
  console.log('  - public/icon-512.png');
  console.log('  - public/apple-touch-icon.png');
  console.log('  - public/icon.png');
  console.log('  - public/logo.png');
  console.log('  - ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
}

generateIcons().catch(console.error);

