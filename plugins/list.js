import config from '../config.js';
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
 *****************************************************************************/
import commandHandler from '../lib/commandHandler.js';
import path from 'path';
import fs from 'fs';

// ═══════════════════════════════════════════════════════════
// 🕐 TIME & GREETING (ENGLISH ONLY)
// ═══════════════════════════════════════════════════════════

function getTimePeriod() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { period: 'morning', sign: '☀' };
    if (hour >= 12 && hour < 18) return { period: 'afternoon', sign: '☁' };
    if (hour >= 18 && hour < 21) return { period: 'evening', sign: '☾' };
    return { period: 'night', sign: '✦' };
}

function getGreeting(period, name) {
    const greetings = {
        morning: [`Good morning, ${name}`, `Rise and shine, ${name}`, `Morning vibes, ${name}`],
        afternoon: [`Good afternoon, ${name}`, `Afternoon energy, ${name}`, `Keep going, ${name}`],
        evening: [`Good evening, ${name}`, `Evening calm, ${name}`, `Unwind time, ${name}`],
        night: [`Good night, ${name}`, `Late night mode, ${name}`, `Rest well, ${name}`]
    };
    const list = greetings[period] || greetings.evening;
    return list[Math.floor(Math.random() * list.length)];
}

async function fetchRandomQuote() {
    const APIs = [
        `https://shizoapi.onrender.com/api/texts/quotes?apikey=shizo`,
        `https://discardapi.dpdns.org/api/quotes/random?apikey=guru`
    ];
    for (const url of APIs) {
        try {
            const res = await fetch(url, { timeout: 5000 });
            if (!res.ok) continue;
            const data = await res.json();
            return data?.quote || data?.text || data?.message || data?.body || "Stay legendary";
        } catch (e) { continue; }
    }
    const fallbacks = [
        "Code with passion, deploy with pride.",
        "Every expert was once a beginner.",
        "Stay legendary, stay humble.",
        "Dream big, code bigger.",
        "Your potential is endless."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: config.timeZone || 'Africa/Nairobi'
    });
}

// ═══════════════════════════════════════════════════════════
// 📋 COMMAND FORMATTER (with count per category)
// ═══════════════════════════════════════════════════════════

function formatCommands(categories, prefix) {
    const result = [];
    for (const [cat, cmds] of categories) {
        const catData = { category: cat, count: cmds.length, commands: [] };
        const descGroups = new Map();
        
        for (const cmdName of cmds) {
            const cmd = commandHandler.commands.get(cmdName);
            if (!cmd) continue;
            const desc = cmd.description || cmd.usage || 'No description';
            const key = desc.toLowerCase().trim();
            
            if (descGroups.has(key)) {
                descGroups.get(key).push(cmdName);
            } else {
                descGroups.set(key, [cmdName]);
            }
        }
        
        for (const [desc, cmdNames] of descGroups) {
            catData.commands.push({ names: cmdNames, description: desc });
        }
        result.push(catData);
    }
    return result;
}

// ═══════════════════════════════════════════════════════════
// 🎨 20+ THIN & CLEAN STYLES (MODERATE SIGNS • COMMAND COUNT)
// ═══════════════════════════════════════════════════════════

const menuStyles = [
    // 1: Thin Line
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `┌────────────────────>>>\n`;
        t += `│ IAMLEGEND │\n`;
        t += `├────────────────────>>>\n`;
        t += `│ ${timeSign} ${greeting}\n`;
        t += `│ ⏱ ${info.time} • v${info.version}\n`;
        t += `│ ${quote}\n`;
        t += `├────────────────────>>>\n`;
        for (const cat of formattedCategories) {
            t += `│\n│ ─ ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `│   ${cmdList}\n`;
                t += `│   └> ${cmd.description}\n`;
            }
        }
        t += `│\n└────────────────────•`;
        return t;
    }},
    
    // 2: Soft Edge
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `╭────────────────────╮\n`;
        t += `│  IAMLEGEND  │\n`;
        t += `├────────────────────┤\n`;
        t += `│ ${timeSign} ${greeting}\n`;
        t += `│ ⏱ ${info.time} • v${info.version}\n`;
        t += `│ "${quote}"\n`;
        t += `├────────────────────┤\n`;
        for (const cat of formattedCategories) {
            t += `│\n│ • ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `│   ${prefix}${name}\n`;
                    t += `│   └> ${cmd.description}\n`;
                }
            }
        }
        t += `╰────────────────────╯`;
        return t;
    }},
    
    // 3: Minimal Dash
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `── IAMLEGEND ──\n\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version}\n`;
        t += `${quote}\n\n`;
        t += `── ${info.total} COMMANDS ──\n\n`;
        for (const cat of formattedCategories) {
            t += `${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `  ${cmdList}\n`;
                t += `  └> ${cmd.description}\n\n`;
            }
        }
        t += `── END ──`;
        return t;
    }},
    
    // 4: Light Frame
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n`;
        t += ` IAMLEGEND\n`;
        t += `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n`;
        t += ` ${timeSign} ${greeting}\n`;
        t += ` ⏱ ${info.time} • v${info.version}\n`;
        t += ` ${quote}\n`;
        t += `╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌\n`;
        for (const cat of formattedCategories) {
            t += `\n ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `   ${prefix}${name}\n`;
                    t += `   └> ${cmd.description}\n`;
                }
            }
        }
        t += `\n╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌`;
        return t;
    }},
    
    // 5: Clean Corner
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `┌──────────────────┐\n`;
        t += `│ IAMLEGEND │\n`;
        t += `└──────────────────┘\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version}\n`;
        t += `${quote}\n\n`;
        for (const cat of formattedCategories) {
            t += `• ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `  ${cmdList}\n`;
                t += `  └> ${cmd.description}\n\n`;
            }
        }
        return t;
    }},
    
    // 6: Simple Bar
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `│ IAMLEGEND │\n`;
        t += `─────────────────────\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version}\n`;
        t += `${quote}\n`;
        t += `─────────────────────\n\n`;
        for (const cat of formattedCategories) {
            t += `▸ ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        t += `─────────────────────`;
        return t;
    }},
    
    // 7: Elegant Thin
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `╭──────────────────╮\n`;
        t += `│ IAMLEGEND │\n`;
        t += `╰──────────────────╯\n\n`;
        t += `${timeSign} ${greeting} • ⏱ ${info.time}\n`;
        t += `${quote}\n\n`;
        t += `─────────────────────\n\n`;
        for (const cat of formattedCategories) {
            t += `┌ ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `│ ${cmdList}\n`;
                t += `└> ${cmd.description}\n\n`;
            }
        }
        t += `─────────────────────`;
        return t;
    }},
    
    // 8: Classic Minimal
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `═════════════════════\n`;
        t += `  IAMLEGEND\n`;
        t += `═════════════════════\n`;
        t += `  ${timeSign} ${greeting}\n`;
        t += `  ⏱ ${info.time} • v${info.version}\n`;
        t += `  ${quote}\n`;
        t += `═════════════════════\n\n`;
        for (const cat of formattedCategories) {
            t += `• ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        t += `═════════════════════`;
        return t;
    }},
    
    // 9: Fresh Line
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `IAMLEGEND\n`;
        t += `──────────────\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version}\n`;
        t += `${quote}\n`;
        t += `──────────────\n\n`;
        for (const cat of formattedCategories) {
            t += `▸ ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `  ${cmdList}\n`;
                t += `  └> ${cmd.description}\n\n`;
            }
        }
        return t;
    }},
    
    // 10: Smooth Edge
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `╌──────────────────╌\n`;
        t += `  IAMLEGEND\n`;
        t += `╌──────────────────╌\n`;
        t += `  ${timeSign} ${greeting}\n`;
        t += `  ⏱ ${info.time}\n`;
        t += `  ${quote}\n`;
        t += `╌──────────────────╌\n\n`;
        for (const cat of formattedCategories) {
            t += `  ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `    ${prefix}${name}\n`;
                    t += `    └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        t += `╌──────────────────╌`;
        return t;
    }},
    
    // 11: Pure Minimal
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `IAMLEGEND\n\n`;
        t += `${timeSign} ${greeting} • ⏱ ${info.time}\n`;
        t += `${quote}\n\n`;
        for (const cat of formattedCategories) {
            t += `${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `  ${cmdList}\n`;
                t += `  └> ${cmd.description}\n\n`;
            }
        }
        return t.trim();
    }},
    
    // 12: Clean Box
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `┌─────────────────>\n`;
        t += `│ IAMLEGEND │\n`;
        t += `├─────────────────>\n`;
        t += `│ ${timeSign} ${greeting}\n`;
        t += `│ ⏱ ${info.time} • v${info.version}\n`;
        t += `│ ${quote}\n`;
        t += `├─────────────────>\n`;
        t += `│ ${info.bot} • ${info.total}\n`;
        t += `└─────────────────>\n\n`;
        for (const cat of formattedCategories) {
            t += `${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        return t;
    }},
    
    // 13: Slim Frame
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `│──────────────────•\n`;
        t += `│  IAMLEGEND  │\n`;
        t += `│──────────────────•\n`;
        t += `│ ${timeSign} ${greeting}\n`;
        t += `│ ⏱ ${info.time}\n`;
        t += `│ ${quote}\n`;
        t += `│──────────────────•\n\n`;
        for (const cat of formattedCategories) {
            t += `│ ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `│  ${cmdList}\n`;
                t += `│  └> ${cmd.description}\n`;
            }
            t += `│\n`;
        }
        t += `│──────────────────•`;
        return t;
    }},
    
    // 14: Light Border
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `╭────────────────╮\n`;
        t += `│ IAMLEGEND │\n`;
        t += `╰────────────────╯\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version}\n`;
        t += `${quote}\n\n`;
        for (const cat of formattedCategories) {
            t += `• ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        return t;
    }},
    
    // 15: Ultimate Clean
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `IAMLEGEND\n`;
        t += `───────────────\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version} • ${info.total}\n`;
        t += `${quote}\n`;
        t += `───────────────\n\n`;
        for (const cat of formattedCategories) {
            t += `${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        t += `───────────────`;
        return t;
    }},
    
    // 16: Dot Border
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `••••••••••••••••••••\n`;
        t += `  IAMLEGEND\n`;
        t += `••••••••••••••••••••\n`;
        t += `  ${timeSign} ${greeting}\n`;
        t += `  ⏱ ${info.time} • v${info.version}\n`;
        t += `  ${quote}\n`;
        t += `••••••••••••••••••••\n\n`;
        for (const cat of formattedCategories) {
            t += `• ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        t += `••••••••••••••••••••`;
        return t;
    }},
    
    // 17: Angle Frame
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `╱──────────────────╲\n`;
        t += `│  IAMLEGEND  │\n`;
        t += `╲──────────────────╱\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version}\n`;
        t += `${quote}\n\n`;
        for (const cat of formattedCategories) {
            t += `▸ ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `  ${cmdList}\n`;
                t += `  └> ${cmd.description}\n\n`;
            }
        }
        return t;
    }},
    
    // 18: Double Line
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `═──────────────────═\n`;
        t += `  IAMLEGEND\n`;
        t += `═──────────────────═\n`;
        t += `  ${timeSign} ${greeting}\n`;
        t += `  ⏱ ${info.time}\n`;
        t += `  ${quote}\n`;
        t += `═──────────────────═\n\n`;
        for (const cat of formattedCategories) {
            t += `  ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `    ${prefix}${name}\n`;
                    t += `    └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        t += `═──────────────────═`;
        return t;
    }},
    
    // 19: Compact Box
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `┌─ IAMLEGEND\n`;
        t += `│\n`;
        t += `│ ${timeSign} ${greeting}\n`;
        t += `│ ⏱ ${info.time} • v${info.version}\n`;
        t += `│ ${quote}\n`;
        t += `│\n`;
        for (const cat of formattedCategories) {
            t += `│ ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `│  ${prefix}${name}\n`;
                    t += `│  └> ${cmd.description}\n`;
                }
            }
            t += `│\n`;
        }
        t += `└─`;
        return t;
    }},
    
    // 20: Minimal Edge
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `IAMLEGEND\n`;
        t += `─────────────────────\n`;
        t += `${timeSign} ${greeting} • ⏱ ${info.time}\n`;
        t += `v${info.version} • ${info.total} commands\n`;
        t += `${quote}\n`;
        t += `─────────────────────\n\n`;
        for (const cat of formattedCategories) {
            t += `${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        t += `─────────────────────`;
        return t;
    }},
    
    // 21: Simple Bracket
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `[ IAMLEGEND ]\n\n`;
        t += `${timeSign} ${greeting}\n`;
        t += `⏱ ${info.time} • v${info.version}\n`;
        t += `${quote}\n\n`;
        for (const cat of formattedCategories) {
            t += `[ ${cat.category} ] [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                for (const name of cmd.names) {
                    t += `  ${prefix}${name}\n`;
                    t += `  └> ${cmd.description}\n`;
                }
            }
            t += `\n`;
        }
        return t;
    }},
    
    // 22: Clean Divider
    { render: ({ greeting, quote, info, formattedCategories, prefix, timeSign }) => {
        let t = `  IAMLEGEND\n`;
        t += `  ─────────\n\n`;
        t += `  ${timeSign} ${greeting}\n`;
        t += `  ⏱ ${info.time} • v${info.version}\n`;
        t += `  ${quote}\n\n`;
        t += `  ─────────\n\n`;
        for (const cat of formattedCategories) {
            t += `  ${cat.category} [${cat.count}]\n`;
            for (const cmd of cat.commands) {
                const cmdList = cmd.names.map(n => `${prefix}${n}`).join(', ');
                t += `    ${cmdList}\n`;
                t += `    └> ${cmd.description}\n\n`;
            }
        }
        t += `  ─────────`;
        return t;
    }}
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ═══════════════════════════════════════════════════════════
// 🤖 MAIN COMMAND HANDLER
// ═══════════════════════════════════════════════════════════

export default {
    command: 'menu',
    aliases: ['help', 'commands', 'h', 'list'],
    category: 'general',
    description: 'Show all commands with descriptions',
    usage: '.menu [command|style#]',
    
    async handler(sock, message, args, context) {
        const { chatId, channelInfo, senderName } = context;
        const prefix = config.prefixes[0];
        const imagePath = path.join(process.cwd(), 'assets/thumb.png');
        
        // ─── Handle specific command lookup ───
        if (args.length) {
            const searchTerm = args[0].toLowerCase();
            let cmd = commandHandler.commands.get(searchTerm);
            if (!cmd && commandHandler.aliases.has(searchTerm)) {
                const mainCommand = commandHandler.aliases.get(searchTerm);
                cmd = commandHandler.commands.get(mainCommand);
            }
            if (!cmd) {
                return sock.sendMessage(chatId, {
                    text: `❌ Command "${args[0]}" not found.\n\nUse ${prefix}menu to see all commands.`,
                    ...channelInfo
                }, { quoted: message });
            }
            const text = `╭━━━━━━━━━━━━━━⬣
┃ 📌 COMMAND INFO
┃
┃ ⚡ Command: ${prefix}${cmd.command}
┃ 📝 Desc: ${cmd.description || 'No description'}
┃ 📖 Usage: ${cmd.usage || `${prefix}${cmd.command}`}
┃ 🏷️ Category: ${cmd.category || 'misc'}
┃ 🔖 Aliases: ${cmd.aliases?.length ? cmd.aliases.map(a => prefix + a).join(', ') : 'None'}
┃
╰━━━━━━━━━━━━━━⬣`;
            if (fs.existsSync(imagePath)) {
                return sock.sendMessage(chatId, {
                    image: { url: imagePath },
                    caption: text,
                    ...channelInfo
                }, { quoted: message });
            }
            return sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
        
        // ─── Prepare dynamic content ───
        const userName = senderName || 'Legend';
        const timeInfo = getTimePeriod();
        const greeting = getGreeting(timeInfo.period, userName);
        const quote = await fetchRandomQuote();
        const formattedCategories = formatCommands(commandHandler.categories, prefix);
        
        // ─── Style selector: .menu 5 or .menu style5 ───
        const styleArg = args.find(a => /^style?\d+$/i.test(a));
        const styleIndex = styleArg ? parseInt(styleArg.replace(/\D/g,'')) - 1 : -1;
        const style = (styleIndex >= 0 && styleIndex < menuStyles.length) 
            ? menuStyles[styleIndex] 
            : pick(menuStyles);
        
        // ─── Render menu ───
        const text = style.render({
            greeting,
            quote,
            prefix,
            timeSign: timeInfo.sign,
            formattedCategories,
            info: {
                bot: config.botName,
                prefix: config.prefixes.join(', '),
                total: commandHandler.commands.size,
                version: config.version || "6.0.0",
                time: formatTime()
            }
        });
        
        // ─── Send message ───
        if (fs.existsSync(imagePath)) {
            await sock.sendMessage(chatId, {
                image: { url: imagePath },
                caption: text,
                ...channelInfo
            }, { quoted: message });
        } else {
            await sock.sendMessage(chatId, { text, ...channelInfo }, { quoted: message });
        }
    }
};

/*****************************************************************************
 *                     Developed By STANY TZ                                 *
 *****************************************************************************/

