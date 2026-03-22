import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import fs from 'fs';
import axios from 'axios';

/**
 * Extract paste ID from a custom session string.
 * Expected: Stanytz378/iamlegendv2_<pasteId>
 * The paste ID is everything after the last underscore.
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
        console.log(`[SESSION] Trying Pastebin: ${url}`);
        const response = await axios.get(url, { timeout: 15000 });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const trimmed = content.trim();
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            console.log(`[SESSION] Pastebin success, content length: ${content.length}`);
            return content;
        }
        console.warn(`[SESSION] Pastebin returned non‑JSON (probably error page)`);
        return null;
    } catch (error) {
        console.warn(`[SESSION] Pastebin fetch failed: ${error.message}`);
        return null;
    }
}

/**
 * Try to fetch from paste.rs.
 */
async function fetchFromPasteRs(pasteId) {
    try {
        // paste.rs raw URL is exactly the paste ID URL (no /raw/ prefix)
        const url = `https://paste.rs/${pasteId}`;
        console.log(`[SESSION] Trying paste.rs: ${url}`);
        const response = await axios.get(url, { timeout: 15000 });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const trimmed = content.trim();
        // paste.rs may return a plain text page if ID is wrong, so we must check JSON
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            console.log(`[SESSION] paste.rs success, content length: ${content.length}`);
            return content;
        }
        console.warn(`[SESSION] paste.rs returned non‑JSON content`);
        return null;
    } catch (error) {
        console.warn(`[SESSION] paste.rs fetch failed: ${error.message}`);
        return null;
    }
}

/**
 * Try to fetch from a custom raw URL (if the pasteId itself is a URL).
 * This handles cases where the session ID might have been saved as a full URL.
 */
async function fetchFromDirectUrl(pasteId) {
    if (!pasteId.startsWith('http')) return null;
    try {
        console.log(`[SESSION] Trying direct URL: ${pasteId}`);
        const response = await axios.get(pasteId, { timeout: 15000 });
        const content = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        const trimmed = content.trim();
        if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
            console.log(`[SESSION] Direct URL success, content length: ${content.length}`);
            return content;
        }
        return null;
    } catch (error) {
        console.warn(`[SESSION] Direct URL fetch failed: ${error.message}`);
        return null;
    }
}

/**
 * Downloads credentials from Pastebin/paste.rs and saves them to session/creds.json.
 * @param {string} txt - Session identifier (e.g., "Stanytz378/iamlegendv2_abc123")
 */
async function SaveCreds(txt) {
    let pasteId = extractPasteId(txt);
    if (!pasteId) {
        throw new Error('Invalid session ID format. Expected: Stanytz378/iamlegendv2_<pasteId>');
    }

    console.log(`📥 Downloading session (paste ID: ${pasteId})`);

    // Try different sources in order
    let data = await fetchFromPastebin(pasteId);
    if (!data) data = await fetchFromPasteRs(pasteId);
    if (!data) data = await fetchFromDirectUrl(pasteId);

    if (!data) {
        throw new Error(
            'Failed to download credentials from all sources.\n' +
            'Check that your session ID is correct and that the paste still exists.\n' +
            `Paste ID: ${pasteId}`
        );
    }

    // Validate JSON
    try {
        JSON.parse(data);
    } catch (e) {
        throw new Error(`Downloaded session data is not valid JSON: ${data.substring(0, 100)}...`);
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