# Nymind’s TV – Monochrome Edition (samostatný modul)

Nový modul TizenBrew. **Nesouvisí s repozitářem `mojeTV` a nic v něm nemění.**

## Jak nahrát na GitHub

1. Vytvoř **nový veřejný repozitář** `nyminds-tv` v účtu `romangazdik-web`.
2. Při vytváření repozitáře nevybírej README ani .gitignore (v balíčku už README je).
3. Otevři nový repozitář, **Add file → Upload files**.
4. Do okna přetáhni **obsah této složky** (`package.json`, `README.md`, složku `app`); nikoli nadřazenou složku a nikoli ZIP.
5. Ověř cesty `package.json`, `app/index.html`, `app/app.js`, `app/style.css`, `app/visual.js`, `app/wallpapers/wallpaper-06.jpg`.
6. Klikni **Commit changes**.

## Zkušební instalace na TV

1. V TizenBrew otevři Module Manager → Add GitHub Module.
2. Přidej **`romangazdik-web/nyminds-tv@main`** (bez prefixu `gh/`).
3. **Ponech původní `romangazdik-web/mojeTV` nainstalované** a neměň automatické spouštění.
4. Spusť nový Nymind’s TV a otestuj načtení, StremioK a TizenTube. Na TV zatím neověřeno.
5. Existující zkratka dvojitého Zpět ve StremioK/TizenTube může zatím stále vracet na původní Moje TV, protože odkazuje na starý modul; neměň ji, dokud nový nebude fungovat.

## Co balíček dělá

- `app/index.html` – Monochrome vzhled a selektory ovládání.
- `app/style.css` – rozhraní v rozlišení 1920×1080 kompatibilní se starším Tizenem.
- `app/app.js` – kopie launcherové navigace s jedinou ochranou proti nulovým rozměrům při spuštění; nezasahuje do existujících modulů.
- `app/visual.js` – 9 časových bloků, pozdravy, počasí přes Open-Meteo, nikoli povinné.
- `app/wallpapers` – 9 lokálních JPEG tapet, načítané z vlastního nového repozitáře.

Náhled můžeš otevřít přes `NAHLED-PC.html`. Na PC bez TizenBrew může ukazovat hlášení o nedostupné službě a spouštění aplikací nebude fungovat. To není chyba TV.

## Aktualizace

Nový repozitář zabrání použití **staré cache původního repozitáře**. Následující úpravy **nového** repozitáře ale stále mohou zůstávat v cache CDN. Pro další vydání použijeme verzované odkazy/commity a testování před změnou hlavního modulu.
