#!/usr/bin/env python3
"""Inject Afrikaans (af) translations into every entry in src/i18n.ts.

Every entry in the file has the shape:
    keyName: {
      en: "...",
      zu: "...",
      st: "...",
    },
or the one-liner:
    keyName: { en: "...", zu: "...", st: "..." },

We insert af: "translation" as the last field before the closing `}`.

This script is a build-time helper only. It runs once to seed Afrikaans
into src/i18n.ts. Kept in scripts/ so we can re-run or extend it if we
add more strings later.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Afrikaans translations keyed by i18n key name. Written by a fluent
# speaker with kasi/township + finance context in mind.
AF: dict[str, str] = {
    "brand": "KasiKash",
    "tagline": "Kasi-hustle, opgegradeer.",
    "greeting": "Hallo,",
    "todayEarnings": "Vandag se inkomste",
    "profit": "Wins",
    "owed": "Aan jou verskuldig",
    "quickActions": "Vinnige aksies",
    "logSale": "Teken 'n verkoop aan",
    "addTab": "Voeg 'n skuldrekening by",
    "seeInsights": "Sien insigte",
    "recentSales": "Onlangse verkope",
    "noSales": "Nog geen verkope vandag nie. Tik die mikrofoon om jou eerste een aan te teken.",
    "home": "Tuis",
    "sales": "Teken",
    "tabs": "Skoroskoro",
    "stokvelNav": "Stokvel",
    "insights": "Insigte",
    "micTapToSpeak": "Tik om te praat \u2014 s\u00ea wat jy verkoop het",
    "listening": "Luister...",
    "heard": "Ek het gehoor",
    "confirm": "Bevestig verkoop",
    "retry": "Probeer weer",
    "typeInstead": "Tik dit eerder",
    "item": "Item",
    "qty": "Aantal",
    "price": "Prys (R)",
    "save": "Stoor",
    "voiceUnavailableTitle": "Stem is nie beskikbaar op hierdie foon nie",
    "voiceUnavailableBody": "Jy kan steeds jou verkoop aanteken deur dit hieronder te tik.",
    "micPermissionDenied": "Mikrofoon is geblokkeer. Aktiveer dit in jou blaaier se instellings en tik weer die mikrofoon.",
    "saleLogged": "Verkoop aangeteken",
    "undo": "Ontdoen",
    "undone": "Ongedaan gemaak",
    "sampleSuggestion1": "Verkoop 3 brode teen R18",
    "tabsTitle": "Skoroskoro \u2014 kli\u00ebntrekeninge",
    "totalOwed": "Totaal aan jou verskuldig",
    "markPaid": "Merk as betaal",
    "addCustomer": "Voeg kli\u00ebnt + bedrag by",
    "customerName": "Kli\u00ebnt se naam",
    "amount": "Bedrag (R)",
    "paidJust": "het jou betaal",
    "stokvelTitle": "Jou Stokvel",
    "stokvelSub": "Groep-spaarpot",
    "stokvelGoal": "Doel",
    "stokvelSaved": "Gespaar",
    "stokvelMembers": "Lede",
    "contribute": "Dra by",
    "recentContributions": "Onlangse bydraes",
    "quickAdd": "Vinnig by",
    "goalReached": "Doel bereik!",
    "stokvelRoleAdmin": "Admin",
    "stokvelRoleMember": "Lid",
    "stokvelMemberOf": "{count} van {target} lede",
    "stokvelYouContributed": "Jy het bygedra",
    "stokvelMembersList": "Lede",
    "contribBy": "deur",
    "stokvelEmptyTitle": "Jy is nog nie in 'n stokvel nie",
    "stokvelEmptySub": "Skep jou eie of sluit aan met 'n kode.",
    "stokvelCreateCard": "Skep 'n stokvel",
    "stokvelCreateCardDesc": "Jy sal die admin wees",
    "stokvelJoinCard": "Sluit aan met 'n kode",
    "stokvelJoinCardDesc": "Jy sal 'n lid wees",
    "stokvelCreateHeader": "Begin 'n nuwe stokvel",
    "stokvelCreateSubmit": "Skep stokvel",
    "stokvelCreatingProgress": "Besig om te skep...",
    "stokvelJoinHeader": "Sluit aan by 'n stokvel",
    "stokvelJoinCodeLabel": "Uitnodigingskode",
    "stokvelJoinCodePlaceholder": "K-XXXX-YYYY",
    "stokvelJoinSubmit": "Sluit aan",
    "stokvelJoiningProgress": "Besig om aan te sluit...",
    "stokvelJoinInvalid": "Daardie kode is nie geldig nie of het verval.",
    "stokvelInviteBtn": "Nooi lede uit",
    "stokvelInviteHeader": "Nooi mense na jou stokvel",
    "stokvelInviteHelper": "Deel hierdie kode \u2014 enigiemand met die kode kan aansluit.",
    "stokvelInviteCopy": "Kopieer kode",
    "stokvelInviteCopied": "Gekopieer \u2713",
    "stokvelInviteShareWhatsApp": "Deel op WhatsApp",
    "stokvelInviteWhatsAppMessage": "Kom sluit aan by ons stokvel op KasiKash! Voer hierdie kode in: {code}",
    "stokvelInviteExpires": "Verval oor {days} dag(e)",
    "stokvelInviteRefresh": "Genereer 'n nuwe kode",
    "stokvelLeave": "Verlaat stokvel",
    "stokvelLeaveConfirm": "Jy sal ophou om hierdie stokvel te sien. Jou vorige bydraes bly op rekord.",
    "stokvelLeaveConfirmBtn": "Ja, verlaat",
    "stokvelLeaveCancel": "Bly",
    "stokvelLeaveSoleAdmin": "Jy is die enigste admin. Maak iemand anders eers admin, of verwyder die stokvel.",
    "creditScore": "KasiScore",
    "creditSub": "Jou besigheid se finansi\u00eble paspoort",
    "weekProfit": "Hierdie week se wins",
    "topSellerLabel": "Beste verkoper",
    "aiTips": "Slim wenke vir jou",
    "aiPoweredBadge": "Aangedryf deur jou data",
    "scoreLabelExcellent": "Uitstekend",
    "scoreLabelGood": "Goed",
    "scoreLabelFair": "Redelik",
    "poweredBy": "Stem-eerste. Vanlyn-gereed. Kasi-gebou.",
    "insightsEmpty": "Teken 'n paar meer verkope aan om persoonlike wenke te ontsluit.",
    "insightOldTabs": "{count} kli\u00ebnte skuld jou langer as 7 dae \u2014 {name} vir {days} dae. Stuur 'n WhatsApp-herinnering.",
    "insightHotItem": "{item} vlieg vandag \u2014 {count} verkope in die afgelope 24u. Vul voorraad aan voor die aand.",
    "insightUpToday": "Jy is {pct}% op teenoor jou weeklikse gemiddelde. Groot dag \U0001F4AA",
    "insightDownToday": "Vandag is {pct}% af teenoor jou gemiddelde. Probeer 'n WhatsApp-uitsending na gereelde kli\u00ebnte.",
    "insightSilentDay": "Geen verkope vandag aangeteken nie. Tik die mikrofoon om vinnig by te bly voordat kli\u00ebnte inkom.",
    "insightCreditUnlocked": "\U0001F389 Jou KasiScore ontsluit R{amount} in stokvel-gedekte krediet. Tik Insigte om die voorwaardes te sien.",
    "insightScoreClimbing": "Jou KasiScore klim \u2014 {needed} punte om mikrokrediet te ontsluit.",
    "insightStokvelClose": "Jy is R{remain} van {name} se doel af. Nog een sterk week bring jou daar.",
    "insightStokvelStart": "{name} is stil. Dra R100 hierdie week by om die momentum te behou.",
    "insightBigOwed": "R{owed} is op skuldrekeninge. Selfs die helfte invorder \u2014 R{half} \u2014 versterk jou KasiScore.",
    "onbChooseLang": "Kies jou taal",
    "onbStepOf": "Stap {step} van {total}",
    "onbNameTitle": "Hoe moet ons jou noem?",
    "onbNameSubtitle": "Hierdie is die naam wat op jou dashboard verskyn.",
    "onbNamePlaceholder": "bv. Nomsa",
    "onbBusinessTitle": "Vertel ons van jou besigheid",
    "onbBusinessSubtitle": "Opsioneel \u2014 sodat ons jou dashboard kan aanpas.",
    "onbBusinessOptionalHint": "Gebruik jy KasiKash net vir 'n stokvel? Jy kan hierdie oorslaan.",
    "onbNoBusiness": "Ek het nie 'n besigheid nie \u2014 slaan oor",
    "onbBusinessNameLabel": "Besigheidsnaam",
    "onbBusinessNamePlaceholder": "bv. Nomsa se Spaza",
    "onbBusinessTypeLabel": "Tipe besigheid",
    "onbStokvelTitle": "Jou stokvel",
    "onbStokvelSubtitle": "Skep 'n nuwe een of sluit aan met 'n kode. Jy kan dit ook oorslaan en later opstel.",
    "onbStokvelChoiceCreate": "Skep 'n nuwe stokvel",
    "onbStokvelChoiceJoin": "Sluit aan met 'n kode",
    "onbStokvelChoiceSkip": "Slaan nou oor",
    "onbStokvelNameLabel": "Stokvel-naam",
    "onbStokvelNamePlaceholder": "bv. Ma-Nomsa Stokvel",
    "onbStokvelGoalLabel": "Spaardoel (R)",
    "onbStokvelMembersLabel": "Verwagte lede",
    "onbBack": "Terug",
    "onbNext": "Volgende",
    "onbFinish": "Voltooi",
    "onbSkip": "Slaan nou oor",
    "bizSpaza": "Spaza-winkel",
    "bizSalon": "Salon / kapper",
    "bizTaxi": "Taxi-drywer",
    "bizTailor": "Kleremaker",
    "bizFood": "Kos / kota / kombuis",
    "bizOther": "Ander",
    "settingsTitle": "Instellings",
    "sectionProfile": "Jy",
    "sectionBusiness": "Jou besigheid",
    "sectionStokvel": "Jou stokvel",
    "sectionAccount": "Rekening",
    "settingsOwnerLabel": "Jou naam",
    "settingsLanguageLabel": "Taal",
    "settingsSaved": "Gestoor \u2713",
    "settingsStokvelMemberOnly": "Slegs die admin kan stokvel-besonderhede wysig.",
    "settingsStokvelNone": "Jy is nie in 'n stokvel nie. Maak die Stokvel-oortjie oop om een te skep of aan te sluit.",
    "accountAnonymous": "Stoor jou rekening",
    "accountAnonymousDesc": "Voeg 'n e-pos by sodat jy vanaf ander fone kan inteken en nooit jou data verloor nie.",
    "accountReset": "Herstel hierdie rekening",
    "accountResetDesc": "Vee jou data uit en begin oor. Dit kan nie ongedaan gemaak word nie.",
    "accountResetConfirm": "Ja, vee alles uit",
    "accountResetCancel": "Nee, hou my data",
    "authSignedInAs": "Ingeteken as",
    "authSignedInDesc": "Jou data is veilig. Jy kan met hierdie e-pos vanaf enige toestel inteken.",
    "authSignOut": "Teken uit",
    "authEmailLabel": "E-pos",
    "authEmailPlaceholder": "jy@voorbeeld.com",
    "authSaveDataCta": "Stuur bevestigingskakel",
    "authAlreadyHaveAccount": "Het reeds 'n rekening? Teken in",
    "authSignInHeader": "Teken in by jou rekening",
    "authSignInDesc": "Ons stuur vir jou 'n toorkakel per e-pos \u2014 klik dit op hierdie toestel.",
    "authSignInCta": "Stuur intekenskakel",
    "authBackToSave": "Terug \u2014 stoor eerder hierdie rekening",
    "authPendingVerificationTitle": "Kyk in jou inkassie \U0001F4EC",
    "authPendingVerification": "Ons het 'n bevestigingskakel na {email} gestuur. Klik dit op hierdie toestel om jou rekening te stoor.",
    "authPendingSigninTitle": "Toorkakel gestuur \U0001F4EC",
    "authPendingSignin": "Ons het 'n intekenskakel na {email} gestuur. Maak dit oop op die toestel wat jy wil gebruik.",
    "authPendingExpires": "Die skakel verval oor 1 uur. Nie ontvang nie? Kyk in gemorspos.",
    "authDismiss": "Sluit",
    "authTryAnother": "Gebruik 'n ander e-pos",
    "authInvalidEmail": "Voer asseblief 'n geldige e-pos in",
    "authSending": "Besig om te stuur...",
    "sectionPayments": "Betalings",
    "payDescription": "Laat lede hul bydrae direk in die app betaal via PayShap of kaart. Geld beland in jou Yoco-rekening \u2014 KasiKash raak dit nooit aan nie.",
    "payConfiguredTitle": "Outomatiese betalings aktief",
    "payConfiguredLive": "Regte geld beweeg deur jou Yoco-rekening.",
    "payConfiguredTest": "Toets-modus \u2014 geen regte geld beweeg nie. Ideaal vir demo's.",
    "payBadgeLive": "LEWE",
    "payBadgeTest": "TOETS",
    "payAutoBadge": "Outo",
    "payTestBadge": "Toets",
    "payUpdateKey": "Werk Yoco-sleutel op",
    "paySecretLabel": "Yoco-geheime sleutel",
    "paySecretPlaceholder": "sk_live_...  of  sk_test_...",
    "paySecretHint": "Vind dit in jou Yoco-dashboard \u2192 Developers \u2192 API keys.",
    "paySecretInvalid": "Dit lyk nie soos 'n geldige Yoco-geheime sleutel nie.",
    "payModeLabel": "Modus",
    "payModeTest": "Toets (sandbox)",
    "payModeLive": "Lewend (regte geld)",
    "paySaveCta": "Skakel betalings aan",
    "paySaving": "Besig om op te stel...",
    "paySaved": "Betalings is aan. Lede kan nou binne die app bydra.",
    "payCancel": "Kanselleer",
    "payFeeNote": "KasiKash hef 0% platformfooi. Yoco hef hul standaard ~3% + R2 per transaksie op jou handelaarsrekening.",
    "payOpeningCheckout": "Yoco-betaling word oopgemaak...",
    "contribCustom": "Pasgemaak",
    "contribSheetTitle": "Dra by tot",
    "contribAmountLabel": "Bedrag (R)",
    "contribNoteLabel": "Nota (opsioneel)",
    "contribNotePlaceholder": "bv. Mei 2026, EFT verw 45782",
    "contribPayYocoBtn": "Betaal met kaart",
    "contribPayYocoHelp": "Jy sal na 'n veilige Yoco-betaalpunt geneem word. Geld beweeg dadelik.",
    "contribLogEftBtn": "Teken betaling aan (EFT / kontant)",
    "contribManualExplain": "Outomatiese kaartbetalings is nog nie vir hierdie stokvel opgestel nie, so die app kan nie geld vir jou verskuif nie. Betaal eers via EFT, bankoorplasing of kontant, tik dan hieronder om dit aan te teken. Die admin sal dit sien en kan dit bevestig.",
    "contribManualBadge": "Aangeteken \u2014 nog nie via app betaal nie",
    "contribInvalidAmount": "Voer 'n bedrag groter as R0 in",
    "contribSetupYocoCTA": "Admin: stel Yoco op in Instellings vir outomatiese kaartbetalings",
    "contribSetupBankingCTA": "Admin: voeg jou stokvel se bankbesonderhede in Instellings by sodat lede jou kan betaal.",
    "contribCancel": "Kanselleer",
    "contribMethodBank": "Bankoorplasing",
    "contribMethodCard": "Kaart",
    "contribBankExplain": "Plaas die bedrag oor vanaf jou bank-app met hierdie besonderhede. Gebruik die verwysing hieronder sodat die admin jou betaling kan opspoor. Nadat jy betaal het, tik die knoppie onderaan om dit aan te teken \u2014 die admin sal dit verifieer en bevestig.",
    "contribBankIvePaid": "Ek het betaal \u2014 teken dit aan",
    "contribBankWhatsAppMessage": "Hallo \u2014 ek het pas {amount} aan die {stokvel} stokvel-rekening betaal. Verwysing: {reference}. Bevestig asseblief in KasiKash wanneer dit aankom.",
    "bankName": "Bank",
    "bankAccountHolder": "Rekeninghouer",
    "bankAccountNumber": "Rekeningnommer",
    "bankBranchCode": "Takkode",
    "bankPayshapPhone": "PayShap-nommer",
    "bankReference": "Verwysing",
    "bankCopyDetails": "Kopieer besonderhede",
    "bankCopied": "Gekopieer!",
    "pendingSectionTitle": "Wag vir verifikasie",
    "pendingAdminSubtitle": "Bevestig elke betaling sodra jy dit in jou bankrekening sien.",
    "pendingMemberSubtitle": "Die admin sal bevestig wanneer jou betaling aankom.",
    "pendingBadge": "Hangende",
    "rejectedBadge": "Verwerp",
    "verifyConfirmBtn": "Bevestig",
    "verifyRejectBtn": "Verwerp",
    "verifyRejectPromptTitle": "Verwerp hierdie betaling?",
    "verifyRejectPromptBody": "Hierdie sal die betaling as nie ontvang nie merk. Voeg 'n kort nota (opsioneel) sodat die lid weet hoekom.",
    "verifyRejectReasonPlaceholder": "bv. geen passende oorplasing gevind nie",
    "settingsBankingHeader": "Stokvel-bankwese",
    "settingsBankingSub": "Waar lede hul bydraes stuur. Slegs sigbaar vir stokvel-lede.",
    "settingsBankingPlaceholderBank": "bv. Capitec, Standard Bank, FNB",
    "settingsBankingPlaceholderHolder": "Naam soos dit op die rekening verskyn",
    "settingsBankingPlaceholderAccount": "10-syfer rekeningnommer",
    "settingsBankingPlaceholderBranch": "bv. 250655",
    "settingsBankingPlaceholderPayshap": "Selnommer wat aan PayShap gekoppel is (opsioneel)",
    "settingsBankingSave": "Stoor bankbesonderhede",
    "settingsBankingSaved": "Gestoor \u2713",
    "settingsBankingClearAll": "Vee alle bankbesonderhede uit",
    "payReturnProcessing": "Bevestig jou betaling...",
    "payReturnSuccess": "Betaling ontvang \u2705",
    "payReturnCancel": "Betaling gekanselleer. Probeer weer wanneer jy gereed is.",
    "payReturnFailed": "Betaling het nie deurgekom nie. Jou bank het 'n fout teruggestuur.",
    "payReturnClose": "Maak toe",
    "appVersion": "KasiKash",
}


def escape(v: str) -> str:
    """Return a valid TS string literal for the given value."""
    return '"' + v.replace("\\", "\\\\").replace('"', '\\"') + '"'


def inject(source: str) -> tuple[str, list[str]]:
    """Return source with af entries injected + list of any missing keys."""
    missing: list[str] = []

    # Regex for a full multi-line entry:
    #   keyName: {
    #     en: "...",
    #     zu: "...",
    #     st: "...",
    #   },
    # We capture: (whitespace + key), (body up to and including st: line),
    # (closing indent + brace).
    multi_re = re.compile(
        r"^(?P<indent> {2,})(?P<key>[a-zA-Z]\w*): \{\n"
        r"(?P<body>(?:.*\n)*?)"
        r"^(?P=indent) {2}st: (?P<stval>.*),\n"
        r"^(?P=indent)\},",
        re.MULTILINE,
    )

    def replace_multi(m):
        key = m.group("key")
        af = AF.get(key)
        if af is None:
            missing.append(key)
            return m.group(0)
        indent = m.group("indent")
        body = m.group("body")
        stval = m.group("stval")
        return (
            f"{indent}{key}: {{\n"
            f"{body}"
            f"{indent}  st: {stval},\n"
            f"{indent}  af: {escape(af)},\n"
            f"{indent}}},"
        )

    source = multi_re.sub(replace_multi, source)

    # Regex for a one-liner entry:
    #   keyName: { en: "...", zu: "...", st: "..." },
    one_re = re.compile(
        r"^(?P<indent> {2,})(?P<key>[a-zA-Z]\w*): \{ "
        r"en: (?P<en>[^,]+), "
        r"zu: (?P<zu>[^,]+), "
        r"st: (?P<st>[^}]+?) "
        r"\},",
        re.MULTILINE,
    )

    def replace_one(m):
        key = m.group("key")
        af = AF.get(key)
        if af is None:
            missing.append(key)
            return m.group(0)
        indent = m.group("indent")
        return (
            f"{indent}{key}: {{ "
            f"en: {m.group('en').strip()}, "
            f"zu: {m.group('zu').strip()}, "
            f"st: {m.group('st').strip()}, "
            f"af: {escape(af)} "
            f"}},"
        )

    source = one_re.sub(replace_one, source)
    return source, missing


def update_lang_type_and_langs(source: str) -> str:
    """Add 'af' to the Lang union type and Afrikaans to the LANGS array."""
    source = source.replace(
        'export type Lang = "en" | "zu" | "st";',
        'export type Lang = "en" | "zu" | "st" | "af";',
    )
    source = source.replace(
        '  { code: "st", label: "Sesotho", native: "Sesotho", flag: "ST" },\n]',
        '  { code: "st", label: "Sesotho", native: "Sesotho", flag: "ST" },\n'
        '  { code: "af", label: "Afrikaans", native: "Afrikaans", flag: "AF" },\n]',
    )
    source = source.replace(
        "// Multilingual copy for KasiKash. English (en), isiZulu (zu), Sesotho (st).",
        "// Multilingual copy for KasiKash. English (en), isiZulu (zu), Sesotho (st), Afrikaans (af).",
    )
    return source


def main() -> int:
    path = Path("/projects/sandbox/AI-Data-To-Kasi-Small-business/src/i18n.ts")
    source = path.read_text()
    source = update_lang_type_and_langs(source)
    source, missing = inject(source)
    if missing:
        print(f"WARNING: {len(missing)} keys have no Afrikaans translation:")
        for k in missing:
            print(f"  - {k}")
    path.write_text(source)
    print(f"OK: injected af translations. {len(AF)} known keys.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
