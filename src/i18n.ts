// Multilingual copy for KasiKash. English (en), isiZulu (zu), Sesotho (st).
export type Lang = "en" | "zu" | "st";

export const LANGS: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English", native: "English", flag: "EN" },
  { code: "zu", label: "isiZulu", native: "isiZulu", flag: "ZU" },
  { code: "st", label: "Sesotho", native: "Sesotho", flag: "ST" },
];

export const t = {
  // Brand
  brand: { en: "KasiKash", zu: "KasiKash", st: "KasiKash" },
  tagline: {
    en: "Kasi hustle, upgraded.",
    zu: "Ibhizinisi lakho, likhulisiwe.",
    st: "Kgwebo ea hao, e ntlafalitsoe.",
  },

  // Home
  greeting: { en: "Sawubona,", zu: "Sawubona,", st: "Dumela," },
  todayEarnings: {
    en: "Today's takings",
    zu: "Imali yanamuhla",
    st: "Chelete ea kajeno",
  },
  profit: { en: "Profit", zu: "Inzuzo", st: "Phaello" },
  owed: { en: "Owed to you", zu: "Okukweletwayo", st: "Se u kolotoang" },
  quickActions: {
    en: "Quick actions",
    zu: "Izenzo ezisheshayo",
    st: "Liketso tse potlakileng",
  },
  logSale: {
    en: "Log a sale",
    zu: "Ngena ukudayisa",
    st: "Ngola thekiso",
  },
  addTab: {
    en: "Add a tab",
    zu: "Faka isikweletu",
    st: "Kenya sekoloto",
  },
  seeInsights: {
    en: "See insights",
    zu: "Buka izimpawu",
    st: "Sheba tlhahiso",
  },
  scanReceipt: {
    en: "Scan receipt",
    zu: "Skena irisidi",
    st: "Skena risiti",
  },
  recentSales: {
    en: "Recent sales",
    zu: "Ukudayisa kwakamuva",
    st: "Thekiso ea morao tjena",
  },
  noSales: {
    en: "No sales yet today. Tap the mic to log your first one.",
    zu: "Akukho okudayisiwe namuhla. Cindezela imakrofoni ukungenisa okokuqala.",
    st: "Ha ho na thekiso kajeno. Tobetsa maekrofouno ho ngola ea pele.",
  },
  tryWhatsApp: {
    en: "Try in WhatsApp",
    zu: "Zama ku-WhatsApp",
    st: "Leka ho WhatsApp",
  },

  // Bottom nav
  home: { en: "Home", zu: "Ikhaya", st: "Lehae" },
  sales: { en: "Log", zu: "Ngenisa", st: "Ngola" },
  tabs: { en: "Skoroskoro", zu: "Isikweletu", st: "Sekoloto" },
  stokvelNav: { en: "Stokvel", zu: "Stokvel", st: "Stokvel" },
  insights: { en: "Insights", zu: "Izimpawu", st: "Tlhahiso" },

  // Voice
  micTapToSpeak: {
    en: "Tap to speak — say what you sold",
    zu: "Cindezela ukhulume — sho okudayisile",
    st: "Tobetsa u bue — bolela seo u se rekisitseng",
  },
  listening: { en: "Listening...", zu: "Ngiyalalela...", st: "Ke a mamela..." },
  heard: { en: "I heard", zu: "Ngizwile", st: "Ke utloile" },
  confirm: { en: "Confirm sale", zu: "Qinisekisa", st: "Tiisa" },
  retry: { en: "Try again", zu: "Zama futhi", st: "Leka hape" },
  manualEntry: {
    en: "Or type it manually",
    zu: "Noma bhala ngesandla",
    st: "Kapa ngola ka letsoho",
  },
  item: { en: "Item", zu: "Into", st: "Ntho" },
  qty: { en: "Qty", zu: "Inani", st: "Palo" },
  price: { en: "Price (R)", zu: "Intengo (R)", st: "Theko (R)" },
  save: { en: "Save", zu: "Londoloza", st: "Boloka" },

  // Receipt scan
  scanTitle: { en: "Scan a receipt", zu: "Skena irisidi", st: "Skena risiti" },
  scanSubtitle: {
    en: "Photograph a supplier receipt — we'll extract items automatically.",
    zu: "Thatha isithombe serisidi — sizokhipha izinto ngokuzenzakalelayo.",
    st: "Nka setshoantsho sa risiti — re tla ntsha lintho ka bo eona.",
  },
  choosePhoto: {
    en: "Take photo or choose file",
    zu: "Thatha isithombe noma ukhethe ifayela",
    st: "Nka setshoantsho kapa khetha faele",
  },
  scanning: {
    en: "Reading receipt...",
    zu: "Ngifunda irisidi...",
    st: "Ke bala risiti...",
  },
  extractedItems: {
    en: "Extracted items",
    zu: "Izinto ezikhishiwe",
    st: "Lintho tse ntsitsoeng",
  },
  addAll: {
    en: "Add all to sales",
    zu: "Faka konke ekudayiseni",
    st: "Kenya kaofela thekisong",
  },
  demoReceiptNote: {
    en: "Demo mode — using a sample receipt",
    zu: "Imodi yedemo — sisebenzisa isibonelo",
    st: "Mokhoa oa demo — re sebelisa mohlala",
  },

  // Skoroskoro
  tabsTitle: {
    en: "Skoroskoro — customer tabs",
    zu: "Isikweletu — abangikweletayo",
    st: "Sekoloto — bareki ba nkolotang",
  },
  totalOwed: {
    en: "Total owed to you",
    zu: "Iyonke okukweletwayo",
    st: "Kakaretso e u kolotoang",
  },
  markPaid: { en: "Mark paid", zu: "Uyakhokha", st: "E lefiloe" },
  addCustomer: {
    en: "Add customer + amount",
    zu: "Faka ikhasimende nemali",
    st: "Kenya moreki le chelete",
  },
  customerName: {
    en: "Customer name",
    zu: "Igama lekhasimende",
    st: "Lebitso la moreki",
  },
  amount: { en: "Amount (R)", zu: "Imali (R)", st: "Chelete (R)" },
  paidJust: { en: "paid you", zu: "ukhokhile", st: "o u lefile" },

  // Stokvel
  stokvelTitle: {
    en: "Your Stokvel",
    zu: "Istokvel sakho",
    st: "Stokvel ea hao",
  },
  stokvelSub: {
    en: "Group savings pot",
    zu: "Umgodi wokugcina imali weqembu",
    st: "Sekhelo sa polokelo sa sehlopha",
  },
  stokvelGoal: { en: "Goal", zu: "Umgomo", st: "Sepheo" },
  stokvelSaved: { en: "Saved", zu: "Kugciniwe", st: "Ho bolokiloe" },
  stokvelMembers: { en: "Members", zu: "Amalungu", st: "Litho" },
  contribute: { en: "Contribute", zu: "Nikela", st: "Kenya" },
  recentContributions: {
    en: "Recent contributions",
    zu: "Iminikelo yakamuva",
    st: "Menehelo ea morao tjena",
  },
  quickAdd: {
    en: "Quick add",
    zu: "Faka ngokushesha",
    st: "Kenya kapele",
  },
  goalReached: {
    en: "Goal reached!",
    zu: "Umgomo ufinyeleliwe!",
    st: "Sepheo se fihletsoe!",
  },

  // Insights
  creditScore: { en: "KasiScore", zu: "i-KasiScore", st: "KasiScore" },
  creditSub: {
    en: "Your business's financial passport",
    zu: "Ipasi yezimali yebhizinisi lakho",
    st: "Pasa ea lichelete tsa khoebo ea hao",
  },
  weekProfit: {
    en: "This week's profit",
    zu: "Inzuzo yaleliviki",
    st: "Phaello ea beke ena",
  },
  topSellerLabel: {
    en: "Top seller",
    zu: "Okuthengiswa kakhulu",
    st: "Se rekisoang haholo",
  },
  aiTips: {
    en: "Smart tips for you",
    zu: "Amacebiso ahlakaniphile kuwe",
    st: "Likeletso tse bohlale ho uena",
  },
  aiPoweredBadge: {
    en: "Powered by your data",
    zu: "Ihanjiswa idatha yakho",
    st: "E tsamaisoa ke data ea hao",
  },
  scoreLabelExcellent: {
    en: "Excellent",
    zu: "Kuhle kakhulu",
    st: "Ho hotle haholo",
  },
  scoreLabelGood: { en: "Good", zu: "Kuhle", st: "Ho hotle" },
  scoreLabelFair: { en: "Fair", zu: "Kulungile", st: "Ho lokile" },
  poweredBy: {
    en: "Voice-first. Offline-ready. Kasi-built.",
    zu: "Iqala ngezwi. Isebenza ngaphandle kwe-inthanethi. Yakhelwe ikasi.",
    st: "E qala ka lentsoe. E sebetsa ntle le inthanete. E hahiloe bakeng sa kasi.",
  },
  insightsEmpty: {
    en: "Log a few more sales to unlock personalised tips.",
    zu: "Faka okudayisa okuningi ukuvula amacebiso.",
    st: "Kenya thekiso e meng ho notlolla likeletso.",
  },

  // Sample suggestions
  sampleSuggestion1: {
    en: "Sold 3 bread at R18",
    zu: "Ngithengise izinkwa ezintathu ngo-R18",
    st: "Ke rekisitse bohobe bo bo bararo ka R18",
  },

  // WhatsApp bot
  whatsappTitle: {
    en: "KasiKash on WhatsApp",
    zu: "KasiKash ku-WhatsApp",
    st: "KasiKash ho WhatsApp",
  },
  whatsappSub: {
    en: "No app needed. Just text.",
    zu: "Ayidingi uhlelo. Bhala kuphela.",
    st: "Ha ho hlokahale app. Ngola feela.",
  },
  whatsappSampleBotWelcome: {
    en: "Hi! I'm KasiKash. Just tell me what you sold and I'll keep the books. Try: \"sold 3 bread R18\"",
    zu: "Sawubona! NginguKasiKash. Ngitshele nje ukuthi udayiseni nami ngizogcina izincwadi. Zama: \"sold 3 bread R18\"",
    st: "Dumela! Ke KasiKash. Mpolelle feela seo u se rekisitseng 'me ke tla boloka libuka. Leka: \"sold 3 bread R18\"",
  },
  whatsappSampleUser1: {
    en: "sold 3 bread R18",
    zu: "sold 3 bread R18",
    st: "sold 3 bread R18",
  },
  whatsappSampleBot1: {
    en: "Logged ✅ 3 × Bread @ R18 = R54. Today's takings updated. Type \"score\" for your KasiScore.",
    zu: "Kubhaliwe ✅ 3 × Bread @ R18 = R54. Imali yanamuhla ibuyekeziwe. Bhala \"score\".",
    st: "E ngoliloe ✅ 3 × Bread @ R18 = R54. Chelete ea kajeno e ntlafalitsoe. Ngola \"score\".",
  },
  whatsappSampleUser2: {
    en: "score",
    zu: "score",
    st: "score",
  },
  whatsappSampleBot2: {
    en: "Your KasiScore: 685 🔥 Keep logging to unlock stokvel-backed credit.",
    zu: "I-KasiScore yakho: 685 🔥 Qhubeka ngokungenisa ukuvula isikweletu.",
    st: "KasiScore ea hao: 685 🔥 Tsoela pele u ngole ho notlolla mokitlane.",
  },
  whatsappTypingIndicator: {
    en: "typing...",
    zu: "iyabhala...",
    st: "e ngola...",
  },
  whatsappTypeHere: {
    en: "Type sold X item RY...",
    zu: "Bhala sold X item RY...",
    st: "Ngola sold X item RY...",
  },
  whatsappSendCta: { en: "Send", zu: "Thumela", st: "Romela" },
  whatsappFallbackReply: {
    en: 'Got it. Type "score" for your KasiScore, or say what you sold e.g. "sold 2 airtime R12".',
    zu: 'Kuphelile. Bhala "score" noma sho okudayisile, sib. "sold 2 airtime R12".',
    st: 'Ho lokile. Ngola "score" kapa bolela seo u rekisitseng, mohlala "sold 2 airtime R12".',
  },
  whatsappSaleReply: {
    en: "Logged ✅ {qty} × {item} @ R{price} = R{total}. Today's takings updated.",
    zu: "Kubhaliwe ✅ {qty} × {item} @ R{price} = R{total}. Imali yanamuhla ibuyekeziwe.",
    st: "E ngoliloe ✅ {qty} × {item} @ R{price} = R{total}. Chelete ea kajeno e ntlafalitsoe.",
  },

  // Dynamic insight templates
  insightOldTabs: {
    en: "{count} customers owe you over 7 days — {name} for {days} days. Send a WhatsApp nudge.",
    zu: "Amakhasimende angu-{count} akukweletayo izinsuku ezingu-7 — u-{name} izinsuku ezingu-{days}. Thumela isikhumbuzo se-WhatsApp.",
    st: "Bareki ba {count} ba u kolota matsatsi a fetang 7 — {name} matsatsi a {days}. Romela sehopotso ho WhatsApp.",
  },
  insightHotItem: {
    en: "{item} is flying today — {count} sales in the last 24h. Restock before evening.",
    zu: "I-{item} iyandiza namuhla — ukudayisa okungu-{count} ezinsukwini ezingu-24. Faka isitoko phambi kokuhlwa.",
    st: "{item} e a rekisoa kajeno — thekiso e {count} matsatsing a fetileng a 24. Reka hape pele ho mantsiboea.",
  },
  insightUpToday: {
    en: "You're up {pct}% versus your weekly average. Big day 💪",
    zu: "Ukhuphuke ngo-{pct}% uma uqhathanisa nesilinganiso saleliviki. Usuku olukhulu 💪",
    st: "U phahame ka {pct}% ho feta karolelano ea beke. Letsatsi le leholo 💪",
  },
  insightDownToday: {
    en: "Today is down {pct}% vs your average. Try a WhatsApp broadcast to regulars.",
    zu: "Usuku lwanamuhla lwehle ngo-{pct}% kunesilinganiso. Zama umsakazo we-WhatsApp kumakhasimende.",
    st: "Kajeno o theohile ka {pct}% ho feta karolelano. Leka phatlalatso ea WhatsApp ho bareki.",
  },
  insightSilentDay: {
    en: "No sales logged today. Tap the mic to catch up before customers rush in.",
    zu: "Akukho okudayisiwe okulotshiwe namuhla. Cindezela imakrofoni ngaphambi kokuba amakhasimende afike.",
    st: "Ha ho thekiso e ngotsoeng kajeno. Tobetsa maekrofouno pele bareki ba fihla.",
  },
  insightCreditUnlocked: {
    en: "🎉 Your KasiScore unlocks R{amount} in stokvel-backed credit. Tap Insights to see terms.",
    zu: "🎉 I-KasiScore yakho ivula isikweletu esesilingene R{amount} esisekelwe yistokvel. Cindezela u-Insights.",
    st: "🎉 KasiScore ea hao e notlolla R{amount} ea mokitlane o tšehetsoeng ke stokvel. Tobetsa Insights.",
  },
  insightScoreClimbing: {
    en: "Your KasiScore is climbing — {needed} points to unlock micro-credit.",
    zu: "I-KasiScore yakho iyakhuphuka — amaphuzu angu-{needed} avula umatepe wesikweletu.",
    st: "KasiScore ea hao e phahama — lintlha tse {needed} ho notlolla micro-credit.",
  },
  insightStokvelClose: {
    en: "You're R{remain} away from {name}'s goal. One more strong week gets you there.",
    zu: "Usasele R{remain} ukufinyelela umgomo ka-{name}. Iviki eyodwa enamandla iyokuthola khona.",
    st: "U setse R{remain} ho fihla sepheong sa {name}. Beke e le 'ngoe e matla e tla u fihlisa.",
  },
  insightStokvelStart: {
    en: "{name} is quiet. Contribute R100 this week to keep the momentum.",
    zu: "I-{name} ithule. Nikela R100 kuleli viki ukugcina ukushuka.",
    st: "{name} e khutsitse. Kenya R100 bekeng ena ho boloka lebelo.",
  },
  insightBigOwed: {
    en: "R{owed} is on tabs. Collecting even half — R{half} — boosts your KasiScore.",
    zu: "R{owed} akukweletwe. Ukuqoqa ngisho R{half} nje kuphakamisa i-KasiScore yakho.",
    st: "R{owed} e likolotong. Ho bokella le R{half} feela ho phahamisa KasiScore ea hao.",
  },

  // -------------------------------------------------------------------------
  // Onboarding
  // -------------------------------------------------------------------------
  onbChooseLang: {
    en: "Choose your language",
    zu: "Khetha ulimi lwakho",
    st: "Khetha puo ea hao",
  },
  onbStepOf: {
    en: "Step {step} of {total}",
    zu: "Isinyathelo {step} sika-{total}",
    st: "Mohato {step} oa {total}",
  },
  onbNameTitle: {
    en: "What should we call you?",
    zu: "Kufanele sikubize ngani?",
    st: "Re u bitse mang?",
  },
  onbNameSubtitle: {
    en: "This is the name that appears on your dashboard.",
    zu: "Leli igama elivela kudashibhodi yakho.",
    st: "Lena ke lebitso le hlahang letlapeng la hao.",
  },
  onbNamePlaceholder: {
    en: "e.g. Nomsa",
    zu: "isb. Nomsa",
    st: "mohlala Nomsa",
  },
  onbBusinessTitle: {
    en: "Tell us about your business",
    zu: "Sitshele ngebhizinisi lakho",
    st: "Re bolelle ka khoebo ea hao",
  },
  onbBusinessSubtitle: {
    en: "So we can tailor your dashboard.",
    zu: "Ukuze sikwazi ukuhlela idashibhodi yakho.",
    st: "Hore re kgone ho lokisa letlapa la hao.",
  },
  onbBusinessNameLabel: {
    en: "Business name",
    zu: "Igama lebhizinisi",
    st: "Lebitso la khoebo",
  },
  onbBusinessNamePlaceholder: {
    en: "e.g. Nomsa's Spaza",
    zu: "isb. Nomsa's Spaza",
    st: "mohlala Nomsa's Spaza",
  },
  onbBusinessTypeLabel: {
    en: "Type of business",
    zu: "Uhlobo lwebhizinisi",
    st: "Mofuta oa khoebo",
  },
  onbStokvelTitle: {
    en: "Set up your stokvel",
    zu: "Setha istokvel sakho",
    st: "Beha stokvel ea hao",
  },
  onbStokvelSubtitle: {
    en: "You can change this any time from Settings.",
    zu: "Ungakushintsha noma kunini kuma-Settings.",
    st: "U ka fetola sena neng kapa neng ho Settings.",
  },
  onbStokvelSkip: {
    en: "I don't have a stokvel yet",
    zu: "Anginayo istokvel okwamanje",
    st: "Ha ke e-so be le stokvel",
  },
  onbStokvelNameLabel: {
    en: "Stokvel name",
    zu: "Igama lestokvel",
    st: "Lebitso la stokvel",
  },
  onbStokvelNamePlaceholder: {
    en: "e.g. Ma-Nomsa Stokvel",
    zu: "isb. Ma-Nomsa Stokvel",
    st: "mohlala Ma-Nomsa Stokvel",
  },
  onbStokvelGoalLabel: {
    en: "Savings goal (R)",
    zu: "Umgomo wokonga (R)",
    st: "Sepheo sa polokelo (R)",
  },
  onbStokvelMembersLabel: {
    en: "Members in the group",
    zu: "Amalungu eqenjini",
    st: "Litho tse ka har'a sehlopha",
  },
  onbBack: { en: "Back", zu: "Emuva", st: "Morao" },
  onbNext: { en: "Next", zu: "Ngaphambili", st: "Latela" },
  onbFinish: { en: "Finish", zu: "Qeda", st: "Qetela" },
  onbSkip: { en: "Skip for now", zu: "Kweqe okwamanje", st: "Tlōla hona joale" },
  onbGetStarted: {
    en: "Get started",
    zu: "Qala manje",
    st: "Qala hona joale",
  },
  onbYouAreSet: {
    en: "You're all set, {name}!",
    zu: "Konke kulungile, {name}!",
    st: "Ho lokile, {name}!",
  },

  // Business types
  bizSpaza: { en: "Spaza shop", zu: "Isitolo sasekasi", st: "Lebenkele la kasi" },
  bizSalon: { en: "Salon / barber", zu: "Isaluni / umgundi", st: "Salone / mokuti" },
  bizTaxi: { en: "Taxi operator", zu: "Umqhubi wetekisi", st: "Mokhanni oa terene" },
  bizTailor: { en: "Tailor / dressmaker", zu: "Umthungi", st: "Mothokoli" },
  bizFood: {
    en: "Food / kota / kitchen",
    zu: "Ukudla / ikota / ikhishi",
    st: "Lijo / kota / kichine",
  },
  bizOther: { en: "Other", zu: "Okunye", st: "Tse ling" },

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  settingsTitle: { en: "Settings", zu: "Amasethingi", st: "Litlhophiso" },

  sectionProfile: { en: "You", zu: "Wena", st: "Uena" },
  sectionBusiness: {
    en: "Your business",
    zu: "Ibhizinisi lakho",
    st: "Khoebo ea hao",
  },
  sectionStokvel: {
    en: "Your stokvel",
    zu: "Istokvel sakho",
    st: "Stokvel ea hao",
  },
  sectionData: { en: "Data", zu: "Idatha", st: "Data" },
  sectionAccount: { en: "Account", zu: "I-akhawunti", st: "Akhaonto" },

  settingsOwnerLabel: {
    en: "Your name",
    zu: "Igama lakho",
    st: "Lebitso la hao",
  },
  settingsLanguageLabel: { en: "Language", zu: "Ulimi", st: "Puo" },
  settingsEdit: { en: "Edit", zu: "Hlela", st: "Lokisa" },
  settingsCancel: { en: "Cancel", zu: "Khansela", st: "Hlakola" },
  settingsSaved: { en: "Saved ✓", zu: "Kugcinwe ✓", st: "E bolokiloe ✓" },

  loadSampleDataTitle: {
    en: "Load sample data",
    zu: "Layisha idatha yesibonelo",
    st: "Kenya data ea mohlala",
  },
  loadSampleDataDesc: {
    en: "Adds a week of demo sales, tabs, and stokvel contributions — useful for recording videos or exploring the app.",
    zu: "Yengeza iviki yokudayisa kwedemo, izikweletu, neminikelo yestokvel.",
    st: "E kenya beke ea thekiso ea mohlala, likoloto, le menehelo ea stokvel.",
  },
  loadSampleDataCta: {
    en: "Load sample data",
    zu: "Layisha idatha",
    st: "Kenya data",
  },
  loadedSample: {
    en: "Sample data loaded ✓",
    zu: "Idatha yesibonelo ilayishiwe ✓",
    st: "Data ea mohlala e kentsoe ✓",
  },

  accountAnonymous: {
    en: "Anonymous session",
    zu: "Iseshini engaziwa",
    st: "Kopano e sa tsejoeng",
  },
  accountAnonymousDesc: {
    en: "Your data is saved to this device only. Add an email below to save it and access it from any phone.",
    zu: "Idatha yakho igciniwe kule divayisi kuphela. Faka i-imeyili ukuze uyigcine futhi uyifinyelele kunoma iyiphi ifoni.",
    st: "Data ea hao e bolokiloe khonopheng ena feela. Kenya email ka tlase ho e boloka le ho e fumana mohaleng ofe kapa ofe.",
  },

  // Email magic-link auth
  authSignedInAs: {
    en: "Signed in as",
    zu: "Ungene njengo",
    st: "U kentse joalo ka",
  },
  authSignedInDesc: {
    en: "Your data is safe. You can sign in from any device with this email.",
    zu: "Idatha yakho iphephile. Ungangena kunoma iyiphi idivayisi nge-imeyili.",
    st: "Data ea hao e bolokehile. U ka kena ho tsoa khonopheng efe kapa efe ka email ena.",
  },
  authSignOut: { en: "Sign out", zu: "Phuma", st: "Tsoa" },

  authEmailLabel: { en: "Email", zu: "I-imeyili", st: "Email" },
  authEmailPlaceholder: {
    en: "you@example.com",
    zu: "wena@isibonelo.com",
    st: "uena@mohlala.com",
  },

  authSaveDataCta: {
    en: "Send verification link",
    zu: "Thumela isixhumanisi sokuqinisekisa",
    st: "Romela sehokelo sa netefatso",
  },
  authAlreadyHaveAccount: {
    en: "Already have an account? Sign in",
    zu: "Usenayo i-akhawunti? Ngena",
    st: "U se u na le akhaonto? Kena",
  },

  authSignInHeader: {
    en: "Sign in to your account",
    zu: "Ngena ku-akhawunti yakho",
    st: "Kena akhaontong ea hao",
  },
  authSignInDesc: {
    en: "We'll email you a magic link — click it on this device.",
    zu: "Sizokuthumelela isixhumanisi nge-imeyili — sicindezele kule divayisi.",
    st: "Re tla u romella sehokelo ka email — se tobetse khonopheng ena.",
  },
  authSignInCta: {
    en: "Send sign-in link",
    zu: "Thumela isixhumanisi sokungena",
    st: "Romela sehokelo sa ho kena",
  },
  authBackToSave: {
    en: "Back — save this account instead",
    zu: "Emuva — gcina le akhawunti",
    st: "Morao — boloka akhaonto ena",
  },

  authPendingVerificationTitle: {
    en: "Check your inbox 📬",
    zu: "Hlola ibhokisi yakho 📬",
    st: "Sheba email ea hao 📬",
  },
  authPendingVerification: {
    en: "We sent a verification link to {email}. Click it on this device to save your account.",
    zu: "Sithumele isixhumanisi sokuqinisekisa ku-{email}. Sicindezele kule divayisi ukugcina i-akhawunti yakho.",
    st: "Re rometse sehokelo sa netefatso ho {email}. Se tobetse khonopheng ena ho boloka akhaonto ea hao.",
  },
  authPendingSigninTitle: {
    en: "Magic link sent 📬",
    zu: "Isixhumanisi sithunyelwe 📬",
    st: "Sehokelo se rometsoe 📬",
  },
  authPendingSignin: {
    en: "We sent a sign-in link to {email}. Open it on the device you want to use.",
    zu: "Sithumele isixhumanisi sokungena ku-{email}. Sicindezele kudivayisi ofuna ukuyisebenzisa.",
    st: "Re rometse sehokelo sa ho kena ho {email}. Se bule khonopheng eo u batlang ho e sebelisa.",
  },
  authPendingExpires: {
    en: "The link expires in 1 hour. Didn't get it? Check spam.",
    zu: "Isixhumanisi siphelelwa ehoreni. Awusitholanga? Hlola i-spam.",
    st: "Sehokelo se felella hora e le 'ngoe. Ha oa se fumana? Sheba spam.",
  },
  authDismiss: { en: "Dismiss", zu: "Chitha", st: "Tlohela" },
  authTryAnother: {
    en: "Use a different email",
    zu: "Sebenzisa enye i-imeyili",
    st: "Sebelisa email e 'ngoe",
  },

  authInvalidEmail: {
    en: "Please enter a valid email",
    zu: "Sicela ufake i-imeyili evumelekile",
    st: "Ka kopo kenya email e nepahetseng",
  },
  authSending: {
    en: "Sending...",
    zu: "Iyathunyelwa...",
    st: "E ntse e romelloa...",
  },
  accountReset: {
    en: "Reset account",
    zu: "Setha kabusha i-akhawunti",
    st: "Nchafatsa akhaonto",
  },
  accountResetDesc: {
    en: "Wipe your data and start fresh. This cannot be undone.",
    zu: "Sula idatha yakho uqale kabusha. Lokhu akunakususwa.",
    st: "Hlakola data ea hao 'me u qale hape. Sena se ke ke sa hlakoloa.",
  },
  accountResetConfirm: {
    en: "Yes, wipe everything",
    zu: "Yebo, sula konke",
    st: "E, hlakola tsohle",
  },
  accountResetCancel: { en: "No, keep my data", zu: "Cha, gcina", st: "Che, boloka" },

  appVersion: { en: "KasiKash", zu: "KasiKash", st: "KasiKash" },
} as const;

export type TKey = keyof typeof t;

export function tr(key: TKey, lang: Lang): string {
  const entry = t[key];
  return entry[lang] ?? entry.en;
}

export function trParams(
  key: TKey,
  lang: Lang,
  params: Record<string, string | number>,
): string {
  let out = tr(key, lang);
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}
