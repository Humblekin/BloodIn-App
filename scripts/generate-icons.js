const sharp = require('sharp');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Brand colors
const BURGUNDY = '#7A1F2B';
const DARK = '#5C1620';
const WHITE = '#FFFFFF';
const LIGHT_BG = '#F7F7F5';
const LIGHT_SUBTLE = '#F5E6E8';

async function generateAppIcon() {
  const size = 1024;
  const padding = 120;
  const cornerRadius = 220;

  // SVG for the app icon: rounded burgundy square with "BloodIn" text
  // Design: "Blood" in white, "In" highlighted with a blood drop accent
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BURGUNDY};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${DARK};stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Background rounded rect -->
      <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="url(#bg)"/>
      <!-- Blood drop icon at top -->
      <g transform="translate(${size/2}, 280)">
        <path d="M0,-80 C30,-30 70,20 70,60 C70,100 38,130 0,130 C-38,130 -70,100 -70,60 C-70,20 -30,-30 0,-80Z" 
              fill="${WHITE}" opacity="0.95"/>
        <!-- Small cross inside drop -->
        <rect x="-8" y="20" width="16" height="60" rx="4" fill="${BURGUNDY}" opacity="0.8"/>
        <rect x="-25" y="42" width="50" height="16" rx="4" fill="${BURGUNDY}" opacity="0.8"/>
      </g>
      <!-- App name text -->
      <text x="${size/2}" y="580" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="700" 
            font-size="160" 
            fill="${WHITE}" 
            text-anchor="middle" 
            letter-spacing="-3">Blood</text>
      <text x="${size/2}" y="740" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="700" 
            font-size="160" 
            fill="${WHITE}" 
            text-anchor="middle" 
            letter-spacing="-3">In</text>
      <!-- Subtle accent line under "In" -->
      <rect x="${size/2 - 60}" y="760" width="120" height="6" rx="3" fill="${WHITE}" opacity="0.6"/>
      <!-- Tagline -->
      <text x="${size/2}" y="860" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="400" 
            font-size="48" 
            fill="${WHITE}" 
            text-anchor="middle" 
            opacity="0.7"
            letter-spacing="6">DONATE LIFE</text>
    </svg>`;

  const buf = Buffer.from(svg);
  
  // Generate main icon.png (1024x1024)
  await sharp(buf)
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('Generated icon.png (1024x1024)');

  // Generate splash-icon.png (512x512)
  await sharp(buf)
    .resize(512, 512)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('Generated splash-icon.png (512x512)');
}

async function generateAdaptiveIcon() {
  const size = 1024;

  // Foreground: the logo content on transparent background
  const foregroundSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BURGUNDY};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${DARK};stop-opacity:1" />
        </linearGradient>
      </defs>
      <!-- Blood drop icon -->
      <g transform="translate(${size/2}, 260)">
        <path d="M0,-90 C35,-35 80,25 80,70 C80,115 42,145 0,145 C-42,145 -80,115 -80,70 C-80,25 -35,-35 0,-90Z" 
              fill="${WHITE}" opacity="0.95"/>
        <rect x="-9" y="22" width="18" height="66" rx="5" fill="${BURGUNDY}" opacity="0.8"/>
        <rect x="-28" y="45" width="56" height="18" rx="5" fill="${BURGUNDY}" opacity="0.8"/>
      </g>
      <!-- App name -->
      <text x="${size/2}" y="560" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="700" 
            font-size="170" 
            fill="${WHITE}" 
            text-anchor="middle" 
            letter-spacing="-3">Blood</text>
      <text x="${size/2}" y="730" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="700" 
            font-size="170" 
            fill="${WHITE}" 
            text-anchor="middle" 
            letter-spacing="-3">In</text>
      <rect x="${size/2 - 65}" y="750" width="130" height="6" rx="3" fill="${WHITE}" opacity="0.6"/>
      <text x="${size/2}" y="840" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="400" 
            font-size="50" 
            fill="${WHITE}" 
            text-anchor="middle" 
            opacity="0.7"
            letter-spacing="6">DONATE LIFE</text>
    </svg>`;

  const foregroundBuf = Buffer.from(foregroundSvg);
  
  await sharp(foregroundBuf)
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, 'android-icon-foreground.png'));
  console.log('Generated android-icon-foreground.png (1024x1024)');

  // Background: solid burgundy gradient
  const backgroundSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BURGUNDY};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${DARK};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg)"/>
    </svg>`;

  const backgroundBuf = Buffer.from(backgroundSvg);
  
  await sharp(backgroundBuf)
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, 'android-icon-background.png'));
  console.log('Generated android-icon-background.png (1024x1024)');
}

async function generateMonochromeIcon() {
  const size = 1024;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Blood drop icon -->
      <g transform="translate(${size/2}, 280)">
        <path d="M0,-80 C30,-30 70,20 70,60 C70,100 38,130 0,130 C-38,130 -70,100 -70,60 C-70,20 -30,-30 0,-80Z" 
              fill="#000000"/>
        <rect x="-8" y="20" width="16" height="60" rx="4" fill="#FFFFFF"/>
        <rect x="-25" y="42" width="50" height="16" rx="4" fill="#FFFFFF"/>
      </g>
      <!-- App name -->
      <text x="${size/2}" y="580" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="700" 
            font-size="160" 
            fill="#000000" 
            text-anchor="middle" 
            letter-spacing="-3">Blood</text>
      <text x="${size/2}" y="740" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="700" 
            font-size="160" 
            fill="#000000" 
            text-anchor="middle" 
            letter-spacing="-3">In</text>
      <rect x="${size/2 - 60}" y="760" width="120" height="6" rx="3" fill="#000000" opacity="0.6"/>
      <text x="${size/2}" y="860" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="400" 
            font-size="48" 
            fill="#000000" 
            text-anchor="middle" 
            opacity="0.7"
            letter-spacing="6">DONATE LIFE</text>
    </svg>`;

  const buf = Buffer.from(svg);
  
  await sharp(buf)
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, 'android-icon-monochrome.png'));
  console.log('Generated android-icon-monochrome.png (1024x1024)');
}

async function generateFavicon() {
  const size = 48;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${BURGUNDY};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${DARK};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="10" ry="10" fill="url(#bg)"/>
      <g transform="translate(${size/2}, 16)">
        <path d="M0,-7 C2,-3 6,2 6,5 C6,8 3,10 0,10 C-3,10 -6,8 -6,5 C-6,2 -2,-3 0,-7Z" 
              fill="${WHITE}" opacity="0.95"/>
        <rect x="-1" y="2" width="2" height="5" rx="0.5" fill="${BURGUNDY}" opacity="0.8"/>
        <rect x="-2.5" y="3.5" width="5" height="2" rx="0.5" fill="${BURGUNDY}" opacity="0.8"/>
      </g>
      <text x="${size/2}" y="38" 
            font-family="Arial, Helvetica, sans-serif" 
            font-weight="700" 
            font-size="12" 
            fill="${WHITE}" 
            text-anchor="middle">In</text>
    </svg>`;

  const buf = Buffer.from(svg);
  
  await sharp(buf)
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('Generated favicon.png (48x48)');
}

async function main() {
  console.log('Generating BloodIn app icons...\n');
  
  await generateAppIcon();
  await generateAdaptiveIcon();
  await generateMonochromeIcon();
  await generateFavicon();
  
  console.log('\nAll icons generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
