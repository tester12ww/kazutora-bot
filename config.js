const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

const DEFAULT_CONFIG = {
  verify_role_id: "",
  welcome: {
    channelId: "1525936048453189763",
    title: "### 👋 Willkommen in Kazutora Community!",
    description: "> Ein neues Gesicht hat die Straßen von **Kazutora Community** betreten!\n> \n> Heißt {member} herzlich in unserer Community willkommen und helft ihm, sich zurechtzufinden. 🤝",
    tip: "Willkommen zur Kazutora Community hier kannst du mit Freunden chillen oder neue Leute kennenlernen!",
    imageUrl: "https://cdn.discordapp.com/attachments/1525455012342272161/1539018485257080862/g.png?ex=6a84ca28&is=6a8378a8&hm=74cecf33ed155db7f244264c741d3bfad3c51361c71c6349713c27a33e431948&",
    footer: "Kazutora Community | Hosted by Mogli"
  },
  boost: {
    channelId: "",
    title: "### 💜✨ Neuer Server-Boost! ✨💜",
    description: "Vielen Dank {member} fürs Boosten unseres Servers!\n\n> 🔥 Aktuelle Boosts: {boosts}\n> 🚀 Boost-Stufe: Tier {tier}",
    tip: "Deine Unterstützung hilft uns, bessere Features, coolere Audioqualität und mehr Emojis zu bieten. Du bist mega! 💪",
    imageUrl: "https://cdn.discordapp.com/attachments/1525455012342272161/1539018485257080862/g.png?ex=6a84ca28&is=6a8378a8&hm=74cecf33ed155db7f244264c741d3bfad3c51361c71c6349713c27a33e431948&",
    footer: "Kazutora Community | Hosted by Mogli"
  },
  verify: {
    channelId: "",
    title: "### 🔒 Verifizierung",
    description: "> Klicke auf den Button unten, um dich zu verifizieren und vollen Zugriff auf den Server zu erhalten!",
    buttonLabel: "Verifizieren",
    imageUrl: "https://cdn.discordapp.com/attachments/1525455012342272161/1539018485257080862/g.png?ex=6a84ca28&is=6a8378a8&hm=74cecf33ed155db7f244264c741d3bfad3c51361c71c6349713c27a33e431948&",
    footer: "Kazutora Community | Hosted by Mogli"
  }
};

function loadConfig() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
      return DEFAULT_CONFIG;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.error("Error loading config:", err);
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error saving config:", err);
  }
}

module.exports = {
  loadConfig,
  saveConfig
};
