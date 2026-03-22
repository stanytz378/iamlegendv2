import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import isAdmin from '../lib/isAdmin.js';

async function setAntiGif(chatId, enabled, action = 'delete') {
    await store.saveSetting(chatId, 'antigif', { enabled, action });
}

async function getAntiGif(chatId) {
    return await store.getSetting(chatId, 'antigif') || { enabled: false, action: 'delete' };
}

async function removeAntiGif(chatId) {
    await store.saveSetting(chatId, 'antigif', { enabled: false, action: null });
}

export async function handleAntiGif(sock, chatId, message, senderId) {
    const config = await getAntiGif(chatId);
    if (!config.enabled) return;

    const isOwnerSudo = await isOwnerOrSudo(senderId, sock, chatId);
    if (isOwnerSudo) return;
    try {
        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        if (isSenderAdmin) return;
    } catch (e) {}

    // Detect GIF: videoMessage with gifPlayback flag
    const isGif = message.message?.videoMessage?.gifPlayback === true;
    if (!isGif) return;

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
            text: `⚠️ *Anti‑GIF Warning*\n\n@${senderId.split('@')[0]}, GIFs are not allowed!`,
            mentions: [senderId]
        });
    }

    if (action === 'kick') {
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `🚫 @${senderId.split('@')[0]} removed for sending a GIF.`,
                mentions: [senderId]
            });
        } catch (e) {}
    }
}

export default {
    command: 'antigif',
    aliases: ['blockgif'],
    category: 'admin',
    description: 'Block animated GIFs',
    usage: '.antigif <on|off|set delete|warn|kick>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();

        if (!action) {
            const config = await getAntiGif(chatId);
            return sock.sendMessage(chatId, {
                text: `*🎞️ ANTI‑GIF SETUP*\n\n` +
                    `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `*Action:* ${config.action || 'Not set'}\n\n` +
                    `*Commands:*\n` +
                    `• \`.antigif on\` - Enable\n` +
                    `• \`.antigif off\` - Disable\n` +
                    `• \`.antigif set delete|warn|kick\``
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                if ((await getAntiGif(chatId)).enabled) return sock.sendMessage(chatId, { text: '⚠️ Already enabled.' });
                await setAntiGif(chatId, true, 'delete');
                return sock.sendMessage(chatId, { text: '✅ Anti‑GIF enabled.' });
            case 'off':
                await removeAntiGif(chatId);
                return sock.sendMessage(chatId, { text: '❌ Anti‑GIF disabled.' });
            case 'set':
                const sub = args[1]?.toLowerCase();
                if (!['delete', 'warn', 'kick'].includes(sub)) return sock.sendMessage(chatId, { text: '❌ Use delete, warn, or kick.' });
                await setAntiGif(chatId, true, sub);
                return sock.sendMessage(chatId, { text: `✅ Action set to ${sub}.` });
            default:
                return sock.sendMessage(chatId, { text: '❌ Invalid command.' });
        }
    },
    handleAntiGif,
    setAntiGif,
    getAntiGif,
    removeAntiGif
};