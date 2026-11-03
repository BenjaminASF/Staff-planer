# Instruktioner för Claude

## Pull requests

- När en ändring är klar: committa, pusha och skapa en pull request mot `main`. Merga inte direkt.
- Allt ska testas innan det når den riktiga sidan (Railway publicerar `main` automatiskt):
  - Kör testerna och prova ändringen i appen i din egen miljö, och skicka skärmbilder och testresultat till användaren i chatten.
  - Användaren provar sedan själv på PR:ens testsida i Railway (PR-miljö med egen adress och egen databas).
- Merga först när användaren uttryckligen har godkänt efter sitt test, och bara om PR:en går att merga (ingen konflikt, CI grön om det finns CI). Annars: åtgärda problemet först eller berätta vad som stoppar.
