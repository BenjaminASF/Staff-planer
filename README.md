# Staff Planner

Schemaplanering för produktionen: veckoschema per skift, rastplanering, kompetens, testresultat, bedömningar och produktion.

Appen består av en Node.js-server och en Postgres-databas, och båda körs på Railway. Alla loggar in med eget konto från sin egen dator eller mobil och ser samma data.

## Roller

| | Admin | Skiftledare | Höger hand | Operatör |
|---|:---:|:---:|:---:|:---:|
| Se sitt skifts schema och rastplan | ✓ | ✓ | ✓ | ✓ (när veckan är delad) |
| Ändra sin egen profil (namn, telefon, e-post, status, lösenord) | ✓ | ✓ | ✓ | ✓ |
| Sätta statusen Inte tillgänglig | ✓ | ✓ | ✓ | |
| Se andra skifts schema och rastplan (endast läsning) | ✓ | ✓ | | |
| Ändra schema, rast och produktion | Alla skift | Eget skift | Eget skift | |
| Ändra det dagliga produktionsmålet | ✓ | ✓ | | |
| Egen att göra-lista (bara man själv ser den) | ✓ | ✓ | ✓ | |
| Dela veckans schema med operatörerna (**Dela schema**) | Alla skift | Eget skift | Eget skift | |
| Lägga till personal och skapa operatörskonton | Alla skift | Eget skift | Eget skift | |
| Återställa lösenord | Alla | Operatörer i eget skift | Operatörer i eget skift | |
| Ändra maskiner, avdelningar och inställningar (gäller alla skift) | ✓ | ✓ | | |
| Kompetens, testresultat och bedömningar | ✓ | | | |
| Hantera alla profiler: namn, telefon, status, skift, användarnamn, roll och lösenord | ✓ | | | |
| Sidan Användare: inloggningar, roller och lösenord samlat | Alla skift | Eget skift | Eget skift | |
| Ta bort användare från sidan Användare | ✓ | | | |
| Chatt med text och bilder | ✓ | ✓ | ✓ | |
| Ta bort personal och användare, ändra roller | ✓ | | | |
| Skapa och ta bort skift, backup och import | ✓ | | | |

Operatörer ser en veckas schema och rastplan först när admin eller skiftledaren har klickat på **Dela schema** för den veckan. Delningen kan tas tillbaka med **Sluta dela**.

### Mejl när schemat delas

När en vecka delas får skiftets operatörer ett mejl om att schemat finns, med en länk för att logga in. Mejlet går bara till operatörer som har en inloggning och en e-postadress. Adressen fylls i under **Min profil** eller av admin eller skiftledaren under **Redigera** på personalsidan. Om veckan sparas igen medan den är delad skickas inget nytt mejl, men om den slutar delas och delas igen skickas ett nytt. Efter delningen visar appen hur många som fick mejlet.

Mejlen skickas via [Resend](https://resend.com), eftersom Railway blockerar vanlig SMTP på de flesta planer. Så här kommer du igång:

1. Skapa ett konto på resend.com, lägg till och verifiera er domän under **Domains**, och skapa en API-nyckel under **API Keys**.
2. Lägg till variablerna `RESEND_API_KEY`, `MAIL_FROM` (till exempel `Staff Planner <schema@er-doman.se>`) och `APP_URL` (appens adress) i Railway.

Utan `RESEND_API_KEY` och `MAIL_FROM` skickas inga mejl, och allt annat fungerar som vanligt.

Allt som skrivs in på sidan **Produktion** sparas automatiskt. Varje dag sparas för hela månaden, och den 10:e i nästa månad tas förra månadens dagar bort automatiskt. Fabriksrekordet och det dagliga målet finns kvar. När admin eller skiftledaren ändrar det dagliga målet gäller det nya målet från det valda datumet och framåt; tidigare dagar behåller sitt mål. Högst upp på sidan visas hur mycket skiftet har producerat totalt under månaden, och siffran uppdateras direkt när dagens resultat skrivs in.

Skiftledare kan aldrig ändra en admins uppgifter (namn, företag, telefon, status eller inloggning), inte ens om admin hör till samma skift.

**Höger hand** är skiftledarens assistent och tar över ansvaret när skiftledaren inte är på plats. Höger hand arbetar bara i sitt eget skift: ändrar schemat, lägger till operatörer, läser och skriver i chatten och registrerar dagens produktion, men kan inte ändra det dagliga målet eller maskiner och inställningar som gäller alla skift. Höger hand kan ändra operatörernas uppgifter i skiftet, men inte skiftledarens eller adminens.

Skiftledare och höger hand kan läsa kompetens eftersom autoschemat och schemats varningar bygger på den.

Alla regler finns samlade i [`server/permissions.js`](server/permissions.js) och kontrolleras på servern. Gränssnittet döljer bara det man inte har behörighet till.

## Driftsättning på Railway

1. Skapa ett projekt i Railway och välj **Deploy from GitHub repo** med det här repot.
2. Lägg till en databas i samma projekt: **New → Database → PostgreSQL**.
3. Lägg till följande variabler i app-tjänsten under **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`. Det är en referens till databasen, och namnet ska matcha databastjänsten.
   - `SETUP_CODE` = en lång, slumpad kod. Den behövs bara för att skapa det första admin-kontot.
   - Valfritt: `APP_TIME_ZONE` (standard `Europe/Stockholm`).
4. Skapa en adress under **Settings → Networking → Generate Domain**.
5. Öppna adressen. Första gången visas **Skapa admin-konto**. Ange installationskoden (`SETUP_CODE`) och välj användarnamn och lösenord.
6. Följ introduktionen: arbetsplatsens namn, arbetsdagar och personal. Skiften Röd, Blå och Gul finns redan, var och en med sin färg. Skift och färger ändras under **Inställningar → Skift**. Varje färg kan bara höra till ett skift. När man lägger till ett skift visas de färger som ingen annan använder (Röd, Blå, Gul, Grön, Lila, Orange och Brun), och den första lediga är förvald.

Databastabellerna skapas automatiskt när servern startar. När det första kontot finns går det inte att köra installationen igen, så `SETUP_CODE` kan tas bort.

Railway kontrollerar `/api/health` vid varje driftsättning (se [`railway.json`](railway.json)).

### Konton för personalen

Admin och skiftledare skapar inloggningar under **Lägg till** eller via **Redigera** på personalsidan. Personen får ett användarnamn och ett tillfälligt lösenord och väljer ett eget lösenord vid första inloggningen. Glömda lösenord återställs på samma sätt.

### Flytta data från den gamla versionen

Den tidigare versionen sparade allt krypterat i en enda webbläsare. Så här flyttar du in den datan:

- **Från samma dator:** logga in som admin i den webbläsare där den gamla datan finns och öppna **Inställningar → Flytta data från den gamla versionen**.
- **Från en backupfil:** välj **Inställningar → Importera backup** och välj filen som exporterades från den gamla versionen.

Ange det gamla lösenordet och välj vilket skift personalen och schemana ska höra till. Datan dekrypteras i webbläsaren och skickas sedan till servern.

### Uppdateringar i realtid

När någon sparar en ändring syns den direkt hos alla andra som har appen öppen, utan att de behöver ladda om sidan. Servern skickar ett meddelande till öppna sidor (Server-Sent Events på `/api/events`) som sedan hämtar det som ändrats och ritar om vyn. Den som håller på att skriva i ett fält eller har en dialogruta öppen får uppdateringen när fältet lämnas eller dialogen stängs, så inget man skriver försvinner. Varje sida får bara veta om ändringar i data den själv får läsa, och operatörer får bara veta om ändringar i veckor som har delats med dem. Om anslutningen bryts kopplar sidan upp sig igen och hämtar allt på nytt.

Ändringarna meddelas via Postgres (`LISTEN`/`NOTIFY`), så det fungerar även om appen körs på flera instanser.

### Ljudnotiser

Appen spelar ett kort ljud när någon annan skickar ett meddelande i chatten eller ändrar schemat eller rastplanen för ens eget skift (eller skiftet man tittar på), utan att man behöver ladda om sidan. Operatörer hör bara ändringar i veckor som har delats med dem, och ett ljud när en vecka delas. Egna ändringar ger inget ljud, och en sparning som ändrar flera saker samtidigt ger bara ett ljud, även med flera flikar öppna.

Ljudnotiserna är på från början och stängs av eller slås på under **Min profil → Ljudnotiser**, där det också finns en knapp för att testa ljudet. Valet gäller den enhet man använder. Webbläsare spelar bara upp ljud efter att man har klickat någonstans på sidan.

### Chatt

Admin och skiftledare har en gemensam chatt bakom knappen i nedre högra hörnet. Där kan man skicka text och bilder, och man kan också klistra in en bild direkt. Nya meddelanden visas med en röd siffra på knappen och en kort förhandsvisning. Nya meddelanden syns direkt; som reserv kollar appen också var 15:e sekund, och var 4:e sekund när chatten är öppen.

Bilder förminskas i webbläsaren till högst 1600 pixlar innan de skickas, och sparas sedan i databasen. Man kan ta bort sina egna meddelanden, och admin kan ta bort alla. Meddelanden tas aldrig bort automatiskt, och chatten ingår inte i appens backupfil.

### Backup

Admin kan exportera och importera all data under **Inställningar** eller **Översikt**. E-postadresserna ingår. Lösenord och de egna att göra-listorna ingår aldrig i backupen, och en import lämnar att göra-listorna orörda. Aktivera gärna även Railways egna backuper för Postgres om er plan har det.

## Utveckling lokalt

Kräver Node.js 20 eller senare och en Postgres-databas.

```bash
npm install
DATABASE_URL=postgres://postgres@localhost:5432/staffplanner SETUP_CODE=valfri-kod npm start
# Appen körs på http://localhost:3000
```

Servertesterna går mot en separat testdatabas, som töms vid varje körning:

```bash
TEST_DATABASE_URL=postgres://postgres@localhost:5432/staffplanner_test npm test
```

| Variabel | Beskrivning |
|---|---|
| `DATABASE_URL` | Anslutning till Postgres (krävs). |
| `SETUP_CODE` | Kod för att skapa det första admin-kontot. |
| `PORT` | Port för servern (Railway sätter den själv). |
| `DATABASE_SSL` | `true` om databasen kräver SSL, till exempel vid anslutning via Railways publika adress. |
| `APP_TIME_ZONE` | Tidszon för veckoberäkningar på servern (standard `Europe/Stockholm`). |
| `RESEND_API_KEY` | API-nyckel från Resend. Behövs för mejl när schemat delas. |
| `MAIL_FROM` | Avsändare för mejlen, till exempel `Staff Planner <schema@er-doman.se>`. Domänen måste vara verifierad i Resend. |
| `APP_URL` | Appens adress, som länkas i mejlen. Utan den används adressen som skiftledaren delade schemat från. |

## Struktur

- `public/` innehåller webbappen: HTML-sidorna, `app.js`, `style.css` och service worker.
- `server/` innehåller Express-servern:
  - `permissions.js` samlar alla rollregler.
  - `realtime.js` skickar ändringar till öppna sidor i realtid.
  - `routes/` innehåller API:t.
  - `migrations/` innehåller databasschemat.
  - `test/` innehåller testerna.
