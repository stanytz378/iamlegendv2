// lib/session.js
import fs from 'fs';
import path from 'path';

/**
 * Download session files from remote service (Pastebin or paste.rs) using session ID.
 * Session ID format: "Stanytz378/iamlegendv2_<pasteId>"
 * @param {string} sessionId - The full custom ID
 * @returns {Promise<boolean>} - True if session restored
 */
export default async function SaveCreds(sessionId) {
    if (!sessionId) {
        console.log('[Session] No sessionId provided');
        return false;
    }

    // Extract the actual paste ID from the custom ID
    const match = sessionId.match(/_([^_]+)$/);
    if (!match) {
        console.log('[Session] Invalid session ID format. Expected: Stanytz378/iamlegendv2_<pasteId>');
        return false;
    }
    const pasteId = match[1];
    if (!pasteId) {
        console.log('[Session] Could not extract paste ID');
        return false;
    }

    // Try both possible services: Pastebin first, then paste.rs
    const pastebinUrl = `https://pastebin.com/raw/${pasteId}`;
    const pasteRsUrl = `https://paste.rs/${pasteId}`;

    let response;
    let urlUsed = '';

    // Attempt Pastebin
    try {
        response = await fetch(pastebinUrl);
        if (response.ok) {
            urlUsed = pastebinUrl;
        } else {
            // Fallback to paste.rs
            response = await fetch(pasteRsUrl);
            if (response.ok) {
                urlUsed = pasteRsUrl;
            } else {
                throw new Error(`Both URLs failed (${response.status})`);
            }
        }
    } catch (err) {
        console.log(`[Session] Error fetching session: ${err.message}`);
        return false;
    }

    if (!response.ok) {
        console.log(`[Session] Failed to fetch session: ${response.status}`);
        return false;
    }

    let data;
    try {
        const text = await response.text();
        data = JSON.parse(text);
    } catch (err) {
        console.log(`[Session] Failed to parse session data: ${err.message}`);
        return false;
    }

    // Ensure session directory exists
    const sessionDir = path.join(process.cwd(), 'session');
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    let filesWritten = 0;
    for (const [filename, content] of Object.entries(data)) {
        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            console.warn(`[Session] Skipping invalid filename: ${filename}`);
            continue;
        }
        const filePath = path.join(sessionDir, filename);
        // Ensure content is string; if it's already string, write directly
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        fs.writeFileSync(filePath, contentStr, 'utf-8');
        filesWritten++;
    }

    if (filesWritten > 0) {
        console.log(`[Session] Restored ${filesWritten} session file(s) for ID: ${sessionId}`);
        return true;
    } else {
        console.log('[Session] No files found in the session data');
        return false;
    }
}