#!/usr/bin/env node

/**
 * Shusto Android App Bundle (.aab / .abb) Builder
 * 
 * This script:
 * 1. Builds the latest web assets (`npm run build`)
 * 2. Syncs web assets to the Android native project (`npx cap sync android`)
 * 3. Builds the Android App Bundle (.aab / .abb) via Gradle (`bundleRelease`)
 * 4. Prints instructions and locates the resulting .aab file.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');

console.log('========================================================');
console.log('🚀 Starting Shusto Android App Bundle (.aab / .abb) Build');
console.log('========================================================\n');

function runStep(title, command, cwd = rootDir) {
  console.log(`\n▶ [Step] ${title}`);
  console.log(`  Executing: ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    console.log(`✔ Completed: ${title}`);
  } catch (err) {
    console.error(`\n❌ Error during "${title}":`, err.message || err);
    throw err;
  }
}

try {
  // Step 1: Build Web Assets
  runStep('Building Production Web Assets', 'npm run build');

  // Step 2: Sync to Android via Capacitor
  runStep('Syncing assets with Capacitor Android', 'npx cap sync android');

  // Step 3: Build Android App Bundle (.aab)
  if (fs.existsSync(androidDir)) {
    const isWindows = process.platform === 'win32';
    const gradlewCmd = isWindows ? 'gradlew.bat bundleRelease' : './gradlew bundleRelease';

    // Ensure gradlew has executable permissions on unix
    if (!isWindows) {
      try {
        fs.chmodSync(path.join(androidDir, 'gradlew'), 0o755);
      } catch (e) {
        // Ignore if permission change fails
      }
    }

    console.log('\n▶ [Step] Building Android App Bundle with Gradle');
    console.log(`  Working Directory: ${androidDir}`);
    console.log(`  Command: ${gradlewCmd}`);

    try {
      execSync(gradlewCmd, { cwd: androidDir, stdio: 'inherit' });
      console.log('✔ Gradle bundleRelease completed successfully!');
    } catch (gradleErr) {
      console.warn('\n⚠️ Gradle CLI direct build note:');
      console.warn('  If Gradle is missing local JDK in this environment, you can also build the .aab in Android Studio:');
      console.warn('  1. Open the "android" folder in Android Studio');
      console.warn('  2. Go to: Build -> Generate Signed Bundle / APK -> Android App Bundle');
      console.warn('  3. Or run Gradle task: :app:bundleRelease\n');
    }

    // Step 4: Check for generated bundle
    const bundleDir = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release');
    const aabFile = path.join(bundleDir, 'app-release.aab');
    const abbAlias = path.join(bundleDir, 'app-release.abb');

    if (fs.existsSync(aabFile)) {
      const stats = fs.statSync(aabFile);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      // Also create an .abb alias copy for convenience if user searches for .abb
      try {
        fs.copyFileSync(aabFile, abbAlias);
      } catch (e) {}

      console.log('\n========================================================');
      console.log('🎉 Android App Bundle (.aab / .abb) Generated Successfully!');
      console.log(`📁 File Location: ${aabFile}`);
      console.log(`📦 Size: ${sizeMB} MB`);
      console.log('🌐 Google Play Console Ready: Upload this file to Play Console');
      console.log('========================================================\n');
    } else {
      console.log('\nℹ️ Assets are synced to android/app/src/main/assets/public.');
      console.log('To generate the .aab file via Android Studio:');
      console.log('  Menu: Build -> Build Bundle(s) / APK(s) -> Build Bundle(s)');
      console.log('  Output will be saved in: android/app/build/outputs/bundle/release/\n');
    }
  } else {
    console.error('❌ "android" directory not found. Please run "npx cap add android" first.');
  }

} catch (err) {
  console.error('\n❌ Build script finished with errors.');
  process.exit(1);
}
