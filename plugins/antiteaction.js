import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import isAdmin from '../lib/isAdmin.js';

async function setAntiReaction(chatId, enabled, action = 'warn') {
    await store.saveSetting(chatId, 'antireaction', { enabled, action });
}

async function getAntiReaction(chatId) {
    return await store.getSetting(chatId, 'antireaction') || { enabled: false, action: 'warn' };
}

async function removeAntiReaction(chatId) {
    await store.saveSetting(chatId, 'antireaction', { enabled: false, action: null });
}

export async function handleAntiReaction(sock, reaction) {
    // reaction object: { key, text, messageTimestamp, ... }
    const chatId = reaction.key?.remoteJid;
    if (!chatId || !chatId.endsWith('@g.us')) return;
    const config = await getAntiReaction(chatId);
    if (!config.enabled) return;

    const senderId = reaction.key.participant || reaction.key.remoteJid;
    const isOwnerSudo = await isOwnerOrSudo(senderId, sock, chatId);
    if (isOwnerSudo) return;
    try {
        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        if (isSenderAdmin) return;
    } catch (e) {}

    const action = config.action || 'warn';
    // Reactions can't be deleted, only warn or kick.
    if (action === 'warn') {
        await sock.sendMessage(chatId, {
            text: `⚠️ *Anti-Reaction Warning*\n\n@${senderId.split('@')[0]}, reacting to messages is not allowed!`,
            mentions: [senderId]
        });
    } else if (action === 'kick') {
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `🚫 @${senderId.split('@')[0]} removed for reacting.`,
                mentions: [senderId]
            });
        } catch (e) {}
    }
    // Note: We cannot remove the reaction itself via API.
}

export default {
    command: 'antireaction',
    aliases: ['blockreaction'],
    category: 'admin',
    description: 'Block reactions on messages',
    usage: '.antireaction <on|off|set warn|kick>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();

        if (!action) {
            const config = await getAntiReaction(chatId);
            return sock.sendMessage(chatId, {
                text: `*😀 ANTI-REACTION SETUP*\n\n` +
                    `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `*Action:* ${config.action || 'Not set'}\n\n` +
                    `*Commands:*\n` +
                    `• \`.antireaction on\` - Enable\n` +
                    `• \`.antireaction off\` - Disable\n` +
                    `• \`.antireaction set warn|kick\``
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                if ((await getAntiReaction(chatId)).enabled) return sock.sendMessage(chatId, { text: '⚠️ Already enabled.' });
                await setAntiReaction(chatId, true, 'warn');
                return sock.sendMessage(chatId, { text: '✅ Anti‑reaction enabled (warn).' });
            case 'off':
                await removeAntiReaction(chatId);
                return sock.sendMessage(chatId, { text: '❌ Anti‑reaction disabled.' });
            case 'set':
                const sub = args[1]?.toLowerCase();
                if (!['warn', 'kick'].includes(sub)) return sock.sendMessage(chatId, { text: '❌ Use warn or kick.' });
                await setAntiReaction(chatId, true, sub);
                return sock.sendMessage(chatId, { text: `✅ Action set to ${sub}.` });
            default:
                return sock.sendMessage(chatId, { text: '❌ Invalid command.' });
        }
    },
    handleAntiReaction,
    setAntiReaction,
    getAntiReaction,
    removeAntiReaction
};