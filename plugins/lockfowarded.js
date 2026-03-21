export default {
    command: 'lockforward',
    aliases: ['blockforward'],
    category: 'admin',
    description: 'Block forwarded messages in the group',
    usage: '.lockforward <on/off>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const store = await import('../lib/lightweight_store.js');
        const mode = args[0]?.toLowerCase();
        if (mode === 'on') {
            await store.default.saveSetting(chatId, 'lockforward', true);
            await sock.sendMessage(chatId, { text: '🔄 Forwarded messages are blocked.', ...channelInfo }, { quoted: message });
        } else if (mode === 'off') {
            await store.default.saveSetting(chatId, 'lockforward', false);
            await sock.sendMessage(chatId, { text: '🔄 Forwarded messages are allowed.', ...channelInfo }, { quoted: message });
        } else {
            const locked = await store.default.getSetting(chatId, 'lockforward');
            await sock.sendMessage(chatId, { text: `Forwarded locked: ${locked ? 'ON' : 'OFF'}`, ...channelInfo }, { quoted: message });
        }
    }
};