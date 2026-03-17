#!/bin/bash
#############################################################################
#                                                                           #
#                     Developed By STANY TZ                                 #
#                                                                           #
#  🌐  GitHub   : https://github.com/Stanytz378                             #
#  ▶️  YouTube  : https://youtube.com/@STANYTZ                              #
#  💬  WhatsApp : https://whatsapp.com/channel/0029Vb7fzu4EwEjmsD4Tzs1p     #
#                                                                           #
#    © 2026 STANY TZ. All rights reserved.                                 #
#                                                                           #
#    Description: Railway One‑Click Deployer for ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ Bot           #
#                                                                           #
#############################################################################

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════╗"
echo "║     ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ Railway Deployer      ║"
echo "║           by STANY TZ                 ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Install railway CLI if not present
if ! command -v railway &>/dev/null; then
    echo -e "${YELLOW}📦 Installing Railway CLI...${NC}"
    curl -fsSL https://railway.app/install.sh | sh
    export PATH="$HOME/.railway/bin:$PATH"
fi

# Check login
if ! railway whoami &>/dev/null; then
    echo -e "${YELLOW}🔑 Please login to Railway:${NC}"
    railway login
fi

echo ""
echo -e "${BOLD}📋 Enter your bot details:${NC}"
echo ""

read -p "$(echo -e ${CYAN}Session ID (Stanytz378/IAMLEGEND_xxxxx): ${NC})" SESSION_ID
if [ -z "$SESSION_ID" ]; then
    echo -e "${RED}❌ Session ID is required!${NC}"
    exit 1
fi

read -p "$(echo -e ${CYAN}Owner WhatsApp number (e.g. 255618558502): ${NC})" OWNER_NUMBER
OWNER_NUMBER=${OWNER_NUMBER:-255618558502}

read -p "$(echo -e ${CYAN}Bot name (default: ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ): ${NC})" BOT_NAME
BOT_NAME=${BOT_NAME:-ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ}

read -p "$(echo -e ${CYAN}MongoDB URL (recommended, press Enter to skip): ${NC})" MONGO_URL

read -p "$(echo -e ${CYAN}Timezone (default: Africa/Nairobi): ${NC})" TIMEZONE
TIMEZONE=${TIMEZONE:-Africa/Nairobi}

echo ""
echo -e "${YELLOW}🚀 Starting deployment...${NC}"
echo ""

# Clone if not in repo
if [ ! -f "railway.json" ]; then
    echo -e "${YELLOW}📦 Cloning ᴵ ᴬᴹ ᴸᴱᴳᴱᴺᴰ repo...${NC}"
    git clone https://github.com/Stanytz378/IAMLEGEND iamlegend-deploy
    cd iamlegend-deploy
fi

# Init railway project
echo -e "${YELLOW}📱 Creating Railway project...${NC}"
railway init --name "iamlegend-bot"

# Set environment variables
echo -e "${YELLOW}⚙️ Setting environment variables...${NC}"
railway variables set \
    SESSION_ID="$SESSION_ID" \
    OWNER_NUMBER="$OWNER_NUMBER" \
    BOT_NAME="$BOT_NAME" \
    TIMEZONE="$TIMEZONE" \
    COMMAND_MODE="public"

[ -n "$MONGO_URL" ] && railway variables set MONGO_URL="$MONGO_URL"

# Deploy
echo -e "${YELLOW}📤 Deploying to Railway (this may take 3‑5 minutes)...${NC}"
railway up --detach

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅ Deployment Complete!        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Logs:${NC}    railway logs"
echo -e "${BOLD}Status:${NC}  railway status"
echo -e "${BOLD}Open:${NC}    railway open"
echo ""
echo -e "${CYAN}📱 Scan QR or use Session ID to connect your WhatsApp!${NC}"