plugins { id("com.android.application") }
android {
 namespace = "ai.blackware.ytdlpcommandbuilder"
 compileSdk = 35
 defaultConfig { applicationId = "ai.blackware.ytdlpcommandbuilder"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "1.0.0" }
 buildTypes {
  getByName("debug") { isMinifyEnabled = false }
  getByName("release") {
   isMinifyEnabled = true
   isShrinkResources = true
   proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
  }
 }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
tasks.register<Copy>("copyWebAssets") {
 from(rootProject.file("index.html"), rootProject.file("app.js"))
 into(layout.projectDirectory.dir("src/main/assets"))
}
tasks.named("preBuild") { dependsOn("copyWebAssets") }
