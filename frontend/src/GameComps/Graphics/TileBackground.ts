import {Application, Assets, Sprite, Spritesheet, SpritesheetData, Texture} from "pixi.js";
import {HeroGameLoopClient} from "../HeroGameLoopClient";

export const setupBackground = async (pixi: Application, totalWidth: number, totalHeight: number)=> {
    const texture: Texture = await Assets.load('/sprites/PixelArtTopDownTextures/TX Tileset Grass.png');

    const tileSize: number = 64;
    const columns = Math.floor(texture.width / tileSize);
    const rows = Math.floor(texture.height / tileSize);
    const screenCols = Math.ceil(totalWidth / tileSize);
    const screenRows = Math.ceil(totalHeight / tileSize);

    const atlasData: SpritesheetData = {
        frames: {},
        meta: {
            scale: 1,
        }
    };

    // const frameNames: string[] = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            const frameName = `tile_${x}_${y}`;
            // frameNames.push(frameName);
            atlasData.frames[frameName] = {
                frame: { x: x * tileSize, y: y * tileSize, w: tileSize, h: tileSize }
            };
        }
    }

    const spritesheet = new Spritesheet(texture, atlasData);

    await spritesheet.parse();

    for (let y = 0; y < screenRows; y++) {
        for (let x = 0; x < screenCols; x++) {
            const tX = Math.floor(Math.random() * columns);
            const tY = Math.floor(Math.random() * rows);
            const frameName = `tile_${tX}_${tY}`
            const sprite = new Sprite(spritesheet.textures[frameName]);
            sprite.x = x * tileSize;
            sprite.y = y * tileSize;
            sprite.zIndex = HeroGameLoopClient.zIndex.environment
            pixi.stage.addChild(sprite);
        }
    }
}