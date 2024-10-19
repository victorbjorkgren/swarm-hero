import {Application, Graphics, Sprite} from "pixi.js";
import {Vector2D} from "../GameComps/Utility";
import HeroGameLoopServer from "../GameComps/HeroGameLoopServer";
import {HeroGameLoopClient} from "../GameComps/HeroGameLoopClient";

export default class DebugDrawer {
    private static lines: Graphics[] = [];
    private static dots: Graphics[] = [];
    private static pixi: Application | null = null;
    
    static setPixi(pixi: Application) {
        DebugDrawer.pixi = pixi;
    }
    
    static reset() {
        DebugDrawer.lines.forEach((line) => {
            DebugDrawer.pixi?.stage.removeChild(line)
        })
        DebugDrawer.dots.forEach((dot) => {
            DebugDrawer.pixi?.stage.removeChild(dot)
        })
        DebugDrawer.lines = [];
        DebugDrawer.dots = [];
    }
    
    static addLine(origin: Vector2D, destination: Vector2D, color: number) {
        const line = new Graphics()
            .moveTo(origin.x, origin.y)
            .lineTo(destination.x, destination.y)
            .stroke({color: color, width: 2});
        line.zIndex = HeroGameLoopClient.zIndex.hud;
        DebugDrawer.pixi?.stage.addChild(line);
        DebugDrawer.lines.push(line);
    }
    
    static addDot(origin: Vector2D, color: number) {
        const dot = new Graphics()
            .circle(origin.x, origin.y, 2)
            .fill({color: color});
        dot.zIndex = HeroGameLoopClient.zIndex.hud;
        DebugDrawer.pixi?.stage.addChild(dot);
        DebugDrawer.dots.push(dot);
    }

    static addPath(points: Vector2D[], color: number) {
        for (let i = 0; i < points.length; i++) {
            // Draw a dot at each point
            DebugDrawer.addDot(points[i], color);

            // Draw a line to the next point if it exists
            if (i < points.length - 1) {
                DebugDrawer.addLine(points[i], points[i + 1], color);
            }
        }
    }
}