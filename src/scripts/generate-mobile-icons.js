const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const srcImage = '/Users/andrew_ekladious/.gemini/antigravity/brain/b91e297b-776d-43e4-9667-2bd7d56fdb6a/.user_uploaded/media_1792551640290_a2425d01.png';
const targetDir = '/Users/andrew_ekladious/Library/CloudStorage/GoogleDrive-cantorhymns@gmail.com/My Drive/CantorHymns/dev/cantor_hymns_mobile/assets/images';

async function generateAssets() {
  console.log('Generating mobile icon assets from:', srcImage);

  // 1. logo.png (1024x1024 RGBA transparent)
  const logoPath = path.join(targetDir, 'logo.png');
  await sharp(srcImage)
    .resize(1024, 1024)
    .png()
    .toFile(logoPath);
  console.log('✅ Created:', logoPath);

  // 2. icon.png (1024x1024 RGB - flattened on white background for iOS app store compliance)
  const iconPath = path.join(targetDir, 'icon.png');
  await sharp(srcImage)
    .resize(1024, 1024)
    .flatten({ background: '#FFFFFF' })
    .toFormat('png', { progressive: false })
    .toFile(iconPath);
  console.log('✅ Created (opaque RGB):', iconPath);

  // 3. splash-icon.png (1024x1024 RGBA)
  const splashPath = path.join(targetDir, 'splash-icon.png');
  await sharp(srcImage)
    .resize(1024, 1024)
    .png()
    .toFile(splashPath);
  console.log('✅ Created:', splashPath);

  // 4. android-icon-foreground.png (512x512 RGBA with 64px padding for adaptive icon safe zone)
  const androidPath = path.join(targetDir, 'android-icon-foreground.png');
  await sharp(srcImage)
    .resize(384, 384)
    .extend({
      top: 64,
      bottom: 64,
      left: 64,
      right: 64,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(androidPath);
  console.log('✅ Created (adaptive icon safe zone):', androidPath);

  // 5. favicon.png (48x48 RGBA)
  const faviconPath = path.join(targetDir, 'favicon.png');
  await sharp(srcImage)
    .resize(48, 48)
    .png()
    .toFile(faviconPath);
  console.log('✅ Created:', faviconPath);

  console.log('\n🎉 All mobile assets successfully generated!');
}

generateAssets().catch(err => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
