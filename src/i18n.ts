// Multilingual copy for KasiKash. English (en), isiZulu (zu), Sesotho (st), Afrikaans (af).
export type Lang = "en" | "zu" | "st" | "af";

export const LANGS: { code: Lang; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English", native: "English", flag: "EN" },
  { code: "zu", label: "isiZulu", native: "isiZulu", flag: "ZU" },
  { code: "st", label: "Sesotho", native: "Sesotho", flag: "ST" },
  { code: "af", label: "Afrikaans", native: "Afrikaans", flag: "AF" },
];

export const t = {
  // Brand
  brand: { en: "KasiKash", zu: "KasiKash", st: "KasiKash", af: "KasiKash" },
  tagline: {
    en: "Kasi hustle, upgraded.",
    zu: "Ibhizinisi lakho, likhulisiwe.",
    st: "Kgwebo ea hao, e ntlafalitsoe.",
    af: "Kasi-hustle, opgegradeer.",
  },

  // Home
  greeting: { en: "Sawubona,", zu: "Sawubona,", st: "Dumela,", af: "Hallo," },
  todayEarnings: {
    en: "Today's takings",
    zu: "Imali yanamuhla",
    st: "Chelete ea kajeno",
    af: "Vandag se inkomste",
  },
  profit: { en: "Profit", zu: "Inzuzo", st: "Phaello", af: "Wins" },
  owed: { en: "Owed to you", zu: "Okukweletwayo", st: "Se u kolotoang", af: "Aan jou verskuldig" },
  quickActions: {
    en: "Quick actions",
    zu: "Izenzo ezisheshayo",
    st: "Liketso tse potlakileng",
    af: "Vinnige aksies",
  },
  logSale: { en: "Log a sale", zu: "Ngena ukudayisa", st: "Ngola thekiso", af: "Teken 'n verkoop aan" },
  addTab: { en: "Add a tab", zu: "Faka isikweletu", st: "Kenya sekoloto", af: "Voeg 'n skuldrekening by" },
  seeInsights: {
    en: "See insights",
    zu: "Buka izimpawu",
    st: "Sheba tlhahiso",
    af: "Sien insigte",
  },
  recentSales: {
    en: "Recent sales",
    zu: "Ukudayisa kwakamuva",
    st: "Thekiso ea morao tjena",
    af: "Onlangse verkope",
  },
  noSales: {
    en: "No sales yet today. Tap the mic to log your first one.",
    zu: "Akukho okudayisiwe namuhla. Cindezela imakrofoni ukungenisa okokuqala.",
    st: "Ha ho na thekiso kajeno. Tobetsa maekrofouno ho ngola ea pele.",
    af: "Nog geen verkope vandag nie. Tik die mikrofoon om jou eerste een aan te teken.",
  },

  // Bottom nav
  home: { en: "Home", zu: "Ikhaya", st: "Lehae", af: "Tuis" },
  sales: { en: "Log", zu: "Ngenisa", st: "Ngola", af: "Teken" },
  tabs: { en: "Skoroskoro", zu: "Isikweletu", st: "Sekoloto", af: "Skoroskoro" },
  stokvelNav: { en: "Stokvel", zu: "Stokvel", st: "Stokvel", af: "Stokvel" },
  // PR #35 — bottom-nav label for the Services hub (replaces the
  // dedicated Stokvel tab; stokvel is now reached via Services).
  servicesNav: { en: "Services", zu: "Izinsiza", st: "Litšebeletso", af: "Dienste" },
  insights: { en: "Insights", zu: "Izimpawu", st: "Tlhahiso", af: "Insigte" },

  // Voice / log sale
  micTapToSpeak: {
    en: "Tap to speak — say what you sold",
    zu: "Cindezela ukhulume — sho okudayisile",
    st: "Tobetsa u bue — bolela seo u se rekisitseng",
    af: "Tik om te praat — sê wat jy verkoop het",
  },
  listening: { en: "Listening...", zu: "Ngiyalalela...", st: "Ke a mamela...", af: "Luister..." },
  heard: { en: "I heard", zu: "Ngizwile", st: "Ke utloile", af: "Ek het gehoor" },
  confirm: { en: "Confirm sale", zu: "Qinisekisa", st: "Tiisa", af: "Bevestig verkoop" },
  retry: { en: "Try again", zu: "Zama futhi", st: "Leka hape", af: "Probeer weer" },
  typeInstead: {
    en: "Type it instead",
    zu: "Bhala esikhundleni salokho",
    st: "Ngola ho e-na le hoo",
    af: "Tik dit eerder",
  },
  item: { en: "Item", zu: "Into", st: "Ntho", af: "Item" },
  qty: { en: "Qty", zu: "Inani", st: "Palo", af: "Aantal" },
  price: { en: "Price (R)", zu: "Intengo (R)", st: "Theko (R)", af: "Prys (R)" },
  save: { en: "Save", zu: "Londoloza", st: "Boloka", af: "Stoor" },

  voiceUnavailableTitle: {
    en: "Voice isn't available on this phone",
    zu: "Izwi alitholakali kule foni",
    st: "Lentsoe ha le fumanehe fonong ena",
    af: "Stem is nie beskikbaar op hierdie foon nie",
  },
  voiceUnavailableBody: {
    en: "You can still record your sale by typing it below.",
    zu: "Usengaqopha ukudayisa kwakho ngokubhala ngezansi.",
    st: "U ntse u ka rekota thekiso ka ho e ngola tlaase.",
    af: "Jy kan steeds jou verkoop aanteken deur dit hieronder te tik.",
  },
  micPermissionDenied: {
    en: "Microphone is blocked. Enable it in your browser settings and tap the mic again.",
    zu: "Imakrofoni ivinjelwe. Yivumele emasethingini omusweni-siza cindezela imakrofoni futhi.",
    st: "Maekrofouno e thibetsoe. E kenye litlhophisong tsa braosara ebe u tobetsa maekrofouno hape.",
    af: "Mikrofoon is geblokkeer. Aktiveer dit in jou blaaier se instellings en tik weer die mikrofoon.",
  },
  saleLogged: {
    en: "Sale logged",
    zu: "Ukudayisa kubhaliwe",
    st: "Thekiso e ngoliloe",
    af: "Verkoop aangeteken",
  },
  undo: { en: "Undo", zu: "Buyisela", st: "Khutlisa", af: "Ontdoen" },
  undone: { en: "Undone", zu: "Kususiwe", st: "Ho hlakotsoe", af: "Ongedaan gemaak" },

  sampleSuggestion1: {
    en: "Sold 3 bread at R18",
    zu: "Ngithengise izinkwa ezintathu ngo-R18",
    st: "Ke rekisitse bohobe bo bo bararo ka R18",
    af: "Verkoop 3 brode teen R18",
  },

  // Skoroskoro
  tabsTitle: {
    en: "Skoroskoro — customer tabs",
    zu: "Isikweletu — abangikweletayo",
    st: "Sekoloto — bareki ba nkolotang",
    af: "Skoroskoro — kliëntrekeninge",
  },
  totalOwed: {
    en: "Total owed to you",
    zu: "Iyonke okukweletwayo",
    st: "Kakaretso e u kolotoang",
    af: "Totaal aan jou verskuldig",
  },
  markPaid: { en: "Mark paid", zu: "Uyakhokha", st: "E lefiloe", af: "Merk as betaal" },
  addCustomer: {
    en: "Add customer + amount",
    zu: "Faka ikhasimende nemali",
    st: "Kenya moreki le chelete",
    af: "Voeg kliënt + bedrag by",
  },
  customerName: {
    en: "Customer name",
    zu: "Igama lekhasimende",
    st: "Lebitso la moreki",
    af: "Kliënt se naam",
  },
  amount: { en: "Amount (R)", zu: "Imali (R)", st: "Chelete (R)", af: "Bedrag (R)" },
  paidJust: { en: "paid you", zu: "ukhokhile", st: "o u lefile", af: "het jou betaal" },

  // ---------------------------------------------------------------------
  // Stokvel (multi-user)
  // ---------------------------------------------------------------------
  stokvelTitle: {
    en: "Your Stokvel",
    zu: "Istokvel sakho",
    st: "Stokvel ea hao",
    af: "Jou Stokvel",
  },
  stokvelSub: {
    en: "Group savings pot",
    zu: "Umgodi wokugcina imali weqembu",
    st: "Sekhelo sa polokelo sa sehlopha",
    af: "Groep-spaarpot",
  },
  stokvelGoal: { en: "Goal", zu: "Umgomo", st: "Sepheo", af: "Doel" },
  stokvelSaved: { en: "Saved", zu: "Kugciniwe", st: "Ho bolokiloe", af: "Gespaar" },
  stokvelMembers: { en: "Members", zu: "Amalungu", st: "Litho", af: "Lede" },
  contribute: { en: "Contribute", zu: "Nikela", st: "Kenya", af: "Dra by" },
  recentContributions: {
    en: "Recent contributions",
    zu: "Iminikelo yakamuva",
    st: "Menehelo ea morao tjena",
    af: "Onlangse bydraes",
  },
  quickAdd: { en: "Quick add", zu: "Faka ngokushesha", st: "Kenya kapele", af: "Vinnig by" },
  goalReached: {
    en: "Goal reached!",
    zu: "Umgomo ufinyeleliwe!",
    st: "Sepheo se fihletsoe!",
    af: "Doel bereik!",
  },

  stokvelRoleAdmin: { en: "Admin", zu: "Umqondisi", st: "Molaoli", af: "Admin" },
  stokvelRoleMember: { en: "Member", zu: "Ilungu", st: "Setho", af: "Lid" },
  stokvelMemberOf: {
    en: "{count} of {target} members",
    zu: "Amalungu angu-{count} kokungu-{target}",
    st: "Litho tse {count} tsa tse {target}",
    af: "{count} van {target} lede",
  },
  stokvelYouContributed: {
    en: "You've contributed",
    zu: "Unikelile",
    st: "U kentse",
    af: "Jy het bygedra",
  },
  stokvelMembersList: {
    en: "Members",
    zu: "Amalungu",
    st: "Litho",
    af: "Lede",
  },
  contribBy: {
    en: "by",
    zu: "yi-",
    st: "ka",
    af: "deur",
  },

  // Empty state (user has no stokvel)
  stokvelEmptyTitle: {
    en: "You're not in a stokvel yet",
    zu: "Awukho kwistokvel okwamanje",
    st: "Ha u e-so be stokveleng",
    af: "Jy is nog nie in 'n stokvel nie",
  },
  stokvelEmptySub: {
    en: "Create your own or join one with a code.",
    zu: "Yakha esakho noma joyina ngekhodi.",
    st: "Iketsetse ea hao kapa kena ka khoutu.",
    af: "Skep jou eie of sluit aan met 'n kode.",
  },
  stokvelCreateCard: {
    en: "Create a stokvel",
    zu: "Yakha istokvel",
    st: "Iketsetse stokvel",
    af: "Skep 'n stokvel",
  },
  stokvelCreateCardDesc: {
    en: "You'll be the admin",
    zu: "Uzoba umqondisi",
    st: "U tla ba molaoli",
    af: "Jy sal die admin wees",
  },
  stokvelJoinCard: {
    en: "Join with a code",
    zu: "Joyina ngekhodi",
    st: "Kena ka khoutu",
    af: "Sluit aan met 'n kode",
  },
  stokvelJoinCardDesc: {
    en: "You'll be a member",
    zu: "Uzoba ilungu",
    st: "U tla ba setho",
    af: "Jy sal 'n lid wees",
  },

  // Create sheet
  stokvelCreateHeader: {
    en: "Start a new stokvel",
    zu: "Qala istokvel esisha",
    st: "Qala stokvel e ncha",
    af: "Begin 'n nuwe stokvel",
  },
  stokvelCreateSubmit: {
    en: "Create stokvel",
    zu: "Yakha istokvel",
    st: "Etsa stokvel",
    af: "Skep stokvel",
  },
  stokvelCreatingProgress: {
    en: "Creating...",
    zu: "Kuyakhiwa...",
    st: "E ntse e etsoa...",
    af: "Besig om te skep...",
  },

  // Join sheet
  stokvelJoinHeader: {
    en: "Join a stokvel",
    zu: "Joyina istokvel",
    st: "Kena stokveleng",
    af: "Sluit aan by 'n stokvel",
  },
  stokvelJoinCodeLabel: {
    en: "Invite code",
    zu: "Ikhodi yesimemo",
    st: "Khoutu ea memo",
    af: "Uitnodigingskode",
  },
  stokvelJoinCodePlaceholder: {
    en: "K-XXXX-YYYY",
    zu: "K-XXXX-YYYY",
    st: "K-XXXX-YYYY",
    af: "K-XXXX-YYYY",
  },
  stokvelJoinSubmit: {
    en: "Join",
    zu: "Joyina",
    st: "Kena",
    af: "Sluit aan",
  },
  stokvelJoiningProgress: {
    en: "Joining...",
    zu: "Kuyajoyinwa...",
    st: "Ho ntse ho kenoa...",
    af: "Besig om aan te sluit...",
  },
  stokvelJoinInvalid: {
    en: "That code isn't valid or has expired.",
    zu: "Ikhodi ayivumelekile noma iphelelwe.",
    st: "Khoutu eo ha e nepahetse kapa e feletsoe.",
    af: "Daardie kode is nie geldig nie of het verval.",
  },

  // Invite sheet (admin)
  stokvelInviteBtn: {
    en: "Invite members",
    zu: "Mema amalungu",
    st: "Memela litho",
    af: "Nooi lede uit",
  },
  stokvelInviteHeader: {
    en: "Invite people to your stokvel",
    zu: "Mema abantu kwistokvel yakho",
    st: "Memela batho stokveleng ea hao",
    af: "Nooi mense na jou stokvel",
  },
  stokvelInviteHelper: {
    en: "Share this code — anyone with it can join.",
    zu: "Yabelana ngale khodi — noma ubani onayo angajoyina.",
    st: "Arolelana khoutu ena — mang kapa mang ea nang le eona a ka kena.",
    af: "Deel hierdie kode — enigiemand met die kode kan aansluit.",
  },
  // PR #25: renamed from "Copy code" to "Copy link" because the
  // button now copies the full invite URL, not the raw code. The
  // link contains the code so nothing is lost; the link is just
  // more useful when pasted into WhatsApp / SMS / email.
  stokvelInviteCopy: { en: "Copy link", zu: "Kopisha ilink", st: "Kopisha linki", af: "Kopieer skakel" },
  stokvelInviteCopied: { en: "Copied ✓", zu: "Kukopishiwe ✓", st: "E kopishoa ✓", af: "Gekopieer ✓" },
  stokvelInviteShareWhatsApp: {
    en: "Share on WhatsApp",
    zu: "Yabelana ku-WhatsApp",
    st: "Arolelana ho WhatsApp",
    af: "Deel op WhatsApp",
  },
  // PR #25: message now includes a tappable URL. Previously only
  // the code was included — recipients saw plain text and couldn't
  // click anything, which was the top pilot-blocking issue.
  //
  // The raw code is still repeated as a fallback in case a
  // recipient's WhatsApp version fails to render the URL (rare but
  // happens in older Android builds) — they can then open KasiKash
  // manually and paste the code.
  stokvelInviteWhatsAppMessage: {
    en: "Come join our stokvel on KasiKash! Tap this link: {url}\n\nOr open KasiKash and use code: {code}",
    zu: "Woza uzojoyina istokvel yethu ku-KasiKash! Cindezela lelilink: {url}\n\nNoma vula i-KasiKash ufake ikhodi: {code}",
    st: "Tloo u kene stokveleng ea rona ho KasiKash! Tobetsa linki ena: {url}\n\nKapa bula KasiKash 'me u sebelise khoutu: {code}",
    af: "Kom sluit aan by ons stokvel op KasiKash! Tik hierdie skakel: {url}\n\nOf maak KasiKash oop en gebruik kode: {code}",
  },
  stokvelInviteExpires: {
    en: "Expires in {days} day(s)",
    zu: "Iphelelwa ezinsukwini ezingu-{days}",
    st: "E felella ka matsatsi a {days}",
    af: "Verval oor {days} dag(e)",
  },
  stokvelInviteRefresh: {
    en: "Generate a new code",
    zu: "Khiqiza ikhodi entsha",
    st: "Etsa khoutu e ncha",
    af: "Genereer 'n nuwe kode",
  },

  // Leave stokvel
  stokvelLeave: {
    en: "Leave stokvel",
    zu: "Shiya istokvel",
    st: "Tloha stokveleng",
    af: "Verlaat stokvel",
  },
  stokvelLeaveConfirm: {
    en: "You'll stop seeing this stokvel. Your past contributions stay on record.",
    zu: "Uzoyeka ukubona lestokvel. Iminikelo yakho edlule iyoqhubeka igciniwe.",
    st: "U tla khaotsa ho bona stokvel ena. Menehelo ea hao ea nakong e fetileng e sala e le hona.",
    af: "Jy sal ophou om hierdie stokvel te sien. Jou vorige bydraes bly op rekord.",
  },
  stokvelLeaveConfirmBtn: {
    en: "Yes, leave",
    zu: "Yebo, shiya",
    st: "E, tloha",
    af: "Ja, verlaat",
  },
  stokvelLeaveCancel: {
    en: "Stay",
    zu: "Hlala",
    st: "Lula",
    af: "Bly",
  },
  stokvelLeaveSoleAdmin: {
    en: "You're the only admin. Make someone else admin first, or delete the stokvel.",
    zu: "Nguwe kuphela ungumqondisi. Yenza omunye umuntu abe umqondisi kuqala.",
    st: "Ke uena feela molaoli. Etsa motho e mong molaoli pele.",
    af: "Jy is die enigste admin. Maak iemand anders eers admin, of verwyder die stokvel.",
  },

  // Insights
  creditScore: { en: "KasiScore", zu: "i-KasiScore", st: "KasiScore", af: "KasiScore" },
  creditSub: {
    en: "Your business's financial passport",
    zu: "Ipasi yezimali yebhizinisi lakho",
    st: "Pasa ea lichelete tsa khoebo ea hao",
    af: "Jou besigheid se finansiële paspoort",
  },
  weekProfit: {
    en: "This week's profit",
    zu: "Inzuzo yaleliviki",
    st: "Phaello ea beke ena",
    af: "Hierdie week se wins",
  },
  topSellerLabel: {
    en: "Top seller",
    zu: "Okuthengiswa kakhulu",
    st: "Se rekisoang haholo",
    af: "Beste verkoper",
  },
  aiTips: {
    en: "Smart tips for you",
    zu: "Amacebiso ahlakaniphile kuwe",
    st: "Likeletso tse bohlale ho uena",
    af: "Slim wenke vir jou",
  },
  aiPoweredBadge: {
    en: "Powered by your data",
    zu: "Ihanjiswa idatha yakho",
    st: "E tsamaisoa ke data ea hao",
    af: "Aangedryf deur jou data",
  },
  scoreLabelExcellent: {
    en: "Excellent",
    zu: "Kuhle kakhulu",
    st: "Ho hotle haholo",
    af: "Uitstekend",
  },
  scoreLabelGood: { en: "Good", zu: "Kuhle", st: "Ho hotle", af: "Goed" },
  scoreLabelFair: { en: "Fair", zu: "Kulungile", st: "Ho lokile", af: "Redelik" },
  poweredBy: {
    en: "Voice-first. Offline-ready. Kasi-built.",
    zu: "Iqala ngezwi. Isebenza ngaphandle kwe-inthanethi. Yakhelwe ikasi.",
    st: "E qala ka lentsoe. E sebetsa ntle le inthanete. E hahiloe bakeng sa kasi.",
    af: "Stem-eerste. Vanlyn-gereed. Kasi-gebou.",
  },
  insightsEmpty: {
    en: "Log a few more sales to unlock personalised tips.",
    zu: "Faka okudayisa okuningi ukuvula amacebiso.",
    st: "Kenya thekiso e meng ho notlolla likeletso.",
    af: "Teken 'n paar meer verkope aan om persoonlike wenke te ontsluit.",
  },

  insightOldTabs: {
    en: "{count} customers owe you over 7 days — {name} for {days} days. Send a WhatsApp nudge.",
    zu: "Amakhasimende angu-{count} akukweletayo izinsuku ezingu-7 — u-{name} izinsuku ezingu-{days}. Thumela isikhumbuzo se-WhatsApp.",
    st: "Bareki ba {count} ba u kolota matsatsi a fetang 7 — {name} matsatsi a {days}. Romela sehopotso ho WhatsApp.",
    af: "{count} kliënte skuld jou langer as 7 dae — {name} vir {days} dae. Stuur 'n WhatsApp-herinnering.",
  },
  insightHotItem: {
    en: "{item} is flying today — {count} sales in the last 24h. Restock before evening.",
    zu: "I-{item} iyandiza namuhla — ukudayisa okungu-{count} ezinsukwini ezingu-24. Faka isitoko phambi kokuhlwa.",
    st: "{item} e a rekisoa kajeno — thekiso e {count} matsatsing a fetileng a 24. Reka hape pele ho mantsiboea.",
    af: "{item} vlieg vandag — {count} verkope in die afgelope 24u. Vul voorraad aan voor die aand.",
  },
  insightUpToday: {
    en: "You're up {pct}% versus your weekly average. Big day 💪",
    zu: "Ukhuphuke ngo-{pct}% uma uqhathanisa nesilinganiso saleliviki. Usuku olukhulu 💪",
    st: "U phahame ka {pct}% ho feta karolelano ea beke. Letsatsi le leholo 💪",
    af: "Jy is {pct}% op teenoor jou weeklikse gemiddelde. Groot dag 💪",
  },
  insightDownToday: {
    en: "Today is down {pct}% vs your average. Try a WhatsApp broadcast to regulars.",
    zu: "Usuku lwanamuhla lwehle ngo-{pct}% kunesilinganiso. Zama umsakazo we-WhatsApp kumakhasimende.",
    st: "Kajeno o theohile ka {pct}% ho feta karolelano. Leka phatlalatso ea WhatsApp ho bareki.",
    af: "Vandag is {pct}% af teenoor jou gemiddelde. Probeer 'n WhatsApp-uitsending na gereelde kliënte.",
  },
  insightSilentDay: {
    en: "No sales logged today. Tap the mic to catch up before customers rush in.",
    zu: "Akukho okudayisiwe okulotshiwe namuhla. Cindezela imakrofoni ngaphambi kokuba amakhasimende afike.",
    st: "Ha ho thekiso e ngotsoeng kajeno. Tobetsa maekrofouno pele bareki ba fihla.",
    af: "Geen verkope vandag aangeteken nie. Tik die mikrofoon om vinnig by te bly voordat kliënte inkom.",
  },
  insightCreditUnlocked: {
    en: "🎉 Your KasiScore unlocks R{amount} in stokvel-backed credit. Tap Insights to see terms.",
    zu: "🎉 I-KasiScore yakho ivula isikweletu esesilingene R{amount} esisekelwe yistokvel. Cindezela u-Insights.",
    st: "🎉 KasiScore ea hao e notlolla R{amount} ea mokitlane o tšehetsoeng ke stokvel. Tobetsa Insights.",
    af: "🎉 Jou KasiScore ontsluit R{amount} in stokvel-gedekte krediet. Tik Insigte om die voorwaardes te sien.",
  },
  insightScoreClimbing: {
    en: "Your KasiScore is climbing — {needed} points to unlock micro-credit.",
    zu: "I-KasiScore yakho iyakhuphuka — amaphuzu angu-{needed} avula umatepe wesikweletu.",
    st: "KasiScore ea hao e phahama — lintlha tse {needed} ho notlolla micro-credit.",
    af: "Jou KasiScore klim — {needed} punte om mikrokrediet te ontsluit.",
  },
  insightStokvelClose: {
    en: "You're R{remain} away from {name}'s goal. One more strong week gets you there.",
    zu: "Usasele R{remain} ukufinyelela umgomo ka-{name}. Iviki eyodwa enamandla iyokuthola khona.",
    st: "U setse R{remain} ho fihla sepheong sa {name}. Beke e le 'ngoe e matla e tla u fihlisa.",
    af: "Jy is R{remain} van {name} se doel af. Nog een sterk week bring jou daar.",
  },
  insightStokvelStart: {
    en: "{name} is quiet. Contribute R100 this week to keep the momentum.",
    zu: "I-{name} ithule. Nikela R100 kuleli viki ukugcina ukushuka.",
    st: "{name} e khutsitse. Kenya R100 bekeng ena ho boloka lebelo.",
    af: "{name} is stil. Dra R100 hierdie week by om die momentum te behou.",
  },
  insightBigOwed: {
    en: "R{owed} is on tabs. Collecting even half — R{half} — boosts your KasiScore.",
    zu: "R{owed} akukweletwe. Ukuqoqa ngisho R{half} nje kuphakamisa i-KasiScore yakho.",
    st: "R{owed} e likolotong. Ho bokella le R{half} feela ho phahamisa KasiScore ea hao.",
    af: "R{owed} is op skuldrekeninge. Selfs die helfte invorder — R{half} — versterk jou KasiScore.",
  },

  // ---------------------------------------------------------------------
  // Onboarding
  // ---------------------------------------------------------------------
  onbChooseLang: {
    en: "Choose your language",
    zu: "Khetha ulimi lwakho",
    st: "Khetha puo ea hao",
    af: "Kies jou taal",
  },
  onbStepOf: {
    en: "Step {step} of {total}",
    zu: "Isinyathelo {step} sika-{total}",
    st: "Mohato {step} oa {total}",
    af: "Stap {step} van {total}",
  },
  onbNameTitle: {
    en: "What should we call you?",
    zu: "Kufanele sikubize ngani?",
    st: "Re u bitse mang?",
    af: "Hoe moet ons jou noem?",
  },
  onbNameSubtitle: {
    en: "This is the name that appears on your dashboard.",
    zu: "Leli igama elivela kudashibhodi yakho.",
    st: "Lena ke lebitso le hlahang letlapeng la hao.",
    af: "Hierdie is die naam wat op jou dashboard verskyn.",
  },
  onbNamePlaceholder: {
    en: "e.g. Nomsa",
    zu: "isb. Nomsa",
    st: "mohlala Nomsa",
    af: "bv. Nomsa",
  },
  onbBusinessTitle: {
    en: "Tell us about your business",
    zu: "Sitshele ngebhizinisi lakho",
    st: "Re bolelle ka khoebo ea hao",
    af: "Vertel ons van jou besigheid",
  },
  onbBusinessSubtitle: {
    en: "Optional — so we can tailor your dashboard.",
    zu: "Ayidingekile — ukuze sikwazi ukuhlela idashibhodi yakho.",
    st: "Ha ea hlokahale — hore re kgone ho lokisa letlapa la hao.",
    af: "Opsioneel — sodat ons jou dashboard kan aanpas.",
  },
  onbBusinessOptionalHint: {
    en: "Only using KasiKash for a stokvel? You can skip this.",
    zu: "Usebenzisa i-KasiKash kuphela ngestokvel? Ungakweqa lokhu.",
    st: "U sebelisa KasiKash bakeng sa stokvel feela? U ka tlōla sena.",
    af: "Gebruik jy KasiKash net vir 'n stokvel? Jy kan hierdie oorslaan.",
  },
  onbNoBusiness: {
    en: "I don't have a business — skip",
    zu: "Anginalo ibhizinisi — kweqa",
    st: "Ha ke na khoebo — tlōla",
    af: "Ek het nie 'n besigheid nie — slaan oor",
  },
  onbBusinessNameLabel: {
    en: "Business name",
    zu: "Igama lebhizinisi",
    st: "Lebitso la khoebo",
    af: "Besigheidsnaam",
  },
  onbBusinessNamePlaceholder: {
    en: "e.g. Nomsa's Spaza",
    zu: "isb. Nomsa's Spaza",
    st: "mohlala Nomsa's Spaza",
    af: "bv. Nomsa se Spaza",
  },
  onbBusinessTypeLabel: {
    en: "Type of business",
    zu: "Uhlobo lwebhizinisi",
    st: "Mofuta oa khoebo",
    af: "Tipe besigheid",
  },
  onbStokvelTitle: {
    en: "Your stokvel",
    zu: "Istokvel sakho",
    st: "Stokvel ea hao",
    af: "Jou stokvel",
  },
  onbStokvelSubtitle: {
    en: "Create a new one or join with a code. You can also skip and set it up later.",
    zu: "Yakha entsha noma joyina ngekhodi. Ungakushiya futhi ukusetha kamuva.",
    st: "Iketsetse e ncha kapa kena ka khoutu. U ka boela u tlōla u lokise hamorao.",
    af: "Skep 'n nuwe een of sluit aan met 'n kode. Jy kan dit ook oorslaan en later opstel.",
  },
  onbStokvelChoiceCreate: {
    en: "Create a new stokvel",
    zu: "Yakha istokvel esisha",
    st: "Iketsetse stokvel e ncha",
    af: "Skep 'n nuwe stokvel",
  },
  onbStokvelChoiceJoin: {
    en: "Join with a code",
    zu: "Joyina ngekhodi",
    st: "Kena ka khoutu",
    af: "Sluit aan met 'n kode",
  },
  onbStokvelChoiceSkip: {
    en: "Skip for now",
    zu: "Kweqe okwamanje",
    st: "Tlōla hona joale",
    af: "Slaan nou oor",
  },
  onbStokvelNameLabel: {
    en: "Stokvel name",
    zu: "Igama lestokvel",
    st: "Lebitso la stokvel",
    af: "Stokvel-naam",
  },
  onbStokvelNamePlaceholder: {
    en: "e.g. Ma-Nomsa Stokvel",
    zu: "isb. Ma-Nomsa Stokvel",
    st: "mohlala Ma-Nomsa Stokvel",
    af: "bv. Ma-Nomsa Stokvel",
  },
  onbStokvelGoalLabel: {
    en: "Savings goal (R)",
    zu: "Umgomo wokonga (R)",
    st: "Sepheo sa polokelo (R)",
    af: "Spaardoel (R)",
  },
  onbStokvelMembersLabel: {
    en: "Expected members",
    zu: "Amalungu alindelekile",
    st: "Litho tse lebeletsoeng",
    af: "Verwagte lede",
  },
  onbBack: { en: "Back", zu: "Emuva", st: "Morao", af: "Terug" },
  onbNext: { en: "Next", zu: "Ngaphambili", st: "Latela", af: "Volgende" },
  onbFinish: { en: "Finish", zu: "Qeda", st: "Qetela", af: "Voltooi" },
  onbSkip: { en: "Skip for now", zu: "Kweqe okwamanje", st: "Tlōla hona joale", af: "Slaan nou oor" },

  // Business types
  bizSpaza: { en: "Spaza shop", zu: "Isitolo sasekasi", st: "Lebenkele la kasi", af: "Spaza-winkel" },
  bizSalon: { en: "Salon / barber", zu: "Isaluni / umgundi", st: "Salone / mokuti", af: "Salon / kapper" },
  bizTaxi: { en: "Taxi operator", zu: "Umqhubi wetekisi", st: "Mokhanni oa terene", af: "Taxi-drywer" },
  bizTailor: { en: "Tailor / dressmaker", zu: "Umthungi", st: "Mothokoli", af: "Kleremaker" },
  bizFood: {
    en: "Food / kota / kitchen",
    zu: "Ukudla / ikota / ikhishi",
    st: "Lijo / kota / kichine",
    af: "Kos / kota / kombuis",
  },
  bizOther: { en: "Other", zu: "Okunye", st: "Tse ling", af: "Ander" },

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------
  settingsTitle: { en: "Settings", zu: "Amasethingi", st: "Litlhophiso", af: "Instellings" },

  sectionProfile: { en: "You", zu: "Wena", st: "Uena", af: "Jy" },
  sectionBusiness: {
    en: "Your business",
    zu: "Ibhizinisi lakho",
    st: "Khoebo ea hao",
    af: "Jou besigheid",
  },
  sectionStokvel: {
    en: "Your stokvel",
    zu: "Istokvel sakho",
    st: "Stokvel ea hao",
    af: "Jou stokvel",
  },
  sectionAccount: { en: "Account", zu: "I-akhawunti", st: "Akhaonto", af: "Rekening" },

  settingsOwnerLabel: {
    en: "Your name",
    zu: "Igama lakho",
    st: "Lebitso la hao",
    af: "Jou naam",
  },
  settingsLanguageLabel: { en: "Language", zu: "Ulimi", st: "Puo", af: "Taal" },
  settingsSaved: { en: "Saved ✓", zu: "Kugcinwe ✓", st: "E bolokiloe ✓", af: "Gestoor ✓" },
  settingsStokvelMemberOnly: {
    en: "Only the admin can edit stokvel details.",
    zu: "Umqondisi kuphela ongahlela imininingwane yestokvel.",
    st: "Ke molaoli feela ea ka lokisang lintlha tsa stokvel.",
    af: "Slegs die admin kan stokvel-besonderhede wysig.",
  },
  settingsStokvelNone: {
    en: "You're not in a stokvel. Open the Stokvel tab to create or join one.",
    zu: "Awukho kwistokvel. Vula ithebhu yestokvel ukuze wakhe noma ujoyine.",
    st: "Ha u stokveleng. Bula tab ea stokvel ho iketsetsa kapa ho kena.",
    af: "Jy is nie in 'n stokvel nie. Maak die Stokvel-oortjie oop om een te skep of aan te sluit.",
  },

  accountAnonymous: {
    en: "Save your account",
    zu: "Ukulondoloza i-akhawunti yakho",
    st: "Boloka akhaonto ea hao",
    af: "Rugsteun jou rekening",
  },
  accountAnonymousDesc: {
    en: "Add an email or phone number so your business data is safe if you change phones or clear your browser.",
    zu: "Faka i-imeyili noma inombolo yefoni ukuze idatha yakho yebhizinisi iphephile uma ushintsha izifonu noma usula isiphequluli.",
    st: "Kenya email kapa nomoro ea mohala hore data ea khoebo ea hao e sireletsehe ha u fetola lifono kapa u hlakola sebatli.",
    af: "Voeg 'n e-pos of foonnommer by sodat jou besigheidsdata veilig is as jy fone verander of jou blaaier uitvee.",
  },
  accountReset: {
    en: "Reset this account",
    zu: "Setha kabusha i-akhawunti",
    st: "Nchafatsa akhaonto ena",
    af: "Herstel hierdie rekening",
  },
  accountResetDesc: {
    en: "Wipe your data and start fresh. This cannot be undone.",
    zu: "Sula idatha yakho uqale kabusha. Lokhu akunakususwa.",
    st: "Hlakola data ea hao 'me u qale hape. Sena se ke ke sa hlakoloa.",
    af: "Vee jou data uit en begin oor. Dit kan nie ongedaan gemaak word nie.",
  },
  accountResetConfirm: {
    en: "Yes, wipe everything",
    zu: "Yebo, sula konke",
    st: "E, hlakola tsohle",
    af: "Ja, vee alles uit",
  },
  accountResetCancel: { en: "No, keep my data", zu: "Cha, gcina", st: "Che, boloka", af: "Nee, hou my data" },

  // ---------------------------------------------------------------------
  // Type-to-confirm reset modal (PR #33)
  //
  // Replaces the previous single-tap confirm with a proper modal that
  // shows the counts of records that will be deleted and requires the
  // user to type "DELETE" to enable the confirmation button. Prevents
  // accidental (and unrecoverable) resets on shared / borrowed phones.
  // ---------------------------------------------------------------------
  accountResetModalTitle: {
    en: "Reset this account?",
    zu: "Setha kabusha le-akhawunti?",
    st: "Nchafatsa akhaonto ena?",
    af: "Herstel hierdie rekening?",
  },
  accountResetModalBody: {
    en: "This will permanently delete everything on this phone. There is no undo.",
    zu: "Lokhu kuzosula ngokugcwele konke kule foni. Akukho ndlela yokubuyisa.",
    st: "Sena se tla hlakola tsohle foneng ena ka mokhoa o sa fetoheng. Ha ho tsela ea ho khutlisa.",
    af: "Dit sal alles op hierdie foon permanent uitvee. Daar is geen ongedaan nie.",
  },
  accountResetModalSummaryTitle: {
    en: "What gets deleted",
    zu: "Okuzosuswa",
    st: "Se tla hlakoloa",
    af: "Wat uitgevee word",
  },
  accountResetModalSummarySales: {
    en: "{count} logged sales",
    zu: "{count} ukudayisa okubhalisiwe",
    st: "{count} thekiso e ngotsoeng",
    af: "{count} aangetekende verkope",
  },
  accountResetModalSummaryTabs: {
    en: "{count} customer tabs",
    zu: "{count} izikweletu zamakhasimende",
    st: "{count} likoloto tsa bareki",
    af: "{count} kliëntrekeninge",
  },
  accountResetModalSummaryContribs: {
    en: "{count} stokvel contributions",
    zu: "{count} iminikelo yestokvel",
    st: "{count} menehelo ea stokvel",
    af: "{count} stokvel-bydraes",
  },
  accountResetModalSummaryStokvel: {
    en: "Your stokvel membership",
    zu: "Ubulungu bakho bestokvel",
    st: "Botho ba hao stokvel",
    af: "Jou stokvel-lidmaatskap",
  },
  accountResetModalTypeToConfirm: {
    en: "Type DELETE below to confirm",
    zu: "Bhala DELETE ngezansi ukuqinisekisa",
    st: "Ngola DELETE ka tlaase ho netefatsa",
    af: "Tik DELETE hieronder om te bevestig",
  },
  accountResetModalConfirmButton: {
    en: "Delete everything",
    zu: "Sula konke",
    st: "Hlakola tsohle",
    af: "Vee alles uit",
  },
  accountResetModalCancelButton: {
    en: "Cancel",
    zu: "Khansela",
    st: "Hlakola",
    af: "Kanselleer",
  },

  // ---------------------------------------------------------------------
  // Home "Back up your account" banner (PR #33)
  //
  // Shown at the top of Home for users who:
  //   * have cloud sync configured (isCloud true)
  //   * haven't linked an email or phone yet
  //   * have done at least one real activity (sale/tab/contribution)
  //   * haven't dismissed the banner (localStorage flag)
  // Persuades them to secure their data BEFORE they lose it — most
  // pilot users don't discover Settings until it's too late.
  // ---------------------------------------------------------------------
  backupBannerTitle: {
    en: "Back up your account",
    zu: "Londoloza i-akhawunti yakho",
    st: "Boloka akhaonto ea hao",
    af: "Rugsteun jou rekening",
  },
  backupBannerSub: {
    en: "So your business data survives if you change phones or clear your browser.",
    zu: "Ukuze idatha yakho yebhizinisi isinde uma ushintsha izifonu noma usula isiphequluli.",
    st: "Hore data ea khoebo ea hao e phele ha u fetola lifono kapa u hlakola sebatli.",
    af: "Sodat jou besigheidsdata oorleef as jy fone verander of jou blaaier uitvee.",
  },
  backupBannerAction: {
    en: "Back up",
    zu: "Londoloza",
    st: "Boloka",
    af: "Rugsteun",
  },
  backupBannerDismiss: {
    en: "Not now",
    zu: "Hhayi manje",
    st: "E seng joale",
    af: "Nie nou nie",
  },

  // ---------------------------------------------------------------------
  // Signed-in "your account is backed up" summary (PR #33)
  //
  // Replaces the previous compact email + Sign out row with a proper
  // green-tinted card that confirms the account is protected. Gives
  // users clear positive feedback that their data is safe.
  // ---------------------------------------------------------------------
  accountBackedUpTitle: {
    en: "Your account is backed up",
    zu: "I-akhawunti yakho ilondoloziwe",
    st: "Akhaonto ea hao e bolokehile",
    af: "Jou rekening is gerugsteun",
  },
  accountBackedUpSub: {
    en: "Sign in with the same details from any phone to restore your business data.",
    zu: "Ngena ngemininingwane efanayo kunoma iyiphi ifoni ukubuyisa idatha yakho yebhizinisi.",
    st: "Kena ka lintlha tse tšoanang ho tsoa foneng efe kapa efe ho khutlisa data ea khoebo ea hao.",
    af: "Meld met dieselfde besonderhede aan vanaf enige foon om jou besigheidsdata te herstel.",
  },

  // Email magic-link auth
  authSignedInAs: {
    en: "Signed in as",
    zu: "Ungene njengo",
    st: "U kentse joalo ka",
    af: "Ingeteken as",
  },
  authSignedInDesc: {
    en: "Your data is safe. You can sign in from any device with this email.",
    zu: "Idatha yakho iphephile. Ungangena kunoma iyiphi idivayisi nge-imeyili.",
    st: "Data ea hao e bolokehile. U ka kena ho tsoa khonopheng efe kapa efe ka email ena.",
    af: "Jou data is veilig. Jy kan met hierdie e-pos vanaf enige toestel inteken.",
  },
  authSignOut: { en: "Sign out", zu: "Phuma", st: "Tsoa", af: "Teken uit" },

  authEmailLabel: { en: "Email", zu: "I-imeyili", st: "Email", af: "E-pos" },
  authEmailPlaceholder: {
    en: "you@example.com",
    zu: "wena@isibonelo.com",
    st: "uena@mohlala.com",
    af: "jy@voorbeeld.com",
  },

  authSaveDataCta: {
    en: "Send verification link",
    zu: "Thumela isixhumanisi sokuqinisekisa",
    st: "Romela sehokelo sa netefatso",
    af: "Stuur bevestigingskakel",
  },
  authAlreadyHaveAccount: {
    en: "Already have an account? Sign in",
    zu: "Usenayo i-akhawunti? Ngena",
    st: "U se u na le akhaonto? Kena",
    af: "Het reeds 'n rekening? Teken in",
  },

  authSignInHeader: {
    en: "Sign in to your account",
    zu: "Ngena ku-akhawunti yakho",
    st: "Kena akhaontong ea hao",
    af: "Teken in by jou rekening",
  },
  authSignInDesc: {
    en: "We'll email you a magic link — click it on this device.",
    zu: "Sizokuthumelela isixhumanisi nge-imeyili — sicindezele kule divayisi.",
    st: "Re tla u romella sehokelo ka email — se tobetse khonopheng ena.",
    af: "Ons stuur vir jou 'n toorkakel per e-pos — klik dit op hierdie toestel.",
  },
  authSignInCta: {
    en: "Send sign-in link",
    zu: "Thumela isixhumanisi sokungena",
    st: "Romela sehokelo sa ho kena",
    af: "Stuur intekenskakel",
  },
  authBackToSave: {
    en: "Back — save this account instead",
    zu: "Emuva — gcina le akhawunti",
    st: "Morao — boloka akhaonto ena",
    af: "Terug — stoor eerder hierdie rekening",
  },

  authPendingVerificationTitle: {
    en: "Check your inbox 📬",
    zu: "Hlola ibhokisi yakho 📬",
    st: "Sheba email ea hao 📬",
    af: "Kyk in jou inkassie 📬",
  },
  authPendingVerification: {
    en: "We sent a verification link to {email}. Click it on this device to save your account.",
    zu: "Sithumele isixhumanisi sokuqinisekisa ku-{email}. Sicindezele kule divayisi ukugcina i-akhawunti yakho.",
    st: "Re rometse sehokelo sa netefatso ho {email}. Se tobetse khonopheng ena ho boloka akhaonto ea hao.",
    af: "Ons het 'n bevestigingskakel na {email} gestuur. Klik dit op hierdie toestel om jou rekening te stoor.",
  },
  authPendingSigninTitle: {
    en: "Magic link sent 📬",
    zu: "Isixhumanisi sithunyelwe 📬",
    st: "Sehokelo se rometsoe 📬",
    af: "Toorkakel gestuur 📬",
  },
  authPendingSignin: {
    en: "We sent a sign-in link to {email}. Open it on the device you want to use.",
    zu: "Sithumele isixhumanisi sokungena ku-{email}. Sicindezele kudivayisi ofuna ukuyisebenzisa.",
    st: "Re rometse sehokelo sa ho kena ho {email}. Se bule khonopheng eo u batlang ho e sebelisa.",
    af: "Ons het 'n intekenskakel na {email} gestuur. Maak dit oop op die toestel wat jy wil gebruik.",
  },
  authPendingExpires: {
    en: "The link expires in 1 hour. Didn't get it? Check spam.",
    zu: "Isixhumanisi siphelelwa ehoreni. Awusitholanga? Hlola i-spam.",
    st: "Sehokelo se felella hora e le 'ngoe. Ha oa se fumana? Sheba spam.",
    af: "Die skakel verval oor 1 uur. Nie ontvang nie? Kyk in gemorspos.",
  },
  authDismiss: { en: "Dismiss", zu: "Chitha", st: "Tlohela", af: "Sluit" },
  authTryAnother: {
    en: "Use a different email",
    zu: "Sebenzisa enye i-imeyili",
    st: "Sebelisa email e 'ngoe",
    af: "Gebruik 'n ander e-pos",
  },
  authInvalidEmail: {
    en: "Please enter a valid email",
    zu: "Sicela ufake i-imeyili evumelekile",
    st: "Ka kopo kenya email e nepahetseng",
    af: "Voer asseblief 'n geldige e-pos in",
  },
  authSending: {
    en: "Sending...",
    zu: "Iyathunyelwa...",
    st: "E ntse e romelloa...",
    af: "Besig om te stuur...",
  },

  // ---------------------------------------------------------------------
  // Payments (Yoco automated contributions)
  // ---------------------------------------------------------------------
  sectionPayments: {
    en: "Payments",
    zu: "Izinkokhelo",
    st: "Litefello",
    af: "Betalings",
  },
  payDescription: {
    en: "Let members pay their contribution directly in the app via PayShap or card. Money lands in your Yoco account — KasiKash never touches it.",
    zu: "Vumela amalungu akhokhe iminikelo yawo ohlelweni ngePayShap noma ngekhadi. Imali ifika ku-akhawunti yakho ye-Yoco — iKasiKash ayilibambi.",
    st: "Lumella litho ho lefa menehelo ea bona ka kotloloho app ka PayShap kapa karete. Chelete e fihla akhaontong ea hao ea Yoco — KasiKash ha e e ame.",
    af: "Laat lede hul bydrae direk in die app betaal via PayShap of kaart. Geld beland in jou Yoco-rekening — KasiKash raak dit nooit aan nie.",
  },
  payConfiguredTitle: {
    en: "Automated payments active",
    zu: "Izinkokhelo ezizenzakalelayo zisebenza",
    st: "Litefello tse iketsang li a sebetsa",
    af: "Outomatiese betalings aktief",
  },
  payConfiguredLive: {
    en: "Real money moves via your Yoco account.",
    zu: "Imali yangempela ihamba nge-akhawunti yakho ye-Yoco.",
    st: "Chelete ea sebele e tsamaea ka akhaonto ea hao ea Yoco.",
    af: "Regte geld beweeg deur jou Yoco-rekening.",
  },
  payConfiguredTest: {
    en: "Sandbox mode — no real money moves. Great for demos.",
    zu: "Imodi yezingcezu — akukho mali yangempela. Kuhle ukubonisa.",
    st: "Mokhoa oa mohlala — ha ho chelete ea sebele. Ho hotle bakeng sa lipontšo.",
    af: "Toets-modus — geen regte geld beweeg nie. Ideaal vir demo's.",
  },
  payBadgeLive: { en: "LIVE", zu: "PHILA", st: "PHELA", af: "LEWE" },
  payBadgeTest: { en: "TEST", zu: "IHLOLA", st: "TEKO", af: "TOETS" },
  payAutoBadge: { en: "Auto", zu: "Ngokuzenzakalelayo", st: "Iketsang", af: "Outo" },
  payTestBadge: { en: "Test", zu: "Ihlolwa", st: "Teko", af: "Toets" },
  payUpdateKey: {
    en: "Update Yoco key",
    zu: "Buyekeza ukhiye we-Yoco",
    st: "Ntlafatsa senotlolo sa Yoco",
    af: "Werk Yoco-sleutel op",
  },
  paySecretLabel: {
    en: "Yoco secret key",
    zu: "Ukhiye oyimfihlo we-Yoco",
    st: "Senotlolo sa lekunutu sa Yoco",
    af: "Yoco-geheime sleutel",
  },
  paySecretPlaceholder: {
    en: "sk_live_...  or  sk_test_...",
    zu: "sk_live_...  noma  sk_test_...",
    st: "sk_live_...  kapa  sk_test_...",
    af: "sk_live_...  of  sk_test_...",
  },
  paySecretHint: {
    en: "Find this in your Yoco dashboard → Developers → API keys.",
    zu: "Yitholele ku-dashibhodi yakho ye-Yoco → Developers → API keys.",
    st: "E fumane ho dashboard ea hao ea Yoco → Developers → API keys.",
    af: "Vind dit in jou Yoco-dashboard → Developers → API keys.",
  },
  paySecretInvalid: {
    en: "That doesn't look like a valid Yoco secret key.",
    zu: "Lokhu akubukeki njengokhiye we-Yoco ovumelekile.",
    st: "Seo ha se bonahale se le senotlolo se nepahetseng sa Yoco.",
    af: "Dit lyk nie soos 'n geldige Yoco-geheime sleutel nie.",
  },
  payModeLabel: {
    en: "Mode",
    zu: "Imodi",
    st: "Mokhoa",
    af: "Modus",
  },
  payModeTest: {
    en: "Test (sandbox)",
    zu: "Ihlola (i-sandbox)",
    st: "Teko (sandbox)",
    af: "Toets (sandbox)",
  },
  payModeLive: {
    en: "Live (real money)",
    zu: "Iphila (imali yangempela)",
    st: "Phela (chelete ea sebele)",
    af: "Lewend (regte geld)",
  },
  paySaveCta: {
    en: "Turn on payments",
    zu: "Vula izinkokhelo",
    st: "Bulela litefello",
    af: "Skakel betalings aan",
  },
  paySaving: {
    en: "Setting up...",
    zu: "Kusethwa...",
    st: "Ho behoa...",
    af: "Besig om op te stel...",
  },
  paySaved: {
    en: "Payments turned on. Members can now contribute in-app.",
    zu: "Izinkokhelo zivuliwe. Amalungu manje angakwazi ukunikela ohlelweni.",
    st: "Litefello li buletsoe. Litho joale li ka kenya menehelo ho app.",
    af: "Betalings is aan. Lede kan nou binne die app bydra.",
  },
  payCancel: {
    en: "Cancel",
    zu: "Khansela",
    st: "Hlakola",
    af: "Kanselleer",
  },
  payFeeNote: {
    en: "KasiKash charges 0% platform fee. Yoco charges their standard ~3% + R2 per transaction to your merchant account.",
    zu: "IKasiKash ikhokhisa u-0% kwezinkokhelo zohlaka. IYoco ikhokhisa u-3% + R2 emalini yakho njengenkokhelo yayo.",
    st: "KasiKash e patela 0% ea tefo ea sethala. Yoco e patela ~3% + R2 ka tefello ho akhaontong ea hao ea marikanta.",
    af: "KasiKash hef 0% platformfooi. Yoco hef hul standaard ~3% + R2 per transaksie op jou handelaarsrekening.",
  },

  // Member-side payment flow
  payOpeningCheckout: {
    en: "Opening Yoco payment...",
    zu: "Kuvulwa inkokhelo ye-Yoco...",
    st: "Ho buloa tefello ea Yoco...",
    af: "Yoco-betaling word oopgemaak...",
  },

  // Contribute sheet — used every time a member taps an amount.
  // We deliberately never silently record a contribution: the sheet
  // makes it explicit whether real money is moving (Yoco path) or the
  // user is logging a payment they made outside the app (EFT / cash).
  contribCustom: { en: "Custom", zu: "Enye inani", st: "Chelete e nngwe", af: "Pasgemaak" },
  contribSheetTitle: {
    en: "Contribute to",
    zu: "Nikela ku",
    st: "Kenya ho",
    af: "Dra by tot",
  },
  contribAmountLabel: {
    en: "Amount (R)",
    zu: "Inani (R)",
    st: "Chelete (R)",
    af: "Bedrag (R)",
  },
  contribNoteLabel: {
    en: "Note (optional)",
    zu: "Inothi (ayidingekile)",
    st: "Noutu (ha e hlokahale)",
    af: "Nota (opsioneel)",
  },
  contribNotePlaceholder: {
    en: "e.g. May 2026, EFT ref 45782",
    zu: "isb. Meyi 2026, EFT ref 45782",
    st: "mohlala Mots'eanong 2026, EFT ref 45782",
    af: "bv. Mei 2026, EFT verw 45782",
  },
  contribPayYocoBtn: {
    en: "Pay with card",
    zu: "Khokha ngekhadi",
    st: "Lefa ka karete",
    af: "Betaal met kaart",
  },
  contribPayYocoHelp: {
    en: "You'll be taken to a secure Yoco checkout. Money moves right away.",
    zu: "Uzothathelwa ekhukhuthini eliphephile le-Yoco. Imali ihamba khona manje.",
    st: "U tla isoa ho khekhaote e sirelelitsoeng ea Yoco. Chelete e tsamaea hang.",
    af: "Jy sal na 'n veilige Yoco-betaalpunt geneem word. Geld beweeg dadelik.",
  },
  contribLogEftBtn: {
    en: "Log payment (EFT / cash)",
    zu: "Bhalisa inkokhelo (i-EFT / imali)",
    st: "Ngola tefello (EFT / chelete)",
    af: "Teken betaling aan (EFT / kontant)",
  },
  contribManualExplain: {
    en: "Automatic card payments aren't set up for this stokvel yet, so the app can't move money for you. Pay via EFT, bank transfer, or cash first, then tap below to record it. The admin will see it and can confirm it.",
    zu: "Izinkokhelo ezizenzakalelayo zamakhadi azikasetheki kulesi stokvel, ngakho i-app ayikwazi ukukuhambisela imali. Qala ukhokhe nge-EFT, nge-bank transfer noma ngemali, bese uthepha ngezansi ukuze uyibhalise. Umphathi uzoyibona futhi uzoyiqinisekisa.",
    st: "Litefello tsa likarete tse iketsang ha li so lokisetsoe stokvel ee, kahoo app e ke ke ea u tsamaisetsa chelete. Qala ka ho lefa ka EFT, phetisetso ea banka, kapa chelete e phahameng, ebe u tobetsa tlase ho e ngola. Molaodi o tla e bona a bile a ka e netefatsa.",
    af: "Outomatiese kaartbetalings is nog nie vir hierdie stokvel opgestel nie, so die app kan nie geld vir jou verskuif nie. Betaal eers via EFT, bankoorplasing of kontant, tik dan hieronder om dit aan te teken. Die admin sal dit sien en kan dit bevestig.",
  },
  contribManualBadge: {
    en: "Recorded — not yet paid via app",
    zu: "Ibhalisiwe — ayikakhokhwa nge-app",
    st: "E ngotsoe — ha e e-so lefeloe ka app",
    af: "Aangeteken — nog nie via app betaal nie",
  },
  contribInvalidAmount: {
    en: "Enter an amount greater than R0",
    zu: "Faka inani elingaphezu kuka-R0",
    st: "Kenya chelete e fetang R0",
    af: "Voer 'n bedrag groter as R0 in",
  },
  contribSetupYocoCTA: {
    en: "Admin: set up Yoco in Settings for automatic card payments",
    zu: "Umphathi: setha i-Yoco kuma-Settings ukuze uthole izinkokhelo ezizenzakalelayo zekhadi",
    st: "Molaodi: lokisa Yoco ho Litlhophiso bakeng sa litefello tse iketsang tsa karete",
    af: "Admin: stel Yoco op in Instellings vir outomatiese kaartbetalings",
  },
  contribSetupBankingCTA: {
    en: "Admin: add your stokvel bank details in Settings so members can pay you in.",
    zu: "Umphathi: engeza imininingwane yebhange lestokvel kuma-Settings ukuze amalungu akwazi ukukhokha.",
    st: "Molaodi: kenya lintlha tsa banka tsa stokvel ho Litlhophiso hore litho li kgone ho u lefa.",
    af: "Admin: voeg jou stokvel se bankbesonderhede in Instellings by sodat lede jou kan betaal.",
  },
  contribCancel: { en: "Cancel", zu: "Khansela", st: "Hlakola", af: "Kanselleer" },

  // Bank-transfer contribution flow (migration 007)
  contribMethodBank: {
    en: "Bank transfer",
    zu: "Idlulisela lebhange",
    st: "Phetisetso ea banka",
    af: "Bankoorplasing",
  },
  contribMethodCard: {
    en: "Card",
    zu: "Ikhadi",
    st: "Karete",
    af: "Kaart",
  },
  contribBankExplain: {
    en: "Transfer the amount from your banking app using these details. Use the reference below so the admin can match your payment. Once you've paid, tap the button at the bottom to record it — the admin will verify and confirm.",
    zu: "Dlulisa imali kusuka ku-app yakho yebhange usebenzisa le mininingwane. Sebenzisa inkomba engezansi ukuze umphathi ahlanganise inkokhelo yakho. Uma usukhokhile, thepha inkinobho engezansi ukuze uyibhalise — umphathi uzoyihlola futhi ayiqinisekise.",
    st: "Fetisetsa chelete ho tsoa ho app ea hao ea banka u sebelisa lintlha tsena. Sebelisa noutu e ka tlaase hore molaodi a kgone ho amanya tefello ea hao. Ha u qeta ho lefa, tobetsa konopo e ka tlaase ho e ngola — molaodi o tla e hlahloba a bile a e netefatse.",
    af: "Plaas die bedrag oor vanaf jou bank-app met hierdie besonderhede. Gebruik die verwysing hieronder sodat die admin jou betaling kan opspoor. Nadat jy betaal het, tik die knoppie onderaan om dit aan te teken — die admin sal dit verifieer en bevestig.",
  },
  contribBankIvePaid: {
    en: "I've paid — record it",
    zu: "Sengikhokhile — kubhalise",
    st: "Ke lefile — e ngole",
    af: "Ek het betaal — teken dit aan",
  },
  contribBankWhatsAppMessage: {
    en: "Hi — I've just paid {amount} to the {stokvel} stokvel account. Reference: {reference}. Please confirm in KasiKash when it arrives.",
    zu: "Sawubona — Ngikhokhe {amount} ku-akhawunti ye-{stokvel} stokvel. Inkomba: {reference}. Sicela uqinisekise ku-KasiKash uma ifika.",
    st: "Lumela — ke qeta ho lefa {amount} ho akhaonto ea {stokvel} stokvel. Noutu: {reference}. Ka kopo netefatsa ho KasiKash ha e fihla.",
    af: "Hallo — ek het pas {amount} aan die {stokvel} stokvel-rekening betaal. Verwysing: {reference}. Bevestig asseblief in KasiKash wanneer dit aankom.",
  },
  bankName: { en: "Bank", zu: "Ibhange", st: "Banka", af: "Bank" },
  bankAccountHolder: {
    en: "Account holder",
    zu: "Umnini we-akhawunti",
    st: "Mong'a akhaonto",
    af: "Rekeninghouer",
  },
  bankAccountNumber: {
    en: "Account number",
    zu: "Inombolo ye-akhawunti",
    st: "Nomoro ea akhaonto",
    af: "Rekeningnommer",
  },
  bankBranchCode: {
    en: "Branch code",
    zu: "Ikhodi yegatsha",
    st: "Khoutu ea lekala",
    af: "Takkode",
  },
  bankPayshapPhone: {
    en: "PayShap number",
    zu: "Inombolo ye-PayShap",
    st: "Nomoro ea PayShap",
    af: "PayShap-nommer",
  },
  bankReference: {
    en: "Reference",
    zu: "Inkomba",
    st: "Noutu",
    af: "Verwysing",
  },
  bankCopyDetails: {
    en: "Copy details",
    zu: "Kopisha imininingwane",
    st: "Kopa lintlha",
    af: "Kopieer besonderhede",
  },
  bankCopied: {
    en: "Copied!",
    zu: "Kukopishiwe!",
    st: "Ho kopitsoe!",
    af: "Gekopieer!",
  },

  // Pending verification section on the Stokvel screen (admin queue +
  // members' read-only view of their own pending contributions).
  pendingSectionTitle: {
    en: "Awaiting verification",
    zu: "Kulindelwe ukuqinisekiswa",
    st: "E emetse netefatso",
    af: "Wag vir verifikasie",
  },
  pendingAdminSubtitle: {
    en: "Confirm each payment once you see it in your bank account.",
    zu: "Qinisekisa inkokhelo ngayinye lapho uyibona ku-akhawunti yakho yebhange.",
    st: "Netefatsa tefello ka nngwe ha u e bona ho akhaonto ea hao ea banka.",
    af: "Bevestig elke betaling sodra jy dit in jou bankrekening sien.",
  },
  pendingMemberSubtitle: {
    en: "The admin will confirm when your payment arrives.",
    zu: "Umphathi uzokuqinisekisa uma inkokhelo yakho ifika.",
    st: "Molaodi o tla netefatsa ha tefello ea hao e fihla.",
    af: "Die admin sal bevestig wanneer jou betaling aankom.",
  },
  pendingBadge: {
    en: "Pending",
    zu: "Kulindiwe",
    st: "E emetse",
    af: "Hangende",
  },
  rejectedBadge: {
    en: "Rejected",
    zu: "Yenqatshwe",
    st: "E hanngoe",
    af: "Verwerp",
  },
  verifyConfirmBtn: { en: "Confirm", zu: "Qinisekisa", st: "Netefatsa", af: "Bevestig" },
  verifyRejectBtn: { en: "Reject", zu: "Yenqabe", st: "Hana", af: "Verwerp" },
  verifyRejectPromptTitle: {
    en: "Reject this payment?",
    zu: "Yenqabe le nkokhelo?",
    st: "Hana tefello ena?",
    af: "Verwerp hierdie betaling?",
  },
  verifyRejectPromptBody: {
    en: "This will mark the payment as not received. Add a short note (optional) so the member knows why.",
    zu: "Lokhu kuzokwenza inkokhelo ibonakale ingatholakalanga. Faka inothi elifushane (ayikho phoqelelo) ukuze ilungu lazi ukuthi kungani.",
    st: "Sena se tla tšoaea tefello e sa amoheloa. Kenya noutu e khutšoanyane (ha e hlokahale) hore setho se tsebe hore hobaneng.",
    af: "Hierdie sal die betaling as nie ontvang nie merk. Voeg 'n kort nota (opsioneel) sodat die lid weet hoekom.",
  },
  verifyRejectReasonPlaceholder: {
    en: "e.g. no matching transfer found",
    zu: "isb. akutholakali okuhambisanayo",
    st: "mohlala ha ho phetisetso e tšoanang",
    af: "bv. geen passende oorplasing gevind nie",
  },

  // Settings screen: banking section (admin-only)
  settingsBankingHeader: {
    en: "Stokvel banking",
    zu: "Ibhange lestokvel",
    st: "Banka ea stokvel",
    af: "Stokvel-bankwese",
  },
  settingsBankingSub: {
    en: "Where members send their contributions. Only visible to stokvel members.",
    zu: "Lapho amalungu athumelela khona iminikelo yawo. Ibonakala kumalungu estokvel kuphela.",
    st: "Moo litho li romellang menehelo ea tsona. E bonoa ke litho tsa stokvel feela.",
    af: "Waar lede hul bydraes stuur. Slegs sigbaar vir stokvel-lede.",
  },
  settingsBankingPlaceholderBank: {
    en: "e.g. Capitec, Standard Bank, FNB",
    zu: "isb. Capitec, Standard Bank, FNB",
    st: "mohlala Capitec, Standard Bank, FNB",
    af: "bv. Capitec, Standard Bank, FNB",
  },
  settingsBankingPlaceholderHolder: {
    en: "Name as it appears on the account",
    zu: "Igama njengoba livela ku-akhawunti",
    st: "Lebitso jwalo ka ha le hlaha akhaontong",
    af: "Naam soos dit op die rekening verskyn",
  },
  settingsBankingPlaceholderAccount: {
    en: "10-digit account number",
    zu: "Inombolo ye-akhawunti yamanani angu-10",
    st: "Nomoro ea akhaonto ea linomoro tse 10",
    af: "10-syfer rekeningnommer",
  },
  settingsBankingPlaceholderBranch: {
    en: "e.g. 250655",
    zu: "isb. 250655",
    st: "mohlala 250655",
    af: "bv. 250655",
  },
  settingsBankingPlaceholderPayshap: {
    en: "Cellphone number linked to PayShap (optional)",
    zu: "Inombolo yefoni exhunywe ne-PayShap (ayidingekile)",
    st: "Nomoro ea mohala e hokahaneng le PayShap (ha e hlokahale)",
    af: "Selnommer wat aan PayShap gekoppel is (opsioneel)",
  },
  settingsBankingSave: {
    en: "Save banking details",
    zu: "Gcina imininingwane yebhange",
    st: "Boloka lintlha tsa banka",
    af: "Stoor bankbesonderhede",
  },
  settingsBankingSaved: {
    en: "Saved ✓",
    zu: "Kugciniwe ✓",
    st: "Bolokoa ✓",
    af: "Gestoor ✓",
  },
  settingsBankingClearAll: {
    en: "Clear all banking details",
    zu: "Sula yonke imininingwane yebhange",
    st: "Hlakola lintlha tsohle tsa banka",
    af: "Vee alle bankbesonderhede uit",
  },

  // ---------------------------------------------------------------------
  // PWA "Add to Home Screen" (PR #29)
  //
  // Pilot users kept re-opening the WhatsApp invite link every
  // session because they didn't know they could add the web app
  // to their home screen. These strings drive the install banner
  // on Home, the install section in Settings, and the InstallSheet
  // modal with platform-specific instructions.
  // ---------------------------------------------------------------------
  installBannerTitle: {
    en: "Save KasiKash to your home screen",
    zu: "Londoloza i-KasiKash esikrinini sakho sasekhaya",
    st: "Boloka KasiKash skrineng sa hao sa lehae",
    af: "Stoor KasiKash op jou tuisskerm",
  },
  installBannerSub: {
    en: "Opens like a real app. Works offline.",
    zu: "Ivuleka njengohlelo lokusebenza. Isebenza ngaphandle kwe-inthanethi.",
    st: "E buleha joalo ka applikeishene ea sebele. E sebetsa ntle le inthanete.",
    af: "Maak oop soos 'n regte app. Werk vanlyn.",
  },
  installBannerDismiss: {
    en: "Not now",
    zu: "Hhayi manje",
    st: "E seng hona joale",
    af: "Nie nou nie",
  },
  installBannerAction: {
    en: "Install",
    zu: "Faka",
    st: "Kenya",
    af: "Installeer",
  },
  installSettingsHeader: {
    en: "Install on this phone",
    zu: "Faka kule foni",
    st: "Kenya foneng ena",
    af: "Installeer op hierdie foon",
  },
  installSettingsSub: {
    en: "Adds a KasiKash icon to your home screen so you can open it in one tap — no browser needed.",
    zu: "Yengeza isithombe se-KasiKash esikrinini sakho sasekhaya ukuze uyivule ngokucindezela okukodwa — akudingi isiphequluli.",
    st: "Kenya letšoao la KasiKash skrineng sa hao sa lehae hore u tle u e bule ka ho tobetsa hang — ha ho hlokahale sebatli.",
    af: "Voeg 'n KasiKash-ikoon by jou tuisskerm sodat jy dit met een tik kan oopmaak — geen blaaier nodig nie.",
  },
  installSettingsButton: {
    en: "Add to home screen",
    zu: "Engeza esikrinini sasekhaya",
    st: "Kenya skrineng sa lehae",
    af: "Voeg by tuisskerm",
  },
  installSettingsAlreadyInstalled: {
    en: "KasiKash is already installed on this phone.",
    zu: "I-KasiKash isivele ifakiwe kule foni.",
    st: "KasiKash e se e kentsoe foneng ena.",
    af: "KasiKash is reeds op hierdie foon geïnstalleer.",
  },
  installTitle: {
    en: "Add KasiKash to your home screen",
    zu: "Engeza i-KasiKash esikrinini sakho sasekhaya",
    st: "Kenya KasiKash skrineng sa hao sa lehae",
    af: "Voeg KasiKash by jou tuisskerm",
  },
  installSub: {
    en: "Opens full-screen like a normal app. Icon on your home screen. Works offline for logged sales.",
    zu: "Ivuleka isikrini esigcwele njengohlelo lokusebenza lujwayelekile. Isithombe esikrinini sakho sasekhaya. Isebenza ngaphandle kwe-inthanethi lapho kunikelwa ukudayisa.",
    st: "E buleha skrineng se felletseng joalo ka applikeishene e tloaelehileng. Letšoao le skrineng sa hao sa lehae. E sebetsa ntle le inthanete bakeng sa thekiso e ngotsoeng.",
    af: "Maak volskerm oop soos 'n gewone app. Ikoon op jou tuisskerm. Werk vanlyn vir aangetekende verkope.",
  },
  installAndroidCta: {
    en: "Install now",
    zu: "Faka manje",
    st: "Kenya hona joale",
    af: "Installeer nou",
  },
  installAndroidDone: {
    en: "Installed! Look for the KasiKash icon on your home screen.",
    zu: "Isifakiwe! Bheka isithombe se-KasiKash esikrinini sakho sasekhaya.",
    st: "E kentsoe! Sheba letšoao la KasiKash skrineng sa hao sa lehae.",
    af: "Geïnstalleer! Soek die KasiKash-ikoon op jou tuisskerm.",
  },
  installAndroidManualTitle: {
    en: "How to add it manually",
    zu: "Indlela yokwengeza mathupha",
    st: "Mokhoa oa ho e kenya ka letsoho",
    af: "Hoe om dit handmatig by te voeg",
  },
  installAndroidManualStep1: {
    en: "Tap the three-dot menu at the top-right of Chrome.",
    zu: "Cindezela imenyu enamachashazi amathathu phezulu kwesokudla e-Chrome.",
    st: "Tobetsa menu ea likhutlo tse tharo holimo ho ka lehlakoreng le letona la Chrome.",
    af: "Tik die drie-kolletjie kieslys aan die regs bo van Chrome.",
  },
  installAndroidManualStep2: {
    en: "Choose Install app, or Add to home screen.",
    zu: "Khetha Faka uhlelo lokusebenza, noma Engeza esikrinini sasekhaya.",
    st: "Kgetha Kenya applikeishene, kapa Kenya skrineng sa lehae.",
    af: "Kies Installeer app, of Voeg by tuisskerm.",
  },
  installAndroidManualStep3: {
    en: "Confirm. The icon will appear on your home screen.",
    zu: "Qinisekisa. Isithombe sizovela esikrinini sakho sasekhaya.",
    st: "Netefatsa. Letšoao le tla hlaha skrineng sa hao sa lehae.",
    af: "Bevestig. Die ikoon sal op jou tuisskerm verskyn.",
  },
  installIOSStep1Title: {
    en: "Tap the Share icon",
    zu: "Cindezela isithonjana Sokwabelana",
    st: "Tobetsa letšoao la Ho arolelana",
    af: "Tik die Deel-ikoon",
  },
  installIOSStep1Body: {
    en: "It's the square with an up-arrow at the bottom of Safari (or top-right on iPad).",
    zu: "Yisikwele esinomcibisholo obhekile phezulu ezansi kwe-Safari (noma phezulu kwesokudla ku-iPad).",
    st: "Ke square e nang le motsu o holimo tlaase ho Safari (kapa holimo ho ka lehlakoreng le letona ho iPad).",
    af: "Dit is die vierkant met 'n op-pyltjie aan die onderkant van Safari (of regs bo op iPad).",
  },
  installIOSStep2Title: {
    en: "Choose \"Add to Home Screen\"",
    zu: "Khetha \"Engeza Esikrinini Sasekhaya\"",
    st: "Kgetha \"Kenya Skrineng sa Lehae\"",
    af: "Kies \"Voeg by tuisskerm\"",
  },
  installIOSStep2Body: {
    en: "You may need to scroll the share menu down to find it.",
    zu: "Ungase kudingeke ukwehlise imenyu yokwabelana ukuyithola.",
    st: "U ka 'na ua tlameha ho theola menu ea ho arolelana ho e fumana.",
    af: "Jy mag dalk in die deel-kieslys moet afskuif om dit te vind.",
  },
  installIOSStep3Title: {
    en: "Tap Add",
    zu: "Cindezela Engeza",
    st: "Tobetsa Kenya",
    af: "Tik Voeg by",
  },
  installIOSStep3Body: {
    en: "KasiKash will appear as an icon on your home screen like any other app.",
    zu: "I-KasiKash izovela njengesithombe esikrinini sakho sasekhaya njengalo lonke olunye uhlelo lokusebenza.",
    st: "KasiKash e tla hlaha e le letšoao skrineng sa hao sa lehae joalo ka applikeishene efe kapa efe e ngoe.",
    af: "KasiKash sal as 'n ikoon op jou tuisskerm verskyn soos enige ander app.",
  },
  installDesktopHint: {
    en: "You're on a laptop or desktop. Install works best on a phone — open kasikash.com on your phone's browser to add it to your home screen.",
    zu: "Uku-laptop noma i-desktop. Ukufaka kusebenza kangcono efonini — vula i-kasikash.com kubhrawuza yefoni yakho ukuze uyifake esikrinini sakho sasekhaya.",
    st: "U mo laptop kapa desktop. Ho kenya ho sebetsa hantle mo foneng — bula kasikash.com sebatling sa fone ea hao ho e kenya skrineng sa hao sa lehae.",
    af: "Jy is op 'n skootrekenaar of tafelrekenaar. Installeer werk die beste op 'n foon — maak kasikash.com in jou foon se blaaier oop om dit by jou tuisskerm te voeg.",
  },
  installOtherMobileHint: {
    en: "Your browser doesn't support one-tap install. Try opening kasikash.com in Chrome (Android) or Safari (iPhone) to add it to your home screen.",
    zu: "Isiphequluli sakho asisekeli ukufaka ngokucindezela okukodwa. Zama ukuvula i-kasikash.com ku-Chrome (Android) noma i-Safari (iPhone) ukuze uyifake esikrinini sakho sasekhaya.",
    st: "Sebatli sa hao ha se tšehetse ho kenya ka ho tobetsa hang. Leka ho bula kasikash.com ho Chrome (Android) kapa Safari (iPhone) ho e kenya skrineng sa hao sa lehae.",
    af: "Jou blaaier ondersteun nie een-tik installeer nie. Probeer om kasikash.com in Chrome (Android) of Safari (iPhone) oop te maak om dit by jou tuisskerm te voeg.",
  },
  installFooterNote: {
    en: "You can uninstall any time by pressing and holding the icon on your home screen.",
    zu: "Ungayikhipha noma nini ngokucindezela nokubamba isithombe esikrinini sakho sasekhaya.",
    st: "U ka tlosa neng kapa neng ka ho tobetsa le ho tšoara letšoao skrineng sa hao sa lehae.",
    af: "Jy kan dit enige tyd verwyder deur die ikoon op jou tuisskerm in te druk en vas te hou.",
  },

  // ---------------------------------------------------------------------
  // Stokvel banking empty-state prompt (PR #29)
  //
  // Instead of hiding banking behind Settings, admins now see a
  // prominent empty-state card at the top of their Stokvel screen
  // when banking isn't configured. Tap → opens a bottom sheet
  // with the same fields available in Settings.
  // ---------------------------------------------------------------------
  stokvelBankingEmptyTitle: {
    en: "Add banking so members can pay you",
    zu: "Engeza ibhange ukuze amalungu akwazi ukukukhokhela",
    st: "Kenya banka hore litho li khone ho u lefa",
    af: "Voeg bank by sodat lede jou kan betaal",
  },
  stokvelBankingEmptyBody: {
    en: "Once your banking is set up, members can copy your details or share your PayShap number with one tap.",
    zu: "Uma nje ibhange lakho selokwe, amalungu angakopi imininingwane yakho noma abelane ngenombolo yakho ye-PayShap ngokucindezela okukodwa.",
    st: "Ha panka ea hao e se e beiloe, litho li ka kopa lintlha tsa hao kapa arolelana nomoro ea hao ea PayShap ka ho tobetsa hang.",
    af: "Sodra jou bank opgestel is, kan lede jou besonderhede kopieer of jou PayShap-nommer met een tik deel.",
  },
  stokvelBankingEmptyCta: {
    en: "Set up banking",
    zu: "Setha ibhange",
    st: "Beha banka",
    af: "Stel bankbesonderhede op",
  },
  stokvelBankingSheetTitle: {
    en: "Banking details",
    zu: "Imininingwane yebhange",
    st: "Lintlha tsa banka",
    af: "Bankbesonderhede",
  },
  stokvelBankingSheetSub: {
    en: "Only the admin sees these fields. Members see your details automatically when they tap Contribute.",
    zu: "Umlawuli kuphela obona lezi zinkambu. Amalungu abona imininingwane yakho ngokuzenzakalelayo lapho ecindezela Nikela.",
    st: "Ke mookameli feela ea bonang libaka tsena. Litho li bona lintlha tsa hao ho itaeng ha ba tobetsa Fana.",
    af: "Slegs die admin sien hierdie velde. Lede sien jou besonderhede outomaties wanneer hulle Bydra tik.",
  },
  stokvelBankingSheetSave: {
    en: "Save banking",
    zu: "Londoloza ibhange",
    st: "Boloka banka",
    af: "Stoor bank",
  },
  stokvelBankingSheetSaved: {
    en: "Banking saved ✓",
    zu: "Ibhange lilondoloziwe ✓",
    st: "Banka e bolokiloe ✓",
    af: "Bank gestoor ✓",
  },
  stokvelBankingMemberInfo: {
    en: "Admin hasn't set up banking yet. Ask them to add it so you can contribute.",
    zu: "Umlawuli akakalisethi ibhange okwamanje. Cela abengeze ukuze ukwazi ukunikela.",
    st: "Mookameli ha a e-so behe banka. Mo kope hore a e kenye hore u tle u fane.",
    af: "Admin het nog nie bank opgestel nie. Vra hulle om dit by te voeg sodat jy kan bydra.",
  },
  payReturnProcessing: {
    en: "Confirming your payment...",
    zu: "Kuqinisekiswa inkokhelo yakho...",
    st: "Ho netefatsa tefello ea hao...",
    af: "Bevestig jou betaling...",
  },
  payReturnSuccess: {
    en: "Payment received ✅",
    zu: "Inkokhelo itholiwe ✅",
    st: "Tefello e amohetsoe ✅",
    af: "Betaling ontvang ✅",
  },
  payReturnCancel: {
    en: "Payment cancelled. Try again when you're ready.",
    zu: "Inkokhelo ikhanseliwe. Zama futhi lapho usukulungele.",
    st: "Tefello e hlakoletsoe. Leka hape ha u lokile.",
    af: "Betaling gekanselleer. Probeer weer wanneer jy gereed is.",
  },
  payReturnFailed: {
    en: "Payment didn't go through. Your bank returned an error.",
    zu: "Inkokhelo ayiphelelanga. Ibhange lakho libuyisele iphutha.",
    st: "Tefello ha e a atleha. Panka ea hao e khutlisitse phoso.",
    af: "Betaling het nie deurgekom nie. Jou bank het 'n fout teruggestuur.",
  },
  payReturnClose: { en: "Close", zu: "Vala", st: "Koala", af: "Maak toe" },

  appVersion: { en: "KasiKash", zu: "KasiKash", st: "KasiKash", af: "KasiKash" },

  // ---------------------------------------------------------------------
  // KasiScore v2: tiers, factor names + explanations, PDF passport copy.
  // Full multilingual coverage (en / zu / st / af) so a user reading in
  // their home language sees the score breakdown and the generated
  // financial passport in that language.
  // ---------------------------------------------------------------------

  scoreTierBuilding: {
    en: "Building",
    zu: "Kuyakhiwa",
    st: "Ho ntse ho hahoa",
    af: "Besig om te bou",
  },

  scoreBreakdownTitle: {
    en: "What drives your score",
    zu: "Okwenza iskoro sakho",
    st: "Se etsang skoro ea hao",
    af: "Wat jou telling dryf",
  },
  scoreBreakdownSubtitle: {
    en: "Tap a factor to learn more.",
    zu: "Cindezela isici ukuze ufunde okwengeziwe.",
    st: "Tobetsa ntlha ho ithuta haholoanyane.",
    af: "Tik 'n faktor om meer te leer.",
  },
  scoreFactorContribToScore: {
    en: "+{pts} pts to your score",
    zu: "+{pts} amaphuzu esikorwini sakho",
    st: "+{pts} lintlha skoreng ea hao",
    af: "+{pts} punte tot jou telling",
  },

  // Factor names
  factorContribConsistency: {
    en: "Contribution consistency",
    zu: "Ukungayeki ukunikela",
    st: "Ho tsitsa ha menehelo",
    af: "Konsekwentheid van bydraes",
  },
  factorContribVolume: {
    en: "Contribution amount",
    zu: "Inani lokunikela",
    st: "Chelete e kentsoeng",
    af: "Bydrae-bedrag",
  },
  factorTabRepayment: {
    en: "Tab repayment",
    zu: "Ukukhokha izikweletu",
    st: "Ho lefa likoloto",
    af: "Skuldrekening-terugbetaling",
  },
  factorSalesActivity: {
    en: "Business activity",
    zu: "Umsebenzi webhizinisi",
    st: "Mosebetsi oa khoebo",
    af: "Besigheidsaktiwiteit",
  },
  factorTimeOnPlatform: {
    en: "Time with KasiKash",
    zu: "Isikhathi ne-KasiKash",
    st: "Nako le KasiKash",
    af: "Tyd saam met KasiKash",
  },
  factorProfileMaturity: {
    en: "Profile completeness",
    zu: "Ukugcwala kwephrofayela",
    st: "Ho phethahala ha profaele",
    af: "Profielvoltooiing",
  },
  factorRecentMomentum: {
    en: "Recent activity",
    zu: "Umsebenzi wakamuva",
    st: "Mosebetsi oa morao tjena",
    af: "Onlangse aktiwiteit",
  },

  // ---------------------------------------------------------------
  // "How your score works" overview — shown above the factor list
  // on Insights. Introduced after pilot feedback:
  //   "I'm confused just by having a score in my side the members
  //    also have a score and it has risen to 340 how?"
  // The three bullets cover the three questions that confusion
  // surfaces: whose activity counts, what "counts" means, and how
  // to read the numbers below.
  // ---------------------------------------------------------------
  scoreHowItWorksTitle: {
    en: "How your score works",
    zu: "Ukuthi iskoro sakho sisebenza kanjani",
    st: "Kamoo lintlha tsa hao li sebetsang kateng",
    af: "Hoe jou telling werk",
  },
  scoreHowItWorksBullet1: {
    en: "Only your own real activity counts — not other members', and not pending contributions.",
    zu: "Kubalwa kuphela okwenzayo wena mathupha — hhayi okwamanye amalungu, futhi hhayi iminikelo esalindile.",
    st: "Ho balloa mesebetsi ea hao feela — eseng ea litho tse ling, 'me eseng menehelo e sa emetseng.",
    af: "Net jou eie werklike aktiwiteit tel — nie ander lede se aktiwiteit nie, en nie hangende bydraes nie.",
  },
  scoreHowItWorksBullet2: {
    en: "Confirmed and bank-verified evidence counts more than self-declared activity.",
    zu: "Ubufakazi obuqinisekisiwe nobuqinisekiswe ngebhange bubalelwa kakhulu kunomsebenzi ozibhalele wona.",
    st: "Bopaki bo netefalitsoeng le bo netefalitsoeng ke banka bo bala haholo ho feta mesebetsi eo u ipolelang eona.",
    af: "Bevestigde en bank-geverifieerde bewyse tel meer as self-verklaarde aktiwiteit.",
  },
  scoreHowItWorksBullet3: {
    en: "Range: 300–850. Tap each factor below for what's driving it.",
    zu: "Ibanga: 300–850. Cindezela isici ngasinye ngezansi ukubona okusiqhubayo.",
    st: "Bophara: 300–850. Tobetsa ntlha e ngoe le e ngoe ka tlase ho bona se e susumetsang.",
    af: "Reikwydte: 300–850. Tik op elke faktor hieronder om te sien wat dit dryf.",
  },

  // Factor explanations (shown when a factor row is expanded).
  // Rewritten after pilot feedback to include (a) what the factor
  // actually measures with specifics, (b) how much it can move the
  // score by (weight), and (c) what counts vs what doesn't — the
  // "confirmed only, own contributions only" rule after PR #26.
  factorContribConsistencyExplain: {
    en: "How many of the last 8 weeks you had at least one confirmed stokvel contribution. Regular weekly contributions are the single biggest driver of your score. Worth up to 20%. Pending or rejected contributions don't count until an admin confirms them, and other members' contributions never count toward your score.",
    zu: "Ukuthi mangaki emavikini angu-8 adlule lapho ubunomnikelo owodwa oqinisekisiwe. Iminikelo ejwayelekile yamaviki iwumshini omkhulu wesikolo sakho. Ifika ku-20%. Iminikelo esalindile noma enqatshelwe ayibalwa kuze kwaqinisekiswe umlawuli, futhi iminikelo yamanye amalungu ayikaze ibalwe eskoreni sakho.",
    st: "Palo ea libeke tse 8 tse fetileng tseo u bileng le monehelo o le mong o netefalitsoeng. Menehelo e tloaelehileng ea beke le beke ke ntho e kholohali e susumetsang lintlha tsa hao. Ea fihla ho 20%. Menehelo e sa emetseng kapa e hanoeng ha e balloe ho fihlela mookameli a e netefatsa, 'me menehelo ea litho tse ling ha e balloe ho hang lintlheng tsa hao.",
    af: "Hoeveel van die laaste 8 weke jy ten minste een bevestigde stokvel-bydrae gehad het. Gereelde weeklikse bydraes is die grootste enkele drywer van jou telling. Werd tot 20%. Hangende of afgekeurde bydraes tel nie totdat 'n admin dit bevestig nie, en ander lede se bydraes tel nooit vir jou telling nie.",
  },
  factorContribVolumeExplain: {
    en: "Total value of your confirmed contributions compared to your stokvel's savings goal. Yoco or bank-verified contributions carry more weight than manually-entered ones. Capped at 1.5× the goal so a single over-contribution doesn't dominate. Worth up to 15%.",
    zu: "Inani liphelele leminikelo yakho eqinisekisiwe uma kuqhathaniswa nomgomo wokonga wistokvel yakho. Iminikelo ye-Yoco noma eqinisekiswe ngebhange isindwa kakhulu kuneminikelo efakiwe ngesandla. Igciniwe ku-1.5× womgomo ukuze umnikelo owodwa ogqithisile ungabusi. Ifika ku-15%.",
    st: "Boleng bo felletseng ba menehelo ea hao e netefalitsoeng ha bo bapisoa le sepheo sa polokelo sa stokvel ea hao. Menehelo e netefalitsoeng ke Yoco kapa ke banka e boima ho feta e kentsoeng ka letsoho. E khaotsoe ho 1.5× sepheo hore monehelo o le mong o feteletseng o se ke oa busa. E fihla ho 15%.",
    af: "Totale waarde van jou bevestigde bydraes teenoor jou stokvel se spaardoel. Yoco- of bank-geverifieerde bydraes weeg swaarder as met-die-hand-ingevoerde bydraes. Beperk tot 1.5× die doel sodat 'n enkele oor-bydrae nie oorheers nie. Werd tot 15%.",
  },
  factorTabRepaymentExplain: {
    en: "The share of customer tabs you've marked as paid. Worth up to 15%. No tabs yet? This factor stays at 0 until you extend credit and settle it — a habit lenders like to see.",
    zu: "Isabelo sezikweletu zamakhasimende ozimake njengezikhokhwe. Ifika ku-15%. Awunazo izikweletu okwamanje? Le sici sihlala ku-0 kuze kube nini uxhasa ngesikweletu futhi usikhokhe — umkhuba ababoleki abathanda ukuwubona.",
    st: "Karolo ea likoloto tsa bareki tseo u li tšoailoeng li lefiloe. E fihla ho 15%. Ha ho na likoloto? Ntlha ena e lula e le 0 ho fihlela u fana ka mokitlane 'me u o lefe — mokhoa o tloaelehileng oo baemeli ba mokitlane ba ratang ho o bona.",
    af: "Die deel van kliëntskulde wat jy as betaal gemerk het. Werd tot 15%. Nog geen skulde nie? Hierdie faktor bly by 0 totdat jy krediet gee en dit vereffen — 'n gewoonte wat lenings graag sien.",
  },
  factorSalesActivityExplain: {
    en: "Sales you've logged in the last 30 days. Yoco or receipt-backed sales weigh more than voice-logged cash sales. Aim for around 20 verified sales a month to reach the ceiling. Worth up to 10%.",
    zu: "Ukudayisa okubhalisile ezinsukwini ezingu-30 ezidlule. Ukudayisa okuqinisekiswe ngeYoco noma amarisidi kubalwa kakhulu kunokudayisa kwecash okubhaliswe ngezwi. Zama ukufinyelela ekudayiseni okuqinisekisiwe okungu-20 ngenyanga ukuze ufike ekutheni. Ifika ku-10%.",
    st: "Thekiso eo u e ngotseng matsatsing a 30 a fetileng. Thekiso e netefalitsoeng ke Yoco kapa ke lirisiti e boima ho feta thekiso ea chelete e ngotsoeng ka lentsoe. Leka ho fihlella thekiso e netefalitsoeng e ka bang 20 khoeling ho fihlella boemo bo phahameng. E fihla ho 10%.",
    af: "Verkope wat jy in die laaste 30 dae aangeteken het. Yoco- of kwitansie-ondersteunde verkope weeg meer as stem-aangetekende kontantverkope. Mik vir ongeveer 20 geverifieerde verkope per maand om die maksimum te bereik. Werd tot 10%.",
  },
  factorTimeOnPlatformExplain: {
    en: "Days since your first activity on KasiKash. Consistency over time matters — this factor caps out at 6 months, so the longer you stay, the more it stabilises. Worth up to 8%.",
    zu: "Izinsuku kusukela emsebenzini wakho wokuqala ku-KasiKash. Ukungaguquki ngokuhamba kwesikhathi kubalulekile — le sici sifika ekutheni ezinyangeni ezingu-6, ngakho isikhathi eside uhlala kuso, sizinza kakhulu. Ifika ku-8%.",
    st: "Matsatsi ho tloha mosebetsing oa hao oa pele ho KasiKash. Ho tsitsa ha nako e ntse e ea pele ho bohlokoa — ntlha ena e fihla boemong bo phahameng likhoeling tse 6, ka hona nako e telele eo u lulang, e e tsitsang haholo. E fihla ho 8%.",
    af: "Dae sedert jou eerste aktiwiteit op KasiKash. Konsekwentheid oor tyd tel — hierdie faktor bereik sy maksimum by 6 maande, so hoe langer jy bly, hoe meer stabiliseer dit. Werd tot 8%.",
  },
  factorProfileMaturityExplain: {
    en: "Four completeness checks: your name, a business or stokvel, banking details, and at least one confirmed contribution. Each is worth a quarter of this factor. Worth up to 10% overall.",
    zu: "Ukuhlolwa okune kokuqedelela: igama lakho, ibhizinisi noma istokvel, imininingwane yebhange, futhi okungenani umnikelo owodwa oqinisekisiwe. Konke kufika ekotheni ingxenye yale sici. Ifika ku-10% sekukonke.",
    st: "Litlhahlobo tse 'ne tsa ho phethahala: lebitso la hao, khoebo kapa stokvel, lintlha tsa banka, 'me bonyane monehelo o le mong o netefalitsoeng. E 'ngoe le e 'ngoe ea fihla kotareng ea ntlha ena. E fihla ho 10% ka kakaretso.",
    af: "Vier volledigheidskontroles: jou naam, 'n besigheid of stokvel, bankbesonderhede, en ten minste een bevestigde bydrae. Elkeen is 'n kwart van hierdie faktor werd. Werd tot 10% in geheel.",
  },
  factorRecentMomentumExplain: {
    en: "Your confirmed activity — sales or contributions — in the last 14 days. Showing up regularly matters; a quiet fortnight lowers this quickly. Worth up to 12%.",
    zu: "Umsebenzi wakho oqinisekisiwe — ukudayisa noma iminikelo — emavikini angu-14 adlule. Ukuvela njalo kubalulekile; amaviki amabili athulile ayasehlisa ngokushesha. Ifika ku-12%.",
    st: "Mesebetsi ea hao e netefalitsoeng — thekiso kapa menehelo — matsatsing a 14 a fetileng. Ho ipontsha khafetsa ho bohlokoa; libeke tse peli tse khutsitseng li fokotsa sena ka potlako. E fihla ho 12%.",
    af: "Jou bevestigde aktiwiteit — verkope of bydraes — in die laaste 14 dae. Om gereeld te wys tel; 'n stil twee weke laat dit vinnig sak. Werd tot 12%.",
  },

  // Passport (PDF) + PassportPreview screen
  passportTitle: {
    en: "Your financial passport",
    zu: "Ipasi yakho yezimali",
    st: "Pasa ea hao ea lichelete",
    af: "Jou finansiële paspoort",
  },
  passportSubtitle: {
    en: "A one-page PDF that summarises your KasiKash record. Share it with lenders, funders, or suppliers to prove your credit-worthiness.",
    zu: "Ipheji eyodwa ye-PDF efingqa umlando wakho we-KasiKash. Yabelane nababoleki, ababoni, noma abahlinzeki ukufakazela ukukwazi kwakho ukuthola isikweletu.",
    st: "Leqephe le le leng la PDF le akaretsang rekoto ea hao ea KasiKash. E arolelane le baemeli ba mokitlane, batšehetsi, kapa baabi ho paka bokhoni ba hao ba mokitlane.",
    af: "'n Een-bladsy-PDF wat jou KasiKash-rekord opsom. Deel dit met lenings, befondsers of verskaffers om jou kredietwaardigheid te bewys.",
  },
  passportPreviewNote: {
    en: "This PDF reflects your data at this moment. Re-download any time to get an updated version.",
    zu: "Le PDF ikhombisa idatha yakho okwamanje. Landa futhi noma nini ukuze uthole inguqulo eyisitshalo.",
    st: "PDF ena e bontša data ea hao hona joale. E khoase hape neng kapa neng ho fumana mofuta o mocha.",
    af: "Hierdie PDF weerspieël jou data op hierdie oomblik. Laai dit enige tyd weer af vir 'n opgedateerde weergawe.",
  },
  passportDownloadBtn: {
    en: "Download PDF",
    zu: "Landa i-PDF",
    st: "Khoasa PDF",
    af: "Laai PDF af",
  },
  passportShareBtn: { en: "Share", zu: "Yabelana", st: "Arolelana", af: "Deel" },
  passportShareUnavailable: {
    en: "Sharing isn't available on this browser. Use Download instead.",
    zu: "Ukwabelana akutholakali kule ibhrawuza. Sebenzisa i-Download esikhundleni salokho.",
    st: "Ho arolelana ha ho fumanehe ho braosara ena. Sebelisa Khoasa ho e-na le hoo.",
    af: "Deel is nie op hierdie blaaier beskikbaar nie. Gebruik eerder Laai af.",
  },
  passportGeneratedOn: {
    en: "Generated {date}",
    zu: "Ikhiqizwe {date}",
    st: "E hlahisitsoe {date}",
    af: "Gegenereer op {date}",
  },
  passportGenerating: {
    en: "Building your passport...",
    zu: "Kwakhiwa ipasi yakho...",
    st: "Ho hahoa pasa ea hao...",
    af: "Besig om jou paspoort te bou...",
  },
  passportBack: { en: "Back", zu: "Emuva", st: "Morao", af: "Terug" },

  // In-app entry point to the passport preview (button on Insights).
  insightsDownloadCTA: {
    en: "Download financial passport",
    zu: "Landa ipasi yezimali",
    st: "Khoasa pasa ea lichelete",
    af: "Laai finansiële paspoort af",
  },
  insightsDownloadDesc: {
    en: "One-page PDF summary for lenders and suppliers.",
    zu: "Isifinyezo se-PDF sephepha elilodwa lababoleki nabahlinzeki.",
    st: "Kakaretso ea PDF ea leqephe le le leng bakeng sa baemeli ba mokitlane le baabi.",
    af: "Een-bladsy-PDF-opsomming vir lenings en verskaffers.",
  },

  // ---------------------------------------------------------------------
  // Copy embedded inside the generated PDF. Kept in i18n so a user
  // reading in isiZulu / Sesotho / Afrikaans gets a passport in their
  // own language — useful when the recipient is a family member or
  // local business partner rather than a formal lender.
  // ---------------------------------------------------------------------
  pdfDocTitle: {
    en: "Financial Passport",
    zu: "Ipasi Yezimali",
    st: "Pasa ea Lichelete",
    af: "Finansiële Paspoort",
  },
  pdfIssuedBy: {
    en: "Issued by KasiKash",
    zu: "Ikhishwe yi-KasiKash",
    st: "E fanoe ke KasiKash",
    af: "Uitgereik deur KasiKash",
  },
  pdfSectionOwner: {
    en: "Owner",
    zu: "Umnini",
    st: "Mong'a",
    af: "Eienaar",
  },
  pdfSectionBusiness: {
    en: "Business",
    zu: "Ibhizinisi",
    st: "Khoebo",
    af: "Besigheid",
  },
  pdfSectionScore: {
    en: "KasiScore",
    zu: "i-KasiScore",
    st: "KasiScore",
    af: "KasiScore",
  },
  pdfSectionSalesActivity: {
    en: "Business activity (last 30 days)",
    zu: "Umsebenzi webhizinisi (izinsuku ezingu-30 ezedlule)",
    st: "Mosebetsi oa khoebo (matsatsi a 30 a fetileng)",
    af: "Besigheidsaktiwiteit (laaste 30 dae)",
  },
  pdfSectionTabDiscipline: {
    en: "Customer tab discipline",
    zu: "Ukuqondisa izikweletu zamakhasimende",
    st: "Boitšoaro ba likoloto tsa bareki",
    af: "Kliëntskulddissipline",
  },
  pdfSectionStokvelSavings: {
    en: "Stokvel savings",
    zu: "Ukonga kwistokvel",
    st: "Polokelo ea stokvel",
    af: "Stokvel-besparings",
  },
  pdfSectionFactors: {
    en: "Score breakdown",
    zu: "Ukuhlukaniswa kwesikoro",
    st: "Karolelano ea skoro",
    af: "Telling-uiteensetting",
  },
  pdfLabelSalesLogged: {
    en: "Sales logged",
    zu: "Ukudayisa okulotshiwe",
    st: "Thekiso e ngoliloe",
    af: "Verkope aangeteken",
  },
  pdfLabelActiveDays: {
    en: "Active days",
    zu: "Izinsuku zomsebenzi",
    st: "Matsatsi a mosebetsi",
    af: "Aktiewe dae",
  },
  pdfLabelTopSeller: {
    en: "Top seller",
    zu: "Okuthengiswa kakhulu",
    st: "Se rekisoang haholo",
    af: "Beste verkoper",
  },
  pdfLabelRevenue30d: {
    en: "Revenue (30 days)",
    zu: "Imali engenile (izinsuku ezingu-30)",
    st: "Chelete e kenneng (matsatsi a 30)",
    af: "Inkomste (30 dae)",
  },

  // ---------------------------------------------------------------------
  // PR #22 — Evidence-tier-aware Financial Passport labels.
  //
  // The passport now shows declared vs observed revenue side by side
  // instead of one collapsed "turnover" line. Copy is deliberately
  // neutral about the change — the receipt reclassification isn't a
  // "lost sales" event, the passport is just becoming more accurate.
  // ---------------------------------------------------------------------
  pdfLabelDeclaredRevenue: {
    en: "Declared sales (30 days)",
    zu: "Ukudayisa okushiwo (izinsuku ezingu-30)",
    st: "Thekiso e boletsoeng (matsatsi a 30)",
    af: "Verklaarde verkope (30 dae)",
  },
  pdfLabelObservedRevenue: {
    en: "Observed sales (30 days)",
    zu: "Ukudayisa okubonwe (izinsuku ezingu-30)",
    st: "Thekiso e bonoeng (matsatsi a 30)",
    af: "Waargeneemde verkope (30 dae)",
  },
  pdfLabelSupplierPurchases: {
    en: "Supplier purchases (30 days)",
    zu: "Ukuthenga kubathengisi (izinsuku ezingu-30)",
    st: "Theko ho baabi (matsatsi a 30)",
    af: "Voorsienerse aankope (30 dae)",
  },

  // Evidence-confidence badge, drawn just under the section title.
  passportConfidenceLabel: {
    en: "Evidence confidence",
    zu: "Ithemba lobufakazi",
    st: "Boitshepo ba bopaki",
    af: "Bewysvertroue",
  },
  passportConfidenceUnknown: {
    en: "No data yet",
    zu: "Ayikho idatha okwamanje",
    st: "Ha ho na data hakaale",
    af: "Nog geen data nie",
  },
  passportConfidenceLow: {
    en: "Low",
    zu: "Phansi",
    st: "E tlaase",
    af: "Laag",
  },
  passportConfidenceMedium: {
    en: "Medium",
    zu: "Phakathi",
    st: "Bohareng",
    af: "Medium",
  },
  passportConfidenceHigh: {
    en: "High",
    zu: "Phakeme",
    st: "E phahameng",
    af: "Hoog",
  },

  // Tier legend printed just above the disclaimer footer.
  passportTierLegendTitle: {
    en: "Evidence tiers:",
    zu: "Amazinga obufakazi:",
    st: "Maemo a bopaki:",
    af: "Bewysvlakke:",
  },
  passportTierDeclared: {
    en: "Declared — self-reported",
    zu: "Okushiwo — okubikwe wumnini",
    st: "E boletsoeng — e tlalehiloeng ke mong'a eona",
    af: "Verklaar — self gerapporteer",
  },
  passportTierObserved: {
    en: "Observed — digital record",
    zu: "Okubonwe — irekhodi ledijithali",
    st: "E bonoeng — rekoto ea dijithale",
    af: "Waargeneem — digitale rekord",
  },
  passportTierVerified: {
    en: "Verified — bank / third-party confirmed",
    zu: "Okuqinisekisiwe — okuqinisekiswe yibhange",
    st: "E netefalitsoeng — e netefalitsoeng ke banka",
    af: "Geverifieer — bevestig deur bank / derde party",
  },

  // Score factor name for the new evidence_confidence factor.
  factorEvidenceConfidence: {
    en: "Evidence quality",
    zu: "Ikhwalithi yobufakazi",
    st: "Boleng ba bopaki",
    af: "Bewyskwaliteit",
  },
  factorEvidenceConfidenceExplain: {
    en: "The share of your records with independent proof — a Yoco transaction, a scanned supplier receipt, a matched bank statement line. Self-declared records don't hurt you but they don't lift this factor. Worth up to 10%.",
    zu: "Isabelo samarekhodi akho anobufakazi obuzimele — ukuxhumana kwe-Yoco, irisidi yomthengisi eskeniwe, umugqa wesitatimende sebhange ohambisanayo. Amarekhodi ozibizele wona awakulimazi kodwa awasiphakamisi lesi sici. Ifika ku-10%.",
    st: "Karolo ea lirekoto tsa hao tse nang le bopaki bo ikemetseng — mokhoa oa Yoco, resiti ea moabi e skenoeng, moleng oa statemente ea banka o lumellanang. Lirekoto tseo u ipolelang tsona ha li u utloise bohloko empa ha li phahamise ntlha ena. E fihla ho 10%.",
    af: "Die deel van jou rekords met onafhanklike bewys — 'n Yoco-transaksie, 'n geskandeerde verskafferkwitansie, 'n bankstaat-lyn wat pas. Self-verklaarde rekords maak jou nie seer nie, maar hulle lig hierdie faktor nie op nie. Werd tot 10%.",
  },

  // ---------------------------------------------------------------------
  // PR #23 — Bank statement importer + passport bank-activity section.
  //
  // Copy is deliberately factual. The passport's job is to show
  // what actually moved through the account, not to speculate about
  // what those movements were for — so labels say "Bank inflows"
  // and "Unclassified", not "Sales" and "Customer payments".
  // ---------------------------------------------------------------------

  // Home card + screen chrome
  importStatementCard: {
    en: "Import bank statement",
    zu: "Ngenisa isitatimende sasebhange",
    st: "Kenya statemente ea banka",
    af: "Voer bankstaat in",
  },
  importStatementCardDesc: {
    en: "Upload a PDF or CSV. Adds observed evidence to your passport.",
    zu: "Layisha i-PDF noma i-CSV. Yengeza ubufakazi obubonwe kwipasi yakho.",
    st: "Kenya PDF kapa CSV. E kenya bopaki bo bonoeng ho pasa ea hao.",
    af: "Laai 'n PDF of CSV op. Voeg waargeneemde bewyse by jou paspoort.",
  },
  importStatementTitle: {
    en: "Import bank statement",
    zu: "Ngenisa isitatimende sasebhange",
    st: "Kenya statemente ea banka",
    af: "Voer bankstaat in",
  },
  importIdleBody: {
    en: "Pick a PDF or CSV file exported from your online banking. It's parsed on this device — the file itself is not uploaded anywhere.",
    zu: "Khetha ifayela le-PDF noma i-CSV elikhishwe kwibhange yakho ye-inthanethi. Lifundwa kule idivayisi — ifayela ngokwalo alilayishelwa ndawo.",
    st: "Khetha faele ea PDF kapa CSV e tsoang ho banka ea hao ea inthanete. E baloa sesebelisoa sena — faele ka boeona ha e kenngoe kae kapa kae.",
    af: "Kies 'n PDF- of CSV-lêer wat uit jou aanlyn-bankdiens uitgevoer is. Dit word op hierdie toestel ontleed — die lêer self word nêrens opgelaai nie.",
  },
  importChooseFile: {
    en: "Choose file",
    zu: "Khetha ifayela",
    st: "Khetha faele",
    af: "Kies lêer",
  },
  importSupportedHeader: {
    en: "What works today",
    zu: "Okusebenza namuhla",
    st: "Se sebetsang kajeno",
    af: "Wat vandag werk",
  },
  importSupportCapitecFnb: {
    en: "PDF statements from Capitec and FNB (others use a generic parser).",
    zu: "Izitatimende ze-PDF ezivela ku-Capitec ne-FNB (amanye asebenzisa isihlukanisi sika-jikelele).",
    st: "Litatemente tsa PDF ho tsoa Capitec le FNB (tse ling li sebelisa mo-parser oa akaretsang).",
    af: "PDF-state van Capitec en FNB (ander gebruik 'n generiese ontleder).",
  },
  importSupportCsvAny: {
    en: "CSV exports from any SA bank.",
    zu: "Ukukhipha kwe-CSV kunoma iyiphi ibhange lase-SA.",
    st: "Ho ntša CSV ho banka efe kapa efe ea SA.",
    af: "CSV-uitvoere van enige SA-bank.",
  },
  importSupportOnDevice: {
    en: "All parsing happens on your phone. Nothing is uploaded as a file.",
    zu: "Konke ukuhlaziywa kwenzeka kufoni yakho. Akukho okulayishelwa njengefayela.",
    st: "Ho hlophisoa hohle ho etsahala fonong ea hao. Ha ho letho le kenngoang joalo ka faele.",
    af: "Alle ontleding gebeur op jou foon. Niks word as 'n lêer opgelaai nie.",
  },
  importPrivacyNote: {
    en: "Only the extracted transactions are saved to your account, under the same privacy rules as your sales data. The original file is discarded from memory once parsing finishes.",
    zu: "Kufakwe kuphela ukuthengiselana okukhishiwe ku-akhawunti yakho, ngaphansi kwemithetho yobumfihlo efanayo nedatha yakho yokudayisa. Ifayela loqobo lilahlwa emsonto uma ukuhlaziywa sekuphelile.",
    st: "Ke lintlha tse ntšitsoeng feela tse bolokehang ho akhaonto ea hao, tlas'a melao ea lekunutu e tšoanang le data ea hao ea thekiso. Faele ea mantlha e lahleloa mohopolong ha ho hlophisoa ho phethiloe.",
    af: "Slegs die onttrekde transaksies word na jou rekening gestoor, onder dieselfde privaatheidsreëls as jou verkoopsdata. Die oorspronklike lêer word uit die geheue verwyder sodra ontleding voltooi is.",
  },

  // Progress labels
  importPhaseReading: {
    en: "Reading the file...",
    zu: "Ifunda ifayela...",
    st: "Ho bala faele...",
    af: "Besig om die lêer te lees...",
  },
  importPhaseParsing: {
    en: "Parsing statement layout...",
    zu: "Ihlaziya isakhiwo sesitatimende...",
    st: "Ho hlahloba sebopeho sa statemente...",
    af: "Ontleed staatuitleg...",
  },
  importPhaseClassifying: {
    en: "Classifying {count} transactions...",
    zu: "Ihlukanisa ukuthengiselana okungu-{count}...",
    st: "Ho arola lintlha tse {count}...",
    af: "Klassifiseer {count} transaksies...",
  },
  importPhaseSaving: {
    en: "Saving {count} transactions...",
    zu: "Ilondoloza ukuthengiselana okungu-{count}...",
    st: "Ho boloka lintlha tse {count}...",
    af: "Stoor {count} transaksies...",
  },

  // Error / retry
  importErrorTitle: {
    en: "Import failed",
    zu: "Ukungeniswa kuhlulekile",
    st: "Kenyo e hlolehile",
    af: "Invoer het misluk",
  },
  importTryAgain: {
    en: "Try another file",
    zu: "Zama elinye ifayela",
    st: "Leka faele e nngoe",
    af: "Probeer 'n ander lêer",
  },
  importUnsupportedType: {
    en: "That file type isn't supported. Please upload a PDF or CSV.",
    zu: "Lolo hlobo lwefayela alusekelwe. Sicela ulayishe i-PDF noma i-CSV.",
    st: "Mofuta oo oa faele ha o tšehetsoe. Ka kopo kenya PDF kapa CSV.",
    af: "Daardie lêertipe word nie ondersteun nie. Laai asseblief 'n PDF of CSV op.",
  },

  // Done view
  importDoneTitle: {
    en: "Statement imported ✓",
    zu: "Isitatimende sifakiwe ✓",
    st: "Statemente e kenngoe ✓",
    af: "Staat ingevoer ✓",
  },
  importDoneSubtitle: {
    en: "Parsed as a {bank} statement.",
    zu: "Ihlaziywe njengesitatimende se-{bank}.",
    st: "E hlophisitsoe joalo ka statemente ea {bank}.",
    af: "Ontleed as 'n {bank}-staat.",
  },
  importSummaryTotal: {
    en: "Total transactions",
    zu: "Ukuthengiselana okuphelele",
    st: "Kakaretso ea lintlha",
    af: "Totale transaksies",
  },
  importSummaryInserted: {
    en: "Newly imported",
    zu: "Kufakwe kabusha",
    st: "E ntšoa kenngoa",
    af: "Nuut ingevoer",
  },
  importSummaryDuplicates: {
    en: "Already on file",
    zu: "Sivele sikhona efayeleni",
    st: "E se e le teng",
    af: "Reeds op rekord",
  },
  importSummaryDropped: {
    en: "Couldn't read",
    zu: "Ayikwazanga ukufunda",
    st: "E ne e sa khone ho balea",
    af: "Kon nie lees nie",
  },
  importWarningsHeader: {
    en: "Notes from the parser",
    zu: "Amanothi avela kumhlaziyi",
    st: "Litlhaloso ho tsoa ho mohlahlobisi",
    af: "Notas van die ontleder",
  },
  importPreviewHeader: {
    en: "First few transactions",
    zu: "Ukuthengiselana kokuqala",
    st: "Lintlha tsa pele",
    af: "Eerste paar transaksies",
  },
  importAnother: {
    en: "Import another",
    zu: "Ngenisa okunye",
    st: "Kenya e nngoe",
    af: "Voer nog een in",
  },
  importBackHome: {
    en: "Back to home",
    zu: "Buyela ekhaya",
    st: "Khutlela hae",
    af: "Terug na tuis",
  },

  // Classification display labels — shown on the transaction preview
  // and in future review UIs. NOTE: there is deliberately no
  // "customer_sale" entry. See src/lib/bank/classify.ts.
  classificationUnknown: {
    en: "Unclassified",
    zu: "Akuhlukaniswe",
    st: "Ha e arotsoe",
    af: "Nie geklassifiseer",
  },
  classificationOwnTransfer: {
    en: "Own transfer",
    zu: "Ukudlulisa kwakho",
    st: "Phetiso ea hao",
    af: "Eie oordrag",
  },
  classificationCashDeposit: {
    en: "Cash deposit",
    zu: "Ukufaka imali",
    st: "Ho beha chelete",
    af: "Kontantdeposito",
  },
  classificationCashWithdrawal: {
    en: "Cash withdrawal",
    zu: "Ukukhipha imali",
    st: "Ho ntša chelete",
    af: "Kontantonttrekking",
  },
  classificationBankFee: {
    en: "Bank fee",
    zu: "Imali yebhange",
    st: "Tefo ea banka",
    af: "Bankfooi",
  },
  classificationAirtime: {
    en: "Airtime / data",
    zu: "I-airtime / idatha",
    st: "Airtime / data",
    af: "Lugtyd / data",
  },
  classificationUtility: {
    en: "Utility",
    zu: "Insiza",
    st: "Tšebeletso",
    af: "Nutsdiens",
  },
  classificationRentOrSubscription: {
    en: "Rent / subscription",
    zu: "Irenti / okubhaliselwe",
    st: "Rente / ho ngolisa",
    af: "Huur / intekening",
  },
  classificationSupplierLike: {
    en: "Supplier",
    zu: "Umthengisi",
    st: "Moabi",
    af: "Verskaffer",
  },
  classificationSalaryLike: {
    en: "Salary-like",
    zu: "Njengeholo",
    st: "E kang moputso",
    af: "Salaris-agtig",
  },
  classificationStokvelRelated: {
    en: "Stokvel",
    zu: "I-stokvel",
    st: "Stokvel",
    af: "Stokvel",
  },
  classificationLoanRepayment: {
    en: "Loan repayment",
    zu: "Ukukhokha imali eboleka",
    st: "Ho lefa mokitlane",
    af: "Leningsterugbetaling",
  },
  classificationRefund: {
    en: "Refund",
    zu: "Imbuyiselo",
    st: "Ho khutlisa chelete",
    af: "Terugbetaling",
  },

  // Passport bank-activity section
  pdfSectionBankActivity: {
    en: "Bank activity (30 days)",
    zu: "Umsebenzi webhange (izinsuku ezingu-30)",
    st: "Mosebetsi oa banka (matsatsi a 30)",
    af: "Bankaktiwiteit (30 dae)",
  },
  pdfLabelBankInflows: {
    en: "Bank inflows",
    zu: "Ukungena kwemali ebhange",
    st: "Chelete e kenang bankeng",
    af: "Bank-invloei",
  },
  pdfLabelBankOutflows: {
    en: "Bank outflows",
    zu: "Ukuphuma kwemali ebhange",
    st: "Chelete e tsoang bankeng",
    af: "Bank-uitvloei",
  },
  pdfLabelInflowDiversity: {
    en: "Distinct payers",
    zu: "Ababhadalayo abehlukene",
    st: "Ba lefang ba fapaneng",
    af: "Verskillende betalers",
  },
  pdfLabelCashDepositRatio: {
    en: "Cash deposit share",
    zu: "Ingxenye yokufaka imali",
    st: "Karolo ea ho beha chelete",
    af: "Kontantdeposito-aandeel",
  },
  pdfLabelRecurringInflows: {
    en: "Recurring inflows",
    zu: "Ukungena okuphindaphindayo",
    st: "Ho kena ho phetahalang",
    af: "Herhalende invloeie",
  },
  pdfLabelTopSupplier: {
    en: "Top supplier",
    zu: "Umthengisi ophezulu",
    st: "Moabi oa hlooho",
    af: "Top-verskaffer",
  },

  // ---------------------------------------------------------------------
  // PR #24 — honest empty-state score.
  //
  // When a fresh account has no value-bearing activity, the score
  // display is deliberately hidden. These keys drive the "log
  // something to build your score" prompt shown on the Insights
  // screen, the Passport preview, and the PDF passport itself.
  // ---------------------------------------------------------------------
  scoreEmptyTitle: {
    en: "Your score will grow with real activity",
    zu: "Iskoro sakho sizokhula ngomsebenzi wangempela",
    st: "Sekoro sa hao se tla hola ka mosebetsi oa 'nete",
    af: "Jou telling groei met werklike aktiwiteit",
  },
  scoreEmptyBody: {
    en: "Log a sale, add a customer tab, or join a stokvel — each real action starts building your evidence.",
    zu: "Bhalisa ukuthengisa, engeza itabhu yekhasimende, noma joyina i-stokvel — isenzo ngasinye sangempela siqala ukwakha ubufakazi bakho.",
    st: "Ngola thekiso, kenya khoante ea moreki, kapa kena stokvel — ketso e nngoe le e nngoe ea 'nete e qala ho aha bopaki ba hao.",
    af: "Teken 'n verkoop aan, voeg 'n kliëntrekening by, of sluit by 'n stokvel aan — elke werklike aksie begin jou bewyse bou.",
  },
  scoreEmptyCta: {
    en: "Log your first sale",
    zu: "Bhalisa ukuthengisa kwakho kokuqala",
    st: "Ngola thekiso ea hao ea pele",
    af: "Teken jou eerste verkoop aan",
  },
  pdfNoScoreYet: {
    en: "Not enough activity yet. The KasiScore will appear once real business events have been logged (sales, expenses, contributions, or bank activity).",
    zu: "Awukho umsebenzi owanele okwamanje. I-KasiScore izovela lapho sekubhaliswe imicimbi yangempela yebhizinisi (ukudayisa, izindleko, iminikelo, noma umsebenzi wasebhange).",
    st: "Ha ho mosebetsi o lekaneng hakaale. KasiScore e tla hlaha ha liketsahalo tsa 'nete tsa khoebo li se li ngotsoe (thekiso, litšenyehelo, menehelo, kapa mosebetsi oa banka).",
    af: "Nog nie genoeg aktiwiteit nie. Die KasiScore verskyn sodra werklike besigheidsgebeure aangeteken is (verkope, uitgawes, bydraes, of bankaktiwiteit).",
  },

  // ---------------------------------------------------------------------
  // PR #24 — Settings advanced-section labels.
  //
  // WhatsApp bot config (Meta Cloud API tokens) is developer-only
  // setup, not something a spaza owner should ever see by default.
  // These labels drive a collapsed "Advanced setup" section that
  // hides technical config behind an explicit tap.
  // ---------------------------------------------------------------------
  settingsAdvancedHeader: {
    en: "Advanced setup",
    zu: "Ukusetha okuthuthukile",
    st: "Ho lokisa ho phahameng",
    af: "Gevorderde opstelling",
  },
  settingsAdvancedHelp: {
    en: "For technical users. Skip this section unless you're setting up a WhatsApp Business bot or a specific integration.",
    zu: "Kwabasebenzisi bezobuchwepheshe. Yeqa lesi sigaba ngaphandle uma usetha i-bot ye-WhatsApp Business noma ukuhlanganiswa okuthile.",
    st: "Bakeng sa basebelisi ba tekheniki. Tlola karolo ena ntle le haeba u lokisa bot ea WhatsApp Business kapa ho kopanya ho itseng.",
    af: "Vir tegniese gebruikers. Slaan hierdie afdeling oor tensy jy 'n WhatsApp Business-bot of 'n spesifieke integrasie opstel.",
  },
  settingsAdvancedShow: {
    en: "Show advanced options",
    zu: "Bonisa okukhethwe kukho okuthuthukile",
    st: "Bontša likhetho tse phahameng",
    af: "Wys gevorderde opsies",
  },
  settingsAdvancedHide: {
    en: "Hide advanced options",
    zu: "Fihla okukhethwe kukho okuthuthukile",
    st: "Pata likhetho tse phahameng",
    af: "Versteek gevorderde opsies",
  },
  settingsAdvancedWhatsAppExplain: {
    en: "Requires Meta Business API approval + your own Cloud API credentials. If you don't know what this means, you don't need it — skip.",
    zu: "Idinga imvume ye-Meta Business API + imininingwane yakho ye-Cloud API. Uma ungayazi ukuthi kusho ukuthini lokhu, awuyidingi — yiqeqe.",
    st: "E hloka tumello ea Meta Business API + lintlha tsa hao tsa Cloud API. Haeba u sa tsebe hore see se bolela'ng, ha u e hloke — e tlole.",
    af: "Vereis Meta Business API-goedkeuring + jou eie Cloud API-geloofsbriewe. As jy nie weet wat dit beteken nie, het jy dit nie nodig nie — slaan oor.",
  },

  pdfLabelTabsPaid: {
    en: "Tabs paid",
    zu: "Izikweletu ezikhokhiwe",
    st: "Likoloto tse lefiloeng",
    af: "Skuldrekeninge betaal",
  },
  pdfLabelTabsOpen: {
    en: "Tabs open",
    zu: "Izikweletu ezivuliwe",
    st: "Likoloto tse butsoeng",
    af: "Skuldrekeninge oop",
  },
  pdfLabelRepaymentRate: {
    en: "Repayment rate",
    zu: "Izinga lokukhokha",
    st: "Sekhahla sa ho lefa",
    af: "Terugbetalingskoers",
  },
  pdfLabelStokvel: {
    en: "Stokvel",
    zu: "Istokvel",
    st: "Stokvel",
    af: "Stokvel",
  },
  pdfLabelRole: {
    en: "Role",
    zu: "Indima",
    st: "Karolo",
    af: "Rol",
  },
  pdfLabelYourContribution: {
    en: "Your confirmed contributions",
    zu: "Iminikelo yakho eqinisekisiwe",
    st: "Menehelo ea hao e netefalitsoeng",
    af: "Jou bevestigde bydraes",
  },
  pdfLabelStokvelGoal: {
    en: "Stokvel savings goal",
    zu: "Umgomo wokonga wistokvel",
    st: "Sepheo sa polokelo sa stokvel",
    af: "Stokvel se spaardoel",
  },
  pdfLabelStokvelSaved: {
    en: "Total saved in stokvel",
    zu: "Iyonke egciniwe kwistokvel",
    st: "Kakaretso e bolokiloeng stokveleng",
    af: "Totaal gespaar in stokvel",
  },
  pdfNoData: {
    en: "No data on record",
    zu: "Ayikho idatha",
    st: "Ha ho data e ngotsoeng",
    af: "Geen data op rekord nie",
  },
  pdfNoStokvel: {
    en: "Not currently in a stokvel",
    zu: "Awukho kwistokvel njengamanje",
    st: "Ha o ea kena stokveleng hona joale",
    af: "Nie tans in 'n stokvel nie",
  },
  pdfFooter: {
    en: "Generated by KasiKash — voice-first finance for South African townships.",
    zu: "Ikhiqizwe yi-KasiKash — ezezimali ezisebenzisa izwi kokasi zaseNingizimu Afrika.",
    st: "E hlahisitsoe ke KasiKash — lichelete tse qalang ka lentsoe bakeng sa likasi tsa Afrika Boroa.",
    af: "Gegenereer deur KasiKash — stem-eerste finansies vir Suid-Afrikaanse townships.",
  },
  pdfDisclaimer: {
    en: "This passport is self-generated from the user's own records. Recipients should verify individual line items directly with the account holder.",
    zu: "Le pasi ikhiqizwe ngokwakho kusukela emirekhodini yakho. Abamukelayo kufanele baqinisekise izinto ngazinye ngqo nomnini we-akhawunti.",
    st: "Pasa ena e ikhahlelloa ho tsoa likhomponeng tsa mong'a eona. Ba amohelang ba lokela ho netefatsa lintlha ka bomong ka kotloloho le mong'a akhaonto.",
    af: "Hierdie paspoort word deur die gebruiker self gegenereer uit sy eie rekords. Ontvangers moet individuele items direk met die rekeninghouer verifieer.",
  },

  // ---------------------------------------------------------------------
  // Receipt scanner (PR #17). Client-side Tesseract.js OCR.
  // ---------------------------------------------------------------------
  scanReceipt: {
    en: "Scan receipt",
    zu: "Skena irisidi",
    st: "Skena risidi",
    af: "Skandeer kwitansie",
  },
  scanReceiptDesc: {
    en: "Photograph a supplier receipt to add items in bulk.",
    zu: "Thwebula irisidi yomthengiseli ukuze ufake izinto ngokushesha.",
    st: "Nka setšoantšo sa risidi ea moabi ho kenya lintho ka bongata.",
    af: "Neem 'n foto van 'n verskaffer se kwitansie om items in grootmaat by te voeg.",
  },
  scanTitle: {
    en: "Scan a receipt",
    zu: "Skena irisidi",
    st: "Skena risidi",
    af: "Skandeer 'n kwitansie",
  },
  scanSubtitle: {
    en: "Take a clear photo of your receipt — we'll pull out the items and prices automatically. Everything happens on your phone; no photo is uploaded.",
    zu: "Thatha isithombe esicacile serisidi yakho — sizokhipha izinto namanani ngokuzenzakalelayo. Konke kwenzeka efonini yakho; asikho isithombe esilayishwayo.",
    st: "Nka setšoantšo se hlakileng sa risidi ea hao — re tla ntša lintho le litheko ka boiketsetso. Tsohle li etsahala fonong ea hao; ha ho setšoantšo se latšuoang.",
    af: "Neem 'n duidelike foto van jou kwitansie — ons trek die items en pryse outomaties uit. Alles gebeur op jou foon; geen foto word opgelaai nie.",
  },
  scanTakePhoto: {
    en: "Take a photo",
    zu: "Thatha isithombe",
    st: "Nka setšoantšo",
    af: "Neem 'n foto",
  },
  scanChooseFile: {
    en: "Choose from gallery",
    zu: "Khetha kwigalari",
    st: "Khetha ho gallery",
    af: "Kies uit galery",
  },
  scanProcessing: {
    en: "Reading your receipt...",
    zu: "Ifunda irisidi yakho...",
    st: "E bala risidi ea hao...",
    af: "Besig om jou kwitansie te lees...",
  },
  scanNoItemsFound: {
    en: "No items detected. Try a clearer photo, with the whole receipt in the frame and no shadow.",
    zu: "Akutholakalanga lutho. Zama isithombe esicacile ngaphakathi kwesikhungo esingenamthunzi.",
    st: "Ha ho ntho e fumanoeng. Leka setšoantšo se hlakileng se se nang moriti.",
    af: "Geen items opgespoor nie. Probeer 'n duideliker foto met die hele kwitansie in die raam en geen skaduwee nie.",
  },
  scanRetry: {
    en: "Try again",
    zu: "Zama futhi",
    st: "Leka hape",
    af: "Probeer weer",
  },
  scanFoundItems: {
    en: "{count} items found",
    zu: "Kutholakele izinto ezingu-{count}",
    st: "Lintho tse {count} li fumanoe",
    af: "{count} items gevind",
  },
  scanFooterHint: {
    en: "Tap an item to edit the name, quantity, or price.",
    zu: "Cindezela into ukuhlela igama, inani, noma intengo.",
    st: "Tobetsa ntho ho lokisa lebitso, palo, kapa theko.",
    af: "Tik 'n item om die naam, hoeveelheid of prys te wysig.",
  },
  scanConfirmAdd: {
    en: "Add {count} items to sales",
    zu: "Faka izinto ezingu-{count} ekudayisweni",
    st: "Kenya lintho tse {count} thekisong",
    af: "Voeg {count} items by verkope",
  },
  scanAdded: {
    en: "{count} sales added ✓",
    zu: "Kufakwe ukudayisa okungu-{count} ✓",
    st: "Thekiso e {count} e kentsoe ✓",
    af: "{count} verkope bygevoeg ✓",
  },
  scanItemName: { en: "Item", zu: "Into", st: "Ntho", af: "Item" },
  scanItemQty: { en: "Qty", zu: "Inani", st: "Palo", af: "Aantal" },
  scanItemPrice: { en: "Price", zu: "Intengo", st: "Theko", af: "Prys" },
  scanLineTotal: {
    en: "Line total",
    zu: "Iyonke yomugqa",
    st: "Kakaretso ea mola",
    af: "Reël-totaal",
  },
  scanSelectedTotal: {
    en: "Selected total",
    zu: "Iyonke ekhethiwe",
    st: "Kakaretso e khethiloeng",
    af: "Gekose totaal",
  },
  scanRemoveItem: {
    en: "Remove",
    zu: "Susa",
    st: "Tlosa",
    af: "Verwyder",
  },
  scanBadge: {
    en: "Scan",
    zu: "Skena",
    st: "Skena",
    af: "Skandeer",
  },

  // ---------------------------------------------------------------------
  // Phone OTP sign-in (PR #18). Runs alongside the existing email
  // magic-link flow. Requires SMS provider in Supabase dashboard.
  // ---------------------------------------------------------------------
  authChannelEmail: {
    en: "Email",
    zu: "I-imeyili",
    st: "Email",
    af: "E-pos",
  },
  authChannelPhone: {
    en: "Phone",
    zu: "Ifoni",
    st: "Fono",
    af: "Foon",
  },
  authPhoneLabel: {
    en: "Phone number",
    zu: "Inombolo yefoni",
    st: "Nomoro ea fono",
    af: "Foonnommer",
  },
  authPhonePlaceholder: {
    en: "083 123 4567",
    zu: "083 123 4567",
    st: "083 123 4567",
    af: "083 123 4567",
  },
  authPhoneHint: {
    en: "SA numbers only. We'll send you a 6-digit code by SMS.",
    zu: "Izinombolo zaseNingizimu Afrika kuphela. Sizokuthumela ikhodi enezinombolo ezingu-6 nge-SMS.",
    st: "Linomoro tsa Afrika Boroa feela. Re tla u romella khoutu ea linomoro tse 6 ka SMS.",
    af: "Slegs SA-nommers. Ons stuur jou 'n 6-syfer-kode per SMS.",
  },
  authPhoneSaveCta: {
    en: "Send SMS code",
    zu: "Thumela ikhodi ye-SMS",
    st: "Romela khoutu ea SMS",
    af: "Stuur SMS-kode",
  },
  authPhoneSignInCta: {
    en: "Sign in by SMS",
    zu: "Ngena nge-SMS",
    st: "Kena ka SMS",
    af: "Meld aan met SMS",
  },
  authInvalidPhone: {
    en: "Enter a valid SA cell number (starts with 0 or +27)",
    zu: "Faka inombolo yefoni evumelekile yaseNingizimu Afrika (iqala ngo-0 noma +27)",
    st: "Kenya nomoro e nepahetseng ea fono ea Afrika Boroa (e qala ka 0 kapa +27)",
    af: "Voer 'n geldige SA-selnommer in (begin met 0 of +27)",
  },
  authInvalidCode: {
    en: "Enter the 6-digit code from your SMS",
    zu: "Faka ikhodi enezinombolo ezingu-6 evela ku-SMS wakho",
    st: "Kenya khoutu ea linomoro tse 6 e tsoang ho SMS ea hao",
    af: "Voer die 6-syfer-kode uit jou SMS in",
  },
  authOtpLabel: {
    en: "6-digit code",
    zu: "Ikhodi yamanani angu-6",
    st: "Khoutu ea linomoro tse 6",
    af: "6-syfer-kode",
  },
  authOtpPlaceholder: {
    en: "123456",
    zu: "123456",
    st: "123456",
    af: "123456",
  },
  authOtpSentTitle: {
    en: "Code sent 📱",
    zu: "Ikhodi ithunyelwe 📱",
    st: "Khoutu e rometsoe 📱",
    af: "Kode gestuur 📱",
  },
  authOtpSentBody: {
    en: "We sent a 6-digit code to {phone}. Enter it below to finish.",
    zu: "Sithumele ikhodi enezinombolo ezingu-6 ku-{phone}. Yifake ngezansi ukuze uqedele.",
    st: "Re rometse khoutu ea linomoro tse 6 ho {phone}. E kenye tlaase ho qeta.",
    af: "Ons het 'n 6-syfer-kode aan {phone} gestuur. Voer dit hieronder in om te voltooi.",
  },
  authVerifyCta: {
    en: "Verify",
    zu: "Qinisekisa",
    st: "Netefatsa",
    af: "Verifieer",
  },
  authVerifying: {
    en: "Verifying...",
    zu: "Kuyaqinisekiswa...",
    st: "Ho netefatsoa...",
    af: "Verifieer...",
  },
  authResendCta: {
    en: "Resend code",
    zu: "Thumela ikhodi futhi",
    st: "Romela khoutu hape",
    af: "Stuur kode weer",
  },

  // ---------------------------------------------------------------------
  // Notifications (PR #19). Both in-app toasts and, opt-in, browser
  // system notifications when the app is backgrounded.
  // ---------------------------------------------------------------------
  notifyNewPendingTitle: {
    en: "Payment to verify",
    zu: "Inkokhelo yokuqinisekisa",
    st: "Tefello ea ho netefatsoa",
    af: "Betaling om te bevestig",
  },
  notifyNewPendingBody: {
    en: "{member} logged a {amount} contribution. Confirm it in the stokvel screen.",
    zu: "U-{member} ubhalise umnikelo we-{amount}. Uqinisekise esikrinini sestokvel.",
    st: "{member} o ngotse monehelo oa {amount}. E netefatse ho screen sa stokvel.",
    af: "{member} het 'n {amount}-bydrae aangeteken. Bevestig dit op die stokvel-skerm.",
  },
  notifyConfirmedTitle: {
    en: "Payment confirmed ✅",
    zu: "Inkokhelo iqinisekisiwe ✅",
    st: "Tefello e netefalitsoe ✅",
    af: "Betaling bevestig ✅",
  },
  notifyConfirmedBody: {
    en: "Your {amount} contribution has been verified by the admin.",
    zu: "Umnikelo wakho we-{amount} uqinisekiswe umphathi.",
    st: "Monehelo oa hao oa {amount} o netefalitsoe ke molaodi.",
    af: "Jou bydrae van {amount} is deur die admin bevestig.",
  },
  notifyRejectedTitle: {
    en: "Payment rejected",
    zu: "Inkokhelo yenqatshiwe",
    st: "Tefello e hantsoe",
    af: "Betaling verwerp",
  },
  notifyRejectedBody: {
    en: "Your {amount} contribution wasn't accepted. Check the reason in the stokvel screen.",
    zu: "Umnikelo wakho we-{amount} awumukelwanga. Hlola isizathu esikrinini sestokvel.",
    st: "Monehelo oa hao oa {amount} ha oa amoheloa. Sheba lebaka ho screen sa stokvel.",
    af: "Jou bydrae van {amount} is nie aanvaar nie. Kyk die rede op die stokvel-skerm.",
  },

  // Settings toggle for system-level notifications
  settingsNotifications: {
    en: "Notifications",
    zu: "Izaziso",
    st: "Litsebiso",
    af: "Kennisgewings",
  },
  settingsNotificationsDesc: {
    en: "Get pinged when payments come in or need verifying — even when the app is backgrounded.",
    zu: "Uthole izaziso lapho izinkokhelo zifika noma zidinga ukuqinisekiswa — ngisho no-app engaphandle.",
    st: "U tsebisoe ha litefello li fihla kapa li hloka ho netefatsoa — le hoja app e le morao.",
    af: "Kry kennisgewings wanneer betalings inkom of bevestig moet word — selfs wanneer die app op die agtergrond is.",
  },
  settingsNotificationsEnable: {
    en: "Enable notifications",
    zu: "Vumela izaziso",
    st: "Bulella litsebiso",
    af: "Aktiveer kennisgewings",
  },
  settingsNotificationsDisable: {
    en: "Disable notifications",
    zu: "Vala izaziso",
    st: "Koala litsebiso",
    af: "Skakel kennisgewings af",
  },
  settingsNotificationsBlocked: {
    en: "Your browser has blocked notifications. Enable them in your browser settings, then come back here.",
    zu: "Ibhrawuza yakho ivimbile izaziso. Zivumele emasethingini ebhrawuza, bese ubuya lapha.",
    st: "Braosara ea hao e thibetse litsebiso. Li bulele litlhophisong tsa braosara, ebe u khutlela mona.",
    af: "Jou blaaier het kennisgewings geblokkeer. Aktiveer hulle in jou blaaier-instellings en kom dan terug.",
  },
  settingsNotificationsUnsupported: {
    en: "This browser doesn't support notifications.",
    zu: "Le bhrawuza ayizisekeli izaziso.",
    st: "Braosara ena ha e tšehetse litsebiso.",
    af: "Hierdie blaaier ondersteun nie kennisgewings nie.",
  },

  // ---------------------------------------------------------------------
  // WhatsApp bot (PR #20). Admin plugs in their own Meta Cloud API
  // credentials; the webhook Edge Function then logs sales from
  // incoming WhatsApp messages sent to their business number.
  // ---------------------------------------------------------------------
  settingsWhatsApp: {
    en: "WhatsApp bot",
    zu: "I-bot ye-WhatsApp",
    st: "Bot ea WhatsApp",
    af: "WhatsApp-bot",
  },
  settingsWhatsAppDesc: {
    en: "Log sales by texting your WhatsApp Business number. Requires Meta Business API approval — see the setup guide in DEPLOY.md.",
    zu: "Bhalisa ukudayisa ngokuthumela umlayezo enombolweni yakho ye-WhatsApp Business. Kudinga imvume ye-Meta Business API — buka umhlahlandlela wokusetha ku-DEPLOY.md.",
    st: "Ngola thekiso ka ho ngolla nomorong ea hao ea WhatsApp Business. Ho hloka tumello ea Meta Business API — sheba tataiso ea ho lokisa ho DEPLOY.md.",
    af: "Teken verkope aan deur na jou WhatsApp Business-nommer te SMS. Vereis Meta Business API-goedkeuring — sien die opstellingsgids in DEPLOY.md.",
  },
  settingsWhatsAppActive: {
    en: "WhatsApp bot is active",
    zu: "I-bot ye-WhatsApp isebenza",
    st: "Bot ea WhatsApp ea sebetsa",
    af: "WhatsApp-bot is aktief",
  },
  settingsWhatsAppInactive: {
    en: "Not configured yet",
    zu: "Ayikahlelwa okwamanje",
    st: "Ha e e-so lokisoe",
    af: "Nog nie opgestel nie",
  },
  settingsWhatsAppPhoneIdLabel: {
    en: "Phone Number ID (from Meta dashboard)",
    zu: "I-ID Yenombolo Yefoni (kudashibhodi ye-Meta)",
    st: "ID ea Nomoro ea Fono (ho tsoa dashboard ea Meta)",
    af: "Foonnommer-ID (van Meta-dashboard)",
  },
  settingsWhatsAppTokenLabel: {
    en: "Access token",
    zu: "Ithokheni yokufinyelela",
    st: "Tokene ea phumaneho",
    af: "Toegangs-token",
  },
  settingsWhatsAppVerifyLabel: {
    en: "Verify token",
    zu: "Ithokheni yokuqinisekisa",
    st: "Tokene ea netefatso",
    af: "Verifikasie-token",
  },
  settingsWhatsAppSenderLabel: {
    en: "Your WhatsApp Business number (E.164)",
    zu: "Inombolo yakho ye-WhatsApp Business (E.164)",
    st: "Nomoro ea hao ea WhatsApp Business (E.164)",
    af: "Jou WhatsApp Business-nommer (E.164)",
  },
  settingsWhatsAppSaveCta: {
    en: "Turn on WhatsApp bot",
    zu: "Vula i-bot ye-WhatsApp",
    st: "Bulella bot ea WhatsApp",
    af: "Aktiveer WhatsApp-bot",
  },
  settingsWhatsAppGenerateVerify: {
    en: "Generate",
    zu: "Khiqiza",
    st: "Etsa",
    af: "Genereer",
  },
  settingsWhatsAppUpdateCta: {
    en: "Update credentials",
    zu: "Buyekeza imininingwane",
    st: "Ntlafatsa lintlha",
    af: "Werk geloofsbriewe op",
  },
  settingsWhatsAppReadDocs: {
    en: "Read the setup guide",
    zu: "Funda umhlahlandlela wokusetha",
    st: "Bala tataiso ea ho lokisa",
    af: "Lees die opstellingsgids",
  },

  // =====================================================================
  // PR #35 — Services hub
  // =====================================================================
  servicesTitle: {
    en: "Your services",
    zu: "Izinsiza zakho",
    st: "Litšebeletso tsa hao",
    af: "Jou dienste",
  },
  servicesSubtitle: {
    en: "One platform, the services you use.",
    zu: "Inkundla eyodwa, izinsiza ozisebenzisayo.",
    st: "Sethala se le seng, litšebeletso tseo u li sebelisang.",
    af: "Een platform, die dienste wat jy gebruik.",
  },
  servicesEnter: {
    en: "Enter",
    zu: "Ngena",
    st: "Kena",
    af: "Betree",
  },
  servicesAddTitle: {
    en: "Add a service",
    zu: "Engeza insiza",
    st: "Eketsa tšebeletso",
    af: "Voeg 'n diens by",
  },
  servicesAddSubtitle: {
    en: "Turn on more of what KasiKash can do for you.",
    zu: "Vula okwengeziwe i-KasiKash engakwenzela kona.",
    st: "Bula tse ling tseo KasiKash e ka u etsetsang tsona.",
    af: "Skakel meer aan van wat KasiKash vir jou kan doen.",
  },
  servicesEnabled: {
    en: "Enabled",
    zu: "Kuvuliwe",
    st: "E bulehile",
    af: "Geaktiveer",
  },
  servicesTurnOn: {
    en: "Turn on",
    zu: "Vula",
    st: "Bula",
    af: "Skakel aan",
  },

  // Service names + descriptions
  serviceStokvelName: {
    en: "Stokvel",
    zu: "Stokvel",
    st: "Stokvel",
    af: "Stokvel",
  },
  serviceStokvelDesc: {
    en: "Save as a group. Track contributions, invite members, reach your goal.",
    zu: "Onga niyiqembu. Landelela iminikelo, mema amalungu, ufinyelele umgomo wakho.",
    st: "Boloka e le sehlopha. Latela menehelo, memela litho, fihlela sepheo sa hao.",
    af: "Spaar as 'n groep. Volg bydraes, nooi lede, bereik jou doel.",
  },
  serviceMashonisaName: {
    en: "Mashonisa",
    zu: "Mashonisa",
    st: "Mashonisa",
    af: "Mashonisa",
  },
  serviceMashonisaDesc: {
    en: "Lend money and track repayments. Build a loan-book record lenders can see.",
    zu: "Boleka imali ulandelele ukukhokhelwa. Yakha irekhodi lezikweletu ababoleki abangayibona.",
    st: "Adima chelete 'me u latele ho lefuwa. Aha rekoto ea mekitlane eo baadimi ba ka e bonang.",
    af: "Leen geld uit en volg terugbetalings. Bou 'n leningsboek-rekord wat leners kan sien.",
  },

  // =====================================================================
  // PR #35 — Stokvel sub-types
  // =====================================================================
  stokvelKindLabel: {
    en: "Stokvel type",
    zu: "Uhlobo lwestokvel",
    st: "Mofuta oa stokvel",
    af: "Stokvel-tipe",
  },
  stokvelKindGroceries: {
    en: "Groceries",
    zu: "Ukudla",
    st: "Lijo",
    af: "Kruideniersware",
  },
  stokvelKindGroceriesDesc: {
    en: "Save through the year, buy in bulk in December.",
    zu: "Onga unyaka wonke, uthenge ngobuningi ngoDisemba.",
    st: "Boloka selemo sohle, u reke ka bongata ka Tšitoe.",
    af: "Spaar deur die jaar, koop in massa in Desember.",
  },
  stokvelKindSavings: {
    en: "Savings",
    zu: "Imali egciniwe",
    st: "Polokelo",
    af: "Spaargeld",
  },
  stokvelKindSavingsDesc: {
    en: "A general savings pot. Pay out when the group decides.",
    zu: "Imbiza yokonga evamile. Khokha uma iqembu linquma.",
    st: "Poto e akaretsang ea polokelo. Lefa ha sehlopha se etsa qeto.",
    af: "'n Algemene spaarpot. Betaal uit wanneer die groep besluit.",
  },
  stokvelKindBirthdays: {
    en: "Birthdays",
    zu: "Izinsuku zokuzalwa",
    st: "Matsatsi a tsoalo",
    af: "Verjaarsdae",
  },
  stokvelKindBirthdaysDesc: {
    en: "Each member gets the pot on their birthday.",
    zu: "Ilungu ngalinye lithola imbiza ngosuku lwalo lokuzalwa.",
    st: "Setho se seng le se seng se fumana poto ka letsatsi la sona la tsoalo.",
    af: "Elke lid kry die pot op hul verjaarsdag.",
  },

  // =====================================================================
  // PR #35 — Mashonisa service
  // =====================================================================
  mashonisaTitle: {
    en: "Mashonisa",
    zu: "Mashonisa",
    st: "Mashonisa",
    af: "Mashonisa",
  },
  mashonisaSubtitle: {
    en: "Your loan book",
    zu: "Incwadi yakho yezikweletu",
    st: "Buka ea hao ea mekitlane",
    af: "Jou leningsboek",
  },
  mashonisaOutTitle: {
    en: "Money on loan",
    zu: "Imali eboleka",
    st: "Chelete e adimiloeng",
    af: "Geld op lening",
  },
  mashonisaOutstandingTitle: {
    en: "Still owed to you",
    zu: "Okusakweletwayo",
    st: "Se u kolotoang",
    af: "Nog aan jou verskuldig",
  },
  mashonisaRepaidTitle: {
    en: "Repaid",
    zu: "Okukhokhiwe",
    st: "Se lefuoeng",
    af: "Terugbetaal",
  },
  mashonisaAddLoan: {
    en: "New loan",
    zu: "Isikweletu esisha",
    st: "Mokitlane o mocha",
    af: "Nuwe lening",
  },
  mashonisaEmptyTitle: {
    en: "No loans yet",
    zu: "Azikho izikweletu okwamanje",
    st: "Ha ho mekitlane hajoale",
    af: "Nog geen lenings nie",
  },
  mashonisaEmptyBody: {
    en: "Record money you lend out. Every repayment builds a credit-worthy track record.",
    zu: "Bhala imali oyibolekayo. Konke ukukhokhelwa kwakha irekhodi elifanelekayo lesikweletu.",
    st: "Ngola chelete eo u e adimang. Ho lefuwa ho hong le ho hong ho aha rekoto e loketseng ea mokitlane.",
    af: "Teken geld aan wat jy uitleen. Elke terugbetaling bou 'n kredietwaardige rekord.",
  },
  mashonisaBorrowerName: {
    en: "Who did you lend to?",
    zu: "Ubolekise bani?",
    st: "U adimile mang?",
    af: "Vir wie het jy geleen?",
  },
  mashonisaBorrowerNamePlaceholder: {
    en: "Borrower's name",
    zu: "Igama lombolekі",
    st: "Lebitso la moadimi",
    af: "Lener se naam",
  },
  mashonisaBorrowerPhone: {
    en: "Phone (optional)",
    zu: "Ifoni (okukhethwa kukho)",
    st: "Mohala (ikhethela)",
    af: "Foon (opsioneel)",
  },
  mashonisaAmountLent: {
    en: "Amount lent (R)",
    zu: "Imali ebolekiwe (R)",
    st: "Chelete e adimiloeng (R)",
    af: "Bedrag geleen (R)",
  },
  mashonisaInterest: {
    en: "Interest % (optional)",
    zu: "Inzalo % (okukhethwa kukho)",
    st: "Tswala % (ikhethela)",
    af: "Rente % (opsioneel)",
  },
  mashonisaRepaymentDate: {
    en: "Repayment date (optional)",
    zu: "Usuku lokukhokha (okukhethwa kukho)",
    st: "Letsatsi la ho lefa (ikhethela)",
    af: "Terugbetalingsdatum (opsioneel)",
  },
  mashonisaNotes: {
    en: "Notes (optional)",
    zu: "Amanothi (okukhethwa kukho)",
    st: "Lintlha (ikhethela)",
    af: "Notas (opsioneel)",
  },
  mashonisaSaveLoan: {
    en: "Save loan",
    zu: "Londoloza isikweletu",
    st: "Boloka mokitlane",
    af: "Stoor lening",
  },
  mashonisaRecordRepayment: {
    en: "Record repayment",
    zu: "Bhala ukukhokhelwa",
    st: "Ngola tefo",
    af: "Teken terugbetaling aan",
  },
  mashonisaRepaymentAmount: {
    en: "Repayment amount (R)",
    zu: "Imali yokukhokha (R)",
    st: "Chelete ea tefo (R)",
    af: "Terugbetalingsbedrag (R)",
  },
  mashonisaMarkDefaulted: {
    en: "Mark as defaulted",
    zu: "Maka njengengakhokhiwe",
    st: "Tšoaea e le e sa lefuoang",
    af: "Merk as wanbetaal",
  },
  mashonisaDeleteLoan: {
    en: "Delete loan",
    zu: "Susa isikweletu",
    st: "Hlakola mokitlane",
    af: "Vee lening uit",
  },
  mashonisaStatusOpen: {
    en: "Open",
    zu: "Kuvuliwe",
    st: "E butsoe",
    af: "Oop",
  },
  mashonisaStatusPartial: {
    en: "Partly repaid",
    zu: "Kukhokhwe ingxenye",
    st: "E lefuoe karolo",
    af: "Gedeeltelik terugbetaal",
  },
  mashonisaStatusRepaid: {
    en: "Repaid",
    zu: "Kukhokhiwe",
    st: "E lefuoe",
    af: "Terugbetaal",
  },
  mashonisaStatusDefaulted: {
    en: "Defaulted",
    zu: "Akukhokhiwanga",
    st: "Ha ea lefuoa",
    af: "Wanbetaal",
  },
  mashonisaOf: {
    en: "of",
    zu: "kwa",
    st: "ho",
    af: "van",
  },
  mashonisaDueLabel: {
    en: "Due",
    zu: "Kufanele ngo",
    st: "E lokela",
    af: "Verskuldig",
  },
  mashonisaCancel: {
    en: "Cancel",
    zu: "Khansela",
    st: "Hlakola",
    af: "Kanselleer",
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
