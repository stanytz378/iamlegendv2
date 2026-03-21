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
 *    Description: Load & activate session credentials from GitHub Gist     *
 *                 Format: stanytz378/iamlegendv2_<32-char-gist-id>         *
 *                                                                           *
 ***************************************************************************/

import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse custom session ID and extract components
 * Supports: 
 *   • stanytz378/iamlegendv2_abc123... (full format)
 *   • iamlegendv2_abc123... (prefix + gistId)
 *   • abc123... (raw gistId only - 32+ hex chars)
 * 
 * @param {string} sessionId - Custom session ID
 * @returns {Object} - { username, gistId }
 */
function parseSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('❌ Session ID must be a non-empty string');
    }

    const input = sessionId.trim();
    
    // Format: username/prefix_gistId
    const fullMatch = input.match(/^([^/]+)\/([^_]+)_([a-f0-9]{32,})$/i);
    if (fullMatch) {
        return { username: fullMatch[1].toLowerCase(), gistId: fullMatch[3].toLowerCase() };
    }
    
    // Format: prefix_gistId
    const prefixMatch = input.match(/^([^_]+)_([a-f0-9]{32,})$/i);
    if (prefixMatch) {
        return { username: 'stanytz378', gistId: prefixMatch[2].toLowerCase() };
    }
    
    // Format: raw gistId only
    if (/^[a-f0-9]{32,}$/i.test(input)) {
        return { username: 'stanytz378', gistId: input.toLowerCase() };
    }
    
    throw new Error(`❌ Invalid session ID format: "${input}"\nExpected: stanytz378/iamlegendv2_<32-char-hex-id>`);
}

/**
 * Download credentials from GitHub Gist and save to session folder
 * @param {string} sessionId - Custom session ID (e.g., stanytz378/iamlegendv2_abc123...)
 * @param {string} sessionPath - Optional: path to save creds.json (default: './session')
 * @returns {Promise<Object>} - Result object with status and details
 */
async function loadSession(sessionId, sessionPath = './session') {
    try {
        // Parse session ID
        const { username, gistId } = parseSessionId(sessionId);
        
        // Build raw content URL
        const rawUrl = `https://gist.githubusercontent.com/${username}/${gistId}/raw/creds.json`;
        
        console.log(`📥 Loading session: ${sessionId}`);
        console.log(`🔗 Fetching from: ${rawUrl}`);
        
        // Fetch creds.json from Gist
        const response = await axios.get(rawUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'iamlegendv2-session-loader/1.0'
            },
            timeout: 20000 // 20 seconds
        });
        
        // Handle response (string or object)
        const credsContent = typeof response.data === 'string' 
            ? response.data 
            : JSON.stringify(response.data, null, 2);
        
        // Validate JSON
        try {
            JSON.parse(credsContent);
        } catch (e) {
            throw new Error('❌ Invalid JSON in creds.json');
        }
        
        // Prepare session directory
        const targetDir = path.resolve(process.cwd(), sessionPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`📁 Created: ${targetDir}`);
        }
        
        // Save creds.json
        const credsFile = path.join(targetDir, 'creds.json');
        fs.writeFileSync(credsFile, credsContent, 'utf8');
        
        console.log('✅ Session loaded successfully!');
        console.log(`📄 Saved to: ${credsFile}`);
        
        return {
            success: true,
            sessionId,
            gistId,
            username,
            filePath: credsFile,
            message: 'Session credentials activated'
        };
        
    } catch (error) {
        console.error('❌ Failed to load session:', error.message);
        
        // Detailed error handling
        if (error.response) {
            const status = error.response.status;
            console.error(`❌ HTTP ${status}: ${error.response.statusText}`);
            
            if (status === 404) {
                console.error('💡 Tips:');
                console.error('   • Check session ID is correct');
                console.error('   • Verify Gist exists and is PUBLIC');
                console.error('   • Ensure file inside Gist is named: creds.json');
            } else if (status === 403) {
                console.error('💡 Gist may be PRIVATE - raw URLs work for public gists only');
            }
        } else if (error.code === 'ECONNABORTED') {
            console.error('💡 Request timeout - check internet connection');
        } else if (error.code === 'ENOTFOUND') {
            console.error('💡 DNS error - check network settings');
        }
        
        throw error;
    }
}

/**
 * Quick check: Is session ID format valid? (no network call)
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean}
 */
function isValidSessionId(sessionId) {
    try {
        parseSessionId(sessionId);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if session is already active (creds.json exists and is valid)
 * @param {string} sessionPath - Path to session folder (default: './session')
 * @returns {boolean}
 */
function isSessionActive(sessionPath = './session') {
    try {
        const credsFile = path.resolve(process.cwd(), sessionPath, 'creds.json');
        if (!fs.existsSync(credsFile)) return false;
        
        const content = fs.readFileSync(credsFile, 'utf8');
        const creds = JSON.parse(content);
        
        // Basic validation: check for required Baileys fields
        return !!(creds.me?.id || creds.registrationId || creds.noiseKey);
    } catch {
        return false;
    }
}

/**
 * Clear/Deactivate current session (delete creds.json)
 * @param {string} sessionPath - Path to session folder
 * @returns {boolean} - True if deleted
 */
function clearSession(sessionPath = './session') {
    try {
        const credsFile = path.resolve(process.cwd(), sessionPath, 'creds.json');
        if (fs.existsSync(credsFile)) {
            fs.unlinkSync(credsFile);
            console.log('🗑️ Session cleared');
            return true;
        }
        return false;
    } catch (e) {
        console.error('❌ Error clearing session:', e.message);
        return false;
    }
}

/**
 * Get direct raw URL for a session ID (for manual download/debugging)
 * @param {string} sessionId - Custom session ID
 * @returns {string} - Raw GitHub Gist URL
 */
function getRawUrl(sessionId) {
    const { username, gistId } = parseSessionId(sessionId);
    return `https://gist.githubusercontent.com/${username}/${gistId}/raw/creds.json`;
}

// Export main function + utilities
export default loadSession;
export { parseSessionId, isValidSessionId, isSessionActive, clearSession, getRawUrl };

