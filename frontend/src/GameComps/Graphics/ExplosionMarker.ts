import {Application, Container, FillGradient, Graphics, GraphicsContext} from "pixi.js";
import {pol2cart} from "../Utility";
import HeroGameLoopServer from "../HeroGameLoopServer";
import {HeroGameLoopClient} from "../HeroGameLoopClient";

export const renderArcaneWheel = (pixi: Application): Container => {
    const parent = new Container();

    const solid = 0xFFFFFF;
    const colorStops = [0xBBBBBB, 0xffffff];
    const majorAlpha = .5;
    const gradient = new FillGradient(0, 0, 100, 100);
    colorStops.forEach((number, index) =>
    {
        const ratio = index / colorStops.length;
        gradient.addColorStop(ratio, number);
    });

    const triContext = new GraphicsContext()
        .poly([
            {x: 0, y: 0},
            {x: -2.5, y: -1.5},
            {x: -2.5, y: 1.5}
        ], true)
        .fill({color: solid, alpha: majorAlpha});

    // Circles
    const circles = new Graphics()
        .circle(0, 0, 87)
        .stroke(gradient)
        .circle(0, 0, 94)
        .circle(0, 0, 100)
        .stroke(gradient);

    parent.addChild(circles);

    // Dashed circle
    const dashCircle = new Graphics();
    const nDashes = 30;
    const gapSizeRatio = 2;
    const dashRadius = 70
    const dashLength = 2 * Math.PI / ((1 + gapSizeRatio) * nDashes);

    for (let i = 0; i < nDashes; i++) {
        const startAngle = i * (1 + gapSizeRatio) * dashLength;
        const startPos = pol2cart(dashRadius, startAngle);
        dashCircle.moveTo(startPos.x, startPos.y);
        dashCircle.arc(0, 0, dashRadius, startAngle, startAngle + dashLength);
        dashCircle.stroke({color: solid, alpha: majorAlpha, width: 1});
    }

    parent.addChild(dashCircle);

    // Cross lines
    const lineLen = 120
    const lineContext = new GraphicsContext()
        .moveTo(-lineLen, 0)
        .lineTo(lineLen, 0)
        .stroke({color: solid, alpha: majorAlpha, width: 1});
    const line1 = new Graphics(lineContext)
    parent.addChild(line1);
    const line2 = new Graphics(lineContext);
    line2.rotation += Math.PI / 2;
    parent.addChild(line2);

    // Line decoration
    const tri = new Graphics(triContext);
    tri.scale = 4;
    tri.position.x = -0.45 * lineLen;
    line2.addChild(tri);
    const rombus = new Graphics()
        .poly([
            {x:0, y: 0},
            {x:5, y: 5},
            {x:15, y: 0},
            {x:5, y: -5}
        ], true)
        .stroke({color: solid, alpha: majorAlpha, width: 1});
    rombus.position.x = lineLen
    line2.addChild(rombus);
    const dashes = new Graphics()
        .lineTo(3, 0)
        .moveTo(6, 0)
        .lineTo(9, 0)
        .stroke({color: solid, alpha: majorAlpha, width: 2});
    dashes.position.x = lineLen + 15 + 3;
    line2.addChild(dashes);
    const backDot = new Graphics()
        .circle(-lineLen, 0,2)
        .fill({color: solid, alpha: majorAlpha});
    line2.addChild(backDot);

    // Line decorations
    const tri2 = new Graphics(triContext);
    tri2.scale = -2;
    tri2.position.x = -1.1 * lineLen;
    line1.addChild(tri2);
    const tri3 = new Graphics(triContext);
    tri3.scale = 2;
    tri3.position.x = 1.1 * lineLen;
    line1.addChild(tri3);

    // Outer symbols
    for (let i = 0; i < 3; i++) {
        const rot = new Container();
        const newTri = new Graphics(triContext);
        newTri.scale.x = -7;
        newTri.scale.y = 5;
        newTri.position.x = 83;
        rot.rotation = i * 2 * Math.PI / 3 + Math.PI / 2;
        rot.addChild(newTri);
        parent.addChild(rot);
    }
    const p = pol2cart(94, Math.PI / 8)
    const outDot = new Graphics()
        .circle(p.x, p.y, 6)
        .fill({color: solid, alpha: majorAlpha});
    parent.addChild(outDot);
    const outRombus = new Graphics()
        .poly([
            {x: 0,y: -84},
            {x: -5,y: -94},
            {x: 0,y: -103},
            {x: 5,y: -94},
        ], true)
        .fill({color: solid, alpha: majorAlpha});
    parent.addChild(outRombus);

    // Mid decorations
    const midDot = new Graphics()
        .circle(0, 0,3)
        .fill({color: solid, alpha: majorAlpha});
    parent.addChild(midDot);

    parent.zIndex = HeroGameLoopClient.zIndex.hud;
    parent.visible = false;

    pixi.stage.addChild(parent);
    pixi.ticker.add(()=> {
        line2.rotation += .004;
        line1.rotation -= .001;
    })
    return parent;
}