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
 *    Description: Block users who mention a group in their WhatsApp status *
 *                 Actions: warn (DM), block (block user), kick (remove from *
 *                 the mentioned group, if bot is admin)                    *
 *                                                                           *
 ***************************************************************************/

import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import isAdmin from '../lib/isAdmin.js';

const SETTING_KEY = 'antistatusgroup';

async function getConfig() {
    const config = await store.getSetting('global', SETTING_KEY);
    return config || { enabled: false, action: 'warn' };
}

async function saveConfig(config) {
    await store.saveSetting('global', SETTING_KEY, config);
}

/**
 * Check if a status message mentions any group (@g.us).
 * Returns the first mentioned group JID, or null.
 * @param {object} msg - The status message object
 * @returns {string|null}
 */
function getMentionedGroup(msg) {
    const mentionedJid = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    return mentionedJid.find(jid => jid.endsWith('@g.us')) || null;
}

/**
 * Handler to be called inside the status update event.
 * @param {object} sock - Baileys socket
 * @param {object} status - The status event object
 * @returns {boolean} - true if action was taken
 */
export async function handleStatusGroupMention(sock, status) {
    const config = await getConfig();
    if (!config.enabled) return false;

    // Extract the message object from the status event
    let msg = null;
    if (status.messages && status.messages.length) {
        msg = status.messages[0];
    } else if (status.key && status.key.remoteJid === 'status@broadcast') {
        return false; // no message content to inspect
    }
    if (!msg || !msg.message) return false;

    const senderJid = msg.key.participant || msg.key.remoteJid;
    // Skip if sender is owner or sudo
    const isOwnerSudo = await isOwnerOrSudo(senderJid, sock);
    if (isOwnerSudo) return false;

    const groupJid = getMentionedGroup(msg);
    if (!groupJid) return false;

    const action = config.action;
    console.log(`[ANTISTATUSGROUP] User ${senderJid} mentioned group ${groupJid} in status. Action: ${action}`);

    if (action === 'warn') {
        await sock.sendMessage(senderJid, {
            text: `⚠️ *Warning*\n\nYou mentioned a group in your WhatsApp status. This is not allowed.\n\nIf you continue, you may be blocked or removed from the group.`
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
    } else if (action === 'kick') {
        // Check if bot is admin in the mentioned group
        try {
            const { isBotAdmin } = await isAdmin(sock, groupJid, sock.user.id);
            if (!isBotAdmin) {
                console.warn(`[ANTISTATUSGROUP] Bot is not admin in ${groupJid}, cannot kick ${senderJid}`);
                await sock.sendMessage(senderJid, {
                    text: `⚠️ *Warning*\n\nYou mentioned a group in your WhatsApp status. This is not allowed.\n\n(The bot is not admin in that group, so no action was taken.)`
                }).catch(() => {});
                return true;
            }
            // Remove user from the group
            await sock.groupParticipantsUpdate(groupJid, [senderJid], 'remove');
            await sock.sendMessage(senderJid, {
                text: `🚫 *You have been removed from ${groupJid.split('@')[0]}*\n\nReason: Mentioning a group in your status is prohibited.`
            }).catch(() => {});
        } catch (err) {
            console.error('Failed to kick user:', err.message);
        }
    }

    return true;
}

export default {
    command: 'antistatusgroup',
    aliases: ['asg', 'blockstatusgroup'],
    category: 'owner',
    description: 'Block/warn/kick users who mention a group in their WhatsApp status',
    usage: '.antistatusgroup <on|off|set warn|block|kick|status>',
    ownerOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const config = await getConfig();
        const action = args[0]?.toLowerCase();

        if (!action || action === 'status') {
            const statusText = config.enabled ? '✅ Enabled' : '❌ Disabled';
            const actionText = config.action === 'warn' ? 'Warn' : (config.action === 'block' ? 'Block' : 'Kick');
            return await sock.sendMessage(chatId, {
                text: `🔇 *Anti‑Status‑Group*\n\nCurrent: ${statusText}\nAction: ${actionText}\n\nCommands:\n.antistatusgroup on — enable\n.antistatusgroup off — disable\n.antistatusgroup set warn — only warn\n.antistatusgroup set block — block users\n.antistatusgroup set kick — remove from mentioned group\n.antistatusgroup status — show current`,
                ...channelInfo
            }, { quoted: message });
        }

        if (action === 'on') {
            if (config.enabled) {
                return await sock.sendMessage(chatId, {
                    text: '⚠️ Anti‑status‑group is already enabled.',
                    ...channelInfo
                }, { quoted: message });
            }
            config.enabled = true;
            await saveConfig(config);
            return await sock.sendMessage(chatId, {
                text: '✅ Anti‑status‑group enabled. Users who mention a group in their status will be warned/blocked/kicked depending on action.',
                ...channelInfo
            }, { quoted: message });
        }

        if (action === 'off') {
            if (!config.enabled) {
                return await sock.sendMessage(chatId, {
                    text: '⚠️ Anti‑status‑group is already disabled.',
                    ...channelInfo
                }, { quoted: message });
            }
            config.enabled = false;
            await saveConfig(config);
            return await sock.sendMessage(chatId, {
                text: '❌ Anti‑status‑group disabled. Users may now mention groups in statuses.',
                ...channelInfo
            }, { quoted: message });
        }

        if (action === 'set') {
            const sub = args[1]?.toLowerCase();
            if (!sub || !['warn', 'block', 'kick'].includes(sub)) {
                return await sock.sendMessage(chatId, {
                    text: '❌ Please specify action: `warn`, `block`, or `kick`\n\nExample: `.antistatusgroup set kick`',
                    ...channelInfo
                }, { quoted: message });
            }
            config.action = sub;
            await saveConfig(config);
            return await sock.sendMessage(chatId, {
                text: `✅ Action set to *${sub.toUpperCase()}*. Users who mention a group in status will now be ${sub === 'warn' ? 'warned' : sub === 'block' ? 'blocked' : 'kicked from the group'}.`,
                ...channelInfo
            }, { quoted: message });
        }

        return await sock.sendMessage(chatId, {
            text: '❌ Invalid command. Use `.antistatusgroup` to see options.',
            ...channelInfo
        }, { quoted: message });
    }
};