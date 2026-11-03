# Instruktioner för Claude

## Pull requests

- När en ändring är klar: committa, pusha och skapa en pull request mot `main`. Merga inte direkt.
- Allt ska testas innan det når den riktiga sidan (Railway publicerar `main` automatiskt):
  - Kör testerna och prova ändringen i appen i din egen miljö.
  - Bygg sedan en simulering som användaren kan testa direkt i Claude-appen (en Artifact), inte via en länk till en testsida.
  - Simulera bara den del som ändras, inte hela sidan. Använd den riktiga koden för just den delen (gränssnitt och serverregler), med en låtsasserver och testdata i webbläsaren.
- Merga först när användaren uttryckligen har godkänt efter sitt test, och bara om PR:en går att merga (ingen konflikt, CI grön om det finns CI). Annars: åtgärda problemet först eller berätta vad som stoppar.
