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
 *    Description: Block or warn users who mention a group in status        *
 *                 – works like antilink but for status mentions.           *
 *                                                                           *
 ***************************************************************************/

import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';

const SETTING_KEY = 'antistatusmention';
let listenerAttached = false;

async function getConfig() {
    const config = await store.getSetting('global', SETTING_KEY);
    return config || { enabled: false, action: 'warn' };
}

async function saveConfig(config) {
    await store.saveSetting('global', SETTING_KEY, config);
}

/**
 * Check if a status message mentions any group.
 * @param {object} msg - The status message object
 * @returns {boolean}
 */
function mentionsGroup(msg) {
    const mentionedJid = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    return mentionedJid.some(jid => jid.endsWith('@g.us'));
}

/**
 * The actual status event handler.
 * @param {object} sock - The socket instance
 * @param {object} update - The status update event
 */
async function statusListener(sock, update) {
    const config = await getConfig();
    if (!config.enabled) return;

    // Extract the message object
    let msg = null;
    if (update.messages && update.messages.length) {
        msg = update.messages[0];
    } else if (update.key && update.key.remoteJid === 'status@broadcast') {
        return; // no message content to inspect
    }
    if (!msg || !msg.message) return;

    const senderJid = msg.key.participant || msg.key.remoteJid;
    // Skip if sender is owner or sudo
    const isOwnerSudo = await isOwnerOrSudo(senderJid, sock);
    if (isOwnerSudo) return;

    // Check for group mention
    if (!mentionsGroup(msg)) return;

    const action = config.action;
    console.log(`[ANTISTATUSMENTION] User ${senderJid} mentioned a group in status. Action: ${action}`);

    // Send a warning message (either as a reply to the status? but we can't reply to status, so we send private message)
    if (action === 'warn') {
        await sock.sendMessage(senderJid, {
            text: `⚠️ *Warning*\n\nYou mentioned a group in your WhatsApp status. This is not allowed.\n\nIf you continue, you may be blocked.`
        }).catch(() => {});
    } else if (action === 'block') {
        try {
            await sock.updateBlockStatus(senderJid, 'block');
            // Try to send a final message (may not be delivered)
            await sock.sendMessage(senderJid, {
                text: `🔒 *You have been blocked*\n\nReason: Mentioning a group in status is prohibited.`
            }).catch(() => {});
        } catch (err) {
            console.error('Failed to block user:', err.message);
        }
    }
}

/**
 * Attach the status listener to the socket if not already attached.
 * @param {object} sock
 */
function attachListener(sock) {
    if (listenerAttached) return;
    sock.ev.on('status.update', async (update) => {
        await statusListener(sock, update);
    });
    listenerAttached = true;
    console.log('[ANTISTATUSMENTION] Listener attached.');
}

export default {
    command: 'antistatusmention',
    aliases: ['asm', 'antistatusgroup'],
    category: 'owner',
    description: 'Block or warn users who mention a group in their WhatsApp status',
    usage: '.antistatusmention <on|off|set warn|block|status>',
    ownerOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const config = await getConfig();
        const action = args[0]?.toLowerCase();

        // Show status if no arguments or 'status'
        if (!action || action === 'status') {
            const statusText = config.enabled ? '✅ Enabled' : '❌ Disabled';
            const actionText = config.action === 'warn' ? 'Warn' : 'Block';
            return await sock.sendMessage(chatId, {
                text: `🔇 *Anti‑Status‑Mention*\n\nCurrent: ${statusText}\nAction: ${actionText}\n\nCommands:\n.antistatusmention on — enable\n.antistatusmention off — disable\n.antistatusmention set warn — only warn\n.antistatusmention set block — block users\n.antistatusmention status — show current`,
                ...channelInfo
            }, { quoted: message });
        }

        if (action === 'on') {
            if (config.enabled) {
                return await sock.sendMessage(chatId, {
                    text: '⚠️ Anti‑status‑mention is already enabled.',
                    ...channelInfo
                }, { quoted: message });
            }
            config.enabled = true;
            await saveConfig(config);
            // Attach the listener (only once)
            attachListener(sock);
            return await sock.sendMessage(chatId, {
                text: '✅ Anti‑status‑mention enabled. Users who mention a group in their status will be warned/blocked.',
                ...channelInfo
            }, { quoted: message });
        }

        if (action === 'off') {
            if (!config.enabled) {
                return await sock.sendMessage(chatId, {
                    text: '⚠️ Anti‑status‑mention is already disabled.',
                    ...channelInfo
                }, { quoted: message });
            }
            config.enabled = false;
            await saveConfig(config);
            // The listener remains, but its config is disabled, so it won't act.
            return await sock.sendMessage(chatId, {
                text: '❌ Anti‑status‑mention disabled. Users may now mention groups in statuses.',
                ...channelInfo
            }, { quoted: message });
        }

        if (action === 'set') {
            const sub = args[1]?.toLowerCase();
            if (!sub || !['warn', 'block'].includes(sub)) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Please specify action: `warn` or `block`\n\nExample: `.antistatusmention set warn`',
                    ...channelInfo
                }, { quoted: message });
            }
            config.action = sub;
            await saveConfig(config);
            // If the feature is already enabled, ensure the listener is attached
            if (config.enabled) attachListener(sock);
            return await sock.sendMessage(chatId, {
                text: `✅ Action set to *${sub.toUpperCase()}*. Users who mention a group in status will now be ${sub === 'warn' ? 'warned' : 'blocked'}.`,
                ...channelInfo
            }, { quoted: message });
        }

        return await sock.sendMessage(chatId, {
            text: '❌ Invalid command. Use `.antistatusmention` to see options.',
            ...channelInfo
        }, { quoted: message });
    }
};