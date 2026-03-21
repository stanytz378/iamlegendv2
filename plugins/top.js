export default {
    command: 'top',
    aliases: ['leaderboard'],
    category: 'group',
    description: 'Show top message senders in the group',
    usage: '.top',
    groupOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const store = await import('../lib/lightweight_store.js');
        const counts = await store.default.getAllMessageCounts();
        const groupCounts = counts.messageCount[chatId] || {};
        const sorted = Object.entries(groupCounts).sort((a,b) => b[1] - a[1]).slice(0, 10);
        let text = `🏆 *Top Senders* 🏆\n\n`;
        sorted.forEach(([jid, count], i) => {
            text += `${i+1}. @${jid.split('@')[0]} - ${count} msgs\n`;
        });
        await sock.sendMessage(chatId, { text, mentions: sorted.map(s => s[0]), ...channelInfo }, { quoted: message });
    }
};