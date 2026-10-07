#!/bin/bash
set -e

WORKSPACE="/app/applet"
JDK_DIR="$WORKSPACE/jdk-21"
SDK_DIR="$WORKSPACE/android-sdk"

# 1. Setup JDK 21 if missing
if [ ! -f "$JDK_DIR/bin/java" ]; then
    echo "Downloading JDK 21..."
    mkdir -p "$JDK_DIR"
    curl -s -L https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.4%2B7/OpenJDK21U-jdk_x64_linux_hotspot_21.0.4_7.tar.gz | tar -xz -C "$JDK_DIR" --strip-components=1
fi

export JAVA_HOME="$JDK_DIR"
export PATH="$JAVA_HOME/bin:$PATH"
java -version

# 2. Setup Android SDK if missing
if [ ! -f "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "Downloading Android SDK Command-line Tools..."
    mkdir -p "$SDK_DIR/cmdline-tools"
    curl -s -L -o /tmp/cmdline.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    unzip -q /tmp/cmdline.zip -d "$SDK_DIR/cmdline-tools"
    mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
    rm /tmp/cmdline.zip
fi

export ANDROID_HOME="$SDK_DIR"
export PATH="$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

# 3. Accept licenses and install platform-34 / build-tools
if [ ! -d "$SDK_DIR/platforms/android-34" ]; then
    echo "Installing Android SDK packages..."
    yes | sdkmanager --licenses >/dev/null 2>&1 || true
    sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"
fi

# 4. Set local.properties
echo "sdk.dir=$SDK_DIR" > "$WORKSPACE/android/local.properties"

# 5. Fix gradle wrapper jar
if ! unzip -t "$WORKSPACE/android/gradle/wrapper/gradle-wrapper.jar" >/dev/null 2>&1; then
    echo "Fixing gradle wrapper jar..."
    curl -s -L -o "$WORKSPACE/android/gradle/wrapper/gradle-wrapper.jar" https://github.com/gradle/gradle/raw/v8.14.3/gradle/wrapper/gradle-wrapper.jar
fi

chmod +x "$WORKSPACE/android/gradlew"

# 6. Build Release AAB Bundle
echo "Building Release AAB Bundle..."
cd "$WORKSPACE/android"
./gradlew :app:bundleRelease --no-daemon

# 7. Copy output AAB to public directory
AAB_FILE=$(find "$WORKSPACE/android/app/build/outputs/bundle/release" -name "*.aab" | head -n 1)
if [ -f "$AAB_FILE" ]; then
    cp "$AAB_FILE" "$WORKSPACE/public/app-release.aab"
    echo "SUCCESS: Bundle built and saved to $WORKSPACE/public/app-release.aab"
    ls -lh "$WORKSPACE/public/app-release.aab"
else
    echo "ERROR: AAB file not found!"
    exit 1
fi
