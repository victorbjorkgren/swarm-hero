import {Vector2D} from "../Utility";
import {PlayerServer} from "./PlayerServer";
import {Team, TexturePack} from "../../types/types";
import HeroGameLoopServer, {CastleID, ClientID, EntityID} from "../HeroGameLoopServer";
import {Application, Graphics, Sprite} from "pixi.js";
import {Spells, SpellPack} from "../../types/spellTypes";
import {gameConfig, SpellPacks} from "../../config";
import {CastleBase} from "./CastleBase";

export class CastleServer extends CastleBase {
    onDeath(): void {
    }


}