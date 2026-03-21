import axios from 'axios';

export default {
    command: 'shorten',
    aliases: ['short'],
    category: 'utility',
    description: 'Shorten a URL using tinyurl',
    usage: '.shorten <url>',
    groupOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const url = args[0];
        if (!url) return sock.sendMessage(chatId, { text: '❌ Provide URL.', ...channelInfo }, { quoted: message });
        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
            await sock.sendMessage(chatId, { text: `🔗 Shortened URL: ${res.data}`, ...channelInfo }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(chatId, { text: '❌ Failed to shorten.', ...channelInfo }, { quoted: message });
        }
    }
};