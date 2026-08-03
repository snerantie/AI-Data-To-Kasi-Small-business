// Multilingual copy for KasiKash. English (en), isiZulu (zu), Sesotho (st).
export type Lang = "en" | "zu" | "st";

export const LANGS: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English", native: "English", flag: "EN" },
  { code: "zu", label: "isiZulu", native: "isiZulu", flag: "ZU" },
  { code: "st", label: "Sesotho", native: "Sesotho", flag: "ST" },
];

export const t = {
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
  greeting: {
    en: "Sawubona,",
    zu: "Sawubona,",
    st: "Dumela,",
  },
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
  addStock: {
    en: "Add stock",
    zu: "Faka istoko",
    st: "Kenya thepa",
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
  home: { en: "Home", zu: "Ikhaya", st: "Lehae" },
  sales: { en: "Log", zu: "Ngenisa", st: "Ngola" },
  tabs: { en: "Skoroskoro", zu: "Isikweletu", st: "Sekoloto" },
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
    st: "Kapa ngola ka letsoho" ,
  },
  item: { en: "Item", zu: "Into", st: "Ntho" },
  qty: { en: "Qty", zu: "Inani", st: "Palo" },
  price: { en: "Price (R)", zu: "Intengo (R)", st: "Theko (R)" },
  save: { en: "Save", zu: "Londoloza", st: "Boloka" },
  // Tabs
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
  paidJust: {
    en: "paid you",
    zu: "ukhokhile",
    st: "o u lefile",
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
  topSeller: {
    en: "Top seller",
    zu: "Okuthengiswa kakhulu",
    st: "Se rekisoang haholo",
  },
  aiTips: {
    en: "Smart tips for you",
    zu: "Amacebiso ahlakaniphile kuwe",
    st: "Likeletso tse bohlale ho uena",
  },
  // Tip content
  tip1: {
    en: "You're low on bread. Sales peak at 5pm — restock this afternoon.",
    zu: "Isinkwa siphelile. Ukudayisa kuphakama ngo-5pm — thenga futhi namuhla ntambama.",
    st: "Bohobe bo felile. Thekiso e phahama ka 5pm — reka hape kajeno mantsiboea.",
  },
  tip2: {
    en: "Your margin on airtime is 4%. Switch to bulk vendor — save R240/week.",
    zu: "Inzalo yakho ku-airtime ingu-4%. Shintsha uye kumdayisi omkhulu — londoloza R240/iviki.",
    st: "Phaello ea hao ho airtime ke 4%. Fetohela morekisi e moholo — boloka R240/beke.",
  },
  tip3: {
    en: "3 customers owe you over 14 days. Send a friendly reminder on WhatsApp.",
    zu: "Amakhasimende amathathu akukweleta izinsuku ezingu-14. Bathumele isikhumbuzo ku-WhatsApp.",
    st: "Bareki ba bararo ba u kolota matsatsi a 14. Ba romelle sehopotso ho WhatsApp.",
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
};

export type TKey = keyof typeof t;

export function tr(key: TKey, lang: Lang): string {
  const entry = t[key];
  return entry[lang] ?? entry.en;
}
