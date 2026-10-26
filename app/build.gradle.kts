plugins { id("com.android.application") }
android {
    namespace = "com.blackware.ytdlpcommandbuilder"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.blackware.ytdlpcommandbuilder"
        minSdk = 29
        targetSdk = 35
        versionCode = 8
        versionName = "1.0.7"
        testInstrumentationRunner = "android.test.InstrumentationTestRunner"
    }
    signingConfigs {
        getByName("debug") {
            System.getenv("YTDLP_DEBUG_KEYSTORE")?.let { storeFile = file(it) }
        }
    }
    buildTypes {
        getByName("debug") { isMinifyEnabled = false }
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    sourceSets.getByName("main").assets.srcDir(layout.buildDirectory.dir("generated/webAssets"))
    useLibrary("android.test.runner")
    useLibrary("android.test.base")
}
val copyWebAssets by tasks.registering(Sync::class) {
    from(rootProject.files("index.html", "engine.js", "app.js", "styles.css"))
    into(layout.buildDirectory.dir("generated/webAssets"))
}
tasks.named("preBuild") { dependsOn(copyWebAssets) }
