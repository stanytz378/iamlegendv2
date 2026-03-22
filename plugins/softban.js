// plugins/softban.js
export default {
    command: 'softban',
    aliases: ['kickban'],
    category: 'admin',
    description: 'Kick a user and delete their last 50 messages',
    usage: '.softban @user',
    groupOnly: true,
    adminOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        const target = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!target) {
            return sock.sendMessage(chatId, { text: '❌ Mention the user to softban.', ...channelInfo }, { quoted: message });
        }

        // 1. Delete last 50 messages from the target
        try {
            // Retrieve recent messages from the store (Baileys keeps them)
            const messages = sock.store.messages[chatId] || [];
            // Filter messages sent by the target (in reverse order to get latest)
            const userMessages = messages.filter(msg => msg.key.participant === target || msg.key.remoteJid === target).slice(-50);
            if (userMessages.length > 0) {
                let deletedCount = 0;
                for (const msg of userMessages) {
                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: msg.key.id,
                                participant: msg.key.participant || target
                            }
                        });
                        deletedCount++;
                        // Small delay to avoid hitting rate limits
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (err) {
                        console.error(`Failed to delete message ${msg.key.id}:`, err.message);
                    }
                }
                await sock.sendMessage(chatId, {
                    text: `🗑️ Deleted ${deletedCount} messages from @${target.split('@')[0]}.`,
                    mentions: [target],
                    ...channelInfo
                }, { quoted: message });
            } else {
                await sock.sendMessage(chatId, {
                    text: `ℹ️ No recent messages found for @${target.split('@')[0]}.`,
                    mentions: [target],
                    ...channelInfo
                }, { quoted: message });
            }
        } catch (err) {
            console.error('Error deleting messages:', err);
            await sock.sendMessage(chatId, {
                text: `⚠️ Could not delete messages: ${err.message}`,
                ...channelInfo
            }, { quoted: message });
        }

        // 2. Kick the user
        try {
            await sock.groupParticipantsUpdate(chatId, [target], 'remove');
            await sock.sendMessage(chatId, {
                text: `🚫 @${target.split('@')[0]} has been removed from the group.`,
                mentions: [target],
                ...channelInfo
            }, { quoted: message });
        } catch (err) {
            await sock.sendMessage(chatId, {
                text: `❌ Failed to remove user: ${err.message}`,
                ...channelInfo
            }, { quoted: message });
        }
    }
};