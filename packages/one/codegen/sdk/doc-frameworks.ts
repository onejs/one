// apple documentation technology groups, https://developer.apple.com/documentation/technologies
// machine learning frameworks are grouped together for browsing.
// modules absent from the catalog are listed under additional sdk modules.
export const frameworkGroups: Record<string, string[]> = {
  'App Frameworks': [
    'Accessibility',
    'AccessoryNotifications',
    'AccessoryLiveActivities',
    'ActivityKit',
    'AlarmKit',
    'AppClip',
    'CoreFoundation',
    'DeclaredAgeRange',
    'Distributed',
    'EnergyKit',
    'Foundation',
    'FoundationModels',
    'GeoToolbox',
    'ManagedApp',
    'MusicUnderstanding',
    'Observation',
    'PaperKit',
    'PermissionKit',
    'RegexBuilder',
    'RelevanceKit',
    'StateReporting',
    'SwiftData',
    'SwiftUI',
    'Symbols',
    'TranslationUIProvider',
    'TrustInsights',
    'UIKit',
    'USDKit',
    'WiFiAware',
  ],
  'App Services': [
    'Accounts',
    'AdAttributionKit',
    'AddressBook',
    'AddressBookUI',
    'AdServices',
    'AdSupport',
    'AppIntents',
    'AppMigrationKit',
    'AutomaticAssessmentConfiguration',
    'AutomatedDeviceEnrollment',
    'BackgroundTasks',
    'BackgroundAssets',
    'BrowserKit',
    'CallKit',
    'CarPlay',
    'CarKey',
    'Charts',
    'ClassKit',
    'ClassKitUI',
    'ClockKit',
    'CloudKit',
    'Combine',
    'Contacts',
    'ContactProvider',
    'ContactsUI',
    'CoreData',
    'CoreLocation',
    'CoreLocationUI',
    'CoreMotion',
    'CoreSpotlight',
    'CoreText',
    'CoreTransferable',
    'DataDetection',
    'DeviceActivity',
    'DeviceCheck',
    'EventKit',
    'EventKitUI',
    'ExtensionFoundation',
    'ExtensionKit',
    'FamilyControls',
    'FileProvider',
    'FileProviderUI',
    'FinanceKit',
    'FinanceKitUI',
    'HealthKit',
    'HomeKit',
    'iAd',
    'IdentityDocumentServices',
    'IdentityDocumentServicesUI',
    'JavaScriptCore',
    'LiveCommunicationKit',
    'ManagedSettings',
    'ManagedAppDistribution',
    'ManagedSettingsUI',
    'MapKit',
    'MarketplaceKit',
    'Matter',
    'MatterSupport',
    'MediaIntents',
    'Messages',
    'MessageUI',
    'MultipeerConnectivity',
    'NotificationCenter',
    'PassKit',
    'ProximityReader',
    'PushKit',
    'PushToTalk',
    'QuickLook',
    'SafariServices',
    'SecureElementCredential',
    'SensitiveContentAnalysis',
    'ServicesAccountLinking',
    'SharedWithYou',
    'IdentityLookup',
    'Social',
    'StoreKit',
    'SuggestedActions',
    'TabularData',
    'TelephonyMessagingKit',
    'TipKit',
    'UserNotifications',
    'UserNotificationsUI',
    'WatchConnectivity',
    'WeatherKit',
    'WebKit',
    'WidgetKit',
    'WorkoutKit',
    'VisionKit',
    'SafetyKit',
  ],
  'Developer Tools': ['DeveloperToolsSupport', 'Synchronization'],
  'Graphics and Games': [
    'ARKit',
    'ColorSync',
    'ComputeGraph',
    'CoreGraphics',
    'CoreImage',
    'GameController',
    'GameKit',
    'GameplayKit',
    'GameSave',
    'GLKit',
    'ImageIO',
    'ImagePlayground',
    'Metal',
    'MetalKit',
    'MetalPerformanceShaders',
    'MetalPerformanceShadersGraph',
    'ModelIO',
    'OpenGLES',
    'PDFKit',
    'PencilKit',
    'QuartzCore',
    'RealityKit',
    'ReplayKit',
    'RoomPlan',
    'SceneKit',
    'Spatial',
    'SpriteKit',
    'TouchController',
  ],
  Media: [
    'AssetsLibrary',
    'AudioToolbox',
    'AudioUnit',
    'AVFAudio',
    'AVFoundation',
    'AVKit',
    'AVRouting',
    'CoreAudio',
    'CoreAudioKit',
    'CoreAudioTypes',
    'CoreHaptics',
    'CoreMedia',
    'CoreMIDI',
    'CoreVideo',
    'DeviceDiscoveryExtension',
    'GroupActivities',
    'ImageCaptureCore',
    'ImmersiveMediaSupport',
    'LockedCameraCapture',
    'MediaAccessibility',
    'MediaIntelligence',
    'MediaPlayer',
    'MediaToolbox',
    'MusicKit',
    'NowPlaying',
    'PHASE',
    'QuickLookThumbnailing',
    'ShazamKit',
    'SoundAnalysis',
    'VideoToolbox',
    'VideoSubscriberAccount',
  ],
  System: [
    'Accelerate',
    'AccessorySetupKit',
    'AccessoryTransportExtension',
    'AppTrackingTransparency',
    'AuthenticationServices',
    'CFNetwork',
    'CoreBluetooth',
    'CoreNFC',
    'CoreTelephony',
    'CryptoKit',
    'CryptoTokenKit',
    'DeviceDiscoveryUI',
    'Dispatch',
    'ExposureNotification',
    'ExternalAccessory',
    'GSS',
    'IOSurface',
    'LocalAuthentication',
    'LocalAuthenticationEmbeddedUI',
    'MetricKit',
    'NearbyInteraction',
    'Network',
    'NetworkExtension',
    'OSLog',
    'Security',
    'SensorKit',
    'System',
    'SystemConfiguration',
    'SystemExtensions',
    'UniformTypeIdentifiers',
  ],
  Web: ['BrowserEngineCore', 'BrowserEngineKit', 'LinkPresentation', 'ScreenTime'],
  'Machine Learning': [
    'CoreML',
    'CreateMLComponents',
    'NaturalLanguage',
    'Vision',
    'Speech',
    'Translation',
  ],
}

export const frameworkSummaries: Record<string, string> = {
  ARKit:
    'Integrate hardware sensing features to produce augmented reality apps and games.',
  AVFAudio:
    'Play, record, and process audio; configure your app\u2019s system audio behavior.',
  AVFoundation:
    'Work with audiovisual assets, control device cameras, process audio, and configure system audio interactions.',
  AVKit:
    'Adopt the system\u2019s video playback interfaces, and integrate your camera app with capture hardware.',
  AVRouting: 'Display custom destinations to stream media in the system route picker.',
  Accelerate:
    'Make large-scale mathematical computations and image calculations, optimized for high performance and low energy consumption.',
  Accessibility: 'Make your apps accessible to everyone who uses Apple devices.',
  AccessoryLiveActivities:
    'Forward Live Activity alerts from iPhone to an accessory you develop.',
  AccessoryNotifications:
    'Receive forwarded iOS system notifications on an accessory that you develop.',
  AccessorySetupKit:
    'Enable privacy-preserving discovery and configuration of accessories.',
  AccessoryTransportExtension:
    'Transfer data securely to connected accessories that you develop.',
  Accounts:
    'Help users access and manage their external accounts from within your app, without requiring them to enter login credentials.',
  ActivityKit:
    'Share live updates from your app as Live Activities on iPhone, iPad, Apple Watch, and the Mac.',
  AdAttributionKit:
    'Present, process, and register postbacks for in-app ads in the App Store and alternative app marketplaces.',
  AdServices:
    'Attribute app-download campaigns that originate from the App Store on iOS devices.',
  AdSupport: 'Provide apps with access to an advertising identifier.',
  AddressBook: 'Access the centralized database for storing users\u2019 contacts.',
  AddressBookUI: 'Access users\u2019 contacts and display them in a graphical interface.',
  AlarmKit: 'Schedule prominent alarms and countdowns to help people manage their time.',
  AppClip:
    'Create a lightweight, in-the-moment experience or demo version for your app that\u2019s instantly available.',
  AppIntents:
    'Make content and actions discoverable by Apple Intelligence and support system experiences like Siri, Spotlight, Shortcuts, and widgets.',
  AppMigrationKit:
    'Perform a one-time transfer of your app\u2019s on-device data to or from a device running another platform.',
  AppTrackingTransparency:
    'Request authorization to access app-related data that your app can use to track the person or the device.',
  AssetsLibrary: 'Access the assets in a user\u2019s media library.',
  AudioToolbox:
    'Record or play audio, convert formats, parse audio streams, and configure your audio session.',
  AudioUnit:
    'Add sophisticated audio manipulation and processing capabilities to your app.',
  AuthenticationServices: 'Make it easy for users to log into apps and services.',
  AutomatedDeviceEnrollment:
    'Allow users of third-party MDM apps to add macOS and iOS devices to their organization.',
  AutomaticAssessmentConfiguration:
    'Enter single-app mode and prevent students from accessing specific system features while taking an exam.',
  BackgroundAssets:
    'Improve or eliminate the time people wait while your app downloads assets.',
  BackgroundTasks:
    'Support background processing in your app by wrapping your app\u2019s most critical work in framework-provided tasks.',
  BrowserEngineCore: 'Integrate an alternative browser engine into your web browser app.',
  BrowserEngineKit:
    'Create a browser that renders content using an alternative browser engine.',
  BrowserKit:
    'Transfer browser data to another browser or check a device\u2019s eligibility to use an alternative browser engine.',
  CFNetwork:
    'Access network services and handle changes in network configurations. Build on abstractions of network protocols to simplify tasks such as working with BSD sockets, administering HTTP and FTP servers, and managing Bonjour services.',
  CallKit:
    'Display the system-calling UI for your app\u2019s VoIP services, and coordinate your calling services with other apps and the system.',
  CarKey: 'Access the remote keyless features of configured vehicles in the Wallet app.',
  CarPlay:
    'Integrate CarPlay in apps related to audio, communication, navigation, parking, EV charging, food ordering, and more.',
  Charts: 'Construct and customize charts on every Apple platform.',
  ClassKit:
    'Enable teachers to assign activities from your app\u2019s content and to view student progress.',
  ClassKitUI:
    'Display views that enable students to submit and withdraw assigned documents in your app.',
  ClockKit: 'Display app-specific data on the clock face.',
  CloudKit:
    'Store structured app and user data in iCloud containers that all users of your app can share.',
  ColorSync:
    'Reproduce colors accurately across a range of input, output, and display devices.',
  Combine:
    'Customize handling of asynchronous events by combining event-processing operators.',
  ComputeGraph:
    'Build and run custom particle effects and compute simulations for RealityKit using a programmable node graph.',
  ContactProvider:
    'Provide contacts managed by your app to the system-wide Contacts ecosystem.',
  Contacts:
    'Access the user\u2019s contacts, and format and localize contact information.',
  ContactsUI:
    'Provide an interface that allows people to display information about their contacts.',
  CoreAudio:
    'Use the Core Audio framework to interact with device\u2019s audio hardware.',
  CoreAudioKit: 'Add user interfaces to audio units.',
  CoreAudioTypes:
    'Use specialized data types to interact with audio streams, complex buffers, and audiovisual timestamps.',
  CoreBluetooth:
    'Communicate with Bluetooth low energy and BR/EDR (\u201cClassic\u201d) Devices.',
  CoreData:
    'Persist or cache data on a single device, or sync data to multiple devices with CloudKit.',
  CoreFoundation:
    'Access low-level functions, primitive data types, and various collection types that are bridged seamlessly with the Foundation framework.',
  CoreGraphics:
    'Harness the power of Quartz technology to perform lightweight 2D rendering with high-fidelity output. Handle path-based drawing, antialiased rendering, gradients, images, color management, PDF documents, and more.',
  CoreHaptics:
    'Compose and play haptic patterns to customize your iOS app\u2019s haptic feedback.',
  CoreImage: 'Use built-in or custom filters to process still and video images.',
  CoreLocation: 'Obtain the geographic location and orientation of a device.',
  CoreLocationUI:
    'Streamline access to users\u2019 location data through a standard, secure UI.',
  CoreMIDI: 'Communicate with MIDI devices such as hardware keyboards and synthesizers.',
  CoreML: 'Integrate machine learning models into your app.',
  CoreMedia: 'Represent time-based audio-visual assets with essential data types.',
  CoreMotion:
    'Process accelerometer, gyroscope, pedometer, and environment-related events.',
  CoreNFC:
    'Detect NFC tags, read messages that contain NDEF data, and save data to writable tags.',
  CoreSpotlight:
    'Add search capabilities to your app, and index your content so people can find it from Spotlight and Safari.',
  CoreTelephony:
    'Access information about a user\u2019s cellular service provider, such as its unique identifier and whether the carrier allows VoIP.',
  CoreText:
    'Create text layouts, optimize font handling, and access font metrics and glyph data.',
  CoreTransferable:
    'Declare a transfer representation for your model types to participate in system sharing and data transfer operations.',
  CoreVideo:
    'Process digital video, including manipulation of individual frames, using a pipeline-based API and support for both Metal and OpenGL.',
  CreateMLComponents: 'Create more customizable machine learning models in your app.',
  CryptoKit: 'Perform cryptographic operations securely and efficiently.',
  CryptoTokenKit: 'Access security tokens and the cryptographic assets they store.',
  DataDetection:
    'Access and utilize common types of data that the data detection system matches.',
  DeclaredAgeRange:
    'Create age-appropriate experiences in your app by asking people to share their age range.',
  DeveloperToolsSupport: 'Expose custom views and modifiers in the Xcode library.',
  DeviceActivity:
    'Monitor device activity with your app extension while maintaining privacy.',
  DeviceCheck:
    'Reduce fraudulent use of your services by managing device state and asserting app integrity.',
  DeviceDiscoveryExtension:
    'Stream media to a third-party device that a user selects in a system menu.',
  DeviceDiscoveryUI:
    'Display an interface that lets people connect iOS, iPadOS, tvOS, watchOS, and Mac Catalyst apps over peer-to-peer networks.',
  Dispatch:
    'Execute code concurrently on multicore hardware by submitting work to dispatch queues managed by the system.',
  Distributed:
    'Build systems that run distributed code across multiple processes and devices.',
  EnergyKit:
    'Provide grid forecasts and energy insights to help people optimize their electricity usage.',
  EventKit: 'Create, view, and edit calendar and reminder events.',
  EventKitUI:
    'Display an interface for viewing, selecting, and editing calendar events and reminders.',
  ExposureNotification:
    'Implement a COVID-19 exposure notification system that protects user privacy.',
  ExtensionFoundation:
    'Create executable bundles to extend the functionality of other apps.',
  ExtensionKit:
    'Make custom UI from an app extension available in a host app, and manage the list of enabled and disabled app extensions.',
  ExternalAccessory:
    'Communicate with accessories that connect to a device with the Apple Lightning connector, or with Bluetooth wireless technology.',
  FamilyControls: 'Authorize your app to provide parental controls on a device.',
  FileProvider:
    'An extension other apps use to access files and folders managed by your app and synced with a remote storage.',
  FileProviderUI: 'Add actions to the document browser\u2019s context menu.',
  FinanceKit:
    'Access financial data and interact with Apple Card, Apple Cash, and orders in Wallet.',
  FinanceKitUI: 'Add orders to Apple Wallet.',
  Foundation:
    'Access essential data types, collections, and operating-system services to define the base layer of functionality for your app.',
  FoundationModels:
    'Perform tasks with models that specialize in language understanding, structured output, and tool calling.',
  GLKit:
    'Speed up OpenGL ES or OpenGL app development. Use math libraries, background texture loading, pre-created shader effects, and a standard view and view controller to implement your rendering loop.',
  GSS: 'Conduct secure, authenticated network transactions.',
  GameController: 'Support hardware game controllers in your game.',
  GameKit:
    'Enable players to interact with friends, compare leaderboard ranks, earn achievements, and participate in multiplayer games.',
  GameSave: 'Store and sync your application\u2019s save files in iCloud.',
  GameplayKit:
    'Architect and organize your game logic.\u00a0Incorporate common gameplay behaviors such as random number generation, artificial intelligence, pathfinding, and agent behavior.',
  GeoToolbox: 'Determine place descriptor information for map coordinates.',
  GroupActivities:
    'Create app-specific activities your users can share and experience together.',
  HealthKit:
    'Access and share health and fitness data while maintaining the user\u2019s privacy and control.',
  HomeKit: 'Configure, control, and communicate with home automation accessories.',
  IOSurface:
    'Share hardware-accelerated buffer data (framebuffers and textures) across multiple processes. Manage image memory more efficiently.',
  IdentityDocumentServices: 'Share mobile documents using the Digital Credentials API.',
  IdentityDocumentServicesUI:
    'Provide an interface so people can present mobile documents.',
  IdentityLookup:
    'Create app extensions to manage and report unwanted SMS messages and spam calls.',
  ImageCaptureCore:
    'Browse for media devices and control them programmatically from your app.',
  ImageIO: 'Read and write most image file formats, and access an image\u2019s metadata.',
  ImagePlayground:
    'Present a system interface to generate images based on descriptive information.',
  ImmersiveMediaSupport: 'Read and write essential Apple Immersive Video metadata.',
  JavaScriptCore:
    'Evaluate JavaScript programs from within an app, and support JavaScript scripting of your app.',
  LinkPresentation: 'Fetch, provide, and present rich links in your app.',
  LiveCommunicationKit:
    'Initiate and handle VoIP and cellular conversations, coordinate them with other communication apps and the system, and get ready to be a default calling or dialer app.',
  LocalAuthentication:
    'Authenticate users biometrically or with a passphrase they already know.',
  LocalAuthenticationEmbeddedUI:
    'Present a standard local authentication view icon in a custom authentication view.',
  LockedCameraCapture:
    'Capture content with your app\u2019s camera experience when the device is locked.',
  ManagedApp:
    'Customize your app for managed deployments by providing configurable features that rely on secure access to secrets and data that an administrator provisions.',
  ManagedAppDistribution: 'Manage the distribution of apps within an organization.',
  ManagedSettings:
    'Access and change settings with your app while maintaining user privacy and control.',
  ManagedSettingsUI: 'Define and configure the appearance of shielding views.',
  MapKit:
    'Display map or satellite imagery within your app, call out points of interest, and determine placemark information for map coordinates.',
  MarketplaceKit:
    'Create an alternative app marketplace, distribute your app on an alternative app marketplace, or distribute your app from your website.',
  Matter:
    'Communicate with and control smart home devices from a variety of manufacturers.',
  MatterSupport: 'Coordinate and control compatible smart home accessories.',
  MediaAccessibility:
    'Make your app\u2019s media more accessible by supporting people\u2019s systemwide preferences for video and audio content.',
  MediaIntelligence:
    'Analyze video content and group faces in images using on-device machine learning.',
  MediaIntents: 'Enable people to use Siri to find and play media from your app.',
  MediaPlayer:
    'Find and play songs, audio podcasts, audio books, and more from within your app.',
  MediaToolbox:
    'Enable support for media format readers; tap and process audio from an audio mix.',
  MessageUI:
    'Create a user interface for composing email and text messages, so users can edit and send messages without leaving your app.',
  Messages:
    'Create app extensions that allow users to send text, stickers, media files, and interactive messages.',
  Metal:
    'Render advanced 3D graphics and compute data in parallel with graphics processors.',
  MetalKit: 'Build Metal apps quicker and easier using a common set of utility classes.',
  MetalPerformanceShaders:
    'Optimize graphics and compute performance with kernels that are fine-tuned for the unique characteristics of each Metal GPU family.',
  MetalPerformanceShadersGraph:
    'Build, compile, and execute compute graphs utilizing all the different compute devices on the platform, including GPU, CPU, and Neural Engine.',
  MetricKit:
    'Measure your app\u2019s performance using daily metric and diagnostic reports from real users.',
  ModelIO:
    'Import, export, and manipulate 3D models using a common infrastructure that integrates MetalKit, GLKit, and SceneKit.',
  MultipeerConnectivity:
    'Support peer-to-peer connectivity and the discovery of nearby devices.',
  MusicKit: 'Integrate your app with Apple Music.',
  MusicUnderstanding: 'Analyze audio content and extract music information.',
  NaturalLanguage:
    'Analyze natural language text and deduce its language-specific metadata.',
  NearbyInteraction:
    'Locate and interact with nearby devices using identifiers, distance, and direction.',
  Network:
    'Create network connections to send and receive data using transport and security protocols.',
  NetworkExtension: 'Customize and extend core networking features.',
  NotificationCenter: 'Create and manage widgets for the Today view.',
  NowPlaying:
    'Make your app\u2019s media playback controls available on the Lock Screen, Control Center, and connected accessories.',
  OSLog: 'A unified logging system for the reading of historical data.',
  Observation:
    'Make responsive apps that update the presentation when underlying data changes.',
  OpenGLES:
    'Create 3D and 2D graphics effects with this compact, efficient subset of OpenGL.',
  PDFKit: 'Display and manipulate PDF documents in your apps.',
  PHASE:
    'Create dynamic audio experiences in your game or app that react to events and cues in the environment.',
  PaperKit: 'Add drawings, shapes, and a consistent markup experience to your app.',
  PassKit:
    'Process Apple Pay payments in your app, and create and distribute passes for the Wallet app.',
  PencilKit:
    'Capture touch and Apple Pencil input as a drawing, and display that content from your app.',
  PermissionKit:
    'Create communication experiences between a child and their parent or guardian.',
  ProximityReader:
    'Read contactless physical and digital wallet cards using your iPhone.',
  PushKit:
    'Respond to push notifications related to your app\u2019s complications, file providers, and VoIP services.',
  PushToTalk:
    'Display the system user interface for your app\u2019s Push to Talk services.',
  QuartzCore: 'Render, compose, and animate visual elements.',
  QuickLook:
    'Create previews of files to use inside your app, or perform simple edits on previews.',
  QuickLookThumbnailing:
    'Generate thumbnails for common file types and add a Thumbnail Extension to your app to enable others to create thumbnails of your custom files.',
  RealityKit: 'Simulate and render 3D content for use in your augmented reality apps.',
  RegexBuilder:
    'Use an expressive domain-specific language to build regular expressions, for operations like searching and replacing in text.',
  RelevanceKit:
    'Provide on-device intelligence with contextual clues that increase your widget\u2019s visibility on Apple Watch.',
  ReplayKit:
    'Record or stream video from the screen, and audio from the app and microphone.',
  RoomPlan:
    'Create a 3D model of a room by interactively guiding people to scan their physical environment using a device\u2019s camera.',
  SafariServices: 'Enable web views and services in your app.',
  SafetyKit: 'Detect and respond to car crash events in your app.',
  SceneKit:
    'Create 3D games and add 3D content to apps using high-level scene descriptions, and easily add animations, physics simulation, particle effects, and realistic physically based rendering.',
  ScreenTime:
    'Share and manage web-usage data, and observe changes made by a parent or guardian.',
  SecureElementCredential:
    'Allow access to credentials inside the Secure Element on device.',
  Security: 'Secure the data your app manages, and control access to your app.',
  SensitiveContentAnalysis:
    'Provide a safer experience in your app by detecting and alerting people to sensitive content in images and videos before displaying them.',
  SensorKit:
    'Retrieve data and derived metrics from sensors on an iPhone, or paired Apple Watch.',
  ServicesAccountLinking: 'Link reseller accounts with Apple Media & Purchases accounts.',
  SharedWithYou: 'Surface shared content and collaborate in your app.',
  ShazamKit:
    'Find information about a specific audio recording when a segment of it\u2019s part of captured sound in the Shazam catalog or your custom catalog.',
  Social:
    'Post content to supported social networking services, using standard system interfaces.',
  SoundAnalysis: 'Classify various sounds by analyzing audio files or streams.',
  Spatial: 'Create and manipulate 3D mathematical primitives.',
  Speech:
    'Perform speech recognition on live or prerecorded audio, and receive transcriptions, alternative interpretations, and confidence levels of the results.',
  SpriteKit:
    'Add high-performance 2D content with smooth animations to your app, or create a game with a high-level set of 2D game-based tools.',
  StateReporting:
    'Communicate your app\u2019s state to the system to improve diagnostic actionability.',
  StoreKit: 'Support Apple In-App Purchases and interactions with the App Store.',
  SuggestedActions:
    'Offer quick actions next to messages in your messaging app, based on context you provide.',
  SwiftData:
    'Write your model code declaratively to add managed persistence and efficient model fetching.',
  SwiftUI: 'Declare the user interface and behavior for your app on every platform.',
  Symbols: 'Apply universal animations to symbol-based images.',
  Synchronization:
    'Build synchronization constructs using low-level, primitive operations.',
  System: 'Perform low-level file operations using type-safe APIs.',
  SystemConfiguration:
    'Allow applications to access a device\u2019s network configuration settings. Determine the reachability of the device, such as whether Wi-Fi or cell connectivity are active.',
  SystemExtensions:
    'Install and manage user space code that extends the capabilities of macOS.',
  TabularData:
    'Import, organize, and prepare a table of data to train a machine learning model.',
  TelephonyMessagingKit:
    'Send and receive standards-based messages over cellular networks.',
  TipKit: 'Display tips that help people discover features in your app.',
  TouchController: 'Integrate onscreen touch controls into your Metal-based games.',
  Translation: 'Translate text in your app from one language to another.',
  TranslationUIProvider: 'Provide UI for translations of text people select.',
  TrustInsights:
    'Evaluate transactions for potential coercive activity while preserving people\u2019s privacy.',
  UIKit:
    'Construct and manage a graphical, event-driven user interface for your iOS, iPadOS, or tvOS app.',
  USDKit:
    'Author, compose, and manipulate Universal Scene Description content from Swift.',
  UniformTypeIdentifiers:
    'Provide uniform type identifiers that describe file types for storage or transfer.',
  UserNotifications:
    'Push user-facing notifications to the user\u2019s device from a server, or generate them locally from your app.',
  UserNotificationsUI:
    'Customize the interface that displays local and remote notifications.',
  VideoSubscriberAccount: 'Support TV provider and Apple TV app functionality.',
  VideoToolbox:
    'Work directly with hardware-accelerated video encoding and decoding capabilities.',
  Vision:
    'Analyze image and video content in your app using computer vision algorithms for object detection, text recognition, and image segmentation.',
  VisionKit:
    'Identify and extract information in the environment using the device\u2019s camera, or in images that your app displays.',
  WatchConnectivity:
    'Implement two-way communication between an iOS app and its paired watchOS app.',
  WeatherKit: 'Deliver weather conditions and alerts to your users.',
  WebKit:
    'Integrate web content seamlessly into your app, and customize content interactions to meet your app\u2019s needs.',
  WiFiAware: 'Securely pair and connect to external devices over peer-to-peer Wi-Fi.',
  WidgetKit:
    'Extend the reach of your app by creating widgets, watch complications, Live Activities, and controls.',
  WorkoutKit: 'Create, preview, and sync workout compositions to the Workout app.',
  iAd: 'The Apple Search Ads iAd Attribution API is a legacy framework for attributing app data that originates from Apple Search Ads campaigns on iOS devices.',
}
