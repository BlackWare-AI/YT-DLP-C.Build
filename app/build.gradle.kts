plugins { id("com.android.application") }
val englishEdition = providers.gradleProperty("appLanguage").orNull == "en"
android {
    buildFeatures { buildConfig = true }
    namespace = "com.blackware.ytdlpcommandbuilder"
    compileSdk = 35
    defaultConfig {
        applicationId = if (englishEdition) "com.blackware.ytdlpcommandbuilder.en" else "com.blackware.ytdlpcommandbuilder"
        buildConfigField("boolean", "ENGLISH_EDITION", englishEdition.toString())
        resValue("string", "app_name", if (englishEdition) "YT-DLP Command Builder EN" else "YT-DLP Command Builder")
        minSdk = 29
        targetSdk = 35
        versionCode = 15
        versionName = "1.1.4"
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
    from(rootProject.files("engine.js", "styles.css", "notes-ui.js"))
    from(rootProject.files(if (englishEdition) "editions/en/index.html" else "index.html", if (englishEdition) "editions/en/app.js" else "app.js"))
    into(layout.buildDirectory.dir("generated/webAssets"))
}
tasks.named("preBuild") { dependsOn(copyWebAssets) }
