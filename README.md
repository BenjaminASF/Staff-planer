# Staff Planner

Schemaplanering för produktionen: veckoschema per skift, rastplanering, kompetens, testresultat, bedömningar och produktion.

Appen består av en Node.js-server och en Postgres-databas, och båda körs på Railway. Alla loggar in med eget konto från sin egen dator eller mobil och ser samma data.

## Roller

| | Admin | Skiftledare | Operatör |
|---|:---:|:---:|:---:|
| Se sitt skifts schema och rastplan | ✓ | ✓ | ✓ |
| Ändra sin egen profil (namn, telefon, status, lösenord) | ✓ | ✓ | ✓ |
| Se andra skifts schema och rastplan (endast läsning) | ✓ | ✓ | |
| Ändra schema, rast, produktion och att göra-lista | Alla skift | Eget skift | |
| Lägga till personal och skapa operatörskonton | Alla skift | Eget skift | |
| Återställa lösenord | Alla | Operatörer i eget skift | |
| Ändra maskiner, avdelningar och inställningar (gäller alla skift) | ✓ | ✓ | |
| Kompetens, testresultat och bedömningar | ✓ | | |
| Hantera alla profiler: namn, telefon, status, skift, användarnamn, roll och lösenord | ✓ | | |
| Sidan Användare: alla inloggningar, roller och lösenord samlat | ✓ | | |
| Ta bort personal och användare, ändra roller | ✓ | | |
| Skapa och ta bort skift, backup och import | ✓ | | |

Skiftledare kan läsa kompetens eftersom autoschemat och schemats varningar bygger på den.

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
6. Följ introduktionen: arbetsplatsens namn, arbetsdagar och personal. Skiften Röd, Blå och Gul finns redan, var och en med sin färg. Skift och färger ändras under **Inställningar → Skift**.

Databastabellerna skapas automatiskt när servern startar. När det första kontot finns går det inte att köra installationen igen, så `SETUP_CODE` kan tas bort.

Railway kontrollerar `/api/health` vid varje driftsättning (se [`railway.json`](railway.json)).

### Konton för personalen

Admin och skiftledare skapar inloggningar under **Lägg till** eller via **Redigera** på personalsidan. Personen får ett användarnamn och ett tillfälligt lösenord och väljer ett eget lösenord vid första inloggningen. Glömda lösenord återställs på samma sätt.

### Flytta data från den gamla versionen

Den tidigare versionen sparade allt krypterat i en enda webbläsare. Så här flyttar du in den datan:

- **Från samma dator:** logga in som admin i den webbläsare där den gamla datan finns och öppna **Inställningar → Flytta data från den gamla versionen**.
- **Från en backupfil:** välj **Inställningar → Importera backup** och välj filen som exporterades från den gamla versionen.

Ange det gamla lösenordet och välj vilket skift personalen och schemana ska höra till. Datan dekrypteras i webbläsaren och skickas sedan till servern.

### Backup

Admin kan exportera och importera all data under **Inställningar** eller **Översikt**. Lösenord ingår aldrig i backupen. Aktivera gärna även Railways egna backuper för Postgres om er plan har det.

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

## Struktur

- `public/` innehåller webbappen: HTML-sidorna, `app.js`, `style.css` och service worker.
- `server/` innehåller Express-servern:
  - `permissions.js` samlar alla rollregler.
  - `routes/` innehåller API:t.
  - `migrations/` innehåller databasschemat.
  - `test/` innehåller testerna.
