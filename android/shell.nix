{ pkgs ? import <nixpkgs> {
    config = {
      allowUnfree = true;
      android_sdk = { accept_license = true; };
    };
  }
}:

let
  androidSdk = pkgs.androidenv.composeAndroidPackages {
    buildToolsVersions = [ "34.0.0" ];
    platformVersions = [ "34" ];
    platformToolsVersion = "37.0.0";
    toolsVersion = "26.1.1";
    includeEmulator = false;
    includeSystemImages = false;
    includeSources = false;
    includeNDK = false;
    includeCmake = false;
  };

  sdkPath = "${androidSdk.androidsdk}/libexec/android-sdk";

  # Wrapper script that sets up local.properties then starts bash
  entryScript = pkgs.writeShellScriptBin "aiscreen-entry" ''
    cat > /home/zapan/myspace/ai/ai-screen/android/local.properties << PROPEOF
    sdk.dir=${sdkPath}
    PROPEOF
    exec bash "$@"
  '';
in
pkgs.buildFHSEnv {
  name = "ai-screen-android";

  targetPkgs = pkgs: [
    pkgs.jdk21
    pkgs.gradle
    pkgs.android-tools
    pkgs.glibc_multi
    androidSdk.androidsdk
  ];

  profile = ''
    export ANDROID_HOME="${sdkPath}"
    export ANDROID_SDK_ROOT="${sdkPath}"
    export JAVA_HOME="${pkgs.jdk21}"
    export GRADLE_OPTS="-Dorg.gradle.daemon=false"

    echo ""
    echo "=== AI Screen Android Dev Environment ==="
    echo "ANDROID_HOME: $ANDROID_HOME"
    echo "JAVA_HOME:   $JAVA_HOME"
    echo ""
    echo "Build the APK:"
    echo "  ./gradlew assembleDebug"
    echo ""
    echo "Install to TV (after adb connect):"
    echo "  adb connect <TV_IP>:5555"
    echo "  adb install -r app/build/outputs/apk/debug/app-debug.apk"
    echo ""
  '';

  runScript = "${entryScript}/bin/aiscreen-entry";
}
