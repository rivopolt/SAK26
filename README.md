# SAK26

Avatud ligipääsuga veebipõhine kaardirakendus: vasakul kihipaneel (vaikimisi
peidetud), paremal suur kaardivaade. Töötab tavalises Windows/Android/iOS
brauseris ning DJI Matrice 4T RC Plus 2 Enterprise pульти brauseris.

**Rakendus töötab täielikult staatilise hostimisega (nt GitHub Pages) —
serveripoolset koodi (PHP jms) ei ole vaja.** Kõik, mis varem vajas serverit
(failihaldus, väliandmed), on ümber ehitatud git-põhiseks ja backend-vabaks.

## Uusim muudatuste pakett

### NOTAM: telefoninumbrid ja kontaktid klõpsatavaks
Kontrollisin päris NOTAM andmeid — struktureeritud "phone" välja seal
pole, aga telefoninumbrid võivad esineda vabatekstis (nt "...ON TEL
+372 717 3724."). Lisasin tuvastuse, mis leiab "TEL"/"PHONE" sõna järel
oleva numbri ja teeb sellest klõpsatava tel: lingi, jättes ülejäänud
teate tavatekstiks. Testitud otse päris NOTAM tekstinäite peal (sh
kontroll, et "3A/C", "60 MINUTES" ega "04/2026" valesti lingiks ei
muutu).

Lisaks lisandus "Kontakt" rida, mis näitab tsooni eest vastutava asutuse
nime, klõpsatavat e-maili (kui olemas) ja veebilehe linki (kui olemas) —
see info oli andmetes juba olemas, aga polnud varem üldse kuvatud.

## Varasem muudatuste pakett

### NOTAM GEO: puhas info tagasi, kattuvad tsoonid nüüd tabidena
Eemaldasin "laen andmeid"/"laetud" teavitusteksti täielikult (vaikne
laadimine). Popup-info on tagasi puhtal, valitud väljade kujul (Nimi,
Piirang, Põhjus, Kõrgus, Teade, Teade (ET), Kehtiv) — mitte enam kõik
toored väljad (sh pesastatud "extendedProperties"/"geometry" jms, mis
lõi segase pika loetelu). Kui klõps tabab mitut kattuvat tsooni, näidatakse
neid nüüd eraldi **tabidena** (üks tsoon korraga, klõpsatavad
pealkirjad), mitte kõiki üksteise alla virnastatuna.

### "Drooni asukoht" ja "Teised droonid" peidetud (mitte kustutatud)
Kuna riistvara (DJI Cloud API + ESP32/Sky-Spy) pole veel kasutusele
võetud, on need kaks nuppu praegu peidetud — kogu JS-funktsionaalsus
jääb täielikult alles. Kui riistvara on valmis, eemalda `index.html`
failist nende nuppude "hidden" klass, ja kõik töötab kohe.

### Asukoha nupp: lähemale ZoomOUT nupule, ruudukujuline
"📍" nupp on nüüd tihedamalt suumikontrolli all (~2px vahe, varem ~6px)
ja ruudukujuline (4px ümardus, sama mis suumi +/- nupud), mitte enam
ümmargune.

## Varasemad muudatused (-9)

### 🛸 Teised droonid (Remote ID — muude droonide tuvastamine)
Uus nupp kaardil ("🛸 Teised droonid") näitab teiste läheduses olevate
(ASTM F3411/ASD-STAN Remote ID standardit järgivate) droonide asukohti —
mitte ainult sinu enda Matrice 4T-d. Iga tuvastuse kohta kuvatakse KAKS
punkti (droon 🛸 ja piloot/operaator 🧍, ühendatud punktiirjoonega), kuna
Remote ID standard nõuab mõlema asukoha edastamist.

**Kasutab sama vastuvõtjateenust**, mis droonitelemeetria (DJI Cloud
API) — laiendasin `dji-telemetry-receiver/server.py` faili, et see
loeks lisaks ka ESP32-le (Sky-Spy püsivara) ühendatud USB-seeriaporti
kaudu. Testisin uut `/remoteid/latest` otspunkti reaalse, kinnitatud
Sky-Spy JSON-formaadiga (nii korrektsete tuvastuste kui ka rikutud/
"heartbeat" ridade õige käsitlemisega).

**Riistvara soovitus:** Seeed XIAO ESP32-S3 (~10-15 €) + Sky-Spy
püsivara (github.com/colonelpanichacks/Sky-Spy). Täielik seadistus:
`dji-telemetry-receiver/README.md`.

**Vastuvõtja Raspberry Pi soovitus — muudetud: Pi 3B+ (~35 €), mitte
Pi Zero 2 W.** Põhjus on turvalisusega seotud, mitte lihtsalt spekk:
DJI enda dokumentatsiooni järgi kasutab Matrice 4T juhtlink (OcuSync/O3)
tegelikult NII 2,4 GHz KUI KA 5,8 GHz sagedust, lülitudes automaatselt
sinna, mis parasjagu selgem on — see pole ainult 5,8 GHz süsteem. Pi
Zero 2 W WiFi toetab AINULT 2,4 GHz — kui see vastuvõtja majutab kohalikku
WiFi võrku välitingimustes ja asub füüsiliselt aktiivselt lendava
juhtseadme kõrval, on see reaalne, mitte teoreetiline sagedusekonflikti
oht. Pi 3B+ kahesageduslik WiFi (2,4/5 GHz) võimaldab kohaliku võrgu
panna spetsiaalselt 5 GHz peale, vältides kattumist täielikult. Lisaboonus:
Pi 3B+-l on täissuurused USB-A pordid (ESP32 jaoks pole OTG adapterit vaja).
Mõlemal juhul soovitan EMQX asemel kergemat Mosquitto MQTT brokerit —
see sobib ühe-lennuki-ühe-operaatori mahule paremini, olenemata valitud
Pi mudelist.

**Aus piirang:** Remote ID levik on umbes tavalise WiFi ulatuses (mitte
droonide endi mitme kilomeetrise juhtlingi ulatuses) — see annab
teadlikkust droonidest SINU enda asukoha lähedal, mitte kogu piirkonnas.
Remote ID signaal on ka autentimata/krüpteerimata (avaliku uurimistöö
põhjal on teadaolevalt võimalik võltssignaale saata), nii et tuvastusi
tasub käsitleda informatiivse, mitte garanteeritud teabena.

## Varasemad muudatused (-8)

### 🛰️ Drooni asukoht (Matrice 4T live telemetria)
Uus nupp kaardil ("🛰️ Drooni asukoht", NOTAM GEO ja Otsi objekti vahel)
kuvab sinu Matrice 4T ja RC Plus 2 Enterprise kontrolleri **live asukoha**
kaardil — droonile ja kontrollerile eraldi märgistus (🛸 droon, 🎮
kontroller), popup-aknas kogu saadaolev telemeetria.

**See EI ole RID-põhine skannimine** (see osutus liiga ebausaldusväärseks
— vt eelmine arutelu) **vaid DJI enda ametlik Cloud API**: DJI Pilot 2
rakenduses on "Cloud Service → Open Platform" funktsioon, mis saadab
elava telemeetria otse sinu enda serverisse.

**See vajab eraldi, pidevalt töötavat vastuvõtjateenust** —
`dji-telemetry-receiver/` kaustas on täielik, testitud (FastAPI käivitub,
JSON otspunkt tagastab õiget infot, paho-mqtt API kasutus kontrollitud
otse teegi lähtekoodi vastu, Fly.io piirkonnakood kinnitatud) valmis
kood + samm-sammuline juhend Fly.io peale paigaldamiseks (~5 $/kuu).
Raspberry Pi peale kolimine on samuti dokumenteeritud (tulevikuplaan).

**Mida ma EI saanud testida** ilma päris riistvarata: kas DJI Pilot 2
tegelikult lõpetab sisselogimise täpselt selle H5-lehega ja ühendub —
see vajab testimist sinu päris Matrice 4T/RC Plus 2 Enterprise'iga.
Kui see kohe ei tööta, on DJI enda Cloud API dokumentatsioon
(github.com/dji-sdk/Cloud-API-Doc) tõeallikas, mitte see README.

Seadistamine: vt `dji-telemetry-receiver/README.md` täielikuks juhendiks;
kui vastuvõtja on üleval, sisesta selle aadress `js/config.js` faili
(`CONFIG.droneTelemetry.receiverUrl`).

## Varasemad muudatused (-7)

### NOTAM GEO: kõik andmed, ka kattuvate tsoonide puhul
Varem näitas klõps ainult selle tsooni valitud infot, mis parasjagu
"peal" oli (kui mitu NOTAM ala kattuvad, nagu päris lennuruumis sageli
juhtub). Nüüd kontrollitakse klõpsamisel KÕIKI NOTAM tsoone (mitte ainult
pealmist) ja kuvatakse popup-aknas iga kattuva tsooni kohta täielikud
andmed (kõik väljad, sh varem peidetud pesastatud info nagu kehtivusaeg,
ingliskeelne/eestikeelne teade jms — mitte enam valitud väljade
kokkuvõte). Testisin punkti-hulknurgas testi ja andmete lahtivoltimist
otse päris NOTAM andmete struktuuri põhjal.

### Lennuliiklus, "Minu asukoht" ja "Kogu Eesti" eemaldatud "Kihid" paneelist
"Minu asukoht" jääb kättesaadavaks kaardi enda 📍 nupu kaudu. "Kogu Eesti"
funktsiooni paneelist enam ei ole (kaardi asemel kasutati seda harva).

### Eemaldatud lõplikult: "Minu kaardid" hoiatusetekst
Tekst faili eelvaate/salvestamise kohta on paneelist eemaldatud.

### Topeltpuudutus (double-tap) suumib sisse
Selgesõnaliselt lubatud (`doubleClickZoom: true`) — Leafleti vaikeseade,
aga nüüd kindlalt tagatud ka mobiilis.

### "Tühista" nupp otsingusse
"Otsi objekti" vidinasse lisandus "Tühista" nupp "Otsi" nupu kõrvale —
tühjendab otsinguvälja, tulemused ja kaardil oleva esiletõstu, ilma
vidinat sulgemata (erinevalt olemasolevast "✕" nupust, mis sulgeb kogu
vidina).

## Varasemad muudatused (-6)

### Käivitussuum 15-le
Nii asukohapõhine kui tagavaravaate (kui asukohta ei õnnestu tuvastada)
suum on nüüd mõlemad 15 — varem oli tagavaravaade terve Eesti ülevaade
(suum 7).

### NOTAM GEO on nüüd alati pealmine kiht
Sisselülitamisel tõstetakse NOTAM GEO automaatselt teiste kihtide
kohale (`bringToFront()`), ja jääb sinna ka kaardi liigutamisel/suumimisel
(kui PRIA/Minu kaardid kihid end vahepeal uuesti joonistavad).

### "Navigeeri" eemaldatud NOTAM GEO popup-akendest
NOTAM tsoonid on alad, mitte sihtkohad — Google Mapsi juhiste link ei
sobinud sinna loogiliselt (ja võinuks eksitavalt viidata, et piiratud
alasse "navigeerimine" on soovitatav).

### Lennuliiklus eemaldatud "Kihid" paneelist
Kogu "Lennuliiklus" jaotus (EANS UTM/Droonikaart manus/iframe) on
eemaldatud — nii kasutajaliidesest kui koodist (dead code puhastatud).
Droonidega seotud lennuohutuse info on nüüd "NOTAM GEO" kihi kaudu
(vt eespool).

### Kadunud fail: PriaKaerNisuMaisHernes1Field_DISS.zip
**Ausalt: ma ei saa seda faili "taastada", kuna mul pole selle sisu
kunagi olemas olnud.** See fail on `js/config.js` failis mainitud
(temaatilised värvid, suumipiirid, sildi väli "ViljadNimi") kuna
arutasime selle SEADEID varem, aga faili ennast ei ole mulle kunagi
üles laetud — erinevalt `Sigalad_puhverala.kmz` ja `Jahipiirkond.zip`
failidest, mis ON minu juures olemas ja iga paketiga kaasas.

**Kõige tõenäolisem põhjus, miks see "kadus":** kui lisasid selle faili
otse oma GitHub repositooriumisse (git push kaudu, ilma minu kaudu
käimata) ja hiljem asendasid kogu repositooriumi sisu minu antud
zip-failiga (nagu olen varem soovitanud "kui pole kindel, asenda kõik"),
kustutas see asenduse käigus ka faili, millest mina ei teadnud.

**Lahendus:** palun laadi see fail mulle uuesti üles (samamoodi nagu
`Sigalad_puhverala.kmz` ja `Jahipiirkond.zip` tegid) — siis lisan selle
oma järgmisesse paketti ja see jääb sealt edaspidi püsivalt alles.
Tulevikus, kui lisad faile otse oma repositooriumisse minust mööda
minnes, anna palun teada, et saaksin need ka oma "baaspaketti" lisada —
nii ei kao need enam järgmisel täisasendusel.

## Varasemad muudatused (-5)

### Sigalad_puhverala popup: ainult nimi + Navigeeri
KML-i stiilimetaandmed (styleUrl, fill-opacity, stroke-width jms, mis
togeojson teisendusel "properties" hulka lekivad) on nüüd sellel kihil
popup-aknast peidetud — näidatakse ainult objekti nime.

### Skaalariba: valge halo läbipaistvaks
Teksti/joone ümber olev valge "halo" (loetavuse jaoks) on nüüd
poolläbipaistev (65% opacity) täiesti opaakse valge asemel — vähem
"valge kastina" paistev efekt.

### "Kihid" avanedes on kõik sektsioonid vaikimisi ahendatud
Lennuliiklus, PRIA põllumassiivid, Minu kaardid ja Väliandmed algavad
nüüd kõik ahendatuna, kui paneel avatakse — kompaktsem esmamulje.

### NOTAM GEO — uus kiht (UAS geograafilised tsoonid)
Uus nupp "NOTAM GEO" kaardi peal (Ortofoto ja "Otsi objekti" vahel,
sama suurus/stiil), mis lülitab sisse/välja EANS-i NOTAM/geopiirete
andmed (ohualad, piirangualad, Tallinna CTR alatsoonid jms).

**Värvid:** enamik objekte kannab andmetes endas juba oma värvi (kollane
täide + sinine joon, poolläbipaistev — täpselt "NOTAM Droonikaardi"
tava, mida kirjeldasid) — neid kasutatakse alati, kui olemas. Kui
objektil oma värvi pole, kasutatakse sama kollast/sinist vaikimisi.
Mõni tsoon (nt "avatud kategooria, piiranguteta") on andmetes endas
100% läbipaistev — see on tahtlik, tähistab piiranguteta ala.

**Live vs. peegeldatud koopia — minu soovitus:**
Rakendus proovib **alati kõigepealt otseühendust** EANS-i serveriga
(`https://utm.eans.ee/avm/utm/uas.geojson`) ja kasutab
`MyFiles/data/notam_geo.geojson` peegeldatud koopiat ainult siis, kui
otseühendus ebaõnnestub (nt CORS piirang). Peegeldatud koopiat
uuendatakse automaatselt üks kord päevas (`.github/workflows/update-notam.yml`,
kell 04:00 UTC, käivitatav ka käsitsi "Actions" vahekaardilt).

Põhjus, miks eelistada otseühendust: andmete enda `metaData.updateDateTime`
väljad näitasid samal päeval tehtud uuendusi — EANS uuendab neid andmeid
tihedamini kui kord päevas. Kuna tegu on lennuohutusega seotud andmetega
(ajutised ohu-/piirangualad), võib isegi 24-tunnine viivitus tähendada,
et äsja lisatud piirang ei kajastu veel kaardil. Seetõttu on peegeldatud
koopia mõeldud rangelt **varulahendusena**, mitte peamise allikana —
rakendus näitab popup-aknas alati, kummast allikast andmed pärinevad
("otseühendus (EANS)" vs "peegeldatud koopia").

**NB!** See kiht ei asenda ametlikku EANS Droonikaarti lennu planeerimisel
— kontrolli alati otse utm.eans.ee/avm/ enne lendu, eriti kui rakendus
näitab, et kasutusel on peegeldatud (mitte otseühenduse) andmed.

## Varasemad muudatused (-4)

### Skaalariba: valge taust eemaldatud
Skaalariba istub nüüd otse kaardi peal ilma valge kastita — loetavus on
tagatud valge "halo" varjuga teksti/joone ümber, mitte taustakastiga.

### Asukoha nupp tõstetud kõrgemale, lähemale suumi miinusnupule
Nupurühm (suum + asukoht) on nüüd tihedamalt koos — ainult ~6px vahe
suumikontrolli ja "📍" nupu vahel (varem ~10px).

### Suumi +/- nupud suuremaks
Nupud on nüüd 40×40px (Leafleti vaikimisi 26×26px asemel) — sama laiused,
mis "📍" nupp, ja lihtsamini puudutatavad.

## Varasemad muudatused (-3)

### Lehe avamisel kasutatakse asukohta, mitte kogu Eesti vaadet
Lehe laadimisel käivitub nüüd automaatselt asukoha jälgimine (sama, mis
"📍 Minu asukoht" nupp) — kaart tsentreerub kohe sinu praegusele
asukohale, selle asemel et näidata vaikimisi kogu Eesti ülevaadet.
Kui asukoha luba puudub/keeldutakse, jääb kaart ilusti tagavaravaatele
(viimane salvestatud asukoht või Eesti ülevaade).

### Asukoha vaikimisi suum: 15
Nii lehe avamisel kui "📍 Minu asukoht" nupu vajutamisel kasutatav
suumitase on nüüd 15 (varem 16).

### Kolmele failile eelseadistatud suumipiirid ja väljad
Uute kihtide (esmakordsel laadimisel, kui pole veel isiklikke salvestatud
seadeid) vaikeväärtused:
- **PriaKaerNisuMaisHernes...zip**: Zoom min 13, Zoom max 19, sildid
  alates suumist 15, sildi väli "ViljadNimi", ning värvimine automaatselt
  "Temaatiline" väljal "ViljadNimi" (kasutab juba varem seadistatud
  hernes/kaer/mais/nisu vaikevärve).
- **Sigalad_puhverala**: Zoom min 8, Zoom max 14.
- **Jahipiirkond**: Zoom min 9, Zoom max 13.

Kui oled mõnda neist kihtidest juba ise käsitsi kohandanud, jäävad sinu
enda salvestatud seaded prioriteetseks — need eelseadistused kehtivad
ainult esmakordsel laadimisel.

### Skaalariba lisatud
Kaardi paremal üleval, "🔍 Otsi objekti" nupu all, on nüüd väike
skaalariba koos meetrites näidatava vahemaaga — sama laiune, mis nupud
selle kohal. Uueneb automaatselt suumi/asukoha muutudes.

## Varasemad muudatused (-2)

### "Google Maps juhis" → "Navigeeri"
Nupu tekst lühemaks ja selgemaks — nii popup-akendes kui otsingutulemustes.

### Suumi +/- ja asukoha nupp tõstetud kõrgemale
Mõnel Android-seadmel jäi asukoha nupp ("📍") ekraani enda navigeerimisriba
(gesture-riba) alla peaaegu nähtamatuks. Mõlemad nupud (suum + asukoht) on
nüüd rohkem ekraani serva kohal — asukoha nupp `bottom: 60px` (varem 36px),
suumikontroll vastavalt kõrgemal, jäädes endiselt üksteise kohale
virnastatuna.

## Varasemad muudatused (-1)

### Suumi +/- nupud liigutatud paremale alla, asukoha nupu kohale
Mobiilis on pöialega ligipääsetavus parem, kui juhtnupud on ekraani alumises
osas, mitte üleval. Suumikontroll on nüüd otse "📍 Minu asukoht" nupu kohal,
mõlemad paremas allnurgas, koos kergesti käega ulatuvad.

### Põhikaart / Ortofoto / Otsi objekti nupud liikusid paremasse ülanurka
Kuna suumikontroll ei ole enam ülal paremal, said kiirnupud selle koha
enda kasutusse — varasem 56px vaba ruum (suumikontrolli jaoks) pole enam
vajalik.

## Varasemad muudatused (0)

### "Muud taustakaardid" eemaldatud
OpenStreetMap, Hübriidkaart ja Valevärviortofoto (CIR) on rakendusest
täielikult eemaldatud — jäid ainult Põhikaart ja Ortofoto, mõlemad
kaardi enda kiirnuppudena.

### Parandatud: taustakaart kadus otsimisel (ja muul suumimisel)
Põhjus: Maa-ameti WMS-kihtidel pole originaalpilti suumitasemest 18
kaugemale, aga kaart ise (ja otsing) võib jõuda tasemeni 19 — ilma
`maxNativeZoom` seadistuseta näitas Leaflet lihtsalt tühja tausta, kui
suum jõudis üle 18. Nüüd suurendab Leaflet 18. taseme pilte automaatselt
(veidi udusemalt) taseme 19 jaoks, selle asemel et tausta kaotada. See
parandab probleemi mitte ainult otsingu puhul, vaid ka tavalisel
suumimisel, mis iganes selleni viib.

### Läbipaistvus kehtib nüüd nii Värvile kui Joonele
Varem mõjutas "Transp." (endine "Täite läbipaistvus %") ainult täidet —
nüüd mõjutab see korraga nii täidet ("Värv") kui äärisjoont ("Joon").

### Väljade nimed lühemaks
- "Täitevärv" → **"Värv"**
- "Äärise värv" → **"Joon"**
- "Täite läbipaistvus (%)" → **"Transp."**

### "Värv" ja "Joon" värvivalija on nüüd suurem
Värvinupud on nüüd selgemini nähtavad "kuubikud" (34×28px, vähem
sisemist marginaali), mitte brauseri vaikimisi pisike värvinupp —
valitud värv paistab palju paremini.

## Varasemad muudatused (1)

### Otsingu sulgemisnupp
"Otsi objekti" vidinal on nüüd oma "✕" nupp päises, et otsingut saaks
kiirelt sulgeda ilma "🔍 Otsi objekti" nuppu uuesti otsimata.

### Täite läbipaistvus (%)
Iga "Minu kaardid" kihi juures saab nüüd määrata täitevärvi läbipaistvuse
protsentides (0% = täiesti täidetud, 100% = ainult äärisjoon, täide
nähtamatu). Kehtib nii ühtse värvi kui temaatilise värvimise puhul.

### Äärise värv = vaikimisi sama, mis täitevärv
Uue kihi lisamisel on äärise värv nüüd vaikimisi sama, mis täitevärv
(varem oli see fikseeritud tumehall) — kiht näeb vaikimisi välja ühtlase
värviga, kuni muudad kumbagi eraldi.

### "Eesti kaart" → "Põhikaart", uus vaikimisi taustakaart
Nimi muudetud selgemaks. Vaikimisi taustakaardiks on nüüd Põhikaart
(varem OpenStreetMap).

### Taustakaart eemaldatud "Kihid" paneelist
Taustakaardi valik käib nüüd täielikult kaardi enda kiirnuppude kaudu:
"Põhikaart" ja "Ortofoto" on alati nähtaval, "▾ Muud taustakaardid" nupp
avab ülejäänud valikud (OpenStreetMap, Hübriidkaart, Valevärviortofoto).
See ei kaota ühtegi varasemat võimalust — kõik viis taustakaarti on
endiselt valitavad, lihtsalt kaardi pealt, mitte paneelist.

### EANS Droonikaart: aus tagasiside sünkroonimise kohta
Kaks järjestikust katset (erinevate URL-parameetritega) kinnitasid, et
utm.eans.ee/avm/ ignoreerib täielikult meie saadetud asukoha/suumi
parameetreid — sellel rakendusel pole avaldatud URL-API-t. Selle asemel
kui jätkata toimimatute parameetrite saatmist, on see nüüd ausalt
dokumenteeritud (info nupu all) ja "🔄 Sünkrooni" nupp on ümber nimetatud
"🔄 Lae algusesse" — see lihtsalt laeb manuse uuesti algvaatesse, mitte
ei väida, et see sünkroonib asukohta (mida see ei tee).

### Kihi ahenda/laienda nupp — liigutatud esimeseks
Iga "Minu kaardid" kihi real on ▾/▸ nupp nüüd kõige esimene element (enne
nähtavuse linnukest), mitte info/eemalda nuppude kõrval real paremal.

## Varasemad muudatused (2)

### Külastuste statistika (GoatCounter — vahetatud Cloudflare Web Analytics'e asemel)
Esialgu lisati Cloudflare Web Analytics, aga selgus, et **Cloudflare ei
aktsepteeri `*.github.io` aadresse üldse** ("Invalid Domain" viga) —
see pole seadistusviga, vaid teadlik piirang. `github.io` on nn "Public
Suffix List"'is (nagu ka `blogspot.com`, `vercel.app` jms) — domeen,
mille all jagavad paljud omavahel mitteseotud kasutajad alamdomeene, ja
Cloudflare (nagu enamik domeeni-kinnitamist nõudvaid teenuseid) ei luba
sellist jagatud domeeni "saidina" registreerida, kuna see võimaldaks
kellelgi teiste kasutajate `.github.io` lehtede analüütikat "üle võtta".

Seetõttu on aktiivne mõõtmisskript nüüd **GoatCounter**, mis töötab otse
`github.io` aadressidel probleemideta, kuna see ei nõua saidi domeeni
kinnitamist üldse — sa lood lihtsalt oma GoatCounteri konto/dashboardi
ja suunad skripti sinna. GoatCounter on:
- **Tasuta** (mitteäriliseks kasutuseks).
- **Küpsisteta (cookie-free)** ja GDPR-sõbralik — ei vaja nõusolekubännerit.
- **Töötab otse praeguse `github.io` aadressiga**, ei vaja kohandatud domeeni.

**Seadistamine (vajalik ainult üks kord, ~2 minutit):**

1. Loo tasuta konto: [goatcounter.com/signup](https://www.goatcounter.com/signup)
   — sisesta e-post ja vali endale sobiv **kood** (nt `sak26`) — see saab
   sinu dashboardi aadressiks: `https://sak26.goatcounter.com`.
2. Pärast konto loomist näed juhiseid koos JavaScripti koodilõiguga:
   ```html
   <script data-goatcounter="https://sinu-kood.goatcounter.com/count"
           async src="https://gc.zgo.at/count.js"></script>
   ```
3. Ava `index.html` selles projektis, leia rida:
   ```html
   <script data-goatcounter="https://YOUR-CODE.goatcounter.com/count"
   ```
   ja asenda `YOUR-CODE` oma valitud koodiga (samm 1).
4. Salvesta, tee `git push`.
5. Mõne minuti pärast hakkavad külastused ilmuma sinu GoatCounteri
   dashboardile (`https://sinu-kood.goatcounter.com`) — külastajate arv,
   lehevaatamised, viitajad (referrers), riigid, brauserid jms.

**Cloudflare Web Analytics jääb `index.html` faili sisse kommenteerituna**
— kui saad tulevikus kohandatud domeeni (nt `sak26.ejs.ee` või uus
väike domeen, vt eespool autentimise arutelu), saab selle uuesti
kasutusele võtta: eemalda kommentaarid ja täida oma Cloudflare'i token
samamoodi nagu ülalpool kirjeldatud.

**Enne tokeni lisamist** ei juhtu skriptiga midagi kahjulikku — see lihtsalt
ei saada kuskile mitte midagi, kuni õige token on sisestatud.

### Minu kaardid: iga kihi seaded on nüüd ahendatavad
Iga kihi rea juures on ▾/▸ nupp, mis ahendab kihi seaded (suumipiirid,
sildi väli, värvivalikud) ainult nime ja linnukesega reaks — kasulik,
kui kaardil on mitu kihti korraga. Värskelt lisatud kiht on vaikimisi
laiendatud, et seaded oleks kohe näha.

### EANS Droonikaart — tagasi pöördutud utm.eans.ee/avm/ juurde
Eelmises versioonis vahetasime Droonikaardi Esri ArcGIS-põhise versiooni
vastu, lootuses paremat asukoha sünkroonimist saada — aga selgus, et see
nõuab kaardi *vaatamiseks* ArcGIS Online kontosse sisselogimist, mis ei
sobinud avatud, autentimiseta ligipääsu nõudega. Tagasi on
utm.eans.ee/avm/ juures (ei nõua sisselogimist vaatamiseks, ainult
lennuplaani esitamiseks), koos varasema `lat`/`lon`/`zoom` (parim katse,
mitte kinnitatud API) sünkroonimisviisiga.

### Kaks eraldi värvivalikut: täitevärv ja äärise värv
Varasem "Ühtne värv" valik jagunes kaheks: **Täitevärv** (polügoni
sisemus — temaatilise värvimise puhul muutub see kategooria järgi) ja
**Äärise värv** (kontuur/piirjoon — jääb ühtlaseks olenemata
värvimisviisist, tagamaks selge piiritluse ka siis, kui täitevärv
kategooriati erineb).

### Otsi objekti — liigutatud kaardi peale
Otsing ei ole enam "Minu kaardid" paneeli sees, vaid otse kaardi peal,
"🔍 Otsi objekti" nupu taga (paremal üleval, koos "Põhikaart" ja
"Ortofoto" kiirnuppudega) — nii saab otsida ka siis, kui "Kihid" paneel
on peidus.

### Kus salvestuvad viimased seaded — ja kas neid saab IP/seadme järgi salvestada?
Praegu salvestuvad kaardi viimane asukoht/suum ning iga "Minu kaardid"
kihi suumipiirid/sildi väli/värvivalikud brauseri **`localStorage`-sse**
(vt `js/app.js` võtmed: `myLayerPrefs`, `lastMapView`, `pria_layer_colors`,
`pria_presets`). See on juba automaatselt "seadmepõhine" — iga
brauser/seade säilitab oma seadeid eraldi.

**IP-aadressi põhine salvestus ei sobiks siia hästi:** IP-aadressid on
sageli jagatud paljude inimeste vahel samas võrgus (nt kontori WiFi) ja
muutuvad tihti (mobiilne internet, dünaamilised IP-d) — see ei vasta
usaldusväärselt ühele konkreetsele kasutajale.

**Piirang:** seaded ei liigu seadmete vahel (nt tahvel → telefon) ega
brauserite vahel samas seadmes. Kui sama seadet/brauserit kasutab mitu
inimest (nt jagatud RC-kontroller), näevad kõik samu salvestatud
seadeid. Päris seadmeülene sünkroonimine sama inimese jaoks nõuaks
kasutajakontosid/sisselogimist, mis läheks vastuollu nii "avatud
ligipääs kõigile, kellel link on" nõudega kui ka praeguse backend-vaba
GitHub Pages arhitektuuriga.

### "Minu asukoht" ei olnud Android tahvlis nähtav — parandatud
Leafleti vaikimisi `.leaflet-div-icon` stiil lisas meie sinisele täpile
automaatselt valge tausta + raami, mis mõnel seadmel kattis selle
peaaegu nähtamatuks. CSS reset lisatud.

Lisaks: rakendus kasutas varem brauseri natiivseid `alert()`/`confirm()`
dialooge, mida mitmed sisseehitatud Android WebView'd (nt RC-kontrollerite
brauserid) vaikimisi tähelepanuta jätavad — vea korral ei juhtunud
seetõttu justkui "mitte midagi". Kõik on nüüd asendatud rakenduse enda
teavituste/kinnitusdialoogidega, mis töötavad usaldusväärselt kõikjal.

### Kiirvalikud "Põhikaart" ja "Ortofoto" otse kaardil
Kaardi paremas ülanurgas (suumikontrolli all) on nüüd kaks nuppu
taustakaardi kiireks vahetamiseks, ilma "Kihid" paneeli avamata.

### Minu kaardid: Zoom min / Zoom max
"Kiht alates suumist" on ümber nimetatud "Zoom min" + lisandus uus
"Zoom max" väli — kiht kaob kaardilt, kui suum ületab selle väärtuse.
Vaikeväärtused: Zoom min = 1, Zoom max = 19 (varem oli vaikimisi
Zoom min = 13, mis tegi kihid vaikimisi liiga hilja nähtavaks).

### Temaatiline värvimine: käsitsi ülekirjutamine + teadaolevad vaikeväärtused
Legendis olevad värvitäpid on nüüd otse klõpsatavad värvivalijad — vali
mistahes väärtusele oma värv. Lisaks on failile
`PriaKaerNisuMaisHernes1Field_DISS.zip` (ja igale muule failile, kus
esineb samad väärtused) sisse ehitatud vaikevärvid: hernes=roheline,
kaer=helepunane, mais=tumekollane/pruunikas, nisu=helekollane. Käsitsi
valitud värv (kui valid) võidab alati teadaoleva vaikeväärtuse üle.

### "Minu asukoht" jälgimisrežiim
Kui asukoha jälgimine on sisse lülitatud, jääb kaart nüüd sinu asukohta
pidevalt kesksele kohale liikumise ajal (varem tsentreeriti ainult
esimest korda, edasi liikus ainult sinine täpp, mitte kaardivaade ise).

### EANS Droonikaart: täpsem asukoha sünkroonimine + eraldi lennuplaani link
Avastasime, et avalik Droonikaart on tegelikult Esri ArcGIS rakendus,
millel on Esri enda dokumentatsioonis kinnitatud `center=`/`level=`
URL-parameetrid (varem kasutasime väljamõeldud `lat`/`lon`/`zoom`
parameetreid, mis polnud kunagi õiged). Kasutame nüüd neid õigeid
parameetreid. Esri dokumentatsioon märgib siiski, et tugi sõltub
rakenduse malli tüübist — see rakendus kasutab "Portfolio" malli, mis
pole puhas kaardivaade, mistõttu 100%-line sünkroonimine pole ikkagi
garanteeritud. Manuse ribale lisandus ka eraldi "Lennuplaani esitamine ↗"
link, mis avab sisselogimist vajava utm.eans.ee/avm/ tööriista uues aknas.

### Väliandmed (Repo fail): selgem viga välise lingi sisestamisel
See väli võtab vastu ainult faili tee sinu enda GitHub repositooriumis
(nt `MyFiles/data/valiandmed.xlsx`) — mitte välist linki (Google Drive,
OneDrive, SharePoint jms), kuna GitHub Pages ei saa CORS piirangute
tõttu selliseid linke otse lugeda. Kui sisestad ikkagi `http://` või
`https://` algava lingi, näitab rakendus nüüd selget selgitust selle
asemel, et lihtsalt ebamääraselt ebaõnnestuda.

### Popup-aknad: klõpsatavad telefoninumbrid + Google Mapsi juhised
Kui objekti andmeväljas on telefoninumbrile viitav väljanimi (nt
"Telefon") või väärtus näeb välja nagu telefoninumber, kuvatakse see
nüüd klõpsatava `tel:` lingina — mobiilis käivitab see otse kõne.
Lisaks on iga objekti popup-aknas nüüd "🚗 Navigeeri" link,
mis avab suunad otse selle objekti tsentrisse (varem oli see nupp
ainult eraldi otsingutulemuste kastis).

## Kiirpaigaldus (GitHub Pages)

1. Lae kogu selle kausta sisu oma GitHub repositooriumisse (kõik peale
   `optional-php-hosting/` kausta, mis on lihtsalt tuleviku jaoks alles hoitud).
2. Repositooriumi seadetes: **Settings → Pages → Source → Deploy from a branch**,
   vali haru (`main`) ja juurkaust (`/ (root)`).
3. Repositooriumi seadetes: **Settings → Actions → General → Workflow permissions**
   → vali **"Read and write permissions"** ja salvesta. See on vajalik, et
   `.github/workflows/update-manifest.yml` saaks automaatselt uuendada
   faili `MyFiles/manifest.json`, kui keegi lisab faile.
4. Mõne minuti pärast on rakendus kättesaadav aadressil
   `https://sinukasutajanimi.github.io/repositooriumi-nimi/`.

Ligipääs on avatud kõigile, kellel link on (autentimist ei ole).

## Miks pole enam PHP-d?

Rakendus loodi algselt PHP-toega jagatud hostingu jaoks, aga kuna see on
nüüd üles seatud GitHub'is (GitHub Pages), tuleb arvestada, et **GitHub
Pages ei toeta serveripoolset koodi (PHP, Node jms) üldse** — see on
puhtalt staatiliste failide hostimine. Sama piirang kehtib ka siis, kui
avad `index.html` faili otse brauseris (`file://`) ilma veebiserverita.

Seetõttu on kolm varem PHP-d vajanud funktsiooni ümber ehitatud:

| Funktsioon | Varem (PHP) | Nüüd (staatiline/git-põhine) |
|---|---|---|
| Oma failide (KML/KMZ/SHP) haldus | Veebivormi kaudu üleslaadimine serverisse | Fail lisatakse repositooriumi `MyFiles/uploads/` kausta ja `git push` |
| Failide nimekiri | `php/list_files.php` (dünaamiline) | Staatiline `MyFiles/manifest.json`, mida GitHub Action automaatselt uuendab |
| Google Sheets andmed | Loeti serveri kaudu (CORS-i vältimiseks) | Loetakse otse brauserist JSONP kaudu (CORS ei kehti JSONP-le) |
| OneDrive/Exceli andmed | Loeti serveri kaudu proksides | Ekspordi CSV/XLSX ja lisa see repositooriumisse — loetakse otse (samast domeenist, CORS pole probleem) |

Kui sul on kunagi ligipääs tavalisele PHP-toega hostingule ja soovid
tagasi minna veebivormi kaudu üleslaadimise juurde, vt
`optional-php-hosting/README.md`.

## Minu kaardid: git-põhine failihaldus

**Ajutine eelvaade (ainult sulle):** "+ Lisa fail" nupp näitab kohe valitud
faili kaardil, aga ainult sinu enda praeguses brauseris — see kaob, kui
värskendad lehte, ja pole teistele nähtav.

**Jäädav, kõigile nähtav lisamine:**
1. Lisa oma `.kml`, `.kmz` või `.zip` (shapefile) fail GitHubis kausta
   `MyFiles/uploads/` — kas GitHubi veebiliideses ("Add file" → "Upload files")
   või `git push` kaudu.
2. GitHub Action (`update-manifest.yml`) käivitub automaatselt ja
   regenereerib `MyFiles/manifest.json` — tavaliselt u. minuti jooksul.
3. Pärast seda ilmub fail automaatselt kõigile, kes rakendust avavad,
   ilma et keegi peaks midagi käsitsi tegema.

**Eemaldamine:** "✕" nupp eemaldab kihi ainult praegusest vaatest (sinu
seansist). Et fail oleks kõigile jäädavalt kadunud, kustuta see failina
repositooriumist ja tee `git push` — manifest uueneb automaatselt.

**Shapefile** tuleb üles laadida `.zip` arhiivina, mis sisaldab vähemalt
`.shp`, `.shx`, `.dbf` (ja soovitavalt `.prj`) faile.

## Väliandmed: Google Sheets (live) ja repo-fail (CSV/XLSX)

Andmeallikas ei pea sisaldama koordinaate — selle asemel peab seal olema
veerg, mis kordab sama objekti nime/identifikaatorit, mis on juba mõne
kaardil oleva kihi ühel andmeväljal. Rakendus otsib iga rea jaoks kaardilt
vastava objekti nime järgi ja lisab kõik veerud selle objekti andmete külge
— nähtavad popup-aknas ja kasutatavad siltidena.

### Google Sheets (uueneb automaatselt, kui soovid)
1. Google Sheetis: Fail → Jaga → "Kõik, kellel link on" (vaataja).
2. Kleebi link rakendusse ja vajuta "↻ Loe Google Sheet".
3. Vali objekti nime veerg, kaardikiht ja vastav väli, seejärel
   "🔗 Ühenda andmed". Soovi korral lülita sisse automaatne värskendus.

Tehniliselt: see käib **JSONP** kaudu (mitte tavaline `fetch()`) — script-tag
trikk, mis ei allu brauseri CORS-piirangutele, nii nagu fetch/XHR teeks.
Seetõttu töötab see otse brauserist ka puhtal staatilisel hostimisel nagu
GitHub Pages, ilma igasuguse serverita.

### Repo fail — CSV/XLSX (nt OneDrive/Exceli eksport)
1. Ekspordi oma OneDrive'i/Exceli tabel `.xlsx` või `.csv` failina.
2. Lisa see fail repositooriumisse (nt kausta `MyFiles/data/`) ja tee
   `git push`.
3. Sisesta rakenduses faili tee (nt `MyFiles/data/valiandmed.xlsx`) ja
   vajuta "↻ Loe repo fail". Kui failis on mitu töölehte, vali sobiv
   tööleht ripploendist.

See ei ole "elus" OneDrive'iga samal sekundil — andmed uuenevad alles
siis, kui ekspordid faili uuesti ja teed uue `git push`'i. Otse
OneDrive'ist reaalajas lugemine pole GitHub Pages'i static-hostingu
piirangute tõttu (CORS) võimalik ilma eraldi backendita.

## Muud funktsioonid

- **Taustakaardid:** OpenStreetMap + Maa-ameti Põhikaart / Hübriidkaart /
  Ortofoto / Valevärviortofoto (WMS, `js/config.js` failis seadistatav).
- **EANS UTM / Droonikaart:** `utm.eans.ee` avaneb kaardi peale manusena,
  proovides sünkroonida Taustakaardi asukoha/suumiga.
- **PRIA põllumassiivid:** kihtide loend WFS GetCapabilities päringust,
  "PÕLLUD" kihid rühmitatud eraldi koos kiirvalikutega, igal kihil oma
  värv, salvestatavad eelseadistused.
- **Kasutaja asukoht:** "sinine täpp" brauseri Geolocation API kaudu, nii
  vasaku paneeli nupust kui väikesest 📍 nupust otse kaardil (nõuab HTTPS-i
  — GitHub Pages pakub seda automaatselt).
- **Suumipiirid:** üldine madalaim lubatud suum kaardil, iga "Minu kaardid"
  kihi enda kiht/sildid-alates-suumist piirid, ning kaardi enda asukoht/suum
  ja kihiseaded jäävad brauserisse meelde järgmiseks korraks.
- **Otsing + Google Mapsi juhised:** otsi objekti "Minu kaardid" kihilt nime
  või koodi järgi, ava otse Google Mapsi juhised sinna.

## Kohalik testimine

Kuna rakendus ei vaja enam PHP-d, piisab kohalikuks testimiseks igast
lihtsast staatilisest failiserverist (mitte `file://` otse avamine, kuna
brauserid piiravad `fetch()` päringuid `file://` päritolust):

```bash
# projekti juurkaustas:
python3 -m http.server 8000
# ava brauseris http://localhost:8000
```

Või kasuta VS Code "Live Server" laiendust, või mis tahes muud lihtsat
staatilist arendusserverit.

## Turvalisuse märkused

- Kõik andmed (üleslaetud failid, väliandmete lingid, PRIA/kihi-eelistused)
  on avalikud kõigile, kellel rakenduse link on — täpselt nagu iga muu
  avalik GitHub Pages leht.
- PRIA eelseadistused ja kihtide värvivalikud, kaardi viimane vaade ning
  "Minu kaardid" kihi seaded salvestuvad kasutaja enda brauseri
  `localStorage`-sse — need pole nähtavad teistele kasutajatele.
- `MyFiles/uploads/` kausta lisatavad failid on avalikult nähtavad kõigile —
  ära lisa sinna midagi tundlikku.
