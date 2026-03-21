export default {
    command: 'tagadmins',
    aliases: ['admins'],
    category: 'admin',
    description: 'Mention all admins',
    usage: '.tagadmins',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const meta = await sock.groupMetadata(chatId);
        const admins = meta.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
        const text = args.length ? args.join(' ') : 'Attention admins!';
        await sock.sendMessage(chatId, { text, mentions: admins, ...channelInfo }, { quoted: message });
    }
};