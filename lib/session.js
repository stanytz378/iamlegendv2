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
 *    Description: Download session credentials from Pastebin or paste.rs   *
 *                 using custom session ID and save to session/ folder.     *
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
 * @param {string} txt - Full session identifier
 * @returns {string} The paste ID
 */
function extractPasteId(txt) {
    const parts = txt.split('_');
    // The paste ID is the last part after the last underscore
    return parts[parts.length - 1];
}

/**
 * Attempts to fetch raw content from Pastebin.
 * @param {string} pasteId 
 * @returns {Promise<string|null>}
 */
async function fetchFromPastebin(pasteId) {
    try {
        const url = `https://pastebin.com/raw/${pasteId}`;
        console.log(`📥 [SESSION] Trying Pastebin: ${url}`);
        const response = await axios.get(url, { timeout: 15000 });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        // Check if it looks like valid JSON
        const trimmed = content.trim();
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            console.log(`✅ [SESSION] Pastebin success (${content.length} bytes)`);
            return content;
        }
        console.warn(`⚠️ [SESSION] Pastebin returned non-JSON (probably error page)`);
        return null;
    } catch (error) {
        console.warn(`❌ [SESSION] Pastebin fetch failed: ${error.message}`);
        return null;
    }
}

/**
 * Attempts to fetch raw content from paste.rs.
 * @param {string} pasteId 
 * @returns {Promise<string|null>}
 */
async function fetchFromPasteRs(pasteId) {
    try {
        const url = `https://paste.rs/${pasteId}`;
        console.log(`📥 [SESSION] Trying paste.rs: ${url}`);
        const response = await axios.get(url, { timeout: 15000 });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const trimmed = content.trim();
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            console.log(`✅ [SESSION] paste.rs success (${content.length} bytes)`);
            return content;
        }
        console.warn(`⚠️ [SESSION] paste.rs returned non-JSON`);
        return null;
    } catch (error) {
        console.warn(`❌ [SESSION] paste.rs fetch failed: ${error.message}`);
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

    console.log(`🔍 [SESSION] Processing session ID: ${txt}`);
    console.log(`📦 [SESSION] Paste ID: ${pasteId}`);

    // Try Pastebin first, then fallback to paste.rs
    let data = await fetchFromPastebin(pasteId);
    if (!data) {
        data = await fetchFromPasteRs(pasteId);
    }

    if (!data) {
        throw new Error(
            '❌ [SESSION] Failed to download credentials from both Pastebin and paste.rs.\n' +
            '   The paste may have expired or the session ID is invalid.\n' +
            '   Please generate a new session ID at https://sessionspair.onrender.com'
        );
    }

    // Validate that the content is valid JSON
    try {
        JSON.parse(data);
    } catch (e) {
        throw new Error(`❌ [SESSION] Downloaded data is not valid JSON: ${data.substring(0, 100)}...`);
    }

    // Ensure session directory exists
    const sessionDir = path.join(process.cwd(), 'session');
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`📁 [SESSION] Created session directory: ${sessionDir}`);
    }

    const credsPath = path.join(sessionDir, 'creds.json');
    fs.writeFileSync(credsPath, data);
    console.log(`💾 [SESSION] Credentials saved to ${credsPath}`);
    console.log(`✅ [SESSION] Session ready!`);
}

export default SaveCreds;