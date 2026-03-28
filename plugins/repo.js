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
 *    Description: Displays repository info, stars, forks, last update,     *
 *                 deployment links, and system stats.                      *
 *                                                                           *
 ***************************************************************************/

import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for version and name
let pkg = {};
try {
  const pkgPath = path.join(__dirname, '../package.json');
  pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
} catch (e) {
  pkg = { name: 'iamlegendv2', version: '6.0.0', author: 'STANY TZ' };
}

const REPO_OWNER = 'Stanytz378';
const REPO_NAME = 'iamlegendv2';
const GITHUB_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
const DEPLOY_SITE = 'https://stanytz.zone.id';
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p';
const GROUP_LINK = 'https://chat.whatsapp.com/J19JASXoaK0GVSoRvShr4Y';

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default {
  command: 'repo',
  aliases: ['script', 'source'],
  category: 'general',
  description: 'Show repository information, GitHub stats, and deployment links',
  usage: '.repo',
  async handler(sock, message, args, context) {
    const { chatId, channelInfo } = context;

    // System info
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptimeSec = process.uptime();
    const uptimeHours = Math.floor(uptimeSec / 3600);
    const uptimeMins = Math.floor((uptimeSec % 3600) / 60);
    const uptimeSecs = Math.floor(uptimeSec % 60);

    // Fetch GitHub stats
    let stars = '?', forks = '?', lastUpdate = '?', lastCommitDate = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(GITHUB_API, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        stars = data.stargazers_count;
        forks = data.forks_count;
        lastUpdate = data.updated_at;
        if (lastUpdate) lastCommitDate = formatDate(lastUpdate);
      }
    } catch (err) {
      console.error('GitHub API error:', err.message);
      // fallback: try to get commit date from API
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const commitRes = await fetch(`${GITHUB_API}/commits?per_page=1`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (commitRes.ok) {
          const commits = await commitRes.json();
          if (commits[0] && commits[0].commit && commits[0].commit.committer) {
            lastCommitDate = formatDate(commits[0].commit.committer.date);
          }
        }
      } catch (e) {}
    }

    const ramUsage = `${formatBytes(usedMem)} / ${formatBytes(totalMem)}`;
    const uptimeStr = `${uptimeHours}h ${uptimeMins}m ${uptimeSecs}s`;

    const messageText = `
*📁 IAMLEGEND V2 REPOSITORY*

*GitHub:* https://github.com/${REPO_OWNER}/${REPO_NAME}
${stars !== '?' ? `⭐ Stars: ${stars}` : ''}
${forks !== '?' ? `🍴 Forks: ${forks}` : ''}
${lastCommitDate ? `🕒 Last Update: ${lastCommitDate}` : ''}
*Version:* ${pkg.version || '6.0.0'}
*Author:* ${pkg.author || 'STANY TZ'}

*💻 System Stats*
• RAM: ${ramUsage}
• Uptime: ${uptimeStr}

*🌐 Deployment*
• Website: ${DEPLOY_SITE}
• WhatsApp Channel: ${CHANNEL_LINK}
• Support Group: ${GROUP_LINK}

*📢 Need help?* Use \`.help\` for commands or join the group.

> Powered by STANY TZ – iamlegendv2
`.trim();

    await sock.sendMessage(chatId, { text: messageText, ...channelInfo }, { quoted: message });
  }
};