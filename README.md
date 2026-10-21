# Staff Planner

Schemaplanering för produktionen: veckoschema per skift, rastplanering, kompetens, testresultat, bedömningar och produktion.

Appen består av en Node.js-server och en Postgres-databas, och båda körs på Railway. Alla loggar in med eget konto från sin egen dator eller mobil och ser samma data.

## Roller

Rollerna har fyra nivåer: **Admin** (högst), **Skiftledare**, **Höger hand** och **Operatör**. Admin kan allt. Under admin hanterar man bara personal i sitt eget skift som ligger på en lägre nivå än en själv, och kan bara ge roller som ligger under ens egen. Ingen kan alltså ändra uppgifter, inloggning eller roll för någon på samma eller högre nivå. Personal utan inloggning räknas som operatörer. Nivåerna finns i `ROLE_LEVELS` i [`server/permissions.js`](server/permissions.js), så en ny roll behöver bara läggas till där.

| | Admin | Skiftledare | Höger hand | Operatör |
|---|:---:|:---:|:---:|:---:|
| Se sitt skifts schema och rastplan | ✓ | ✓ | ✓ | ✓ (när veckan är delad) |
| Ändra sin egen profil (namn, telefon, e-post, status, lösenord) | ✓ | ✓ | ✓ | ✓ |
| Se andra skifts schema och rastplan (endast läsning) | ✓ | ✓ | | |
| Ändra schema, rast och produktion | Alla skift | Eget skift | Eget skift | |
| Ändra skiftets dagliga produktionsmål | ✓ | ✓ | | |
| Egen privat att göra-lista, med delning av enskilda uppgifter | ✓ | ✓ | ✓ | |
| Dela veckans schema med operatörerna (**Dela schema**) | Alla skift | Eget skift | Eget skift | |
| Lägga till personal och skapa konton | Alla roller och skift | Höger hand och operatörer, eget skift | Operatörer, eget skift | |
| Återställa lösenord | Alla | Höger hand och operatörer i eget skift | Operatörer i eget skift | |
| Göra någon till Höger hand eller ta bort rollen | ✓ | Eget skift | | |
| Ändra maskiner, avdelningar och inställningar (gäller alla skift) | ✓ | ✓ | | |
| Testresultat, kompetens och bedömningar | Alla | Operatörer i eget skift | | |
| Hantera alla profiler: namn, telefon, status, skift, användarnamn, roll och lösenord | ✓ | | | |
| Sidan Användare: inloggningar, roller och lösenord samlat | Alla skift | Eget skift | Eget skift | |
| Ta bort användare från sidan Användare | ✓ | | | |
| Chatt med text och bilder | ✓ | ✓ | ✓ | |
| Ta bort personal och användare, ändra roller | ✓ | | | |
| Skapa och ta bort skift, backup och import | ✓ | | | |
| Exportera backup av sitt eget skift (**Översikt → Backup av skiftet**) | | ✓ | | |

### Produktionsöversikt för admin

Admin hamnar på **Översikt** efter inloggningen. Sidan visar alla skift sida vid sida:

- Produktion idag och under månaden, jämfört med varje skifts dagliga mål. Ett klick på boxsiffran på ett skiftkort öppnar **Produktion per maskin**: box och svinn för varje linje och maskin, med GD-operatören som körde den och totalen mot målet. Idag visas operatören som registrerats på sidan Produktion, annars den som schemat placerat på maskinen (markerat "enligt schemat"). Under Månaden summeras hela månaden per maskin. Den som enligt schemat har utbildning på en maskin, det vill säga står på en utbildningsrad med maskinen som plats, visas under operatören med markeringen **(Utbildning)**. Sammanställningen uppdateras direkt när schemat ändras, även när den är öppen.
- Svinn under månaden i kg per skift.
- Antal operatörer på plats och vem som är ej tillgänglig eller ledig.
- Vilka linjer som är bemannade enligt skiftets schema för det valda datumet (**Linjer för**, idag som standard). En linje är bemannad när varje plats på linjen har en schemalagd operatör som är Tillgänglig och har platsens kompetens, med samma regler som autoschemat (avdelningens kompetens, krav på maskinen och GD-begränsning). En operatör räknas bara på en linje; en plats som hör till flera linjer, som Logimark på linje 2 och 3, delas av dem. För varje linje som inte är bemannad står vad som saknas, till exempel att ingen är schemalagd, att personen inte är tillgänglig eller saknar kompetens.
- Om linjen är i produktion, det vill säga om produktion är rapporterad för linjens maskin den dagen. Bemannad och i produktion visas var för sig.
- **Produktionskapacitet** per skift, med tre färgmarkerade rutor (grönt = räcker, gult = delvis, rött = räcker inte): **Bemannade linjer** enligt schemat, **Kan köra alla linjer** (Ja/Nej, utifrån skiftets tillgängliga operatörer och deras kompetens) och **Tillgänglig personal** jämfört med hur många alla linjer behöver samtidigt. Vad som saknas på varje linje och kompetensen per avdelning ligger under **Visa detaljer**, som är stängt från början. Hela sektionen Produktionskapacitet på skiftkortet och kortet **Kompetens per skift** är stängda från början och öppnas och stängs med ett klick på rubriken. En öppen sektion förblir öppen när översikten uppdateras i realtid.
- **Regler för linjebemanning** visar vilka platser, kompetenser och hur många personer varje linje kräver. Saknas en regel, till exempel en plats utan kopplad kompetens, visas linjen som **Regel saknas** och regeln listas där i stället för att appen gissar. Platserna per linje ändras under **Inställningar → Rastlinjer**.

Linjeöversikten uppdateras direkt när schemat, personalens status eller kompetensen ändras. Tillgängligheten är personens status just nu, även när man tittar på ett annat datum.
- Kompetensen per skift jämfört med hur många som behövs för att köra alla linjer.

Admin har ingen sidomeny. Överst finns en kompakt menyrad med genvägar till Översikt, Schema, Produktion och Personal. Under **Meny** finns alla sidor, valet av skift, Min profil och Logga ut.

Varje skiftkort har två knappar:
- **Visa schema** öppnar skiftets schema för läsning, utan redigeringsknappar. Man växlar mellan dagsvy och veckovy och bläddrar mellan veckor. I dagens kolumn syns det om någon som är schemalagd är sjuk eller borta.
- **Fler inställningar** leder till sidorna där man ändrar schema och rast, registrerar produktion och hanterar personal, användare, kompetens, testresultat och bedömning. Sidan öppnas med just det skiftet valt, även i en ny flik: skiftet följer med i länken och väljs som aktivt skift och i skiftfiltren på Personal, Kompetens och Användare.

På översikten finns även **Data** under **Meny**: dagens ändringar och export och import av backup. Skiftledare och höger hand ser samma översikt som tidigare, för sitt eget skift.

Operatörer ser en veckas schema och rastplan först när admin eller skiftledaren har klickat på **Dela schema** för den veckan. Delningen kan tas tillbaka med **Sluta dela**.

### Mejl när schemat delas

När en vecka delas får skiftets operatörer ett mejl om att schemat finns, med en länk för att logga in. Mejlet går bara till operatörer som har en inloggning och en e-postadress. Adressen fylls i under **Min profil** eller av admin eller skiftledaren under **Redigera** på personalsidan. Om veckan sparas igen medan den är delad skickas inget nytt mejl, men om den slutar delas och delas igen skickas ett nytt. Efter delningen visar appen hur många som fick mejlet.

Mejlen skickas via [Resend](https://resend.com), eftersom Railway blockerar vanlig SMTP på de flesta planer. Så här kommer du igång:

1. Skapa ett konto på resend.com, lägg till och verifiera er domän under **Domains**, och skapa en API-nyckel under **API Keys**.
2. Lägg till variablerna `RESEND_API_KEY`, `MAIL_FROM` (till exempel `Staff Planner <schema@er-doman.se>`) och `APP_URL` (appens adress) i Railway.

Utan `RESEND_API_KEY` och `MAIL_FROM` skickas inga mejl, och allt annat fungerar som vanligt.

Allt som skrivs in på sidan **Produktion** sparas automatiskt. Varje dag sparas för hela månaden, och den 10:e i nästa månad tas förra månadens dagar bort automatiskt. Fabriksrekordet och det dagliga målet finns kvar. Varje skift har sitt eget dagliga mål. När admin eller skiftledaren ändrar målet gäller det nya målet bara det skift som är valt, från det valda datumet och framåt; tidigare dagar och de andra skiftens mål ändras inte. Högst upp på sidan visas hur mycket skiftet har producerat totalt under månaden, och siffran uppdateras direkt när dagens resultat skrivs in.

Skiftledare kan aldrig ändra uppgifter (namn, företag, telefon, status eller inloggning) för admin eller en annan skiftledare, inte ens i samma skift. Höger hand kan bara ändra uppgifter för operatörer och personal utan inloggning.

**Höger hand** är skiftledarens assistent och tar över ansvaret när skiftledaren inte är på plats. Höger hand arbetar bara i sitt eget skift: ändrar schemat, lägger till operatörer, läser och skriver i chatten och registrerar dagens produktion, men kan inte ändra det dagliga målet eller maskiner och inställningar som gäller alla skift. Höger hand kan ändra operatörernas uppgifter i skiftet, men inte skiftledarens eller adminens.

**Att göra** är privat. Alla utom operatörer har en egen lista, och ingen annan kan se den, inte ens admin. Med **Dela** på en uppgift väljer man exakt vilka personer som ska se just den uppgiften. De ser den under **Delade med mig**, med namnet på den som delade den, men kan inte ändra den. Resten av listan förblir privat, och delningen kan tas bort när som helst.

Skiftledare genomför tester och bedömer kompetens för operatörerna i sitt eget skift, och för skiftets Höger hand och personal utan inloggning. De ser bara testresultat och bedömningar för de personerna, och kan inte ändra något för andra skift, andra skiftledare eller admin. Att lägga till eller ta bort avdelningar på sidan Testresultat är fortfarande bara för admin, eftersom det ändrar resultaten i alla skift.

Skiftledare och höger hand kan läsa kompetens för alla eftersom autoschemat och schemats varningar bygger på den.

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

### Dölja informationsmeddelanden

När man stänger ett informationsmeddelande (sidtipsen och utbildningspåminnelsen) frågar appen om det ska döljas permanent eller bara den här gången. **Bara den här gången** döljer det tills man loggar in nästa gång, även om man byter sida eller laddar om. **Dölj permanent** döljer det för gott, även efter ny inloggning. Valet sparas på servern och gäller bara den egna användaren.

### Ljudnotiser

Appen spelar ett kort ljud när någon annan skickar ett meddelande i chatten eller ändrar schemat eller rastplanen för ens eget skift (eller skiftet man tittar på), utan att man behöver ladda om sidan. Operatörer hör bara ändringar i veckor som har delats med dem, och ett ljud när en vecka delas. Egna ändringar ger inget ljud, och en sparning som ändrar flera saker samtidigt ger bara ett ljud, även med flera flikar öppna.

Ljudnotiserna är på från början och stängs av eller slås på under **Min profil → Ljudnotiser**, där det också finns en knapp för att testa ljudet. Valet gäller den enhet man använder. Webbläsare spelar bara upp ljud efter att man har klickat någonstans på sidan.

### Notiser

Klockan uppe till höger visar korta notiser, med en röd siffra för olästa:

- **Skiftledare och höger hand** får en notis när en admin ändrar något i deras skift (till exempel schemat, personal eller någons status) eller i gemensamma inställningar och maskiner. Notisen säger vem som ändrade och vad.
- **Alla som får en uppgift delad** från någons att göra-lista får en notis med uppgiften och vem som delade den. Ett klick på notisen öppnar **Att göra**.

Nya notiser syns direkt med en kort ruta och ett ljud. När man öppnar listan räknas notiserna som lästa, och **Rensa alla** tar bort dem. Notiser äldre än 30 dagar tas bort automatiskt.

### Chatt

Admin och skiftledare har en gemensam chatt bakom knappen i nedre högra hörnet. Där kan man skicka text och bilder, och man kan också klistra in en bild direkt. Nya meddelanden visas med en röd siffra på knappen och en kort förhandsvisning. Nya meddelanden syns direkt; som reserv kollar appen också var 15:e sekund, och var 4:e sekund när chatten är öppen.

Bilder förminskas i webbläsaren till högst 1600 pixlar innan de skickas, och sparas sedan i databasen. Man kan ta bort sina egna meddelanden, och admin kan ta bort alla. Meddelanden tas aldrig bort automatiskt, och chatten ingår inte i appens backupfil.

### Backup

Admin kan exportera och importera all data under **Inställningar** eller **Översikt → Meny → Data**. E-postadresserna ingår. Lösenord och de egna att göra-listorna ingår aldrig i backupen, och en import lämnar att göra-listorna orörda. Aktivera gärna även Railways egna backuper för Postgres om er plan har det.

Skiftledare kan exportera en backup av sitt eget skift under **Översikt → Backup av skiftet**. Den innehåller skiftet, dess personal, scheman, produktion och gemensamma inställningar, kompetens för skiftets personal samt testresultat och bedömningar för dem skiftledaren bedömer. Andra skift, lösenord och att göra-listor ingår inte. En skiftbackup är en kopia att spara: den kan inte importeras, eftersom den bara innehåller en del av datan. Exporten syns under skiftets ändringar. Höger hand och operatörer kan inte exportera.

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
