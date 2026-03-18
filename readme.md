# Planner Maps

Le mie mappe interattive di attivita e tempo libero, generate con il Leisure Planner.

## Setup (una volta sola)

```bash
cd plan-viewer
git init
git add .
git commit -m "Initial plan-viewer setup"
gh repo create plan-viewer --public --source=. --push
```

Poi vai su: https://github.com/ccancellieri/plan-viewer/settings/pages
- Source: "Deploy from a branch"
- Branch: main, / (root)
- Save

La tua app sara disponibile su: **https://ccancellieri.github.io/plan-viewer/**

## Aggiungere nuove mappe

Ogni volta che Claude genera una nuova mappa, salva i file HTML nella cartella `maps/`
e aggiorna l'array `MAPS` in `index.html`.

## Add to iPhone Home Screen

1. Apri https://ccancellieri.github.io/plan-viewer/ in Safari su iPhone
2. Tocca il pulsante di condivisione (rettangolo con freccia in su)
3. Seleziona "Aggiungi alla schermata Home"
4. Conferma

L'icona appare sulla Home Screen come un'app nativa.
