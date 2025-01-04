import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { generateKeyPairSync } from 'crypto';
import dotenv from 'dotenv';
import * as process from "node:process";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Key rotation setup
let privateKey: string;
let publicKey: string;

function generateKeyPair() {
    const { privateKey: priv, publicKey: pub } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = priv;
    publicKey = pub;
}

generateKeyPair();

setInterval(generateKeyPair, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || "4000";
const EMAIL_FROM = process.env.EMAIL_FROM || 'dev@example.com';
const EMAIL_USER = process.env.EMAIL_USER || 'dev@example.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'dev-email-password';
const ENV = process.env.ENVIRONMENT || 'production';

console.log(
    PORT,
    EMAIL_FROM,
    EMAIL_USER,
    EMAIL_PASS
)

const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

// Mock user database
const users: Record<string, { email: string; code: string | null }> = {
    'victor.bjorkgren@hotmail.com': { email: 'victor.bjorkgren@hotmail.com', code: null },
    'admin@example.com': { email: 'admin@example.com', code: null },
};

function generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function issueToken(email: string): string {
    return jwt.sign({ email }, privateKey, {
        algorithm: 'RS256',
        expiresIn: '1d',
    });
}

app.post('/request-code/', async (req: Request, res: Response) => {
    const { email } = req.body;
    if (ENV === 'DEVELOPMENT' && email === 'dev') {
        res.status(200).send();
        return;
    }

    if (!email || !email.length) {
        res
            .status(401)
            .json({ message: 'Empty email' });
    }

    if (!users[email]) {
        res
            .status(401)
            .json({ message: 'Invalid email.' });
        return;
    }

    const code = generateSixDigitCode();
    users[email].code = code;
    console.log('email', email, 'code', code);

    try {
        await transporter.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: 'Login Code - EchoesOfTheSwarm',
            text: code,
        });

        res.status(200).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error sending email.' });
    }
});

app.post('/verify-code/', (req: Request, res: Response) => {
    const { email, code } = req.body;

    if (ENV === 'DEVELOPMENT' && email === 'dev') {
        const token = issueToken(email);
        console.log('issuing dev token');
        res.json({ token });
        return;
    }

    if (!users[email]) {
        res
            .status(401)
            .json({ message: 'Invalid email.' });
        return;
    }

    const user = users[email];

    if (user.code === code) {
        const token = issueToken(user.email);
        res.json({ token });
    } else {
        res
            .status(401)
            .json({ message: 'Wrong code.' });
    }

})

app.get('/keys/', (req: Request, res: Response) => {
    res.json({ publicKey });
});

app.listen(PORT, () => console.log('Login service running on https://swarm-login-service.onrender.com'));
