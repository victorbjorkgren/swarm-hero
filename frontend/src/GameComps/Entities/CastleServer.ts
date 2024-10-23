import {Vector2D} from "../Utility";
import {PlayerServer} from "./PlayerServer";
import {Team, TexturePack} from "../../types/types";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {Application, Graphics, Sprite} from "pixi.js";
import {Spells, SpellPack} from "../../types/spellTypes";
import {gameConfig, SpellPacks} from "@shared/config";
import {CastleBase} from "./CastleBase";
import {CastleID, ClientID, EntityID} from "@shared/commTypes";

export class CastleServer extends CastleBase {
    onDeath(): void {
    }


}