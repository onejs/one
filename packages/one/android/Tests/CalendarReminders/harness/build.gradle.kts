plugins {
    id("com.android.application") version "8.13.2"
    id("org.jetbrains.kotlin.android") version "2.1.20"
}

android {
    namespace = "dev.onejs.calendarproof"
    compileSdk = 36
    defaultConfig {
        applicationId = "dev.onejs.calendarproof"
        minSdk = 23
        targetSdk = 36
        versionCode = 1
        versionName = "1"
    }
    testOptions.unitTests.isIncludeAndroidResources = true
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin.sourceSets.getByName("main").kotlin.apply {
    srcDir("../../../src/main/java")
    srcDir("../../../../nitrogen/generated/android/kotlin")
    include("com/margelo/nitro/one/OneCalendarReminders.kt", "com/margelo/nitro/one/OneNativeError.kt",
        "com/margelo/nitro/one/CalendarRecurrence.kt", "com/margelo/nitro/one/CalendarRecurrenceFrequency.kt",
        "com/margelo/nitro/one/ReminderInput.kt", "com/margelo/nitro/one/ReminderInfo.kt",
        "com/margelo/nitro/one/NativeHarness.kt")
}

dependencies {
    implementation("androidx.annotation:annotation:1.8.0")
    implementation("com.facebook.yoga:proguard-annotations:1.19.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
}
