import store from '../lib/lightweight_store.js';

export default {
    command: 'rules',
    aliases: ['setrules'],
    category: 'admin',
    description: 'Set or view group rules',
    usage: '.rules [text]',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        let rules = await store.getSetting(chatId, 'rules');
        if (!args.length) {
            const text = rules ? `📜 *Group Rules*\n\n${rules}` : 'No rules set. Use `.rules <text>` to set.';
            return sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
        const newRules = args.join(' ');
        await store.saveSetting(chatId, 'rules', newRules);
        await sock.sendMessage(chatId, { text: `✅ Rules updated.\n\n${newRules}`, ...channelInfo }, { quoted: message });
    }
};