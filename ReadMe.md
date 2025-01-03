# To dev run

- spin up `login-service` and `signalling-service`
- run `yarn start` in frontend.


# Level editing

Raw ldtk files are in `frontend/public/sprites/PixelArtTopDownTextures/TopDownRuins_1.0`

To submit a new level (or update one), after saving in ldtk,
move the files in `Level_0` to `public/levels/<level_name>/`
also put the `data.json` in `src/GameComps/Levels/<level_name>/`

You should probable make changes in `Level.ts`.