/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378                             *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *    Description: This file is part of the ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ ⱽ¹.⁰.⁰ Project.     *
 *                 Unauthorized copying or distribution is prohibited.      *
 *                                                                           *
 ***************************************************************************/

import 'dotenv/config';

import fs, { existsSync, mkdirSync, rmSync } from 'fs';
import path, { dirname } from 'path';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { parsePhoneNumber as PhoneNumber } from 'awesome-phonenumber';
import readline from 'readline';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { smsg } from './lib/myfunc.js';
import { compileAll } from './lib/compile.js';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, jidDecode, jidNormalizedUser, makeCacheableSignalKeyStore, delay } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import config from './config.js';
import store from './lib/lightweight_store.js';
import SaveCreds from './lib/session.js';
import { server, PORT } from './lib/server.js';
import { printLog } from './lib/print.js';
import { writeErrorLog } from './lib/logger.js';
import { handleMessages, handleGroupParticipantUpdate, handleStatus, handleCall } from './lib/messageHandler.js';
import commandHandler from './lib/commandHandler.js';

store.readFromFile();
setInterval(() => store.writeToFile(), config.storeWriteInterval || 10000);
// Memory monitoring removed - no forced restart due to RAM usage
// setInterval(() => { ... }, 30000); // REMOVED

const phoneNumber = config.pairingNumber || config.ownerNumber || "255618558502";

// Auto-create data directory and default files on startup
const DATA_DEFAULTS = {
    'owner.json': [],
    'banned.json': [],
    'premium.json': [],
    'warnings.json': {},
    'notes.json': {},
    'autoAi.json': {},
    'messageCount.json': { isPublic: true, messageCount: {} },
    'userGroupData.json': { users: [], groups: [], antilink: {}, antibadword: {}, warnings: {}, sudo: [], welcome: {}, goodbye: {}, chatbot: {}, autoReaction: false },
    'autoStatus.json': { enabled: false },
    'autoread.json': { enabled: false },
    'autotyping.json': { enabled: false },
    'pmblocker.json': { enabled: false },
    'anticall.json': { enabled: false },
    'stealthMode.json': { enabled: false },
    'autoBio.json': { enabled: false, customBio: null },
    'autoReaction.json': { enabled: false },
    'antidelete.json': { enabled: false },
    'antilink.json': {},
    'antibadword.json': {},
};

fs.mkdirSync('./data', { recursive: true });
for (const [file, def] of Object.entries(DATA_DEFAULTS)) {
    const fp = `./data/${file}`;
    if (!fs.existsSync(fp))
        fs.writeFileSync(fp, JSON.stringify(def, null, 2));
}

let owner = [];
try {
    owner = JSON.parse(fs.readFileSync('./data/owner.json', 'utf-8'));
} catch {
    owner = [];
}

global.botname = config.botName || "ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ";
global.themeemoji = "•";

const pairingCode = !process.argv.includes("--qr-code");
const useMobile = process.argv.includes("--mobile");

let rl = null;
let rlClosed = false;

if (process.stdin.isTTY && !config.pairingNumber) {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.on('close', () => { rlClosed = true; });
}

const question = (text) => {
    if (rl && !rlClosed) {
        return new Promise((resolve) => rl.question(text, resolve));
    } else {
        return Promise.resolve(config.ownerNumber || phoneNumber);
    }
};

process.on('exit', () => {
    if (rl && !rlClosed) rl.close();
});
process.on('SIGINT', () => {
    if (rl && !rlClosed) rl.close();
    process.exit(0);
});

function ensureSessionDirectory() {
    const sessionPath = path.join(__dirname, 'session');
    if (!existsSync(sessionPath)) {
        mkdirSync(sessionPath, { recursive: true });
    }
    return sessionPath;
}

function hasValidSession() {
    try {
        const credsPath = path.join(__dirname, 'session', 'creds.json');
        if (!existsSync(credsPath)) return false;

        const fileContent = fs.readFileSync(credsPath, 'utf8');
        if (!fileContent || fileContent.trim().length === 0) {
            printLog('warning', 'creds.json exists but is empty');
            return false;
        }

        try {
            const creds = JSON.parse(fileContent);
            if (!creds.noiseKey || !creds.signedIdentityKey || !creds.signedPreKey) {
                printLog('warning', 'creds.json is missing required fields');
                return false;
            }

            if (creds.registered === false) {
                printLog('warning', 'Session not registered. Clearing for fresh pairing...');
                try {
                    rmSync(path.join(__dirname, 'session'), { recursive: true, force: true });
                } catch (_e) { /* ignore */ }
                return false;
            }

            printLog('success', 'Valid and registered session credentials found');
            return true;
        } catch (_parseError) {
            printLog('warning', 'creds.json contains invalid JSON');
            return false;
        }
    } catch (error) {
        printLog('error', `Error checking session validity: ${error.message}`);
        return false;
    }
}

async function initializeSession() {
    ensureSessionDirectory();
    const txt = config.sessionId;
    const mongoUrl = config.mongoUrl || process.env.MONGODB_URI;

    // If both sessionId and mongoUrl are provided, try to restore from MongoDB
    if (txt && mongoUrl) {
        if (hasValidSession()) return true;
        try {
            await SaveCreds(txt);
            await delay(2000);
            if (hasValidSession()) {
                printLog('success', 'Session file verified and valid (restored from MongoDB)');
                await delay(1000);
                return true;
            } else {
                printLog('error', 'Session file not valid after download');
                return false;
            }
        } catch (error) {
            printLog('error', `Error downloading session: ${error.message}`);
            return false;
        }
    } else {
        // MongoDB not configured, rely on file-based session
        if (hasValidSession()) {
            printLog('success', 'Existing file session found. Using saved credentials');
            return true;
        }
        return false;
    }
}

server.listen(PORT, () => {
    printLog('success', `Server listening on port ${PORT}`);
});

async function startStanyTZ() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        ensureSessionDirectory();
        await delay(1000);
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        const _saveCreds = async () => {
            ensureSessionDirectory();
            await saveCreds();
        };
        const msgRetryCounterCache = new NodeCache();
        const ghostMode = await store.getSetting('global', 'stealthMode');
        const isGhostActive = ghostMode && ghostMode.enabled;

        const StanyTZ = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Chrome'),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: !isGhostActive,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            getMessage: async (key) => {
                const jid = jidNormalizedUser(key.remoteJid);
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
        });

        StanyTZ.store = store;

        const originalSendPresenceUpdate = StanyTZ.sendPresenceUpdate;
        const originalReadMessages = StanyTZ.readMessages;
        const originalSendReceipt = StanyTZ.sendReceipt;

        StanyTZ.sendPresenceUpdate = async function (...args) {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (ghostMode && ghostMode.enabled) {
                printLog('info', '👻 Blocked presence update (stealth mode)');
                return;
            }
            return originalSendPresenceUpdate.apply(this, args);
        };

        StanyTZ.readMessages = async function (...args) {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (ghostMode && ghostMode.enabled) return;
            return originalReadMessages.apply(this, args);
        };

        if (originalSendReceipt) {
            StanyTZ.sendReceipt = async function (...args) {
                const ghostMode = await store.getSetting('global', 'stealthMode');
                if (ghostMode && ghostMode.enabled) return;
                return originalSendReceipt.apply(this, args);
            };
        }

        const originalQuery = StanyTZ.query;
        StanyTZ.query = async function (node, ...args) {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            if (ghostMode && ghostMode.enabled) {
                if (node && node.tag === 'receipt') return;
                if (node && node.attrs && (node.attrs.type === 'read' || node.attrs.type === 'read-self')) return;
            }
            return originalQuery.apply(this, [node, ...args]);
        };

        StanyTZ.isGhostMode = async () => {
            const ghostMode = await store.getSetting('global', 'stealthMode');
            return ghostMode && ghostMode.enabled;
        };

        StanyTZ.ev.on('creds.update', _saveCreds);
        store.bind(StanyTZ.ev);

        StanyTZ.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage')
                    ? mek.message.ephemeralMessage.message
                    : mek.message;

                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    await handleStatus(StanyTZ, chatUpdate);
                    return;
                }

                if (!StanyTZ.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us');
                    if (!isGroup) return;
                }

                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
                if (StanyTZ?.msgRetryCounterCache) {
                    StanyTZ.msgRetryCounterCache.clear();
                }

                try {
                    await handleMessages(StanyTZ, chatUpdate);
                } catch (err) {
                    printLog('error', `Error in handleMessages: ${err.message}`);
                    if (mek.key && mek.key.remoteJid) {
                        await StanyTZ.sendMessage(mek.key.remoteJid, {
                            text: '❌ An error occurred while processing your message.',
                            contextInfo: {
                                forwardingScore: 1,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: '120363404317544295@newsletter',
                                    newsletterName: 'ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ',
                                    serverMessageId: -1
                                }
                            }
                        }).catch(console.error);
                    }
                }
            } catch (err) {
                printLog('error', `Error in messages.upsert: ${err.message}`);
            }
        });

        StanyTZ.decodeJid = (jid) => {
            if (!jid) return jid;
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {};
                return decode.user && decode.server && `${decode.user}@${decode.server}` || jid;
            } else return jid;
        };

        StanyTZ.ev.on('contacts.update', (update) => {
            for (const contact of update) {
                const id = StanyTZ.decodeJid(contact.id);
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
            }
        });

        StanyTZ.getName = (jid, withoutContact = false) => {
            const id = StanyTZ.decodeJid(jid);
            withoutContact = StanyTZ.withoutContact || withoutContact;
            let v;
            if (id.endsWith("@g.us"))
                return new Promise(async (resolve) => {
                    v = store.contacts[id] || {};
                    if (!(v.name || v.subject)) v = StanyTZ.groupMetadata(id) || {};
                    resolve(v.name || v.subject || PhoneNumber(`+${id.replace('@s.whatsapp.net', '')}`).number?.international);
                });
            else
                v = id === '0@s.whatsapp.net' ? {
                    id,
                    name: 'WhatsApp'
                } : id === StanyTZ.decodeJid(StanyTZ.user.id) ?
                    StanyTZ.user :
                    (store.contacts[id] || {});
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber(`+${jid.replace('@s.whatsapp.net', '')}`).number?.international;
        };

        StanyTZ.public = true;
        StanyTZ.serializeM = (m) => smsg(StanyTZ, m, store);

        const isRegistered = state.creds?.registered === true;

        if (pairingCode && !isRegistered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api');
            let phoneNumberInput;
            if (config.pairingNumber) {
                phoneNumberInput = config.pairingNumber;
            } else if (process.env.PAIRING_NUMBER) {
                phoneNumberInput = process.env.PAIRING_NUMBER;
            } else if (rl && !rlClosed) {
                phoneNumberInput = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFormat: 255618558502 (without + or spaces) : `)));
            } else {
                phoneNumberInput = phoneNumber;
                printLog('info', `Using default phone number: ${phoneNumberInput}`);
            }
            phoneNumberInput = phoneNumberInput.replace(/[^0-9]/g, '');
            const pn = PhoneNumber(`+${phoneNumberInput}`);
            if (!pn.valid) {
                printLog('error', 'Invalid phone number format');
                if (rl && !rlClosed) rl.close();
                process.exit(1);
            }
            const doPairing = async (num, attempt = 1) => {
                try {
                    let code = await StanyTZ.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)));
                    printLog('success', `Pairing code generated: ${code}`);
                    if (rl && !rlClosed) {
                        rl.close();
                        rl = null;
                    }
                } catch (error) {
                    if (attempt < 3) {
                        try {
                            rmSync('./session', { recursive: true, force: true });
                        } catch (_e) { /* ignore */ }
                        await delay(3000);
                        startStanyTZ();
                    } else {
                        printLog('error', 'All 3 pairing attempts failed. Please restart manually.');
                    }
                }
            };
            setTimeout(() => doPairing(phoneNumberInput), 3000);
        } else if (isRegistered) {
            if (rl && !rlClosed) {
                rl.close();
                rl = null;
            }
        } else {
            printLog('warning', 'Waiting for connection to establish...');
            if (rl && !rlClosed) {
                rl.close();
                rl = null;
            }
        }

        StanyTZ.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s;
            if (qr) {
                if (!pairingCode) {
                    try {
                        console.log(await QRCode.toString(qr, { type: 'terminal', small: true }));
                    } catch (_e) {
                        console.log('QR:', qr);
                    }
                }
            }
            if (connection === "open") {
                printLog('success', 'Bot connected successfully!');
                try {
                    const setbioModule = await import('./plugins/setbio.js');
                    const startAutoBio = setbioModule.startAutoBio || setbioModule.default?.startAutoBio;
                    if (typeof startAutoBio === 'function') startAutoBio(StanyTZ);
                } catch (e) {
                    printLog('error', `Failed to start auto bio: ${e.message}`);
                }

                const ghostMode = await store.getSetting('global', 'stealthMode');
                if (ghostMode && ghostMode.enabled) {
                    printLog('info', '👻 STEALTH MODE ACTIVE');
                }

                printLog('success', `Connected to => ${JSON.stringify(StanyTZ.user, null, 2)}`);

                try {
                    const botNumber = `${StanyTZ.user.id.split(':')[0]}@s.whatsapp.net`;
                    const ghostStatus = (ghostMode && ghostMode.enabled) ? '\n👻 Stealth Mode: ACTIVE' : '';
                    await StanyTZ.sendMessage(botNumber, {
                        text: `🤖 Bot Connected Successfully!\n\n⏰ Time: ${new Date().toLocaleString()}\n✅ Status: Online and Ready!${ghostStatus}\n\n✅Make sure to join below channel`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363404317544295@newsletter',
                                newsletterName: 'ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ',
                                serverMessageId: -1
                            }
                        }
                    });
                } catch (error) {
                    printLog('error', `Failed to send connection message: ${error.message}`);
                }

                await delay(1999);
                try {
                    owner = JSON.parse(fs.readFileSync('./data/owner.json', 'utf-8'));
                } catch (_e) { }

                printLog('info', `[ ${config.botName || 'ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ'} ]`);
                printLog('info', `WA NUMBER  : ${owner[0] || config.ownerNumber || ''}`);
                printLog('success', `Bot Connected Successfully!`);
                printLog('info', `Plugins   : ${commandHandler.commands.size}`);
                printLog('info', `Prefixes   : ${config.prefixes.join(', ')}`);
                printLog('store', `Backend    : ${store.getStats().backend}`);
                console.log();
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        rmSync('./session', { recursive: true, force: true });
                    } catch (_e) { /* ignore */ }
                    await delay(3000);
                    startStanyTZ();
                    return;
                }
                if (shouldReconnect) {
                    printLog('connection', 'Reconnecting in 5 seconds...');
                    await delay(5000);
                    startStanyTZ();
                }
            }
        });

        StanyTZ.ev.on('call', async (calls) => {
            await handleCall(StanyTZ, calls);
        });

        StanyTZ.ev.on('group-participants.update', async (update) => {
            await handleGroupParticipantUpdate(StanyTZ, update);
        });

        StanyTZ.ev.on('status.update', async (status) => {
            await handleStatus(StanyTZ, status);
        });

        StanyTZ.ev.on('messages.reaction', async (reaction) => {
            await handleStatus(StanyTZ, reaction);
        });

        return StanyTZ;
    } catch (error) {
        printLog('error', `Error in startStanyTZ: ${error.message}`);
        if (rl && !rlClosed) {
            rl.close();
            rl = null;
        }
        await delay(5000);
        startStanyTZ();
    }
}

async function main() {
    await compileAll();
    await commandHandler.loadCommands();
    printLog('info', 'Starting ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ BOT...');
    await initializeSession();
    await delay(3000);
    startStanyTZ().catch((error) => {
        printLog('error', `Fatal error: ${error.message}`);
        if (rl && !rlClosed) rl.close();
        process.exit(1);
    });
}

main();

// Session cleanup interval
const sessionDir = path.join(process.cwd(), 'session');
setInterval(() => {
    if (!fs.existsSync(sessionDir)) return;
    fs.readdir(sessionDir, (err, files) => {
        if (err) return;
        for (const file of files) {
            if (file === 'creds.json') continue;
            if (file.startsWith('app-state-sync-key-')) continue;
            fs.unlink(path.join(sessionDir, file), () => {});
        }
    });
}, 3 * 60 * 1000);

// Temp folder setup
const customTemp = path.join(process.cwd(), 'temp');
if (!fs.existsSync(customTemp)) fs.mkdirSync(customTemp, { recursive: true });
process.env.TMPDIR = customTemp;
process.env.TEMP = customTemp;
process.env.TMP = customTemp;

// Temp folder cleanup
setInterval(() => {
    fs.readdir(customTemp, (err, files) => {
        if (err) return;
        for (const file of files) {
            const filePath = path.join(customTemp, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && Date.now() - stats.mtimeMs > 3 * 60 * 60 * 1000) {
                    fs.unlink(filePath, () => {});
                }
            });
        }
    });
}, 1 * 60 * 60 * 1000);

// Syntax check dist files
const folders = [
    path.join(__dirname, './lib'),
    path.join(__dirname, './plugins')
];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) return;
    fs.readdirSync(folder)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
            const filePath = path.join(folder, file);
            try {
                const code = fs.readFileSync(filePath, 'utf-8');
                const err = syntaxerror(code, file, {
                    sourceType: 'module',
                    allowAwaitOutsideFunction: true
                });
                if (err) {
                    console.error(chalk.red(`❌ Syntax error in ${filePath}:\n${err}`));
                }
            } catch (e) {
                console.error(chalk.yellow(`⚠️ Cannot read file ${filePath}:\n${e}`));
            }
        });
});

// Error handlers
process.on('uncaughtException', (err) => {
    printLog('error', `Uncaught Exception: ${err.message}`);
    console.error(err.stack);
    writeErrorLog({
        type: 'uncaughtException',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
});

process.on('unhandledRejection', (err) => {
    printLog('error', `Unhandled Rejection: ${err.message}`);
    console.error(err.stack);
    writeErrorLog({
        type: 'unhandledRejection',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        printLog('error', `Address localhost:${PORT} in use`);
        writeErrorLog({
            type: 'serverError',
            error: `Address localhost:${PORT} in use`,
            timestamp: new Date().toISOString()
        });
        server.close();
    } else {
        printLog('error', `Server error: ${error.message}`);
        writeErrorLog({
            type: 'serverError',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
});