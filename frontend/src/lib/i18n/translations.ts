export type SupportedLanguage = 'en' | 'bn';

export interface Translations {
  // Brand & Meta
  brandName: string;
  tagline: string;
  online: string;
  offline: string;

  // Intro
  welcome: string;
  welcomeSub: string;

  // States
  listening: string;
  processing: string;
  responding: string;
  idle: string;
  activating: string;

  // Mic & Action Area
  tapToSpeak: string;
  listeningState: string;
  speakingState: string;
  activatingState: string;

  // Status Cards
  listeningCardTitleListening: string;
  listeningCardTitleDefault: string;
  cardActivating: string;
  cardListening: string;
  cardProcessing: string;
  cardResponding: string;
  cardIdle: string;

  // System status
  systemStatus: string;
  microphone: string;
  internet: string;
  language: string;
  langValue: string;
  connected: string;
  disconnected: string;
  active: string;
  inactive: string;
  denied: string;
  ready: string;

  // Conversation
  conversationTitle: string;
  showConversation: string;
  hideConversation: string;
  showChat: string;
  hideChat: string;
  noMessages: string;
  noMessagesSub: string;

  // Settings
  settings: string;
  settingsDesc: string;
  languageSection: string;
  interfaceLanguage: string;
  interfaceLanguageDesc: string;
  selectLangPrompt: string;
  back: string;
  backToSettings: string;
  done: string;
  defaultBadge: string;
  bdBadge: string;
  englishTag: string;
  banglaTag: string;
  englishDesc: string;
  banglaDesc: string;
  voiceSection: string;
  voiceLanguage: string;
  volume: string;
  speed: string;
  pitch: string;
  wakeTriggerSection: string;
  activationMethod: string;
  shortcutOption: string;
  clapOption: string;
  saveButton: string;
  savingButton: string;
  savedButton: string;
  englishOption: string;
  banglaOption: string;

  // History
  historyTitle: string;
  historyDesc: string;
  searchPlaceholder: string;
  sessions: string;
  noConversations: string;
  noConversationsSub: string;
  startTalking: string;
  noSearchResults: string;
  authError: string;

  // Auth / Login
  welcomeBack: string;
  createAccount: string;
  signInSub: string;
  registerSub: string;
  signIn: string;
  register: string;
  email: string;
  password: string;
  showPassword: string;
  hidePassword: string;
  authFailed: string;

  // Diagnostics
  liveDiagnostics: string;
  systemDiagnostics: string;
  testDoubleClap: string;
  clapDetector: string;
  firstClap: string;
  secondClap: string;
  doubleClap: string;
  assistantWindow: string;
  tts: string;
  speechRecognition: string;
  aiRequest: string;
  conversation: string;

  // Phrases & Conversation Flow
  welcomePhrase1: string;
  welcomePhrase2: string;
  farewellMessage: string;
  defaultAiError: string;
  defaultAiFallback: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    // Brand & Meta
    brandName: 'AI Assistant',
    tagline: 'Voice Assistant • Always Ready',
    online: 'Online',
    offline: 'Offline',

    // Intro
    welcome: 'How can I help you?',
    welcomeSub: 'Double-clap or tap the microphone to talk',

    // States
    listening: 'Listening',
    processing: 'Processing',
    responding: 'Responding',
    idle: 'Idle',
    activating: 'Activating',

    // Mic & Action Area
    tapToSpeak: 'Tap to speak',
    listeningState: 'Listening...',
    speakingState: 'Assistant is speaking...',
    activatingState: 'Activating...',

    // Status Cards
    listeningCardTitleListening: 'Listening to your voice...',
    listeningCardTitleDefault: 'Voice Assistant',
    cardActivating: 'Double-clap detected! Waking up...',
    cardListening: 'Listening to your voice... Speak now.',
    cardProcessing: 'Understanding your request and generating response...',
    cardResponding: 'Assistant is speaking (speak anytime to interrupt)...',
    cardIdle: 'Double-clap or tap the microphone to speak.',

    // System status
    systemStatus: 'System Status',
    microphone: 'Microphone',
    internet: 'Internet',
    language: 'Language',
    langValue: 'English (US)',
    connected: 'Connected',
    disconnected: 'Disconnected',
    active: 'Active',
    inactive: 'Inactive',
    denied: 'Denied',
    ready: 'Ready',

    // Conversation
    conversationTitle: 'Conversation',
    showConversation: 'Show Conversation',
    hideConversation: 'Hide Conversation',
    showChat: 'Show Chat',
    hideChat: 'Hide Chat',
    noMessages: 'No messages yet',
    noMessagesSub: 'Start talking to see your conversation here',

    // Settings
    settings: 'Settings',
    settingsDesc: 'Assistant conversation & voice',
    languageSection: 'Language & Region',
    interfaceLanguage: 'Language',
    interfaceLanguageDesc: 'Choose your preferred language for the UI and AI voice interactions.',
    selectLangPrompt: 'Select assistant conversation & voice language:',
    back: 'Back',
    backToSettings: 'Back to Settings',
    done: 'Done',
    defaultBadge: 'Default',
    bdBadge: 'Bangladesh',
    englishTag: 'Default • AI conversation & voice: en-US',
    banglaTag: 'Bangladesh • AI conversation & voice: bn-BD',
    englishDesc: 'English (US)',
    banglaDesc: 'বাংলা (Bangladeshi Bengali)',
    voiceSection: 'Voice',
    voiceLanguage: 'Voice Output',
    volume: 'Volume',
    speed: 'Speed',
    pitch: 'Pitch',
    wakeTriggerSection: 'Wake Trigger',
    activationMethod: 'Activation Method',
    shortcutOption: 'Keyboard Shortcut (Ctrl + Space)',
    clapOption: 'Two-Clap Trigger (Requires Desktop Host)',
    saveButton: 'Save Settings',
    savingButton: 'Saving...',
    savedButton: 'Saved!',
    englishOption: 'English',
    banglaOption: 'বাংলা',

    // History
    historyTitle: 'History',
    historyDesc: 'Your past voice interactions and executed actions.',
    searchPlaceholder: 'Search conversations…',
    sessions: 'sessions',
    noConversations: 'No conversations yet',
    noConversationsSub: 'Your voice interactions will appear here after you start chatting with the assistant.',
    startTalking: 'Start talking',
    noSearchResults: 'No results for',
    authError: 'Could not load history. Please sign in first.',

    // Auth / Login
    welcomeBack: 'Welcome back',
    createAccount: 'Create account',
    signInSub: 'Sign in to your voice assistant',
    registerSub: 'Get started with AI Assistant',
    signIn: 'Sign In',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    authFailed: 'Authentication failed. Check your credentials.',

    // Diagnostics
    liveDiagnostics: 'Live Diagnostics',
    systemDiagnostics: 'System Diagnostics',
    testDoubleClap: '⚡ Test Double-Clap',
    clapDetector: 'Clap Detector',
    firstClap: 'First Clap',
    secondClap: 'Second Clap',
    doubleClap: 'Double Clap',
    assistantWindow: 'Assistant Window',
    tts: 'TTS',
    speechRecognition: 'Speech Recognition',
    aiRequest: 'AI Request',
    conversation: 'Conversation',

    // Phrases & Conversation Flow
    welcomePhrase1: "Welcome. I'm ready.",
    welcomePhrase2: 'How can I help you?',
    farewellMessage: 'Goodbye! Feel free to double-clap or tap the mic whenever you need me.',
    defaultAiError: 'Sorry, I had trouble processing that. Please try again.',
    defaultAiFallback: 'I am here to help you.',
  },

  bn: {
    // Brand & Meta
    brandName: 'এআই অ্যাসিস্ট্যান্ট',
    tagline: 'ভয়েস অ্যাসিস্ট্যান্ট • সর্বদা প্রস্তুত',
    online: 'অনলাইন',
    offline: 'অফলাইন',

    // Intro
    welcome: 'আমি কীভাবে সাহায্য করতে পারি?',
    welcomeSub: 'দুইটা তালি দিন অথবা মাইক্রোফোনে ট্যাপ করে কথা বলুন',

    // States
    listening: 'শুনছি',
    processing: 'প্রক্রিয়াকরণ হচ্ছে',
    responding: 'উত্তর দিচ্ছি',
    idle: 'অপেক্ষমাণ',
    activating: 'চালু হচ্ছে',

    // Mic & Action Area
    tapToSpeak: 'কথা বলতে ট্যাপ করুন',
    listeningState: 'শুনছি...',
    speakingState: 'অ্যাসিস্ট্যান্ট কথা বলছে...',
    activatingState: 'চালু হচ্ছে...',

    // Status Cards
    listeningCardTitleListening: 'আপনার কথা শুনছি...',
    listeningCardTitleDefault: 'ভয়েস অ্যাসিস্ট্যান্ট',
    cardActivating: 'দুইটা তালি শনাক্ত হয়েছে! অ্যাসিস্ট্যান্ট চালু হচ্ছে...',
    cardListening: 'আপনার কথা শুনছি... বাংলায় কথা বলুন।',
    cardProcessing: 'আপনার কথা বুঝে উত্তর তৈরি করছি...',
    cardResponding: 'অ্যাসিস্ট্যান্ট কথা বলছে (কথা বললে থেমে যাবে)...',
    cardIdle: 'দুইটা তালি দিন অথবা মাইক্রোফোনে ট্যাপ করে কথা বলুন।',

    // System status
    systemStatus: 'সিস্টেম স্ট্যাটাস',
    microphone: 'মাইক্রোফোন',
    internet: 'ইন্টারনেট',
    language: 'ভাষা',
    langValue: 'বাংলা (বাংলাদেশ)',
    connected: 'সংযুক্ত',
    disconnected: 'বিচ্ছিন্ন',
    active: 'সক্রিয়',
    inactive: 'নিষ্ক্রিয়',
    denied: 'অনুমতি নেই',
    ready: 'প্রস্তুত',

    // Conversation
    conversationTitle: 'কথোপকথন',
    showConversation: 'কথোপকথন দেখুন',
    hideConversation: 'কথোপকথন লুকান',
    showChat: 'চ্যাট দেখুন',
    hideChat: 'চ্যাট লুকান',
    noMessages: 'এখনও কোনো বার্তা নেই',
    noMessagesSub: 'কথা বলতে শুরু করলে কথোপকথন এখানে দেখা যাবে',

    // Settings
    settings: 'সেটিংস',
    settingsDesc: 'অ্যাসিস্ট্যান্টের কথোপকথন ও কণ্ঠের ভাষা',
    languageSection: 'ভাষা ও অঞ্চল',
    interfaceLanguage: 'ভাষা',
    interfaceLanguageDesc: 'ইউজার ইন্টারফেস ও এআই ভয়েস কথোপকথনের জন্য ভাষা নির্বাচন করুন।',
    selectLangPrompt: 'অ্যাসিস্ট্যান্টের কথোপকথন ও ভয়েস আউটপুটের ভাষা নির্বাচন করুন:',
    back: 'পেছনে',
    backToSettings: 'সেটিংসে ফিরুন',
    done: 'সম্পন্ন',
    defaultBadge: 'ডিফল্ট',
    bdBadge: 'বাংলাদেশ',
    englishTag: 'ডিফল্ট • এআই কথোপকথন ও কণ্ঠ: en-US',
    banglaTag: 'বাংলাদেশ • এআই কথোপকথন ও কণ্ঠ: bn-BD',
    englishDesc: 'English (US)',
    banglaDesc: 'বাংলা (বাংলাদেশি বাংলা)',
    voiceSection: 'ভয়েস',
    voiceLanguage: 'ভয়েস আউটপুট',
    volume: 'ভলিউম',
    speed: 'গতি',
    pitch: 'পিচ',
    wakeTriggerSection: 'ওয়েক ট্রিগার',
    activationMethod: 'অ্যাক্টিভেশন পদ্ধতি',
    shortcutOption: 'কীবোর্ড শর্টকাট (Ctrl + Space)',
    clapOption: 'দুই-তালি ট্রিগার (ডেস্কটপ হোস্ট আবশ্যক)',
    saveButton: 'সেটিংস সংরক্ষণ করুন',
    savingButton: 'সংরক্ষণ হচ্ছে...',
    savedButton: 'সংরক্ষিত হয়েছে!',
    englishOption: 'English',
    banglaOption: 'বাংলা',

    // History
    historyTitle: 'ইতিহাস',
    historyDesc: 'আপনার পূর্ববর্তী ভয়েস কথোপকথন এবং সম্পাদিত নির্দেশনাসমূহ।',
    searchPlaceholder: 'কথোপকথন খুঁজুন…',
    sessions: 'সেশন',
    noConversations: 'এখনও কোনো কথোপকথন নেই',
    noConversationsSub: 'অ্যাসিস্ট্যান্টের সাথে কথা বলার পর আপনার পূর্বের আলাপচারিতা এখানে দেখতে পাবেন।',
    startTalking: 'কথা বলা শুরু করুন',
    noSearchResults: 'এর জন্য কোনো ফলাফল পাওয়া যায়নি',
    authError: 'ইতিহাস লোড করা যায়নি। অনুগ্রহ করে আগে লগইন করুন।',

    // Auth / Login
    welcomeBack: 'স্বাগতম',
    createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    signInSub: 'আপনার ভয়েস অ্যাসিস্ট্যান্টে সাইন ইন করুন',
    registerSub: 'এআই অ্যাসিস্ট্যান্ট শুরু করুন',
    signIn: 'সাইন ইন',
    register: 'নিবন্ধন',
    email: 'ইমেইল',
    password: 'পাসওয়ার্ড',
    showPassword: 'পাসওয়ার্ড দেখুন',
    hidePassword: 'পাসওয়ার্ড লুকান',
    authFailed: 'লগইন ব্যর্থ হয়েছে। তথ্য যাচাই করুন।',

    // Diagnostics
    liveDiagnostics: 'লাইভ ডায়াগনস্টিকস',
    systemDiagnostics: 'সিস্টেম ডায়াগনস্টিকস',
    testDoubleClap: '⚡ দুই-তালি পরীক্ষা',
    clapDetector: 'তালি শনাক্তকারী',
    firstClap: 'প্রথম তালি',
    secondClap: 'দ্বিতীয় তালি',
    doubleClap: 'ডাবল তালি',
    assistantWindow: 'অ্যাসিস্ট্যান্ট উইন্ডো',
    tts: 'টিটিএস (ভয়েস)',
    speechRecognition: 'কথা শনাক্তকরণ (STT)',
    aiRequest: 'এআই অনুরোধ',
    conversation: 'কথোপকথন',

    // Phrases & Conversation Flow
    welcomePhrase1: 'স্বাগতম! আমি প্রস্তুত আছি।',
    welcomePhrase2: 'কীভাবে সাহায্য করতে পারি?',
    farewellMessage: 'খোদা হাফেজ! প্রয়োজনে আমাকে আবার দুইটা তালি দিয়ে ডাকবেন।',
    defaultAiError: 'দুঃখিত, এই মুহূর্তে উত্তর দিতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার বলুন।',
    defaultAiFallback: 'আমি আপনাকে সাহায্য করতে প্রস্তুত আছি।',
  },
};
