export default {
    command: 'setgroupdesc',
    aliases: ['gdesc'],
    category: 'admin',
    description: 'Change group description',
    usage: '.setgroupdesc <new description>',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const desc = args.join(' ');
        if (!desc) return sock.sendMessage(chatId, { text: '❌ Provide a new description.', ...channelInfo }, { quoted: message });
        await sock.groupUpdateDescription(chatId, desc);
        await sock.sendMessage(chatId, { text: `✅ Group description updated.`, ...channelInfo }, { quoted: message });
    }
};