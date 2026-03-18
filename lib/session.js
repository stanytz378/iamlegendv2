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
 *    Description: Download session credentials from Pastebin / paste.rs    *
 *                 and save to session/creds.json.                          *
 *                                                                           *
 ***************************************************************************/

import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import axios from 'axios';

/**
 * Extract paste ID from custom session string like "Stanytz378/IAMLEGEND_abc123"
 * @param {string} txt - Full session identifier
 * @returns {string} Paste ID
 */
function extractPasteId(txt) {
    const parts = txt.split('_');
    return parts[parts.length - 1];
}

/**
 * Try to fetch raw content from Pastebin
 * @param {string} pasteId 
 * @returns {Promise<string|null>}
 */
async function fetchFromPastebin(pasteId) {
    try {
        const url = `https://pastebin.com/raw/${pasteId}`;
        const response = await axios.get(url, { timeout: 10000 });
        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (err) {
        console.warn(`Pastebin fetch failed: ${err.message}`);
        return null;
    }
}

/**
 * Try to fetch raw content from paste.rs
 * @param {string} pasteId 
 * @returns {Promise<string|null>}
 */
async function fetchFromPasteRs(pasteId) {
    try {
        const url = `https://paste.rs/${pasteId}`;
        const response = await axios.get(url, { timeout: 10000 });
        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (err) {
        console.warn(`paste.rs fetch failed: ${err.message}`);
        return null;
    }
}

/**
 * Save credentials from Pastebin/paste.rs to session/creds.json
 * @param {string} txt - Session identifier (Stanytz378/IAMLEGEND_<pasteId>)
 */
async function SaveCreds(txt) {
    const pasteId = extractPasteId(txt);
    if (!pasteId) {
        throw new Error('Invalid session ID format. Expected: Stanytz378/IAMLEGEND_<pasteId>');
    }

    let data = await fetchFromPastebin(pasteId);
    if (!data) {
        data = await fetchFromPasteRs(pasteId);
    }
    if (!data) {
        throw new Error('Failed to download credentials from both Pastebin and paste.rs');
    }

    const sessionDir = path.join(process.cwd(), 'session');
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const credsPath = path.join(sessionDir, 'creds.json');
    fs.writeFileSync(credsPath, data);
    console.log('✅ Credentials saved to session/creds.json');
}

export default SaveCreds;