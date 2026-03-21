export default {
    command: 'lockstickers',
    aliases: ['blocksticker'],
    category: 'admin',
    description: 'Block stickers in the group',
    usage: '.lockstickers <on/off>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const store = await import('../lib/lightweight_store.js');
        const mode = args[0]?.toLowerCase();
        if (mode === 'on') {
            await store.default.saveSetting(chatId, 'lockstickers', true);
            await sock.sendMessage(chatId, { text: '🎭 Stickers are now blocked.', ...channelInfo }, { quoted: message });
        } else if (mode === 'off') {
            await store.default.saveSetting(chatId, 'lockstickers', false);
            await sock.sendMessage(chatId, { text: '🎭 Stickers are now allowed.', ...channelInfo }, { quoted: message });
        } else {
            const locked = await store.default.getSetting(chatId, 'lockstickers');
            await sock.sendMessage(chatId, { text: `Stickers locked: ${locked ? 'ON' : 'OFF'}`, ...channelInfo }, { quoted: message });
        }
    }
};