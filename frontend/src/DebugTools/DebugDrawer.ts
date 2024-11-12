import {Application, Graphics} from "pixi.js";
import {Vector2D} from "../GameComps/Utility";
import {Game} from "../GameComps/Game";

export default class DebugDrawer {
    private static lines: Graphics[] = [];
    private static dots: Graphics[] = [];
    private static pixi: Application | null = null;
    private static scene: Game | null = null;
    
    static setPixi(pixi: Application) {
        DebugDrawer.pixi = pixi;
    }
    static setScene(scene: Game) {
        DebugDrawer.scene = scene;
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
        const s = this.scene ? this.scene.renderScale : 1
        const line = new Graphics()
            .moveTo(origin.x * s, origin.y * s)
            .lineTo(destination.x * s, destination.y * s)
            .stroke({color: color, width: 2});
        line.zIndex = Game.zIndex.hud;
        DebugDrawer.pixi?.stage.addChild(line);
        DebugDrawer.lines.push(line);
    }
    
    static addDot(origin: Vector2D, color: number) {
        const s = this.scene ? this.scene.renderScale : 1
        const dot = new Graphics()
            .circle(origin.x * s, origin.y * s, 2)
            .fill({color: color});
        dot.zIndex = Game.zIndex.hud;
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