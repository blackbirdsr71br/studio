
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
        [`app/src/main/java/${packagePath}/data/repository/ScreenRepositoryImpl.kt`]: getScreenRepositoryImpl(packageId),
        [`app/src/main/java/${packagePath}/data/remote/RemoteConfigApi.kt`]: getRemoteConfigApi(packageId),
        
        // Presentation Layer (MVI)
        [`app/src/main/java/${packagePath}/presentation/base/BaseViewModel.kt`]: getBaseViewModel(packageId),
        [`app/src/main/java/${packagePath}/presentation/base/ViewContract.kt`]: getViewContract(packageId),
        [`app/src/main/java/${packagePath}/presentation/screens/generated/GeneratedScreenContract.kt`]: getGeneratedScreenContract(packageId),
        [`app/src/main/java/${packagePath}/presentation/screens/generated/GeneratedScreenViewModel.kt`]: getGeneratedScreenViewModel(packageId),
        [`app/src/main/java/${packagePath}/presentation/screens/generated/GeneratedScreen.kt`]: getGeneratedScreenUi(packageId, composableCode),

        // UI Theme
        [`app/src/main/java/${packagePath}/ui/theme/Theme.kt`]: themeFileContent,
        [`app/src/main/java/${packagePath}/ui/theme/Color.kt`]: getColorKt(packageId),
        [`app/src/main/java/${packagePath}/ui/theme/Type.kt`]: getTypeKt(packageId),
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

class GetScreenLayoutUseCase(
    private val repository: ScreenRepository
) {
    suspend operator fun invoke(): Result<String> {
        return repository.getScreenLayoutJson()
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

private const val LAYOUT_KEY = "COMPOSE_DESIGN_JSON_V2"
private const val MINIMUM_FETCH_INTERVAL_SECONDS = 3600L

class RemoteConfigApi(private val remoteConfig: FirebaseRemoteConfig) {

    init {
        remoteConfig.setConfigSettingsAsync(
            com.google.firebase.remoteconfig.ktx.remoteConfigSettings {
                minimumFetchIntervalInSeconds = MINIMUM_FETCH_INTERVAL_SECONDS
            }
        )
    }

    suspend fun getScreenLayoutJson(): String {
        return suspendCoroutine { continuation ->
            remoteConfig.fetchAndActivate()
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val json = remoteConfig.getString(LAYOUT_KEY)
                        if (json.isNotEmpty()) {
                            continuation.resume(json)
                        } else {
                            continuation.resume("[]") // Return empty JSON array if key is missing
                        }
                    } else {
                        // Fallback to cached value or default
                        val json = remoteConfig.getString(LAYOUT_KEY)
                        if (json.isNotEmpty()) {
                            continuation.resume(json)
                        } else {
                             continuation.resume("[]")
                        }
                    }
                }
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
        viewModelScope.launch { _event.emit(event) }
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

// Represents the UI state of a screen.
interface UiState

// Represents a user interaction event.
interface UiEvent

// Represents a one-time side effect that should be handled by the UI.
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
    }

    data class State(
        val isLoading: Boolean,
        val layoutJson: String,
        val error: String?
    ) : UiState

    sealed class Effect : UiEffect {
        data class ShowToast(val message: String) : Effect()
    }
}
`;

const getGeneratedScreenViewModel = (packageId: string) => `
package ${packageId}.presentation.screens.generated

import ${packageId}.domain.usecase.GetScreenLayoutUseCase
import ${packageId}.presentation.base.BaseViewModel

class GeneratedScreenViewModel(
    private val getScreenLayoutUseCase: GetScreenLayoutUseCase
) : BaseViewModel<GeneratedScreenContract.Event, GeneratedScreenContract.State, GeneratedScreenContract.Effect>() {

    override fun createInitialState() = GeneratedScreenContract.State(
        isLoading = true,
        layoutJson = "",
        error = null
    )

    override fun handleEvent(event: GeneratedScreenContract.Event) {
        when (event) {
            is GeneratedScreenContract.Event.OnFetchLayout -> fetchLayout()
        }
    }

    private fun fetchLayout() {
        setState { copy(isLoading = true, error = null) }
        viewModelScope.launch {
            getScreenLayoutUseCase().onSuccess { json ->
                setState { copy(isLoading = false, layoutJson = json) }
            }.onFailure {
                setState { copy(isLoading = false, error = it.message) }
                setEffect { GeneratedScreenContract.Effect.ShowToast(it.message ?: "An unknown error occurred") }
            }
        }
    }
    
    init {
        setEvent(GeneratedScreenContract.Event.OnFetchLayout)
    }
}
`;

const getGeneratedScreenUi = (packageId: string, composableCode: string) => `
package ${packageId}.presentation.screens.generated

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
            // This is where your generated code from the canvas is rendered
            DynamicScreen()
        }
    }
}

// Your generated composables will be placed below by the generator.
// The code below is a direct translation of your canvas design.

${composableCode.replace('fun GeneratedScreen()', 'fun DynamicScreen()')}
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

function generateThemeFile(packageId: string, m3Theme?: M3Theme): string {
  if (!m3Theme) {
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
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = darkTheme
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
  const darkColors = Object.entries(m3Theme.darkColors).map(([name, color]) => `    ${toComposeColor(color)}`).join(',\n');

  return `
package ${packageId}.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// This is a generated file. Modifications may be overwritten.

private val LightColorScheme = lightColorScheme(
${lightColors}
)

private val DarkColorScheme = darkColorScheme(
${darkColors}
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
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = useDarkTheme
        }
    }
    
    MaterialTheme(
        colorScheme = colors,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}
`;
}
