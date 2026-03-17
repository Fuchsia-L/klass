# Android Build Notes

## Purpose

This document records the Android packaging flow that is confirmed to work for this repository.
It is intentionally project-specific.

## Current Output

- Release APK path: `android/app/build/outputs/apk/release/app-release.apk`
- Build command:

```powershell
cd android
$env:JAVA_HOME='C:\Users\Fuchs\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2'
$env:ANDROID_HOME='D:\Android\Sdk'
$env:ANDROID_SDK_ROOT='D:\Android\Sdk'
.\gradlew.bat assembleRelease --console=plain --no-daemon
```

## Environment

The current project has been verified locally with:

- JDK 17
- Android SDK at `D:\Android\Sdk`
- Gradle wrapper from the repository
- Windows PowerShell

If `java` is not available in `PATH`, `JAVA_HOME` must be set explicitly before building.

## Important Project-Specific Notes

### 1. Build tools

`android/app/build.gradle` is pinned to:

```gradle
buildToolsVersion "36.1.0"
```

Reason:

- local `36.0.0` build-tools installation was corrupted
- forcing `36.1.0` avoided Gradle trying to install the broken package

Do not casually change this unless the local SDK is also verified.

### 2. Maven mirrors

`android/build.gradle` includes Aliyun Maven mirrors before `google()` and `mavenCentral()`.

Reason:

- Maven Central TLS handshake failed in this environment during dependency resolution

If dependency download starts failing again, check these mirror entries first.

### 3. Signing

The current `release` build still uses the debug keystore in `android/app/build.gradle`.

This is acceptable for:

- local installation
- testing
- internal distribution

This is not acceptable for:

- store submission
- production release

Before publishing, replace the signing config with a real keystore.

## Build Variants

### Release APK

Use:

```powershell
cd android
$env:JAVA_HOME='C:\Users\Fuchs\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2'
$env:ANDROID_HOME='D:\Android\Sdk'
$env:ANDROID_SDK_ROOT='D:\Android\Sdk'
.\gradlew.bat assembleRelease --console=plain --no-daemon
```

Output:

- `android/app/build/outputs/apk/release/app-release.apk`

### Debug APK

Use:

```powershell
cd android
$env:JAVA_HOME='C:\Users\Fuchs\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2'
$env:ANDROID_HOME='D:\Android\Sdk'
$env:ANDROID_SDK_ROOT='D:\Android\Sdk'
.\gradlew.bat assembleDebug --console=plain --no-daemon
```

### AAB

If preparing for store upload, build an Android App Bundle:

```powershell
cd android
$env:JAVA_HOME='C:\Users\Fuchs\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2'
$env:ANDROID_HOME='D:\Android\Sdk'
$env:ANDROID_SDK_ROOT='D:\Android\Sdk'
.\gradlew.bat bundleRelease --console=plain --no-daemon
```

Expected output:

- `android/app/build/outputs/bundle/release/app-release.aab`

Note:

- the signing setup must be production-ready before store submission

## APK Size

The current APK is relatively large because:

- it bundles multiple ABIs
- it includes React Native / Expo native libraries
- release minification is not fully optimized for smallest size yet

Current architecture setting:

```properties
reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64
```

If smaller APKs are needed for testing or distribution, consider:

- limiting ABIs to real devices only
- enabling release minify and resource shrinking
- distributing AAB instead of universal APK

## Known Issues And Fixes

### `JAVA_HOME is not set`

Fix:

- set `JAVA_HOME` explicitly before running Gradle

### SDK build-tools install failure / zip archive error

Symptom:

- Gradle tries to install `build-tools;36.0.0`
- fails with zip/archive error

Fix:

- keep `buildToolsVersion "36.1.0"` in `android/app/build.gradle`
- verify local SDK installation under `D:\Android\Sdk\build-tools`

### Maven Central TLS handshake failure

Symptom:

- dependency download fails with TLS handshake or remote host terminated errors

Fix:

- keep the Aliyun Maven mirror entries in `android/build.gradle`

### `NODE_ENV` warning after build

Current behavior:

- Gradle/Expo may print a `NODE_ENV` warning after a successful build

This warning did not block APK generation in the verified build flow.

## Recommended Next Steps For Production

Before a real release:

1. Create a production keystore.
2. Replace debug signing in `android/app/build.gradle`.
3. Prefer `bundleRelease` for store delivery.
4. Reduce ABI scope if universal APK size matters.
5. Consider enabling release shrinking and minification.
