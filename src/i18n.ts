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
  chooseLang: {
    en: "Choose your language",
    zu: "Khetha ulimi lwakho",
    st: "Khetha puo ea hao",
  },
  getStarted: {
    en: "Get started",
    zu: "Qala manje",
    st: "Qala hona joale",
  },

  // Home
  greeting: { en: "Sawubona,", zu: "Sawubona,", st: "Dumela," },
  ownerName: { en: "Mama Nomsa", zu: "Mama Nomsa", st: "Mme Nomsa" },
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
  listening: {
    en: "Listening...",
    zu: "Ngiyalalela...",
    st: "Ke a mamela...",
  },
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
  orScan: {
    en: "Or scan a receipt",
    zu: "Noma skena irisidi",
    st: "Kapa skena risiti",
  },

  // Receipt scan
  scanTitle: {
    en: "Scan a receipt",
    zu: "Skena irisidi",
    st: "Skena risiti",
  },
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
  stokvelMembers: {
    en: "Members",
    zu: "Amalungu",
    st: "Litho",
  },
  contribute: {
    en: "Contribute",
    zu: "Nikela",
    st: "Kenya",
  },
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
  creditScore: {
    en: "KasiScore",
    zu: "i-KasiScore",
    st: "KasiScore",
  },
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

  // Sample suggestions
  sampleSuggestion1: {
    en: "Sold 3 bread at R18",
    zu: "Ngithengise izinkwa ezintathu ngo-R18",
    st: "Ke rekisitse bohobe bo bo bararo ka R18",
  },
  sampleSuggestion2: {
    en: "2 airtime R12",
    zu: "Ama-airtime amabili R12",
    st: "Li-airtime tse peli R12",
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
    en: "Hi Mama Nomsa! I'm KasiKash. Just tell me what you sold and I'll keep the books. Try: \"sold 3 bread R18\"",
    zu: "Sawubona Mama Nomsa! NginguKasiKash. Ngitshele nje ukuthi udayiseni nami ngizogcina izincwadi. Zama: \"sold 3 bread R18\"",
    st: "Dumela Mme Nomsa! Ke KasiKash. Mpolelle feela seo u se rekisitseng 'me ke tla boloka libuka. Leka: \"sold 3 bread R18\"",
  },
  whatsappSampleUser1: {
    en: "sold 3 bread R18",
    zu: "sold 3 bread R18",
    st: "sold 3 bread R18",
  },
  whatsappSampleBot1: {
    en: "Logged ✅ 3 × Bread @ R18 = R54. Today's takings: R255. Type \"score\" for your KasiScore.",
    zu: "Kubhaliwe ✅ 3 × Bread @ R18 = R54. Imali yanamuhla: R255. Bhala \"score\" ukubona i-KasiScore yakho.",
    st: "E ngoliloe ✅ 3 × Bread @ R18 = R54. Chelete ea kajeno: R255. Ngola \"score\" ho bona KasiScore ea hao.",
  },
  whatsappSampleUser2: {
    en: "score",
    zu: "score",
    st: "score",
  },
  whatsappSampleBot2: {
    en: "Your KasiScore: 685 🔥 You're 15 points from unlocking R2 000 stokvel-backed credit. Keep logging!",
    zu: "I-KasiScore yakho: 685 🔥 Usasele amaphuzu angu-15 ukuvula isikweletu se-R2 000. Qhubeka ngokungenisa!",
    st: "KasiScore ea hao: 685 🔥 U sa hloka lintlha tse 15 ho notlolla mokitlane oa R2 000. Tsoela pele u ngole!",
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
  whatsappSendCta: {
    en: "Send",
    zu: "Thumela",
    st: "Romela",
  },
  whatsappFallbackReply: {
    en: "Got it. Type \"score\" to see your KasiScore or say what you sold, e.g. \"sold 2 airtime R12\".",
    zu: "Kuphelile. Bhala \"score\" ukubona i-KasiScore noma sho okudayisile, sib. \"sold 2 airtime R12\".",
    st: "Ho lokile. Ngola \"score\" ho bona KasiScore kapa bolela seo u se rekisitseng, mohlala \"sold 2 airtime R12\".",
  },
  whatsappSaleReply: {
    en: "Logged ✅ {qty} × {item} @ R{price} = R{total}. Today's takings updated.",
    zu: "Kubhaliwe ✅ {qty} × {item} @ R{price} = R{total}. Imali yanamuhla ibuyekeziwe.",
    st: "E ngoliloe ✅ {qty} × {item} @ R{price} = R{total}. Chelete ea kajeno e ntlafalitsoe.",
  },

  // Dynamic insight templates. Use {placeholders} that computeInsights fills in.
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
