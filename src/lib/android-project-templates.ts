
/**
 * @fileOverview This file contains static string templates for a complete,
 * functional Android project structure. This allows for reliable project generation
 * by minimizing the amount of code the AI needs to generate from scratch.
 */

const files: Record<string, string> = {};

// Root build.gradle.kts
files['build.gradle.kts'] = `
// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.androidApplication) apply false
    alias(libs.plugins.kotlinAndroid) apply false
    alias(libs.plugins.kotlinSerialization) apply false
    alias(libs.plugins.ksp) apply false
}
`;

// Root gradle.properties
files['gradle.properties'] = `
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
org.gradle.parallel=true
android.useAndroidX=true
`;

// settings.gradle.kts
files['settings.gradle.kts'] = `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "My Application"
include(":app")
`;

// gradle/libs.versions.toml (Version Catalog)
files['gradle/libs.versions.toml'] = `
[versions]
# Core & AndroidX
compileSdk = "34"
minSdk = "26"
targetSdk = "34"
agp = "8.4.1"
kotlin = "1.9.23"
coreKtx = "1.13.1"
lifecycleRuntimeKtx = "2.8.1"
activityCompose = "1.9.0"

# Compose
composeBom = "2024.05.00"
composeCompiler = "1.5.13"

# Koin (Dependency Injection)
koin = "3.5.6"

# Kotlinx Serialization
kotlinxSerialization = "1.6.3"

# Firebase
firebaseBom = "33.1.0"

# Coil (Image Loading)
coil = "2.6.0"

# KSP
ksp = "1.9.23-1.0.19"

# Testing
junit = "4.13.2"
androidxTestExtJunit = "1.1.5"
espressoCore = "3.5.1"


[libraries]
# Core & AndroidX
core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }

# Compose
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
ui = { group = "androidx.compose.ui", name = "ui" }
ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
material3 = { group = "androidx.compose.material3", name = "material3" }

# Koin
koin-android = { group = "io.insert-koin", name = "koin-android", version.ref = "koin" }
koin-androidx-compose = { group = "io.insert-koin", name = "koin-androidx-compose", version.ref = "koin" }

# Kotlinx Serialization
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinxSerialization" }

# Firebase
firebase-bom = { group = "com.google.firebase", name = "firebase-bom", version.ref = "firebaseBom" }
firebase-config = { group = "com.google.firebase", name = "firebase-config-ktx" }

# Coil
coil-compose = { group = "io.coil-kt", name = "coil-compose", version.ref = "coil" }

# Testing
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-test-ext-junit = { group = "androidx.test.ext", name = "junit", version.ref = "androidxTestExtJunit" }
espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }


[plugins]
androidApplication = { id = "com.android.application", version.ref = "agp" }
kotlinAndroid = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlinSerialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
`;

// app/build.gradle.kts
files['app/build.gradle.kts'] = `
plugins {
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.kotlinAndroid)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.example.myapplication"
    compileSdk = libs.versions.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.example.myapplication"
        minSdk = libs.versions.minSdk.get().toInt()
        targetSdk = libs.versions.targetSdk.get().toInt()
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = libs.versions.composeCompiler.get()
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core & AndroidX
    implementation(libs.core.ktx)
    implementation(libs.lifecycle.runtime.ktx)
    implementation(libs.activity.compose)

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.ui)
    implementation(libs.ui.graphics)
    implementation(libs.ui.tooling.preview)
    implementation(libs.material3)

    // Koin (DI)
    implementation(libs.koin.android)
    implementation(libs.koin.androidx.compose)

    // Kotlinx Serialization
    implementation(libs.kotlinx.serialization.json)

    // Firebase
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.config)

    // Coil (Image Loading)
    implementation(libs.coil.compose)

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.ui.test.junit4)
    debugImplementation(libs.ui.tooling)
    debugImplementation(libs.ui.test.manifest)
}
`;

// app/proguard-rules.pro
files['app/proguard-rules.pro'] = `
-keep class kotlin.io.File** { *; }
-keepnames class kotlinx.** { *; }
-keepclassmembers class ** {
    @kotlinx.serialization.Serializable <methods>;
}
-keepclassmembers class * {
    @kotlinx.serialization.KSerializer <methods>;
}
`;

// app/src/main/AndroidManifest.xml
files['app/src/main/AndroidManifest.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".MyApplication"
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.MyApplication"
        tools:targetApi="31">
        <activity
            android:name=".presentation.MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:theme="@style/Theme.MyApplication">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;

// Placeholder google-services.json
files['app/google-services.json'] = `
{
  "project_info": {
    "project_number": "1234567890",
    "project_id": "my-application",
    "storage_bucket": "my-application.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:1234567890:android:abcdef1234567890",
        "android_client_info": {
          "package_name": "com.example.myapplication"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "dummy_api_key"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}
`;

// Main Application Class for Koin setup
files['app/src/main/java/com/example/myapplication/MyApplication.kt'] = `
package com.example.myapplication

import android.app.Application
import com.example.myapplication.di.appModule
import com.example.myapplication.di.dataModule
import com.example.myapplication.di.domainModule
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin
import org.koin.core.logger.Level

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidLogger(Level.DEBUG)
            androidContext(this@MyApplication)
            modules(listOf(appModule, domainModule, dataModule))
        }
    }
}
`;

// DI Modules
files['app/src/main/java/com/example/myapplication/di/AppModule.kt'] = `
package com.example.myapplication.di

import com.example.myapplication.presentation.MainViewModel
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

val appModule = module {
    viewModel { MainViewModel(get()) }
}
`;

files['app/src/main/java/com/example/myapplication/di/DomainModule.kt'] = `
package com.example.myapplication.di

import com.example.myapplication.domain.usecase.GetUiConfigurationUseCase
import org.koin.dsl.module

val domainModule = module {
    factory { GetUiConfigurationUseCase(get()) }
}
`;

files['app/src/main/java/com/example/myapplication/di/DataModule.kt'] = `
package com.example.myapplication.di

import com.example.myapplication.data.datasource.FirebaseRemoteConfigDataSource
import com.example.myapplication.data.datasource.RemoteConfigDataSource
import com.example.myapplication.data.repository.UiConfigRepositoryImpl
import com.example.myapplication.domain.repository.UiConfigRepository
import kotlinx.serialization.json.Json
import org.koin.dsl.module

val dataModule = module {
    single<UiConfigRepository> { UiConfigRepositoryImpl(get()) }
    single<RemoteConfigDataSource> { FirebaseRemoteConfigDataSource(get()) }

    single {
        Json {
            ignoreUnknownKeys = true
            isLenient = true
            prettyPrint = true
            encodeDefaults = true
        }
    }
}
`;


// Presentation Layer
files['app/src/main/java/com/example/myapplication/presentation/MainActivity.kt'] = `
package com.example.myapplication.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.example.myapplication.presentation.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainScreen()
                }
            }
        }
    }
}
`;

files['app/src/main/java/com/example/myapplication/presentation/MainScreen.kt'] = `
package com.example.myapplication.presentation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import com.example.myapplication.presentation.components.DynamicUiComponent
import org.koin.androidx.compose.koinViewModel

@Composable
fun MainScreen(
    viewModel: MainViewModel = koinViewModel()
) {
    val state by viewModel.uiState.collectAsState()

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        when (val s = state) {
            is MainContract.State.Loading -> {
                CircularProgressIndicator()
            }
            is MainContract.State.Success -> {
                if (s.components.isEmpty()) {
                    Text(text = "No UI configuration found or content is empty.", color = Color.Gray)
                } else {
                    s.components.forEach {
                        DynamicUiComponent(componentDto = it)
                    }
                }
            }
            is MainContract.State.Error -> {
                Text(text = "Error: \${s.message}", color = Color.Red)
            }
        }
    }
}
`;

files['app/src/main/java/com/example/myapplication/presentation/MainViewModel.kt'] = `
package com.example.myapplication.presentation

import androidx.lifecycle.viewModelScope
import com.example.myapplication.domain.usecase.GetUiConfigurationUseCase
import kotlinx.coroutines.launch

class MainViewModel(
    private val getUiConfigurationUseCase: GetUiConfigurationUseCase
) : BaseViewModel<MainContract.Event, MainContract.State, MainContract.Effect>() {

    init {
        fetchUiConfiguration()
    }

    override fun createInitialState(): MainContract.State {
        return MainContract.State.Loading
    }

    override fun handleEvent(event: MainContract.Event) {
        when (event) {
            is MainContract.Event.FetchUi -> fetchUiConfiguration()
        }
    }

    private fun fetchUiConfiguration() {
        viewModelScope.launch {
            setState { MainContract.State.Loading }
            try {
                val components = getUiConfigurationUseCase()
                setState { MainContract.State.Success(components) }
            } catch (e: Exception) {
                val errorMessage = e.message ?: "An unknown error occurred."
                setState { MainContract.State.Error(errorMessage) }
                setEffect { MainContract.Effect.ShowToast(errorMessage) }
            }
        }
    }
}
`;

files['app/src/main/java/com/example/myapplication/presentation/BaseViewModel.kt'] = `
package com.example.myapplication.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch

/**
 * A base class for ViewModels that follow the MVI (Model-View-Intent) pattern.
 * It provides a structured way to manage state, events, and side effects.
 *
 * @param Event The type of events that the UI can send to the ViewModel.
 * @param State The type of the state that the ViewModel holds and the UI observes.
 * @param Effect The type of side effects that the ViewModel can trigger in the UI (e.g., showing a toast).
 */
abstract class BaseViewModel<Event, State, Effect> : ViewModel() {

    private val initialState: State by lazy { createInitialState() }
    abstract fun createInitialState(): State

    private val _uiState: MutableStateFlow<State> = MutableStateFlow(initialState)
    val uiState: StateFlow<State> = _uiState.asStateFlow()

    private val _event: Channel<Event> = Channel()

    private val _effect: Channel<Effect> = Channel(Channel.UNLIMITED)
    val effect = _effect.receiveAsFlow()

    init {
        subscribeEvents()
    }

    private fun subscribeEvents() {
        viewModelScope.launch {
            _event.receiveAsFlow().collect {
                handleEvent(it)
            }
        }
    }

    abstract fun handleEvent(event: Event)

    fun setEvent(event: Event) {
        viewModelScope.launch { _event.send(event) }
    }

    protected fun setState(reducer: State.() -> State) {
        val newState = uiState.value.reducer()
        _uiState.value = newState
    }

    protected fun setEffect(builder: () -> Effect) {
        val effectValue = builder()
        viewModelScope.launch { _effect.send(effectValue) }
    }
}
`;

files['app/src/main/java/com/example/myapplication/presentation/MainContract.kt'] = `
package com.example.myapplication.presentation

import com.example.myapplication.data.model.ComponentDto

class MainContract {
    sealed class Event {
        data object FetchUi : Event()
    }

    sealed class State {
        data object Loading : State()
        data class Success(val components: List<ComponentDto>) : State()
        data class Error(val message: String) : State()
    }

    sealed class Effect {
        data class ShowToast(val message: String) : Effect()
    }
}
`;

// Data Layer
files['app/src/main/java/com/example/myapplication/data/repository/UiConfigRepositoryImpl.kt'] = `
package com.example.myapplication.data.repository

import com.example.myapplication.data.datasource.RemoteConfigDataSource
import com.example.myapplication.data.model.ComponentDto
import com.example.myapplication.domain.repository.UiConfigRepository

class UiConfigRepositoryImpl(
    private val remoteConfigDataSource: RemoteConfigDataSource
) : UiConfigRepository {

    override suspend fun getUiConfiguration(): List<ComponentDto> {
        return remoteConfigDataSource.getComponents()
    }
}
`;

// New DataSource Layer
files['app/src/main/java/com/example/myapplication/data/datasource/RemoteConfigDataSource.kt'] = `
package com.example.myapplication.data.datasource

import android.util.Log
import com.example.myapplication.data.model.ComponentDto
import com.example.myapplication.data.util.await
import com.google.firebase.ktx.Firebase
import com.google.firebase.remoteconfig.ConfigUpdate
import com.google.firebase.remoteconfig.ConfigUpdateListener
import com.google.firebase.remoteconfig.FirebaseRemoteConfigException
import com.google.firebase.remoteconfig.ktx.remoteConfig
import com.google.firebase.remoteconfig.ktx.remoteConfigSettings
import kotlinx.serialization.json.Json
import java.lang.Exception

interface RemoteConfigDataSource {
    suspend fun getComponents(): List<ComponentDto>
}

class FirebaseRemoteConfigDataSource(
    private val json: Json
) : RemoteConfigDataSource {

    private val remoteConfig = Firebase.remoteConfig
    private val configKey = "COMPOSE_DESIGN_JSON_V2"

    init {
        val configSettings = remoteConfigSettings {
            minimumFetchIntervalInSeconds = if (com.example.myapplication.BuildConfig.DEBUG) 0 else 3600
        }
        remoteConfig.setConfigSettingsAsync(configSettings)
        remoteConfig.setDefaultsAsync(mapOf(configKey to "[]"))
    }

    override suspend fun getComponents(): List<ComponentDto> {
        return try {
            remoteConfig.fetchAndActivate().await()
            val jsonString = remoteConfig.getString(configKey)
            if (jsonString.isNotBlank()) {
                json.decodeFromString<List<ComponentDto>>(jsonString)
            } else {
                Log.w("RemoteConfigDataSource", "Remote config for key '\$configKey' is blank.")
                emptyList()
            }
        } catch (e: Exception) {
            Log.e("RemoteConfigDataSource", "Failed to fetch or parse components for key '\$configKey'", e)
            emptyList()
        }
    }
}
`;

// New Util Layer
files['app/src/main/java/com/example/myapplication/data/util/FirebaseExtensions.kt'] = `
package com.example.myapplication.data.util

import com.google.android.gms.tasks.Task
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

suspend fun <T> Task<T>.await(): T {
    return suspendCancellableCoroutine { cont ->
        addOnCompleteListener { task ->
            if (task.exception != null) {
                cont.resumeWithException(task.exception!!)
            } else {
                cont.resume(task.result)
            }
        }
    }
}
`;

// Domain Layer
files['app/src/main/java/com/example/myapplication/domain/repository/UiConfigRepository.kt'] = `
package com.example.myapplication.domain.repository

import com.example.myapplication.data.model.ComponentDto

interface UiConfigRepository {
    suspend fun getUiConfiguration(): List<ComponentDto>
}
`;

files['app/src/main/java/com/example/myapplication/domain/usecase/GetUiConfigurationUseCase.kt'] = `
package com.example.myapplication.domain.usecase

import com.example.myapplication.domain.repository.UiConfigRepository

class GetUiConfigurationUseCase(
    private val repository: UiConfigRepository
) {
    suspend operator fun invoke() = repository.getUiConfiguration()
}
`;

// Theme files
files['app/src/main/java/com/example/myapplication/presentation/theme/Theme.kt'] = `
package com.example.myapplication.presentation.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = Purple80,
    secondary = PurpleGrey80,
    tertiary = Pink80
)

private val LightColorScheme = lightColorScheme(
    primary = Purple40,
    secondary = PurpleGrey40,
    tertiary = Pink40
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
`;

files['app/src/main/java/com/example/myapplication/presentation/theme/Color.kt'] = `
package com.example.myapplication.presentation.theme

import androidx.compose.ui.graphics.Color

val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)
val Pink80 = Color(0xFFEFB8C8)

val Purple40 = Color(0xFF6650a4)
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)
`;

files['app/src/main/java/com/example/myapplication/presentation/theme/Type.kt'] = `
package com.example.myapplication.presentation.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Typography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    )
)
`;

// Resource files
files['app/src/main/res/values/strings.xml'] = `
<resources>
    <string name="app_name">My Application</string>
</resources>
`;

files['app/src/main/res/values/colors.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
</resources>
`;

files['app/src/main/res/xml/backup_rules.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
</full-backup-content>
`;

files['app/src/main/res/xml/data_extraction_rules.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="root" />
    </cloud-backup>
    <device-transfer>
        <exclude domain="root" />
    </device-transfer>
</data-extraction-rules>
`;


files['app/src/main/res/values/themes.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.MyApplication" parent="android:Theme.Material.Light.NoActionBar" />
</resources>
`;

files['app/src/main/res/drawable/ic_launcher_background.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:pathData="M0,0h108v108h-108z"
        android:fillColor="#3DDC84"/>
</vector>
`;

files['app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

files['app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml'] = `
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

// For simplicity, foreground is a simple vector
files['app/src/main/res/mipmap-hdpi/ic_launcher_foreground.xml'] = `
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,54m-24,0a24,24 0,1 1,48 0a24,24 0,1 1,-48 0" />
</vector>
`;

// Providing all mipmap folder variants for completeness
files['app/src/main/res/mipmap-hdpi/ic_launcher.png'] = "";
files['app/src/main/res/mipmap-hdpi/ic_launcher_round.png'] = "";
files['app/src/main/res/mipmap-mdpi/ic_launcher.png'] = "";
files['app/src/main/res/mipmap-mdpi/ic_launcher_round.png'] = "";
files['app/src/main/res/mipmap-mdpi/ic_launcher_foreground.xml'] = files['app/src/main/res/mipmap-hdpi/ic_launcher_foreground.xml'];
files['app/src/main/res/mipmap-xhdpi/ic_launcher.png'] = "";
files['app/src/main/res/mipmap-xhdpi/ic_launcher_round.png'] = "";
files['app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.xml'] = files['app/src/main/res/mipmap-hdpi/ic_launcher_foreground.xml'];
files['app/src/main/res/mipmap-xxhdpi/ic_launcher.png'] = "";
files['app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png'] = "";
files['app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.xml'] = files['app/src/main/res/mipmap-hdpi/ic_launcher_foreground.xml'];
files['app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'] = "";
files['app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png'] = "";
files['app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.xml'] = files['app/src/main/res/mipmap-hdpi/ic_launcher_foreground.xml'];



export function getAndroidProjectTemplates(): Record<string, string> {
    const mutableFiles = { ...files };
    // Create empty png files to ensure folders are created, actual content is not needed
    Object.keys(mutableFiles).forEach(key => {
        if (key.endsWith(".png")) {
            // This is a placeholder for a binary file, which we can't really generate.
            // The file entry itself is what matters for the project structure.
        }
    });
    return mutableFiles;
}

