import store from '../lib/lightweight_store.js';
import isOwnerOrSudo from '../lib/isOwner.js';
import isAdmin from '../lib/isAdmin.js';

async function setAntiMedia(chatId, enabled, action = 'delete', blockedTypes = ['image', 'video', 'audio', 'document']) {
    await store.saveSetting(chatId, 'antimedia', { enabled, action, blockedTypes });
}

async function getAntiMedia(chatId) {
    return await store.getSetting(chatId, 'antimedia') || { enabled: false, action: 'delete', blockedTypes: [] };
}

async function removeAntiMedia(chatId) {
    await store.saveSetting(chatId, 'antimedia', { enabled: false, action: null, blockedTypes: [] });
}

export async function handleAntiMedia(sock, chatId, message, senderId) {
    const config = await getAntiMedia(chatId);
    if (!config.enabled) return;

    const isOwnerSudo = await isOwnerOrSudo(senderId, sock, chatId);
    if (isOwnerSudo) return;
    try {
        const { isSenderAdmin } = await isAdmin(sock, chatId, senderId);
        if (isSenderAdmin) return;
    } catch (e) {}

    // Determine message type
    const msg = message.message;
    let type = null;
    if (msg.imageMessage) type = 'image';
    else if (msg.videoMessage) type = 'video';
    else if (msg.audioMessage) type = 'audio';
    else if (msg.documentMessage) type = 'document';
    else if (msg.stickerMessage) type = 'sticker';
    else if (msg.contactMessage) type = 'contact';
    else if (msg.locationMessage) type = 'location';
    else if (msg.pollCreationMessage) type = 'poll';
    else return;

    if (!config.blockedTypes.includes(type)) return;

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
            text: `⚠️ *Anti‑Media Warning*\n\n@${senderId.split('@')[0]}, ${type} messages are not allowed!`,
            mentions: [senderId]
        });
    }

    if (action === 'kick') {
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `🚫 @${senderId.split('@')[0]} removed for sending ${type}.`,
                mentions: [senderId]
            });
        } catch (e) {}
    }
}

export default {
    command: 'antimedia',
    aliases: ['blockmedia'],
    category: 'admin',
    description: 'Block media messages (image, video, audio, document)',
    usage: '.antimedia <on|off|set delete|warn|kick> [types]',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const chatId = context.chatId || message.key.remoteJid;
        const action = args[0]?.toLowerCase();

        if (!action) {
            const config = await getAntiMedia(chatId);
            return sock.sendMessage(chatId, {
                text: `*🖼️ ANTI-MEDIA SETUP*\n\n` +
                    `*Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `*Action:* ${config.action || 'Not set'}\n` +
                    `*Blocked Types:* ${config.blockedTypes.length ? config.blockedTypes.join(', ') : 'None'}\n\n` +
                    `*Commands:*\n` +
                    `• \`.antimedia on\` - Enable (blocks images, videos, audio, documents)\n` +
                    `• \`.antimedia off\` - Disable\n` +
                    `• \`.antimedia set delete|warn|kick [types]\` - Set action and optionally specify types (image,video,audio,document,sticker,contact,location,poll)\n\n` +
                    `*Example:* \`.antimedia set delete image,video\``
            }, { quoted: message });
        }

        switch (action) {
            case 'on':
                if ((await getAntiMedia(chatId)).enabled) return sock.sendMessage(chatId, { text: '⚠️ Already enabled.' });
                await setAntiMedia(chatId, true, 'delete', ['image', 'video', 'audio', 'document']);
                return sock.sendMessage(chatId, { text: '✅ Anti‑media enabled (blocks images, videos, audio, documents).' });
            case 'off':
                await removeAntiMedia(chatId);
                return sock.sendMessage(chatId, { text: '❌ Anti‑media disabled.' });
            case 'set':
                const sub = args[1]?.toLowerCase();
                if (!['delete', 'warn', 'kick'].includes(sub)) return sock.sendMessage(chatId, { text: '❌ Use delete, warn, or kick.' });
                let types = [];
                if (args[2]) {
                    types = args[2].split(',').map(t => t.trim().toLowerCase());
                    const valid = ['image', 'video', 'audio', 'document', 'sticker', 'contact', 'location', 'poll'];
                    types = types.filter(t => valid.includes(t));
                    if (types.length === 0) return sock.sendMessage(chatId, { text: '❌ No valid types. Valid: image,video,audio,document,sticker,contact,location,poll' });
                } else {
                    types = ['image', 'video', 'audio', 'document'];
                }
                await setAntiMedia(chatId, true, sub, types);
                return sock.sendMessage(chatId, { text: `✅ Anti‑media set to ${sub} for types: ${types.join(', ')}` });
            default:
                return sock.sendMessage(chatId, { text: '❌ Invalid command.' });
        }
    },
    handleAntiMedia,
    setAntiMedia,
    getAntiMedia,
    removeAntiMedia
};