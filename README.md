# SAK26

Serverisse üleslaetav veebipõhine kaardirakendus: vasakul kihipaneel, paremal
suur kaardivaade. Töötab tavalises Windows/Android/iOS brauseris ning DJI
Matrice 4T RC Plus 2 Enterprise pульти brauseris, kuna kasutab ainult tavalist
HTML/CSS/JS-i (Leaflet) + kerget PHP-d failihaldusele.

## Kiirpaigaldus

1. Laadi kogu kaust (`index.html`, `css/`, `js/`, `php/`, `MyFiles/`) FTP
   kaudu oma veebiserverisse (nt `public_html/kaart/`).
2. Serveril peab olema PHP 7.4+ ja kirjutamisõigusega kaust `MyFiles/uploads/`.
3. Ava brauseris `https://sinudomeen.ee/kaart/index.html`. Ligipääs on
   avatud kõigile, kellel link on (autentimist ei ole).

## Muudatused viimases versioonis

### 1. Info (ⓘ) nupud
Rakenduse päises on üldine ⓘ nupp (rakenduse info, andmeallikad, litsentsid)
ja iga jaotise ("Taustakaart", "Lennuliiklus", "PRIA põllumassiivid",
"Minu kaardid") pealkirja juures väiksem ⓘ nupp, mis avab konkreetse
funktsiooni kohta selgituse.

### 2. EANS UTM ja Taustakaart samal asukohal/suumil
Taustakaart on "master" vaade. EANS-i akna sisselülitamisel avaneb
manus (iframe) URL-iga, mis sisaldab hetkel Taustakaardil olevat asukohta
ja suumitaset (`?lat=...&lon=...&zoom=...`). Manuse ribal on nupp
"🔄 Sünkrooni Taustakaardiga", mis liigutab EANS-i vaate uuesti
Taustakaardiga samale kohale, kui oled vahepeal Taustakaarti liigutanud.

**NB!** EANS Droonikaart on kolmanda osapoole täisrakendus — see
sünkroniseerimine on parim võimalik katse (URL-parameetrite kaudu) ja
töötab ainult siis, kui EANS-i enda rakendus neid parameetreid loeb.
Kui see ei toimi, kasuta "Ava uues aknas" linki ja navigeeri seal käsitsi.

### 3–5. PRIA põllumassiivid: kihtide valik, salvestatud otsingud, värvid
- Vajuta "↻ Lae kihtide loend" — rakendus loeb PRIA WFS-teenuse
  GetCapabilities vastusest kõik saadaolevad kihid (typeName + pealkiri)
  ja kuvab need linnukestega nimekirjana.
- Iga kiht on eraldi sisse/välja lülitatav ja saab oma püsiva värvi
  (värvipalett `js/config.js` failis, `pria.colorPalette`), mis salvestub
  brauseri `localStorage`-sse, nii et sama kiht saab sama värvi ka
  järgmine kord.
- Valitud kihtide komplekti saab salvestada nimega eelseadistusena
  ("💾 Salvesta") ja hiljem kiirelt taastada ("📂 Lae") või kustutada
  ("🗑"). Eelseadistused salvestatakse samuti `localStorage`-sse (kohalikult
  brauseris, mitte serveris).
- Andmed laetakse ikka ainult praeguse kaardivaate (BBOX) piires ja alles
  suumitasemest 14 alates — see hoiab päringud kiirena ~160 000 objekti
  suurusel andmestikul.

### 6. Jahipiirkonnad eemaldatud
Jahipiirkondade WMS-kiht on rakendusest täielikult eemaldatud. Kui soovid
oma jahipiirkonna kaarti kuvada, ekspordi see KML/KMZ/SHP failina ja lisa
see "Minu kaardid" alt — see töötab täpselt samamoodi kui iga teine oma kiht
(sisse/välja lülitamine, siltide lisamine, info popup, eemaldamine).

### 7. "Eesti kaardid ei kuva midagi" — parandatud
Esimeses versioonis kasutati Maa-ameti WMTS-teenust koos **oletatud**
TileMatrixSet nimega, mida ei olnud võimalik dokumentatsioonist kinnitada —
seetõttu jäid taustakaardid tühjaks. Nüüd kasutatakse selle asemel
tavalist **OGC WMS GetMap** päringut (`L.tileLayer.wms` otse
`https://tiles.maaamet.ee/tm/` vastu), mis ei vaja eelnevalt kokkulepitud
tile-matrix-set'i ja töötab otse EPSG:3857-ga.

Kui mõni taustakaart ikka ei ilmu (nt "Valevärviortofoto / CIR", mille kihi
masinnime — `fotoinfra` — ei olnud avalikust dokumentatsioonist 100%
kinnitatav):
- Rakendus näitab nüüd ka kollast hoiatusriba kaardi peal, kui kihi
  pildid ei laadi (nt vale kihinimi).
- Kontrolli õiget kihinime siit: `https://tiles.maaamet.ee/tm/?service=WMS&version=1.1.1&request=GetCapabilities`
  ja uuenda vastavat `layer` väärtust failis `js/config.js`
  (`baseLayers` massiivis).

### 8–10. Minu kaardid: info, sildid, eemaldamine
- **Info:** klõpsa kaardil otse mistahes objektil (nii üleslaetud kihtidel
  kui MyFiles kaustast laetutel) — avaneb popup kõigi selle objekti
  andmeväljadega. Iga kihi juures on ka eraldi ⓘ nupp, mis näitab kihi
  kokkuvõtet: objektide arv ja kõik saadaolevad andmeväljad.
- **Sildid:** kui kihil on tuvastatud andmeväljad, ilmub kihi rea alla
  valik "Sildi väli:" — vali sealt väli (nt "nimi" või "liik") ja iga
  objekti kõrvale ilmub püsiv silt selle välja väärtusega. Vali
  "(puudub)", et sildid eemaldada.
- **Eemaldamine:** iga kihi juures on "✕" nupp, mis eemaldab kihi
  kaardilt (küsib enne kinnitust). See ei kustuta faili serverist —
  MyFiles kaustast laetud faili saab uuesti lisada "↻ Lae MyFiles
  kaustast" nupu abil.

### 11. "shape is not defined" viga — parandatud
Viga tekkis, kuna rakendus viitas shpjs teegi CDN-lingis versioonile
(`[email protected]`), mida tegelikult ei eksisteeri — skript ei laadinud
ning `shp` funktsiooni polnud seetõttu olemas. Nüüd kasutatakse kinnitatud
töötavat linki: `https://cdnjs.cloudflare.com/ajax/libs/shpjs/6.2.0/shp.min.js`.
Kui see viga peaks kunagi uuesti ilmnema (nt CDN muudab oma struktuuri),
annab rakendus nüüd ka selgema veateate ("Shapefile'i teisendaja pole
laetud...") lihtsalt vaikimisi JS-vea asemel.

## Uusim muudatuste pakett

### "MyFiles not readable" — php/list_files.php parandatud
Varasem versioon vaikis, kui `MyFiles/uploads` kausta ei leitud või seda
ei õnnestunud lugeda (nt õiguste probleem serveris) — see nägi brauseris
välja nagu üldine "ei õnnestunud lugeda" viga ilma täpsema põhjuseta.
Lisaks võis üks stray PHP hoiatus (nt ebaõnnestunud `scandir()` korral)
JSON-vastuse enne meie enda väljundit ära rikkuda, mistõttu brauser ei
saanud vastust üldse parsida.

Nüüd:
- `list_files.php` kontrollib eraldi, kas kaust on olemas, kas see on
  kaust, ja kas see on serverile loetav — ning tagastab iga juhtumi
  jaoks konkreetse veateate (mitte üldise "ei õnnestu").
- Kõik stray PHP hoiatused on alla surutud (`display_errors=0`), nii et
  vastus on alati kehtiv JSON.
- Rakendus näitab nüüd seda konkreetset serveri veateadet otse
  "MyFiles" jaotuse staatuses, selle asemel, et alati sama üldist
  teadet näidata — nii on lihtsam kohe aru saada, kas probleem on
  vale kaustatee, õiguste seadistus, või midagi muud.

Testitud PHP 8.3 `php -l` ja tegeliku käivitusega kolme stsenaariumi
jaoks (kaust olemas + failidega, kaust puudub, kaust olemas aga
loetamatu) — kõik kolm annavad kehtiva JSON-vastuse.

## Varasem muudatuste pakett

### Rakenduse nimi: SAK26
Rakendus kannab nüüd nime **SAK26** (varem "Kaardirakendus") — nähtav
brauseri vahelehe pealkirjas ja rakenduse info (ⓘ) aknas.

### Kihid peidus vaikimisi
Vasak paneel ("Kihid") on nüüd lehe avamisel **peidetud** — vajuta
vasakul üleval "☰ Kihid" nuppu, et see avada. See annab kaardile
rohkem ruumi, eriti mobiilis/RC kontrolleri ekraanil.

### Taustakaardi valik: "vali üks" tekst eemaldatud
Puhtam pealkiri — käitumine (raadionupud, ainult üks korraga aktiivne)
on endiselt sama, ainult abitekst on ära võetud.

### Kaardi suumipiirid
Kaardile on lisatud üldine **madalaim lubatud suum** (vaikimisi 3),
et vältida tarbetut väljasuumimist tasemele, kus rakenduse
Eesti-spetsiifilised kihid (taustakaardid, PRIA, jahikaart jne) niikuinii
kasutuskõlbmatud on. Piirid on seadistatavad failis `js/config.js`
(`mapMinZoom` / `mapMaxZoom`).

### Kaardi suum + Minu kaardid seaded — jäävad meelde
- **Kaardi enda asukoht/suum** salvestatakse brauserisse ja taastatakse
  järgmisel lehe avamisel (selle asemel, et alati Eesti tervikvaatest
  alustada).
- **Iga "Minu kaardid" kihi** suumipiirid (kiht/sildid alates suumist),
  sildi väli ja värviseaded (ühtne/temaatiline) salvestuvad samuti
  brauserisse, seotuna faili nimega — kui sama fail hiljem uuesti
  laetakse (nt automaatselt MyFiles kaustast), rakenduvad varasemad
  seaded automaatselt uuesti.

### Eraldi "Minu asukoht" nupp kaardil
Lisaks vasaku paneeli "📍 Minu asukoht" nupule on nüüd väike ümmargune
📍 nupp otse kaardi peal (paremal all), mis teeb sama asja — mugav, kui
paneel on peidetud.

### Suumi +/- nupud liigutatud, et vältida kattumist
Leafleti +/- suumikontroll on nüüd paremal üleval (mitte vasakul
üleval, kus see kattus "☰ Kihid" nupuga) — eriti oluline väiksemate/
mobiiliekraanide puhul.

## Varasemad muudatused (SAK26 nimemuutusele eelnev pakett)

### Google Sheets "Failed to fetch" — parandatud
Google'i `gviz/tq` CSV-liides ei saada alati brauserile vajalikke CORS
päiseid, mistõttu otse brauserist tehtud `fetch()` päring võib
ebaõnnestuda veateatega "Failed to fetch". Nüüd käib ka Google Sheetsi
lugemine — nagu juba OneDrive puhul — serveri kaudu
(`php/data_proxy.php`), mis väldib CORS-i täielikult, kuna brauser
suhtleb ainult sinu enda domeeniga.

### Minu kaardid: suumitasemed kihi ja siltide jaoks
Iga oma kihi juures saab nüüd määrata kaks suumitaset:
- **"Kiht alates suumist"** (vaikimisi 13, nagu PRIA) — kiht ise ei
  kuvata enne, kui ollakse suumitud vähemalt sellele tasemele.
- **"Sildid alates suumist"** (vaikimisi 15) — sildid ilmuvad alles
  suuremas suumis, isegi kui kiht ise on juba nähtav, et vältida
  teksti ülekuhjumist.

Lisaks kuvatakse kihilt alati ainult **praeguses kaardivaates olevaid
objekte** (viewport-põhine filtreerimine) — see hoiab rakenduse kerge
ja kiire ka suurte failide korral, kuna kaart ei pea korraga
joonistama tuhandeid objekte, mis parasjagu ekraanil ei paista.

### Minu kaardid: temaatiline värvimine
Iga kihi juures saab valida "Ühtne värv" (kogu kiht ühte värvi) või
"Temaatiline (välja järgi)" — vali andmeväli (nt liik, staatus, tüüp)
ja igale unikaalsele väärtusele omistatakse automaatselt oma värv,
koos väikese legendiga kihi rea all.

### PRIA: kihtide rühmitamine ja kiirvalikud
Kihid, mille nimi/pealkiri sisaldab "PÕLLUD" (nt PRIA_PÕLLUD),
kuvatakse nüüd eraldi grupis nimekirja tipus, koos kahe kiirnupuga:
- **"⭐ Vali PRIA PÕLLUD (peamine)"** — valib automaatselt kõige
  tõenäolisema "peamise" kihi (lühima nimega vastega).
- **"☑ Vali kõik 'PÕLLUD' kihid"** — valib korraga kõik seotud kihid.

Muud, harvem vajaminevad kihid on peidetud "▸ Näita muid kihte" nupu
taha, et vähendada nimekirja segadust.

### Lennuliiklus (EANS) — viidud kihtide nimekirja tippu
"Lennuliiklus" jaotus on nüüd esimene kihtide sektsioon (Taustakaardi,
PRIA ja Minu kaartide ees).

### Ahendatavad sektsioonid
Igal neljal peamisel jaotusel (Lennuliiklus, Taustakaart, PRIA
põllumassiivid, Minu kaardid) on nüüd väike ▾/▸ nupp pealkirja ees,
millega saab sektsiooni sisu ahendada/laiendada — vasak paneel jääb
korrastatumaks, kui parasjagu kõiki seadeid vaja ei lähe.

### Otsing + Google Mapsi juhised (Minu kaardid)
Uus "Otsi objekti" alajaotus "Minu kaardid" sees: vali kiht ja väli
(nt nimi või kood), sisesta otsitav väärtus. Leitud objektile
suumitakse kaardil (koos ajutise punase ringiga esiletõstuks) ja
kuvatakse nupp "🚗 Ava Google Mapsi juhised", mis avab Google Mapsi
otse sellesse asukohta suunavate juhistega (töötab nii mobiilis
Google Mapsi rakendusega kui ka veebis).

### Minu kaardid: püsiv serveris hoidmine
Kõik üleslaetud failid laetakse nüüd **automaatselt** iga kord, kui
keegi lehte avab — mitte ainult siis, kui keegi käsitsi nuppu vajutab.
Failid jäävad serverisse ja on kõigile lingi kaudu nähtavad, kuni need
jäädavalt kustutatakse. Lisandus kaks eraldi nuppu iga kihi juures:
- **"✕"** — eemaldab kihi ainult praegusest vaatest (fail jääb
  serverisse, ilmub uuesti järgmisel lehe avamisel).
- **"🗑"** — kustutab faili **jäädavalt** serverist (kinnitust küsitakse
  enne). Sama nupp on olemas ka "MyFiles" faililoendis.

## Väliandmed (Google Sheets) — uus funktsioon

Rakendusse saab siduda live-andmeid otse Google Sheetist, ilma et Sheet
peaks sisaldama koordinaate. Selle asemel kasutatakse **nimepõhist
sidumist (join)**: Sheetis olgu veerg, mis kordab sama objekti nime/tunnust,
mis on juba mõne kaardil oleva kihi ühel andmeväljal (nt oma üleslaetud
KML-i punkti "nimi" väli, või PRIA põllumassiivi tunnus).

**Kuidas kasutada:**
1. Google Sheetis: Fail → Jaga → "Kõik, kellel link on" (vaataja õigustega).
2. Kleebi Sheeti link (või ainult ID) rakenduse "Väliandmed (Google Sheets)"
   jaotusesse ja vajuta "↻ Loe Sheet".
3. Vali, milline Sheeti veerg sisaldab objekti nime.
4. Vali kaardikiht (oma üleslaetud kiht või sisselülitatud PRIA kiht) ja
   selle väli, mis vastab samale nimele.
5. Vajuta "🔗 Ühenda andmed" — rakendus otsib iga Sheeti rea jaoks kaardilt
   vastava objekti ja lisab kõik Sheeti veerud selle objekti andmete külge.
   Neid näeb objektile klõpsates avanevas popup-aknas, ja neid saab
   kasutada ka "Minu kaardid" sildistamise valikus.
6. Soovi korral lülita sisse automaatne värskendus (30 sek / 1 min / 5 min),
   et välitööde ajal Sheetis tehtud muudatused jõuaksid kaardile iseenesest,
   ilma lehte uuesti laadimata.

**Tehniline pool:** rakendus loeb Sheeti Google'i avaliku
`gviz/tq?tqx=out:csv` liidese kaudu — see ei vaja API-võtit ega
autentimist, ainult et Sheet oleks jagatud vaatamisõigusega. Andmete
sidumine (join) toimub täielikult brauseris; midagi ei salvestata serverisse.

**Piirang:** kui Sheeti reale ei leita kaardilt sama nimega objekti, jääb
see rida kaardile lisamata — ühenduse staatus näitab, mitu sellist rida
oli ja toob mõne nime näiteks, et saaksid kirjaviisi kaardil ja Sheetis
võrrelda.



| Funktsioon | Teenus | Staatus |
|---|---|---|
| Taustakaardid: OSM, Eesti kaart, Hübriidkaart, Ortofoto | Maa-amet WMS (`tiles.maaamet.ee/tm/`) | Kinnitatud töötav aadress/parameetrid |
| Valevärvi (CIR) ortofoto | Maa-amet WMS, kiht `fotoinfra` | **Kontrolli!** vt eespool |
| EANS UTM / droonikaart | `utm.eans.ee/avm/` | Eraldi rakendus, kuvatakse iframe'is + sünkroonimiskatse |
| PRIA põllumassiivid (WFS) | `kls.pria.ee/geoserver/pria_avalik/ows` | Kinnitatud töötav server; kihtide loend tuuakse dünaamiliselt |
| Oma kihid (KML/KMZ/SHP) | Kohalik üleslaadimine + `MyFiles/uploads/` | Töötab |
| Kasutaja asukoht ("sinine täpp") | Brauseri Geolocation API | Nõuab HTTPS-i |

## OneDrive / Excel tugi

Google Sheetsi kõrval saab sama nimepõhise sidumise teha ka OneDrive'is/
SharePointis oleva Exceli failiga. **Tehniline erinevus Google Sheetsist:**
OneDrive/SharePoint ei luba tavaliselt otse brauserist (JavaScript
`fetch()`) kolmanda osapoole veebilehelt oma faile lugeda (CORS piirang),
erinevalt Google'i avalikust Sheetsi CSV-liidesest. Seetõttu käib OneDrive
faili lugemine läbi serveri: `php/onedrive_proxy.php` toob faili serveri
poolelt (kus CORS ei kehti) ja annab selle brauserile edasi.

**Kasutamine:**
1. OneDrive'is/SharePointis: jaga fail "Kõik, kellel link on" (vaataja).
2. Vali rakenduses "Väliandmed" jaotuses allikaks "OneDrive / Excel".
3. Kleebi jagamislink täpselt nii, nagu OneDrive/SharePoint selle andis,
   ja vajuta "↻ Loe OneDrive fail".
4. Kui failis on mitu töölehte, vali sobiv leht ripploendist.
5. Edasi käib kõik täpselt samamoodi kui Google Sheetsiga: vali objekti
   nime veerg, kaardikiht ja vastav väli, seejärel "🔗 Ühenda andmed".

**Turvalisus:** `php/onedrive_proxy.php` aktsepteerib ainult
OneDrive/SharePoint domeene (`1drv.ms`, `onedrive.live.com`,
`*.sharepoint.com`, `api.onedrive.com`) — seda ei saa kasutada suvalise
muu URL-i toomiseks, et vältida serveri väärkasutamist avatud proksina.
See vajab ka serveris töötavat PHP `curl` laiendust (enamikel
hostidel vaikimisi olemas).

**Kui lugemine ebaõnnestub:**
- Kontrolli, et jagamisõigused on tõesti "kõigil, kellel link on"
  (mitte ainult kindlatele inimestele/organisatsioonile).
- Rakendus proovib ise linki "otselaadimise" kujule teisendada
  (lisab `?download=1`), kuid mõne isikliku (mitte organisatsiooni)
  OneDrive konto lingi puhul ei pruugi see automaatselt toimida —
  proovi sel juhul `&download=1` lingi lõppu ise käsitsi lisada enne
  kleepimist.
- `download=1` toimib kõige usaldusväärsemalt SharePoint/OneDrive
  for Business linkidega (organisatsiooni kontod); isiklikel
  OneDrive kontodel võib käitumine linkide vormingu tõttu erineda.

## Turvalisuse märkused

- `php/upload.php` ei nõua praegu autentimist (vastavalt "avatud ligipääs
  kõigile, kellel link on" nõudele). Lubatud on ainult `.kml`, `.kmz`, `.zip`
  laiendid ja piiratud failisuurus (50 MB).
- PRIA eelseadistused ja PRIA kihtide värvivalikud salvestuvad kasutaja
  enda brauseri `localStorage`-sse — need ei ole nähtavad teistele
  kasutajatele ega salvestu serverisse.
