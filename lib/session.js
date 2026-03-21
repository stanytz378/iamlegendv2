/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *    Description: Download session credentials from Pastebin/paste.rs      *
 *                 with intelligent fallback and JSON validation.           *
 *                                                                           *
 ***************************************************************************/

import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import axios from 'axios';

/**
 * Extracts the paste ID from a custom session string.
 * Expected format: Stanytz378/iamlegendv2_<pasteId>
 */
function extractPasteId(txt) {
    const parts = txt.split('_');
    return parts[parts.length - 1];
}

/**
 * Try to fetch from Pastebin.
 * Returns the raw content only if it looks like valid JSON (starts with { or [).
 */
async function fetchFromPastebin(pasteId) {
    try {
        const url = `https://pastebin.com/raw/${pasteId}`;
        const response = await axios.get(url, { timeout: 15000 });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        // Check if content is probably valid JSON (starts with { or [)
        const trimmed = content.trim();
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            return content;
        }
        console.warn(`Pastebin returned non‑JSON content (probably an error page).`);
        return null;
    } catch (error) {
        console.warn(`Pastebin fetch failed: ${error.message}`);
        return null;
    }
}

/**
 * Try to fetch from paste.rs.
 */
async function fetchFromPasteRs(pasteId) {
    try {
        const url = `https://paste.rs/${pasteId}`;
        const response = await axios.get(url, { timeout: 15000 });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        // paste.rs may return a simple text page, but we expect JSON.
        const trimmed = content.trim();
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            return content;
        }
        console.warn(`paste.rs returned non‑JSON content.`);
        return null;
    } catch (error) {
        console.warn(`paste.rs fetch failed: ${error.message}`);
        return null;
    }
}

/**
 * Downloads credentials from Pastebin/paste.rs and saves them to session/creds.json.
 * @param {string} txt - Session identifier (e.g., "Stanytz378/iamlegendv2_abc123")
 */
async function SaveCreds(txt) {
    const pasteId = extractPasteId(txt);
    if (!pasteId) {
        throw new Error('Invalid session ID format. Expected: Stanytz378/iamlegendv2_<pasteId>');
    }

    console.log(`📥 Downloading session (paste ID: ${pasteId})`);

    // Try Pastebin first
    let data = await fetchFromPastebin(pasteId);
    if (!data) {
        // Fallback to paste.rs
        console.log('Pastebin failed, trying paste.rs...');
        data = await fetchFromPasteRs(pasteId);
    }

    if (!data) {
        throw new Error(
            'Failed to download credentials from both Pastebin and paste.rs.\n' +
            'The paste may have expired or the ID is incorrect.\n' +
            'Please generate a new session ID at https://sessionspair.onrender.com'
        );
    }

    // Validate that it's valid JSON
    try {
        JSON.parse(data);
    } catch (e) {
        throw new Error('Downloaded session data is not valid JSON. The paste may be corrupted.');
    }

    // Ensure session directory exists
    const sessionDir = path.join(process.cwd(), 'session');
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const credsPath = path.join(sessionDir, 'creds.json');
    fs.writeFileSync(credsPath, data);
    console.log('✅ Credentials saved to session/creds.json');
}

export default SaveCreds;