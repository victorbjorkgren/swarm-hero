// @ts-ignore
import os from "os";
import { Request, Response, NextFunction } from "express";
// @ts-ignore
import jwt, { JwtPayload } from "jsonwebtoken";
import axios from "axios";


export const getNetworkIP = (): string => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;  // Return the network IP
            }
        }
    }
    console.log('Could not find network interface, returning localhost');
    return 'localhost';
};


export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}


export const authenticateToken = (publicKeyUrl: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

        if (!token) {
            return res.status(401).json({ message: "Token not provided" });
        }

        try {
            // Fetch the latest public key from the issuer service
            const { data } = await axios.get(publicKeyUrl);
            const publicKey = data.publicKey;

            // Verify the token using the public key
            const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
            req.user = decoded as JwtPayload; // Attach decoded info to the request
            next(); // Proceed to the next middleware or route handler
        } catch (err) {
            console.error("JWT verification failed:", err);
            res.status(403).json({ message: "Invalid or expired token" });
        }
    };
};
