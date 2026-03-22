import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import isAdmin from '../lib/isAdmin.js';

async function setAntiCaps(chatId, enabled, action = 'delete') {
    await store.saveSetting(chatId, 'anticaps', { enabled, action });
}

async function getAntiCaps(chatId) {
    return await store.getSetting(chatId, 'anticaps') || { enabled: false, action: 'delete' };
}

async function removeAntiCaps(chatId) {
    await store.saveSetting(chatId, 'anticaps', { enabled: false, action: null });
}

export async function handleAntiCaps(sock, chatId, message, userMessage, senderId) {
    const config = await getAntiCaps(chatId);
    if (!config.enabled) return;

    // Exempt owner/sudo/admins
    const isOwnerSudo = await isOwnerOrSudo(senderId, sock, chatId);
    if (isOwnerSudo) return;
    try {
        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        if (isSenderAdmin) return;
    } catch (e) {}

    // Count uppercase letters (only letters, ignore numbers/punctuation)
    const letters = userMessage.replace(/[^a-zA-Z]/g, '');
    const caps = letters.replace(/[^A-Z]/g, '');
    const capsRatio = letters.length ? caps.length / letters.length : 0;
    if (capsRatio < 0.7) return;

    const action = config.action || 'delete';
    const messageId = message.key.id;
    const participant = message.key.participant || senderId;

    if (action === 'delete' || action === 'kick') {
        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: messageId, participant }
            });
        } catch (e) {}
    }

    if (action === 'warn' || action === 'delete') {
        await sock.sendMessage(chatId, {
            text: `⚠️ *Anti‑Caps Warning*\n\n@${senderId.split('@')[0]}, please don't type in all caps!`,
            mentions: [senderId]
        });
    }

    if (action === 'kick') {
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `🚫 @${senderId.split('@')[0]} removed for excessive caps.`,
                mentions: [senderId]
            });
        } catch (e) {}
    }
}

export default {
    command: 'anticaps',
    aliases: ['capslock'],
    category: 'admin',
    description: 'Block messages with excessive caps (>70% uppercase)',
    usage: '.anticaps <on|off|set delete|warn|kick>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();

        if (!action) {
            const config = await getAntiCaps(chatId);
            return sock.sendMessage(chatId, {
                text: `*🔤 ANTI-CAPS SETUP*\n\n` +
                    `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `*Action:* ${config.action || 'Not set'}\n\n` +
                    `*Commands:*\n` +
                    `• \`.anticaps on\` - Enable\n` +
                    `• \`.anticaps off\` - Disable\n` +
                    `• \`.anticaps set delete\` - Delete only\n` +
                    `• \`.anticaps set warn\` - Warn only\n` +
                    `• \`.anticaps set kick\` - Kick user\n\n` +
                    `*Note:* Admins, Owner, Sudo exempt.`
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                if ((await getAntiCaps(chatId)).enabled) {
                    return sock.sendMessage(chatId, { text: '⚠️ Already enabled.' }, { quoted: message });
                }
                await setAntiCaps(chatId, true, 'delete');
                return sock.sendMessage(chatId, { text: '✅ Anti‑caps enabled.' }, { quoted: message });
            case 'off':
                await removeAntiCaps(chatId);
                return sock.sendMessage(chatId, { text: '❌ Anti‑caps disabled.' }, { quoted: message });
            case 'set':
                const sub = args[1]?.toLowerCase();
                if (!['delete', 'warn', 'kick'].includes(sub)) {
                    return sock.sendMessage(chatId, { text: '❌ Use delete, warn, or kick.' }, { quoted: message });
                }
                await setAntiCaps(chatId, true, sub);
                return sock.sendMessage(chatId, { text: `✅ Action set to ${sub}.` }, { quoted: message });
            default:
                return sock.sendMessage(chatId, { text: '❌ Invalid command.' }, { quoted: message });
        }
    },
    handleAntiCaps,
    setAntiCaps,
    getAntiCaps,
    removeAntiCaps
};