import axios from 'axios';

export default {
    command: 'crypto',
    aliases: ['price'],
    category: 'utility',
    description: 'Get cryptocurrency price (BTC, ETH)',
    usage: '.crypto <symbol>',
    groupOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const symbol = (args[0] || 'bitcoin').toLowerCase();
        try {
            const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=usd`);
            const price = res.data[symbol]?.usd;
            if (!price) throw new Error();
            await sock.sendMessage(chatId, { text: `💰 1 ${symbol.toUpperCase()} = $${price} USD`, ...channelInfo }, { quoted: message });
        } catch (e) {
            await sock.sendMessage(chatId, { text: '❌ Invalid symbol or API error.', ...channelInfo }, { quoted: message });
        }
    }
};