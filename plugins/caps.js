import store from '../lib/lightweight_store.js';

export default {
    command: 'caps',
    aliases: ['capsonly'],
    category: 'admin',
    description: 'Block messages with too many capital letters',
    usage: '.caps <on/off>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const mode = args[0]?.toLowerCase();
        if (mode === 'on') {
            await store.saveSetting(chatId, 'capsblock', true);
            await sock.sendMessage(chatId, { text: '🔠 Messages with >70% caps will be blocked.', ...channelInfo });
        } else if (mode === 'off') {
            await store.saveSetting(chatId, 'capsblock', false);
            await sock.sendMessage(chatId, { text: '🔠 Caps block disabled.', ...channelInfo });
        } else {
            const status = await store.getSetting(chatId, 'capsblock');
            await sock.sendMessage(chatId, { text: `Caps block: ${status ? 'ON' : 'OFF'}`, ...channelInfo });
        }
    }
};