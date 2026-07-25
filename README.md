# SAK26

Avatud ligipääsuga veebipõhine kaardirakendus: vasakul kihipaneel (vaikimisi
peidetud), paremal suur kaardivaade. Töötab tavalises Windows/Android/iOS
brauseris ning DJI Matrice 4T RC Plus 2 Enterprise pульти brauseris.

**Rakendus töötab täielikult staatilise hostimisega (nt GitHub Pages) —
serveripoolset koodi (PHP jms) ei ole vaja.** Kõik, mis varem vajas serverit
(failihaldus, väliandmed), on ümber ehitatud git-põhiseks ja backend-vabaks.

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

- **Taustakaardid:** OpenStreetMap + Maa-ameti Eesti kaart / Hübriidkaart /
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
