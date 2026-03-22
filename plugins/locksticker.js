import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import isAdmin from '../lib/isAdmin.js';

async function setAntiSticker(chatId, enabled, action = 'delete') {
    await store.saveSetting(chatId, 'antisticker', { enabled, action });
}

async function getAntiSticker(chatId) {
    return await store.getSetting(chatId, 'antisticker') || { enabled: false, action: 'delete' };
}

async function removeAntiSticker(chatId) {
    await store.saveSetting(chatId, 'antisticker', { enabled: false, action: null });
}

export async function handleAntiSticker(sock, chatId, message, senderId) {
    const config = await getAntiSticker(chatId);
    if (!config.enabled) return;

    const isOwnerSudo = await isOwnerOrSudo(senderId, sock, chatId);
    if (isOwnerSudo) return;
    try {
        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        if (isSenderAdmin) return;
    } catch (e) {}

    if (!message.message?.stickerMessage) return;

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
            text: `⚠️ *Anti-Sticker Warning*\n\n@${senderId.split('@')[0]}, stickers are not allowed!`,
            mentions: [senderId]
        });
    }

    if (action === 'kick') {
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `🚫 @${senderId.split('@')[0]} removed for sending sticker.`,
                mentions: [senderId]
            });
        } catch (e) {}
    }
}

export default {
    command: 'antisticker',
    aliases: ['blocksticker'],
    category: 'admin',
    description: 'Block sticker messages',
    usage: '.antisticker <on|off|set delete|warn|kick>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();

        if (!action) {
            const config = await getAntiSticker(chatId);
            return sock.sendMessage(chatId, {
                text: `*🎭 ANTI-STICKER SETUP*\n\n` +
                    `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `*Action:* ${config.action || 'Not set'}\n\n` +
                    `*Commands:*\n` +
                    `• \`.antisticker on\` - Enable\n` +
                    `• \`.antisticker off\` - Disable\n` +
                    `• \`.antisticker set delete|warn|kick\``
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                if ((await getAntiSticker(chatId)).enabled) return sock.sendMessage(chatId, { text: '⚠️ Already enabled.' });
                await setAntiSticker(chatId, true, 'delete');
                return sock.sendMessage(chatId, { text: '✅ Anti‑sticker enabled.' });
            case 'off':
                await removeAntiSticker(chatId);
                return sock.sendMessage(chatId, { text: '❌ Anti‑sticker disabled.' });
            case 'set':
                const sub = args[1]?.toLowerCase();
                if (!['delete', 'warn', 'kick'].includes(sub)) return sock.sendMessage(chatId, { text: '❌ Use delete, warn, or kick.' });
                await setAntiSticker(chatId, true, sub);
                return sock.sendMessage(chatId, { text: `✅ Action set to ${sub}.` });
            default:
                return sock.sendMessage(chatId, { text: '❌ Invalid command.' });
        }
    },
    handleAntiSticker,
    setAntiSticker,
    getAntiSticker,
    removeAntiSticker
};