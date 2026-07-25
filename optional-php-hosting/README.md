# Valikuline: PHP-põhine hostimine

See kaust on **hetkel rakenduse poolt kasutusel EI OLE**. SAK26 töötab praegu
puhtalt staatilise GitHub Pages hostimisega (git-põhine failihaldus,
Google Sheets JSONP, repo-failid Excel/CSV andmete jaoks) — vt projekti
juurkaustas olevat README.md.

Need PHP failid on siia alles jäetud juhuks, kui otsustad hiljem kolida
tavalisele PHP-toega veebihostingule (nt jagatud (shared) hosting FTP
kaudu), kus saab kasutada:
- reaalajas failide üleslaadimist veebivormi kaudu (mitte git push)
- serveripoolset kustutamist
- Google Sheets / OneDrive andmete toomist serveri kaudu (CORS-vaba)

## Kasutuselevõtt (kui kolid PHP hostingule)

1. Kopeeri see `php/` kaust oma rakenduse juurkausta (samale tasemele
   kui `index.html`, `css/`, `js/`, `MyFiles/`).
2. Muuda `js/config.js` failis tagasi PHP-põhiste otspunktide peale
   (vt käesoleva projekti git-ajalugu varasema versiooni jaoks, kus
   need olid aktiivselt kasutusel: `php/upload.php`, `php/list_files.php`,
   `php/delete_file.php`, `php/data_proxy.php`).
3. Muuda `js/app.js` failis üleslaadimis- ja väliandmete funktsioonid
   tagasi otse `fetch()` päringute peale nende PHP otspunktide vastu
   (git-ajaloos on näha, kuidas see varem oli üles ehitatud).

See on suurem muudatus kui lihtne konfiguratsiooni ümberlülitamine —
soovitame selle jaoks pöörduda uuesti abi saamiseks, kui see aeg käes on.
