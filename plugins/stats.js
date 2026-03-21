/*****************************************************************************
 *                                                                           *
 *                     Developed By STANY TZ                                 *
 *                                                                           *
 *  🌐  GitHub   : https://github.com/Stanytz378/iamlegendv2                 *
 *  ▶️  YouTube  : https://youtube.com/@STANYTZ                              *
 *  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     *
 *                                                                           *
 *    © 2026 STANY TZ. All rights reserved.                                 *
 *                                                                           *
 *    Description: Show performance metrics for all commands                *
 *                                                                           *
 ***************************************************************************/

import commandHandler from '../lib/commandHandler.js';
import config from '../config.js';

export default {
    command: 'perf',
    aliases: ['metrics', 'diagnostics'],
    category: 'general',
    description: 'View command performance and error metrics',
    usage: '.perf',
    ownerOnly: true,
    async handler(sock, message, args, context) {
        const { chatId, channelInfo } = context;
        try {
            const report = commandHandler.getDiagnostics?.() || [];
            if (!report || report.length === 0) {
                return await sock.sendMessage(chatId, {
                    text: '_No performance data collected yet._',
                    ...channelInfo
                }, { quoted: message });
            }

            let text = `📊 *PLUGINS PERFORMANCE*\n\n`;
            report.forEach((cmd, index) => {
                const errorText = cmd.errors > 0 ? `❗ Errors: ${cmd.errors}` : `✅ Smooth`;
                text += `${index + 1}. *${cmd.command.toUpperCase()}*\n`;
                text += `   ↳ Calls: ${cmd.usage}\n`;
                text += `   ↳ Latency: ${cmd.average_speed}\n`;
                text += `   ↳ Status: ${errorText}\n\n`;
            });

            await sock.sendMessage(chatId, {
                text: text.trim(),
                ...channelInfo
            }, { quoted: message });
        } catch (error) {
            console.error('Error in perf command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to fetch performance metrics.',
                ...channelInfo
            }, { quoted: message });
        }
    }
};