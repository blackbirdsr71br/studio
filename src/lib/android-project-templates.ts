
import type { DesignComponent, M3Theme } from '@/types/compose-spec';

interface TemplateOptions {
    packageId: string;
    composableCode: string;
    m3Theme?: M3Theme;
}

export const getProjectTemplates = (options: TemplateOptions): Record<string, string> => {
    const { packageId, composableCode, m3Theme } = options;
    const packagePath = packageId.replace(/\./g, '/');

    const themeFileContent = generateThemeFile(packageId, m3Theme);

    return {
        // Gradle files
        'build.gradle.kts': getBuildGradleKts(),
        'app/build.gradle.kts': getAppBuildGradleKts(packageId),
        'settings.gradle.kts': getSettingsGradleKts(),
        'gradle/libs.versions.toml': getLibsVersionsToml(),

        // Proguard
        'app/proguard-rules.pro': getAppProguard(),

        // Manifest
        [`app/src/main/AndroidManifest.xml`]: getAndroidManifest(packageId),

        // Main Activity
        [`app/src/main/java/${packagePath}/MainActivity.kt`]: getMainActivity(packageId),
        
        // DI (Koin)
        [`app/src/main/java/${packagePath}/di/AppModule.kt`]: getAppModule(packageId),
        [`app/src/main/java/${packagePath}/MyApplication.kt`]: getMyApplication(packageId),

        // Domain Layer
        [`app/src/main/java/${packagePath}/domain/repository/ScreenRepository.kt`]: getScreenRepository(packageId),
        [`app/src/main/java/${packagePath}/domain/usecase/GetScreenLayoutUseCase.kt`]: getGetScreenLayoutUseCase(packageId),

        // Data Layer
        [`app/srcs/main/java/${packagePath}/data/repository/ScreenRepositoryImpl.kt`]: getScreenRepositoryImpl(packageId),
        [`app/src/main/java/${packagePath}/data/remote/RemoteConfigApi.kt`]: getRemoteConfigApi(packageId),
        
        // Presentation Layer (MVI)
        [`app/src/main/java/${packagePath}/presentation/base/BaseViewModel.kt`]: getBaseViewModel(packageId),
        [`app/srcsrc/main/java/${packagePath}/presentation/base/ViewContract.kt`]: getViewContract(packageId),
        [`app/src/main/java/${packagePath}/presentation/screens/generated/GeneratedScreenContract.kt`]: getGeneratedScreenContract(packageId),
        [`app/src/main/java/${packagePath}/presentation/screens/generated/GeneratedScreenViewModel.kt`]: getGeneratedScreenViewModel(packageId),
        [`app/src/main/java/${packagePath}/presentation/screens/generated/GeneratedScreen.kt`]: getGeneratedScreenUi(packageId, composableCode),

        // UI Theme
        [`app/src/main/java/${packagePath}/ui/theme/Theme.kt`]: themeFileContent,
        [`app/src/main/java/${packagePath}/ui/theme/Color.kt`]: getColorKt(packageId),
        [`app/src/main/java/${packagePath}/ui/theme/Type.kt`]: getTypeKt(packageId),

        // Resources
        'app/src/main/res/values/strings.xml': getStringsXml(),
        'app/src/main/res/values/themes.xml': getThemesXml(),
    };
};

// --- Template Functions ---

const getBuildGradleKts = () => `
// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.jetbrains.kotlin.android) apply false
    alias(libs.plugins.google.gms.google.services) apply false
}
`;

const getAppBuildGradleKts = (packageId: string) => `
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.jetbrains.kotlin.android)
    alias(libs.plugins.google.gms.google.services)
}

android {
    namespace = "${packageId}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${packageId}"
        minSdk = 26
        targetSdk = 34
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
        kotlinCompilerExtensionVersion = "1.5.1"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)

    // Koin for DI
    implementation(libs.koin.android)
    implementation(libs.koin.androidx.compose)

    // Coroutines
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)

    // ViewModel
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)

    // Coil for images
    implementation(libs.coil.compose)

    // Firebase
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.config.ktx)

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}
`;

const getSettingsGradleKts = () => `
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

rootProject.name = "GeneratedApp"
include(":app")
`;

const getLibsVersionsToml = () => `
[versions]
activityCompose = "1.9.0"
androidApplication = "8.2.2"
composeBom = "2024.02.02"
coreKtx = "1.13.1"
espressoCore = "3.5.1"
firebaseBom = "33.1.1"
googleServices = "4.4.2"
junit = "4.13.2"
junitVersion = "1.1.5"
kotlin = "1.9.0"
kotlinxCoroutinesCore = "1.7.3"
kotlinxCoroutinesPlayServices = "1.7.3"
lifecycleRuntimeKtx = "2.8.1"
koin = "3.5.6"
coil = "2.6.0"

[libraries]
androidx-activity-compose = { module = "androidx.activity:activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { module = "androidx.compose:compose-bom", version.ref = "composeBom" }
androidx-core-ktx = { module = "androidx.core:core-ktx", version.ref = "coreKtx" }
androidx-espresso-core = { module = "androidx.test.espresso:espresso-core", version.ref = "espressoCore" }
androidx-junit = { module = "androidx.test.ext:junit", version.ref = "junitVersion" }
androidx-lifecycle-runtime-ktx = { module = "androidx.lifecycle:lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-viewmodel-compose = { module = "androidx.lifecycle:lifecycle-viewmodel-compose", version.ref = "lifecycleRuntimeKtx" }
androidx-lifecycle-viewmodel-ktx = { module = "androidx.lifecycle:lifecycle-viewmodel-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-material3 = { module = "androidx.compose.material3:material3" }
androidx-ui = { module = "androidx.compose.ui:ui" }
androidx-ui-graphics = { module = "androidx.compose.ui:ui-graphics" }
androidx-ui-test-junit4 = { module = "androidx.compose.ui:ui-test-junit4" }
androidx-ui-test-manifest = { module = "androidx.compose.ui:ui-test-manifest" }
androidx-ui-tooling = { module = "androidx.compose.ui:ui-tooling" }
androidx-ui-tooling-preview = { module = "androidx.compose.ui:ui-tooling-preview" }
firebase-bom = { module = "com.google.firebase:firebase-bom", version.ref = "firebaseBom" }
firebase-config-ktx = { module = "com.google.firebase:firebase-config-ktx" }
junit = { module = "junit:junit", version.ref = "junit" }
kotlinx-coroutines-android = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-android", version.ref = "kotlinxCoroutinesCore" }
kotlinx-coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "kotlinxCoroutinesCore" }
kotlinx-coroutines-play-services = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-play-services", version.ref = "kotlinxCoroutinesPlayServices" }
koin-android = { module = "io.insert-koin:koin-android", version.ref = "koin" }
koin-androidx-compose = { module = "io.insert-koin:koin-androidx-compose", version.ref = "koin" }
coil-compose = { module = "io.coil-kt:coil-compose", version.ref = "coil" }

[plugins]
android-application = { id = "com.android.application", version.ref = "androidApplication" }
jetbrains-kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
google-gms-google-services = { id = "com.google.gms.google-services", version.ref = "googleServices" }
`;


const getAppProguard = () => `
-keep class io.koin.** { *; }
-keep class org.koin.** { *; }
-keep class com.google.firebase.remoteconfig.** { *; }
`;

const getAndroidManifest = (packageId: string) => `
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
        android:theme="@style/Theme.GeneratedApp"
        tools:targetApi="31">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="@string/app_name"
            android:theme="@style/Theme.GeneratedApp">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;

const getMainActivity = (packageId: string) => `
package ${packageId}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import ${packageId}.presentation.screens.generated.GeneratedScreen
import ${packageId}.ui.theme.AppTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            AppTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    GeneratedScreen()
                }
            }
        }
    }
}
`;

const getAppModule = (packageId: string) => `
package ${packageId}.di

import ${packageId}.data.remote.RemoteConfigApi
import ${packageId}.data.repository.ScreenRepositoryImpl
import ${packageId}.domain.repository.ScreenRepository
import ${packageId}.domain.usecase.GetScreenLayoutUseCase
import ${packageId}.presentation.screens.generated.GeneratedScreenViewModel
import com.google.firebase.ktx.Firebase
import com.google.firebase.remoteconfig.ktx.remoteConfig
import org.koin.androidx.viewmodel.dsl.viewModel
import org.koin.dsl.module

val appModule = module {
    // Data
    single { Firebase.remoteConfig }
    single { RemoteConfigApi(get()) }
    single<ScreenRepository> { ScreenRepositoryImpl(get()) }

    // Domain
    factory { GetScreenLayoutUseCase(get()) }

    // Presentation
    viewModel { GeneratedScreenViewModel(get()) }
}
`;

const getMyApplication = (packageId: string) => `
package ${packageId}

import android.app.Application
import ${packageId}.di.appModule
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.GlobalContext.startKoin

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        startKoin {
            androidContext(this@MyApplication)
            modules(appModule)
        }
    }
}
`;

const getScreenRepository = (packageId: string) => `
package ${packageId}.domain.repository

interface ScreenRepository {
    suspend fun getScreenLayoutJson(): Result<String>
}
`;

const getGetScreenLayoutUseCase = (packageId: string) => `
package ${packageId}.domain.usecase

import ${packageId}.domain.repository.ScreenRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GetScreenLayoutUseCase(
    private val repository: ScreenRepository
) {
    suspend operator fun invoke(): Result<String> = withContext(Dispatchers.IO) {
        repository.getScreenLayoutJson()
    }
}
`;

const getScreenRepositoryImpl = (packageId: string) => `
package ${packageId}.data.repository

import ${packageId}.data.remote.RemoteConfigApi
import ${packageId}.domain.repository.ScreenRepository

class ScreenRepositoryImpl(
    private val remoteConfigApi: RemoteConfigApi
) : ScreenRepository {
    override suspend fun getScreenLayoutJson(): Result<String> {
        return try {
            val json = remoteConfigApi.getScreenLayoutJson()
            Result.success(json)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
`;

const getRemoteConfigApi = (packageId: string) => `
package ${packageId}.data.remote

import com.google.firebase.remoteconfig.FirebaseRemoteConfig
import kotlinx.coroutines.tasks.await
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine
import com.google.firebase.remoteconfig.ktx.remoteConfigSettings

private const val LAYOUT_KEY = "COMPOSE_DESIGN_JSON_V2"
// Use a short interval for development, but increase for production
private const val MINIMUM_FETCH_INTERVAL_SECONDS = 60L 

class RemoteConfigApi(private val remoteConfig: FirebaseRemoteConfig) {

    init {
        val configSettings = remoteConfigSettings {
                minimumFetchIntervalInSeconds = MINIMUM_FETCH_INTERVAL_SECONDS
            }
        remoteConfig.setConfigSettingsAsync(configSettings)
    }

    suspend fun getScreenLayoutJson(): String {
        return try {
            remoteConfig.fetchAndActivate().await()
            remoteConfig.getString(LAYOUT_KEY).ifEmpty { "[]" }
        } catch (e: Exception) {
            // Fallback to cached value on failure
            remoteConfig.getString(LAYOUT_KEY).ifEmpty { "[]" }
        }
    }
}
`;

const getBaseViewModel = (packageId: string) => `
package ${packageId}.presentation.base

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

abstract class BaseViewModel<Event : UiEvent, State : UiState, Effect : UiEffect> : ViewModel() {

    private val initialState: State by lazy { createInitialState() }
    abstract fun createInitialState(): State

    val currentState: State
        get() = uiState.value

    private val _uiState: MutableStateFlow<State> = MutableStateFlow(initialState)
    val uiState = _uiState.asStateFlow()

    private val _event: MutableSharedFlow<Event> = MutableSharedFlow()
    val event = _event.asSharedFlow()

    private val _effect: Channel<Effect> = Channel()
    val effect = _effect.receiveAsFlow()

    init {
        subscribeEvents()
    }

    private fun subscribeEvents() {
        viewModelScope.launch {
            event.collect {
                handleEvent(it)
            }
        }
    }

    abstract fun handleEvent(event: Event)

    fun setEvent(event: Event) {
        val newEvent = event
        viewModelScope.launch { _event.emit(newEvent) }
    }

    protected fun setState(reduce: State.() -> State) {
        val newState = currentState.reduce()
        _uiState.value = newState
    }

    protected fun setEffect(builder: () -> Effect) {
        val effectValue = builder()
        viewModelScope.launch { _effect.send(effectValue) }
    }
}
`;

const getViewContract = (packageId: string) => `
package ${packageId}.presentation.base

// Represents the immutable UI state of a screen.
interface UiState

// Represents a user interaction or an action from the UI.
interface UiEvent

// Represents a one-time side effect that should be handled by the UI (e.g., navigation, showing a toast).
interface UiEffect
`;

const getGeneratedScreenContract = (packageId: string) => `
package ${packageId}.presentation.screens.generated

import ${packageId}.presentation.base.UiEffect
import ${packageId}.presentation.base.UiEvent
import ${packageId}.presentation.base.UiState

class GeneratedScreenContract {

    sealed class Event : UiEvent {
        object OnFetchLayout : Event()
        data class OnComponentClick(val action: String, val value: String) : Event()
    }

    data class State(
        val isLoading: Boolean,
        val layoutJson: String,
        val error: String?
    ) : UiState

    sealed class Effect : UiEffect {
        data class ShowToast(val message: String) : Effect()
        data class Navigate(val route: String) : Effect()
        data class LogCustomEvent(val name: String, val params: String) : Effect()
    }
}
`;

const getGeneratedScreenViewModel = (packageId: string) => `
package ${packageId}.presentation.screens.generated

import androidx.lifecycle.viewModelScope
import ${packageId}.domain.usecase.GetScreenLayoutUseCase
import ${packageId}.presentation.base.BaseViewModel
import kotlinx.coroutines.launch

class GeneratedScreenViewModel(
    private val getScreenLayoutUseCase: GetScreenLayoutUseCase
) : BaseViewModel<GeneratedScreenContract.Event, GeneratedScreenContract.State, GeneratedScreenContract.Effect>() {

    init {
        // Automatically fetch layout when the ViewModel is created
        setEvent(GeneratedScreenContract.Event.OnFetchLayout)
    }

    override fun createInitialState() = GeneratedScreenContract.State(
        isLoading = true,
        layoutJson = "[]", // Start with an empty array
        error = null
    )

    override fun handleEvent(event: GeneratedScreenContract.Event) {
        when (event) {
            is GeneratedScreenContract.Event.OnFetchLayout -> fetchLayout()
            is GeneratedScreenContract.Event.OnComponentClick -> handleComponentClick(event.action, event.value)
        }
    }

    private fun fetchLayout() {
        setState { copy(isLoading = true, error = null) }
        viewModelScope.launch {
            getScreenLayoutUseCase().onSuccess { json ->
                setState { copy(isLoading = false, layoutJson = json) }
            }.onFailure {
                setState { copy(isLoading = false, error = it.message ?: "An unknown error occurred") }
            }
        }
    }
    
    private fun handleComponentClick(action: String, value: String) {
        when (action) {
            "SHOW_TOAST" -> setEffect { GeneratedScreenContract.Effect.ShowToast(value) }
            "NAVIGATE" -> setEffect { GeneratedScreenContract.Effect.Navigate(value) }
            "CUSTOM_EVENT" -> setEffect { GeneratedScreenContract.Effect.LogCustomEvent(value, "{}") }
        }
    }
}
`;

const getGeneratedScreenUi = (packageId: string, composableCode: string) => `
package ${packageId}.presentation.screens.generated

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.flow.onEach
import org.koin.androidx.compose.koinViewModel

// This is the main entry point that connects the ViewModel to the UI
@Composable
fun GeneratedScreen(
    viewModel: GeneratedScreenViewModel = koinViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(key1 = viewModel.effect) {
        viewModel.effect.onEach { effect ->
            when (effect) {
                is GeneratedScreenContract.Effect.ShowToast -> {
                    Toast.makeText(context, effect.message, Toast.LENGTH_SHORT).show()
                }
                is GeneratedScreenContract.Effect.Navigate -> {
                    // TODO: Implement your navigation logic here
                    Log.d("Navigation", "Navigate to: \${effect.route}")
                    Toast.makeText(context, "Navigate to: \${effect.route}", Toast.LENGTH_SHORT).show()
                }
                is GeneratedScreenContract.Effect.LogCustomEvent -> {
                     // TODO: Implement your analytics logic here
                    Log.d("CustomEvent", "Event: \${effect.name}, Params: \${effect.params}")
                }
            }
        }.collect()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (state.isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        } else if (state.error != null) {
            Text(
                text = "Error: \${state.error}",
                modifier = Modifier.align(Alignment.Center)
            )
        } else {
            // The JSON from Remote Config is used here to render the dynamic screen
            DynamicScreen(
                layoutJson = state.layoutJson,
                onComponentClick = { action, value ->
                    viewModel.setEvent(GeneratedScreenContract.Event.OnComponentClick(action, value))
                }
            )
        }
    }
}

// Your generated composables will be placed below by the generator.
// The code below is a direct translation of your canvas design.
// It has been adapted to accept the JSON from the ViewModel.

${composableCode}
`;

const getColorKt = (packageId: string) => `
package ${packageId}.ui.theme

import androidx.compose.ui.graphics.Color

val Purple80 = Color(0xFFD0BCFF)
val PurpleGrey80 = Color(0xFFCCC2DC)
val Pink80 = Color(0xFFEFB8C8)

val Purple40 = Color(0xFF6650a4)
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)
`;

const getTypeKt = (packageId: string) => `
package ${packageId}.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Set of Material typography styles to start with
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

const getStringsXml = () => `
<resources>
    <string name="app_name">GeneratedApp</string>
</resources>
`;

const getThemesXml = () => `
<resources>
    <style name="Theme.GeneratedApp" parent="android:Theme.Material.Light.NoActionBar" />
</resources>
`;


function generateThemeFile(packageId: string, m3Theme?: M3Theme): string {
  if (!m3Theme) {
    // Fallback to a default theme if not provided
    return `
package ${packageId}.ui.theme

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
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
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
  }
  
  const toComposeColor = (hex: string) => `Color(0xFF${hex.substring(1).toUpperCase()})`;

  const lightColors = Object.entries(m3Theme.lightColors).map(([name, color]) => `    ${name} = ${toComposeColor(color)}`).join(',\n');
  const darkColors = Object.entries(m3Theme.darkColors).map(([name, color]) => `    ${name} = ${toComposeColor(color)}`).join(',\n');
  
  const toFontWeight = (w: 'Normal' | 'Medium' | 'Bold') => w === 'Normal' ? 'FontWeight.Normal' : w === 'Medium' ? 'FontWeight.Medium' : 'FontWeight.Bold';
  
  const typographyStyles = (Object.keys(m3Theme.typography) as Array<keyof typeof m3Theme.typography>).map(key => `    ${key} = TextStyle(\n        fontFamily = FontFamily.Default, // TODO: Replace with actual font\n        fontWeight = ${toFontWeight(m3Theme.typography[key].fontWeight)},\n        fontSize = ${m3Theme.typography[key].fontSize}.sp\n    )`).join(',\n');
  const shapesDef = (Object.keys(m3Theme.shapes) as Array<keyof typeof m3Theme.shapes>).map(key => `    ${key} = RoundedCornerShape(${m3Theme.shapes[key]}.dp)`).join(',\n');

  return `
package ${packageId}.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

// This is a generated file. Modifications may be overwritten.

private val LightColorScheme = lightColorScheme(
${lightColors}
)

private val DarkColorScheme = darkColorScheme(
${darkColors}
)

private val AppShapes = Shapes(
${shapesDef}
)

private val AppTypography = Typography(
${typographyStyles}
)


@Composable
fun AppTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (useDarkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colors.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !useDarkTheme
        }
    }
    
    MaterialTheme(
        colorScheme = colors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}
`;
}
