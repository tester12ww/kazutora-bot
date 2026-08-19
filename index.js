require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  PermissionFlagsBits,
  ActivityType,
  MessageType,
  REST,
  Routes,
  SlashCommandBuilder,
  Partials
} = require('discord.js');
const { loadConfig, saveConfig } = require('./config');

const DEFAULT_BANNER_URL = "https://cdn.discordapp.com/attachments/1525455012342272161/1539018485257080862/g.png?ex=6a84ca28&is=6a8378a8&hm=74cecf33ed155db7f244264c741d3bfad3c51361c71c6349713c27a33e431948&";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

// Helper to generate a random 5-character verification code
function generateVerifyCode(length = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like I, O, 0, 1
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Helper to trim each line of a multiline string
function trimLines(str) {
  if (!str) return '';
  return str.split('\n').map(line => line.trim()).join('\n');
}

// Helper to replace placeholders in embeds
function replacePlaceholders(text, member, guild) {
  if (!text) return '';
  let result = text;
  if (member) {
    result = result
      .replace(/{member}/g, `<@${member.id}>`)
      .replace(/{member\.id}/g, member.id)
      .replace(/{member\.username}/g, member.user.username)
      .replace(/{member\.tag}/g, member.user.tag);
  }
  if (guild) {
    let tierNum = 0;
    if (guild.premiumTier === 'TIER_1' || guild.premiumTier === 1) tierNum = 1;
    else if (guild.premiumTier === 'TIER_2' || guild.premiumTier === 2) tierNum = 2;
    else if (guild.premiumTier === 'TIER_3' || guild.premiumTier === 3) tierNum = 3;

    result = result
      .replace(/{guild\.name}/g, guild.name)
      .replace(/{boosts}/g, guild.premiumSubscriptionCount || 0)
      .replace(/{tier}/g, tierNum);
  }
  return result;
}

// Helper to create a ticket channel on a guild
async function createTicket(guild, member, categoryName, interaction, loadingMsg, isDM = false) {
  try {
    const config = loadConfig();
    let counter = config.ticket_counter || 0;
    counter++;
    config.ticket_counter = counter;
    saveConfig(config);

    const ticketNumber = counter.toString().padStart(3, '0');
    const channelName = `${ticketNumber}-${member.user.username.toLowerCase()}`;

    let parentCategory = guild.channels.cache.find(c => 
      c.name === '⸻ ↬ Tickets ⸻' && c.type === 4
    );

    if (!parentCategory) {
      parentCategory = await guild.channels.create({
        name: '⸻ ↬ Tickets ⸻',
        type: 4, // Category
        permissionOverwrites: [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel]
          }
        ]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName.substring(0, 100),
      type: 0, // Text Channel
      parent: parentCategory.id,
      permissionOverwrites: [
        {
          id: guild.id, // @everyone
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: member.id, // The ticket opener
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        {
          id: guild.client.user.id, // Bot itself
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
        }
      ]
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      flags: 32768, // IS_COMPONENTS_V2
      components: [
        {
          type: 17, // Container
          accent_color: 4530517, // #452155
          accentColor: 4530517,
          components: [
            {
              type: 10, // Text Display
              content: `### 🎫 Support-Ticket | Kazutora Community`
            },
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `👤 **Ticket-Inhaber:** <@${member.id}> (ID: \`${member.id}\`)\n📂 **Kategorie:** \`${categoryName.toUpperCase()}\`\n⚙️ **Ticket-Nummer:** \`#${ticketNumber}\`\n⏰ **Erstellt am:** <t:${timestamp}:F> (<t:${timestamp}:R>)\n⚙️ **Ticket-Status:** 🟢 Aktiv & Offen\n🛡️ **Zuständigkeit:** Moderation & Administration\n📅 **Konto erstellt:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:d> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)\n📥 **Server beigetreten:** <t:${Math.floor(member.joinedTimestamp / 1000)}:d> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)\n📌 **Richtlinien:** Beschreibe dein Anliegen so genau wie möglich und lade ggf. Screenshots hoch. Bitte pinge keine Teammitglieder.`
            },
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `*Ein Teammitglied wird sich in Kürze um dein Anliegen kümmern. Bitte habe etwas Geduld!*`
            },
            {
              type: 12, // Media Gallery
              items: [
                {
                  media: {
                    url: DEFAULT_BANNER_URL,
                    content_type: "image/png",
                    contentType: "image/png"
                  }
                }
              ]
            },
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
            }
          ]
        },
        {
          type: 1, // Action Row
          components: [
            {
              type: 2, // Button
              style: 4, // Danger / Red
              label: "Schließen",
              emoji: { name: "🔒" },
              custom_id: `ticket_close:${member.id}`,
              customId: `ticket_close:${member.id}`
            },
            {
              type: 2, // Button
              style: 3, // Success / Green
              label: "Beanspruchen",
              emoji: { name: "🤝" },
              custom_id: `ticket_claim:${member.id}`,
              customId: `ticket_claim:${member.id}`
            },
            {
              type: 2, // Button
              style: 2, // Secondary / Grey
              label: "Umbenennen",
              emoji: { name: "📝" },
              custom_id: `ticket_rename:${member.id}`,
              customId: `ticket_rename:${member.id}`
            }
          ]
        }
      ]
    };

    await ticketChannel.send(payload);
    await ticketChannel.send({ content: `<@${member.id}> Willkommen in deinem Ticket!` });

    if (isDM) {
      await interaction.editReply({
        content: `✅ Dein Ticket wurde auf dem Server **${guild.name}** erfolgreich erstellt: <#${ticketChannel.id}>`
      });
    } else {
      await interaction.webhook.editMessage(loadingMsg.id, {
        content: `✅ Dein Ticket wurde erfolgreich erstellt: <#${ticketChannel.id}>`
      });
    }

  } catch (err) {
    console.error("Fehler beim Erstellen des Tickets:", err);
    if (isDM) {
      await interaction.editReply({
        content: `❌ Fehler beim Erstellen des Tickets: ${err.message}`
      });
    } else {
      await interaction.webhook.editMessage(loadingMsg.id, {
        content: `❌ Fehler beim Erstellen des Tickets: ${err.message}`
      });
    }
  }
}

// Helper to parse duration string (e.g. 24h, 2h, 10m, 30s)
function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

// Helper to resolve a giveaway session
async function resolveGiveaway(clientInstance, giveawayId) {
  const config = loadConfig();
  const giveaway = config.giveaways?.[giveawayId];
  if (!giveaway) return;

  delete config.giveaways[giveawayId];
  saveConfig(config);

  try {
    const guild = clientInstance.guilds.cache.get(giveaway.guildId);
    if (!guild) return;

    const channel = guild.channels.cache.get(giveaway.channelId);
    if (!channel) return;

    let message;
    try {
      message = await channel.messages.fetch(giveaway.messageId);
    } catch (e) {
      console.error("Giveaway-Nachricht konnte nicht abgerufen werden:", e);
    }

    const participants = giveaway.participants || [];
    const winnersCount = giveaway.winnersCount || 1;
    const prize = giveaway.prize;

    if (participants.length === 0) {
      if (message) {
        const timestamp = Math.floor(giveaway.endTimestamp / 1000);
        const failPayload = {
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 4530517,
              accentColor: 4530517,
              components: [
                {
                  type: 10,
                  content: `### 🎉 Gewinnspiel beendet!`
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10,
                  content: `🏆 **Preis:** ${prize}\n👥 **Gewinner:** Keine Teilnehmer!`
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1
                },
                {
                  type: 12,
                  items: [
                    {
                      media: {
                        url: DEFAULT_BANNER_URL,
                        content_type: "image/png",
                        contentType: "image/png"
                      }
                    }
                  ]
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10,
                  content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
                }
              ]
            }
          ]
        };
        await message.edit(failPayload).catch(() => {});
      }
      return;
    }

    // Truly random selection
    const winners = [];
    const tempParticipants = [...new Set(participants)];
    while (winners.length < winnersCount && tempParticipants.length > 0) {
      const randIndex = Math.floor(Math.random() * tempParticipants.length);
      const winnerId = tempParticipants.splice(randIndex, 1)[0];
      winners.push(winnerId);
    }

    const timestamp = Math.floor(giveaway.endTimestamp / 1000);
    let dmsStatusText = '';

    for (const winnerId of winners) {
      try {
        const winner = await guild.members.fetch(winnerId);
        const dmPayload = {
          flags: 32768,
          components: [
            {
              type: 17,
              accent_color: 4530517,
              accentColor: 4530517,
              components: [
                {
                  type: 10,
                  content: `### 🎉 Gewinnspiel-Gewinner!`
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10,
                  content: `🏆 **Gewinn:** ${prize}\n🎉 **Herzlichen Glückwunsch!** Du hast das Gewinnspiel auf **${guild.name}** gewonnen!`
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10, // Text Display (Instruction)
                  content: `*Klicke auf den Button unten, um dein Gewinn-Ticket zu öffnen und deinen Preis abzuholen!*`
                },
                {
                  type: 12,
                  items: [
                    {
                      media: {
                        url: DEFAULT_BANNER_URL,
                        content_type: "image/png",
                        contentType: "image/png"
                      }
                    }
                  ]
                },
                {
                  type: 14,
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10,
                  content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
                }
              ]
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3,
                  label: "Gewinn abholen (Ticket öffnen)",
                  emoji: { name: "🎫" },
                  custom_id: `ticket_open_dm:${guild.id}:giveaway`,
                  customId: `ticket_open_dm:${guild.id}:giveaway`
                }
              ]
            }
          ]
        };
        await winner.send(dmPayload);
      } catch (dmErr) {
        console.error(`Fehler beim Senden der DM an Gewinner ${winnerId}:`, dmErr);
        dmsStatusText += `\n*Hinweis: <@${winnerId}> konnte keine DM erhalten (DMs geschlossen).*`;
      }
    }

    if (message) {
      const endPayload = {
        flags: 32768,
        components: [
          {
            type: 17,
            accent_color: 4530517,
            accentColor: 4530517,
            components: [
              {
                type: 10,
                content: `### 🎉 Gewinnspiel beendet!`
              },
              {
                type: 14,
                divider: true,
                spacing: 1
              },
              {
                type: 10,
                content: `🏆 **Preis:** ${prize}\n👥 **Gewinner:** ${winners.map(id => `<@${id}>`).join(', ')}\n⏳ **Zeit:** Beendet`
              },
              {
                type: 14,
                divider: true,
                spacing: 1
              },
              {
                type: 10,
                content: `*Die Gewinner haben eine Privatnachricht erhalten, um ihren Preis abzuholen!*${dmsStatusText}`
              },
              {
                type: 12,
                items: [
                  {
                    media: {
                      url: DEFAULT_BANNER_URL,
                      content_type: "image/png",
                      contentType: "image/png"
                    }
                  }
                ]
              },
              {
                type: 14,
                divider: true,
                spacing: 1
              },
              {
                type: 10,
                content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
              }
            ]
          }
        ]
      };
      await message.edit(endPayload).catch(() => {});
    }

    await channel.send({
      flags: 32768, // IS_COMPONENTS_V2
      components: [
        {
          type: 17, // Container
          accent_color: 4530517, // #452155
          accentColor: 4530517,
          components: [
            {
              type: 10, // Text Display
              content: `### 🎉 Gewinnspiel-Auslosung`
            },
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `🏆 **Preis:** ${prize}\n👥 **Gewinner:** ${winners.map(id => `<@${id}>`).join(', ')}\n⏳ **Zeit:** Beendet`
            },
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `*Die Gewinner haben eine Privatnachricht erhalten, um ihren Preis abzuholen!*`
            },
            {
              type: 12, // Media Gallery
              items: [
                {
                  media: {
                    url: DEFAULT_BANNER_URL,
                    content_type: "image/png",
                    contentType: "image/png"
                  }
                }
              ]
            },
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
            }
          ]
        }
      ]
    });

  } catch (err) {
    console.error("Fehler beim Auflösen des Gewinnspiels:", err);
  }
}

// Helper to initialize active giveaways from database
function initializeGiveaways(clientInstance) {
  try {
    const config = loadConfig();
    if (!config.giveaways) {
      config.giveaways = {};
      saveConfig(config);
      return;
    }

    const now = Date.now();
    let count = 0;
    for (const giveawayId of Object.keys(config.giveaways)) {
      const giveaway = config.giveaways[giveawayId];
      const remaining = giveaway.endTimestamp - now;

      if (remaining <= 0) {
        resolveGiveaway(clientInstance, giveawayId).catch(() => {});
      } else {
        setTimeout(() => {
          resolveGiveaway(clientInstance, giveawayId).catch(() => {});
        }, remaining);
      }
      count++;
    }
    if (count > 0) {
      console.log(`${count} aktive Gewinnspiele aus der Datenbank geladen und gestartet.`);
    }
  } catch (err) {
    console.error("Fehler beim Initialisieren der Gewinnspiele:", err);
  }
}

// Build Components V2 for Welcome Embed
function buildWelcomeComponents(data, member, guild) {
  const timestamp = Math.floor(Date.now() / 1000);
  const avatarUrl = member.user.displayAvatarURL({ extension: 'webp', size: 128 });
  
  return [
    {
      type: 17, // Container
      accent_color: 4530517, // #452155
      accentColor: 4530517,
      components: [
        {
          type: 10, // Text Display
          content: replacePlaceholders(data.title, member, guild)
        },
        {
          type: 9, // Section
          components: [
            {
              type: 10, // Text Display
              content: replacePlaceholders(data.description, member, guild)
            }
          ],
          accessory: {
            type: 11, // Thumbnail / Image
            media: {
              url: avatarUrl,
              proxy_url: avatarUrl,
              proxyUrl: avatarUrl,
              height: 128,
              width: 128,
              content_type: "image/webp",
              contentType: "image/webp"
            }
          }
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display
          content: replacePlaceholders(data.tip, member, guild)
        },
        {
          type: 12, // Media Gallery
          items: [
            {
              media: {
                url: data.imageUrl || "https://cdn.discordapp.com/attachments/1525455012342272161/1539018485257080862/g.png?ex=6a84ca28&is=6a8378a8&hm=74cecf33ed155db7f244264c741d3bfad3c51361c71c6349713c27a33e431948&",
                height: 1000,
                width: 3000,
                content_type: "image/png",
                contentType: "image/png"
              }
            }
          ]
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display
          content: `-# ${replacePlaceholders(data.footer, member, guild)} • <t:${timestamp}:f>`
        }
      ]
    }
  ];
}

// Build Components V2 for Boost Embed
function buildBoostComponents(data, member, guild) {
  const timestamp = Math.floor(Date.now() / 1000);
  const avatarUrl = member.user.displayAvatarURL({ extension: 'webp', size: 128 });

  return [
    {
      type: 17, // Container
      accent_color: 4530517, // #452155
      accentColor: 4530517,
      components: [
        {
          type: 10, // Text Display
          content: replacePlaceholders(data.title, member, guild)
        },
        {
          type: 9, // Section
          components: [
            {
              type: 10, // Text Display
              content: replacePlaceholders(data.description, member, guild)
            }
          ],
          accessory: {
            type: 11, // Thumbnail / Image
            media: {
              url: avatarUrl,
              proxy_url: avatarUrl,
              proxyUrl: avatarUrl,
              height: 128,
              width: 128,
              content_type: "image/webp",
              contentType: "image/webp"
            }
          }
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display
          content: replacePlaceholders(data.tip, member, guild)
        },
        {
          type: 12, // Media Gallery
          items: [
            {
              media: {
                url: data.imageUrl || DEFAULT_BANNER_URL,
                height: 1000,
                width: 3000,
                content_type: "image/png",
                contentType: "image/png"
              }
            }
          ]
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display
          content: `-# ${replacePlaceholders(data.footer, member, guild)} • <t:${timestamp}:f>`
        }
      ]
    }
  ];
}

// Build Components V2 for Verification Embed
function buildVerifyComponents(data, guild) {
  const timestamp = Math.floor(Date.now() / 1000);

  return [
    {
      type: 17, // Container
      accent_color: 4530517, // #452155
      accentColor: 4530517,
      components: [
        {
          type: 10, // Text Display
          content: replacePlaceholders(data.title, null, guild)
        },
        {
          type: 10, // Text Display
          content: replacePlaceholders(data.description, null, guild)
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display (Instruction)
          content: `*Klicke auf den Button unten, um dich erfolgreich zu verifizieren!*`
        },
        {
          type: 12, // Media Gallery
          items: [
            {
              media: {
                url: data.imageUrl || DEFAULT_BANNER_URL,
                height: 1000,
                width: 3000,
                content_type: "image/png",
                contentType: "image/png"
              }
            }
          ]
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display
          content: `-# ${replacePlaceholders(data.footer, null, guild)} • <t:${timestamp}:f>`
        }
      ]
    },
    {
      type: 1, // Action Row
      components: [
        {
          type: 2, // Button
          style: 3, // Success / Green
          label: data.buttonLabel || "Verifizieren",
          custom_id: "verify_user",
          customId: "verify_user",
          emoji: {
            name: "✅"
          }
        },
        {
          type: 2, // Button
          style: 2, // Secondary / Grey
          label: "Regeln",
          custom_id: "verify_rules",
          customId: "verify_rules",
          emoji: {
            name: "📘"
          }
        }
      ]
    }
  ];
}

// Build Components V2 for Giveaway Embed
function buildGiveawayComponents(prize, winnersCount, endTimestamp, participantsCount) {
  const timestamp = Math.floor(endTimestamp / 1000);
  return [
    {
      type: 17, // Container
      accent_color: 4530517, // #452155
      accentColor: 4530517,
      components: [
        {
          type: 10, // Text Display
          content: `### 🎉 Gewinnspiel!`
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display
          content: `🏆 **Preis:** ${prize}\n👥 **Gewinner:** ${winnersCount}\n⏳ **Endet:** <t:${timestamp}:R> (<t:${timestamp}:f>)\n👥 **Teilnehmer:** ${participantsCount}`
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display (Instruction)
          content: `*Klicke auf den Button unten, um am Gewinnspiel teilzunehmen!*`
        },
        {
          type: 12, // Media Gallery
          items: [
            {
              media: {
                url: DEFAULT_BANNER_URL,
                content_type: "image/png",
                contentType: "image/png"
              }
            }
          ]
        },
        {
          type: 14, // Separator
          divider: true,
          spacing: 1
        },
        {
          type: 10, // Text Display
          content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
        }
      ]
    }
  ];
}

function parseFeedbackInput(text) {
  // Try key-value parser first if text has colons
  if (text.includes(':')) {
    let comment = "";
    let supporter = "*Kein Supporter angegeben*";
    let stars = 5;
    let hasParsed = false;

    const lines = text.split('\n');
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.substring(0, idx).toLowerCase().trim();
      const val = line.substring(idx + 1).trim();

      if (key === 'kommentar') {
        comment = val;
        hasParsed = true;
      } else if (key === 'supporter') {
        supporter = val;
        hasParsed = true;
      } else if (key === 'sterne') {
        const num = parseInt(val);
        if (!isNaN(num)) stars = Math.max(1, Math.min(5, num));
        hasParsed = true;
      }
    }
    if (hasParsed && comment) {
      return { comment, supporter, stars };
    }
  }

  // Otherwise try positional parser
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return null;

  const starsStr = words[words.length - 1].replace(/[,"']/g, '').trim();
  const stars = parseInt(starsStr);
  if (isNaN(stars) || stars < 1 || stars > 5) return null;

  const supporter = words[words.length - 2].trim();
  const comment = words.slice(0, words.length - 2).join(' ').trim();

  return { comment, supporter, stars };
}

function parseGiveawayInput(text) {
  // Try key-value parser first if text has colons
  if (text.includes(':')) {
    let prize = "";
    let winners = 1;
    let mins = 0;
    let hasParsed = false;

    const lines = text.split('\n');
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.substring(0, idx).toLowerCase().trim();
      const val = line.substring(idx + 1).trim();

      if (key === 'preis') {
        prize = val;
        hasParsed = true;
      } else if (key === 'gewinner') {
        const num = parseInt(val);
        if (!isNaN(num)) winners = Math.max(1, Math.min(20, num));
        hasParsed = true;
      } else if (key === 'zeit') {
        const num = parseInt(val);
        if (!isNaN(num)) mins = Math.max(1, num);
        hasParsed = true;
      }
    }
    if (hasParsed && prize && mins > 0) {
      return { prize, winners, mins };
    }
  }

  // Otherwise try positional parser
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return null;

  const minsStr = words[words.length - 1].replace(/[,"']/g, '').trim();
  const mins = parseInt(minsStr);
  if (isNaN(mins) || mins < 1) return null;

  const winnersStr = words[words.length - 2].replace(/[,"']/g, '').trim();
  const winners = parseInt(winnersStr);
  if (isNaN(winners) || winners < 1 || winners > 20) return null;

  const prize = words.slice(0, words.length - 2).join(' ').trim();

  return { prize, winners, mins };
}

async function registerSlashCommands(clientInstance) {
  try {
    console.log('Starte automatische Registrierung der Slash Commands...');
    
    const commands = [
      new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Konfiguriere das Willkommens-Embed über ein Modal')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in den Willkommensnachrichten gesendet werden')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('setup-boost')
        .setDescription('Konfiguriere das Server Boost-Embed über ein Modal')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in den Boost-Nachrichten gesendet werden')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('setup-verify')
        .setDescription('Konfiguriere das Verifizierungs-Embed über ein Modal und sende es')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in den das Verifizierungs-Embed gesendet wird')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('set-verify-role')
        .setDescription('Setze die Rolle, die nach erfolgreicher Verifizierung vergeben wird')
        .addRoleOption(option =>
          option.setName('role')
            .setDescription('Die Verifizierungs-Rolle')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('createembed')
        .setDescription('Erstelle ein individuelles Embed über ein Modal und sende es')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in den das Embed gesendet wird')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Lösche eine bestimmte Anzahl an Nachrichten aus diesem Kanal')
        .addIntegerOption(option => 
          option.setName('amount')
            .setDescription('Anzahl der zu löschenden Nachrichten (1 - 100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

      new SlashCommandBuilder()
        .setName('setup-suggestions')
        .setDescription('Richte den Vorschlags-Kanal ein')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in den Vorschläge gesendet werden')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Konfiguriere das Ticket-System über ein Modal')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in den das Ticket-Panel gesendet wird')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('setup-feedback')
        .setDescription('Richte den Feedback-Kanal ein')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in den Feedback gesendet wird')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('setup-bugs')
        .setDescription('Richte den Bug-Report-Kanal und die zu pingende Entwickler-Rolle ein')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in dem Bug-Reports gepostet werden')
            .setRequired(true)
        )
        .addRoleOption(option => 
          option.setName('pingrole')
            .setDescription('Die Entwickler-/Team-Rolle, die gepingt wird (Optional)')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('setup-giveaway')
        .setDescription('Richte den Gewinnspiel-Kanal ein')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Channel, in dem Gewinnspiele stattfinden und gestartet werden')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

      new SlashCommandBuilder()
        .setName('setup-honeypot')
        .setDescription('Richte den Honey-pot-Kanal (Honey-puu) mit Warnung-Embed ein')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('Der Honey-pot-Kanal, in dem Nachrichten verboten sind')
            .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(clientInstance.token);
    
    await rest.put(
      Routes.applicationCommands(clientInstance.user.id),
      { body: [] }
    );
    console.log('Globale Commands bereinigt (keine Duplikate mehr).');

    const guilds = clientInstance.guilds.cache;
    for (const [guildId, guild] of guilds.entries()) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientInstance.user.id, guildId),
          { body: commands }
        );
        console.log(`Slash Commands erfolgreich registriert für Server: ${guild.name} (${guildId})`);
      } catch (guildErr) {
        console.error(`Fehler beim Registrieren der Commands für Guild ${guild.name}:`, guildErr);
      }
    }
  } catch (error) {
    console.error('Fehler bei der automatischen Registrierung der Slash Commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`Bot ist online als ${client.user.tag}!`);
  console.log(`Bot ist online und einsatzbereit!`);
  
  try {
    client.user.setActivity('gg./kazutora', {
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/kazutora'
    });
    console.log('Status auf "Streaming gg./kazutora" gesetzt.');
  } catch (err) {
    console.error('Fehler beim Setzen des Status:', err);
  }

  // Auto-register commands
  await registerSlashCommands(client);

  // Initialize running giveaways from database
  initializeGiveaways(client);
});

client.on('guildCreate', async (guild) => {
  console.log(`Bot ist einem neuen Server beigetreten: ${guild.name} (${guild.id})`);
  await registerSlashCommands(client);
});

// Cache for welcome cooldowns to prevent duplicate posts
const welcomeCooldowns = new Map();

// Event: User joins the guild
client.on('guildMemberAdd', async (member) => {
  const now = Date.now();
  const lastWelcome = welcomeCooldowns.get(member.id);
  if (lastWelcome && (now - lastWelcome) < 10000) { // 10 seconds cooldown
    console.log(`Dupliziertes Beitritts-Event für ${member.user.tag} ignoriert (Cooldown).`);
    return;
  }
  welcomeCooldowns.set(member.id, now);

  // Clear memory cache if it gets too large
  if (welcomeCooldowns.size > 200) {
    for (const [id, time] of welcomeCooldowns.entries()) {
      if (now - time > 60000) welcomeCooldowns.delete(id);
    }
  }

  console.log(`Neues Mitglied beigetreten: ${member.user.tag}`);
  const config = loadConfig();
  const channelId = config.welcome.channelId;
  if (!channelId) {
    console.log("Willkommens-Channel ist nicht konfiguriert.");
    return;
  }

  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) {
    console.warn(`Konfigurierter Willkommens-Channel (${channelId}) existiert nicht mehr.`);
    return;
  }

  try {
    const payload = {
      flags: 32768, // IS_COMPONENTS_V2
      components: buildWelcomeComponents(config.welcome, member, member.guild)
    };
    await channel.send(payload);
    console.log(`Willkommens-Embed erfolgreich gesendet für ${member.user.tag}`);
  } catch (err) {
    console.error("Fehler beim Senden des Willkommens-Embeds:", err);
  }
});

// Event: Detect Server Boosts via System Messages (triggers on every single boost)
client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  const config = loadConfig();

  // Honey-pot (Honey-puu) Channel Handler
  if (config.honeypot_channel_id && message.channel.id === config.honeypot_channel_id) {
    // Delete message immediately
    await message.delete().catch(() => {});

    // Ignore if it's an administrator to prevent accidental self-bans during setup
    if (message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const warning = await message.channel.send(`⚠️ <@${message.author.id}>, als Administrator bist du vom Honey-pot-Ban geschützt, aber bitte schreibe hier nicht!`);
      setTimeout(() => warning.delete().catch(() => {}), 5000);
      return;
    }

    try {
      // Ban the user without mercy (delete messages of last 7 days)
      await message.member.ban({
        deleteMessageSeconds: 7 * 24 * 60 * 60,
        reason: "Honey-pot (Honey-puu) ausgelöst: In geschütztem Kanal geschrieben."
      });
      console.log(`Mitglied ${message.author.tag} (${message.author.id}) wurde permanent vom Server gebannt (Honey-pot ausgelöst).`);
    } catch (err) {
      console.error(`Fehler beim Bannen des Honey-pot-Auslösers (${message.author.tag}):`, err);
    }
    return;
  }

  // Handle Giveaway Channel (only admins/moderators can start)
  if (config.giveaway_channel_id && message.channel.id === config.giveaway_channel_id) {
    await message.delete().catch(() => {});

    // Check if the sender has Administrator or ManageMessages permissions (Admins/Moderators)
    const isTeam = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                   message.member.permissions.has(PermissionFlagsBits.ManageMessages);
    if (!isTeam) {
      return;
    }

    try {
      const parsed = parseGiveawayInput(message.content);
      if (!parsed) {
        const err = await message.channel.send("❌ Fehler: Bitte schreibe das Gewinnspiel nebeneinander im Format:\n`[Preis] [Gewinner (1-20)] [Dauer in Minuten]` (z.B. `1x Nitro 1 30`)");
        setTimeout(() => err.delete().catch(() => {}), 5000);
        return;
      }

      const { prize: preis, winners: gewinnerCount, mins: minutenCount } = parsed;
      const durationMs = minutenCount * 60 * 1000;

      const endTimestamp = Date.now() + durationMs;
      const timestamp = Math.floor(endTimestamp / 1000);
      const giveawayId = `giveaway_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const initialPayload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
          ...buildGiveawayComponents(preis, gewinnerCount, endTimestamp, 0),
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button
                style: 1, // Primary
                label: "Teilnehmen",
                emoji: { name: "🎉" },
                custom_id: `giveaway_join:${giveawayId}`,
                customId: `giveaway_join:${giveawayId}`
              }
            ]
          }
        ]
      };

      const giveawayMsg = await message.channel.send(initialPayload);

      if (!config.giveaways) config.giveaways = {};
      config.giveaways[giveawayId] = {
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: giveawayMsg.id,
        prize: preis,
        winnersCount: gewinnerCount,
        endTimestamp: endTimestamp,
        participants: []
      };
      saveConfig(config);

      setTimeout(() => {
        resolveGiveaway(client, giveawayId).catch(err => {
          console.error(`Fehler bei der Auslosung des Gewinnspiels ${giveawayId}:`, err);
        });
      }, durationMs);

    } catch (err) {
      console.error("Fehler beim Erstellen des Gewinnspiels:", err);
    }
    return;
  }

  // Handle Suggestions Channel (type directly to suggest)
  if (config.suggestions_channel_id && message.channel.id === config.suggestions_channel_id) {
    await message.delete().catch(() => {});

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const suggestionId = `sugg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const payload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
          {
            type: 17, // Container
            accent_color: 4530517, // #452155
            accentColor: 4530517,
            components: [
              {
                type: 10, // Text Display (Title)
                content: `### 💡 Community-Vorschlag`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Body)
                content: `👤 **Eingereicht von:** <@${message.author.id}>\n💡 **Idee:** ${trimLines(message.content)}\n⭐ **Sterne-Bewertung:** 0\n⏰ **Eingestellt am:** <t:${timestamp}:f>\n📢 **Diskussion:** Thread wurde unten erstellt!`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Instruction)
                content: `*Bewerte den Vorschlag mit dem Stern-Button unten!*`
              },
              {
                type: 12, // Media Gallery
                items: [
                  {
                    media: {
                      url: DEFAULT_BANNER_URL,
                      content_type: "image/png",
                      contentType: "image/png"
                    }
                  }
                ]
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Footer)
                content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
              }
            ]
          },
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button
                style: 1, // Primary
                label: "0",
                emoji: { name: "⭐" },
                custom_id: `suggestion_star:${suggestionId}`,
                customId: `suggestion_star:${suggestionId}`
              },
              {
                type: 2, // Button
                style: 4, // Danger
                label: "Löschen",
                emoji: { name: "🗑️" },
                custom_id: `suggestion_delete:${suggestionId}`,
                customId: `suggestion_delete:${suggestionId}`
              }
            ]
          }
        ]
      };

      const suggestionMessage = await message.channel.send(payload);

      let threadId = "";
      try {
        const thread = await suggestionMessage.startThread({
          name: `Diskussion - Vorschlag von ${message.author.username}`,
          autoArchiveDuration: 1440
        });
        threadId = thread.id;
        await thread.send(`Hier könnt ihr über den Vorschlag von <@${message.author.id}> diskutieren! Bitte bleibt sachlich und respektvoll. 💬`);
      } catch (threadErr) {
        console.error("Fehler beim Erstellen des Vorschlag-Threads:", threadErr);
      }

      if (!config.suggestions) config.suggestions = {};
      config.suggestions[suggestionId] = {
        messageId: suggestionMessage.id,
        authorId: message.author.id,
        content: message.content,
        stars: [],
        threadId: threadId
      };
      saveConfig(config);

    } catch (err) {
      console.error("Fehler beim Erstellen des Vorschlags:", err);
    }
    return;
  }

  // Handle Feedback Channel (type directly to submit feedback)
  if (config.feedback_channel_id && message.channel.id === config.feedback_channel_id) {
    await message.delete().catch(() => {});

    try {
      const parsed = parseFeedbackInput(message.content);
      if (!parsed) {
        const err = await message.channel.send("❌ Fehler: Bitte schreibe dein Feedback nebeneinander im Format:\n`[Kommentar] [Supporter] [Sterne (1-5)]` (z.B. `Super Hilfe Mogli 5`)");
        setTimeout(() => err.delete().catch(() => {}), 5000);
        return;
      }

      const { comment: kommentar, supporter: supporterText, stars: rating } = parsed;
      const timestamp = Math.floor(Date.now() / 1000);
      const stars = '⭐'.repeat(rating);

      const payload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
          {
            type: 17, // Container
            accent_color: 4530517, // #452155
            accentColor: 4530517,
            components: [
              {
                type: 10, // Text Display (Title)
                content: `### 🌟 Feedback-Bewertung`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Body)
                content: `👤 **Bewertet von:** <@${message.author.id}>\n🤝 **Supporter:** ${supporterText}\n⭐ **Bewertung:** ${stars}\n💬 **Kommentar:** ${trimLines(kommentar)}`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Instruction)
                content: `*Vielen Dank für dein Feedback! Deine Bewertung hilft uns, den Support zu verbessern.*`
              },
              {
                type: 12, // Media Gallery
                items: [
                  {
                    media: {
                      url: DEFAULT_BANNER_URL,
                      content_type: "image/png",
                      contentType: "image/png"
                    }
                  }
                ]
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Footer)
                content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
              }
            ]
          }
        ]
      };

      await message.channel.send(payload);
    } catch (err) {
      console.error("Fehler beim Erstellen des Feedbacks:", err);
    }
    return;
  }

  // Handle Bug Reports Channel
  if (config.bugs_channel_id && message.channel.id === config.bugs_channel_id) {
    await message.delete().catch(() => {});

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const avatarUrl = message.author.displayAvatarURL({ extension: 'webp', size: 128 });

      const bugPayload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
          {
            type: 17, // Container
            accent_color: 4530517, // #452155
            accentColor: 4530517,
            components: [
              {
                type: 10, // Text Display
                content: `### 🐛 Neuer Bug-Report`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display
                content: `👤 **Eingereicht von:** <@${message.author.id}>\n📝 **Beschreibung:** ${message.content}\n⚙️ **Status:** 🔴 Offen\n🤝 **Bearbeiter:** *Niemand*`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Instruction)
                content: `*Bitte beschreibe Bugs so detailliert wie möglich. Missbrauch wird bestraft!*`
              },
              {
                type: 12, // Media Gallery
                items: [
                  {
                    media: {
                      url: DEFAULT_BANNER_URL,
                      content_type: "image/png",
                      contentType: "image/png"
                    }
                  }
                ]
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display
                content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
              }
            ]
          },
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button
                style: 1, // Primary / Blurple
                label: "Beanspruchen",
                emoji: { name: "🤝" },
                custom_id: `bug_claim:${message.author.id}`,
                customId: `bug_claim:${message.author.id}`
              },
              {
                type: 2, // Button
                style: 3, // Success / Green
                label: "Bearbeitet",
                emoji: { name: "✅" },
                custom_id: `bug_resolve:${message.author.id}`,
                customId: `bug_resolve:${message.author.id}`
              },
              {
                type: 2, // Button
                style: 4, // Danger / Red
                label: "Ablehnen",
                emoji: { name: "❌" },
                custom_id: `bug_reject:${message.author.id}`,
                customId: `bug_reject:${message.author.id}`
              }
            ]
          }
        ]
      };

      await message.channel.send(bugPayload);

      const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                      message.member.permissions.has(PermissionFlagsBits.ManageMessages);

      if (!isAdmin && config.bugs_ping_role_id) {
        const pingMsg = await message.channel.send({ content: `<@&${config.bugs_ping_role_id}>` });
        setTimeout(() => pingMsg.delete().catch(() => {}), 1000);
      }
    } catch (err) {
      console.error("Fehler beim Erstellen des Bug-Reports:", err);
    }
    return;
  }

  const boostTypes = [
    MessageType.GuildBoost,
    MessageType.GuildBoostTier1,
    MessageType.GuildBoostTier2,
    MessageType.GuildBoostTier3
  ];

  if (boostTypes.includes(message.type)) {
    console.log(`Boost-System-Nachricht erkannt von: ${message.author?.tag || 'Unbekannt'}`);
    const config = loadConfig();
    const channelId = config.boost.channelId;
    if (!channelId) return;

    const channel = message.guild.channels.cache.get(channelId);
    if (!channel) return;

    let member = message.member;
    if (!member && message.author) {
      try {
        member = await message.guild.members.fetch(message.author.id);
      } catch (e) {
        console.error("Fehler beim Abrufen des Members für Boost:", e);
      }
    }

    if (!member) return;

    try {
      const payload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: buildBoostComponents(config.boost, member, message.guild)
      };
      await channel.send(payload);
      console.log(`Boost-Embed erfolgreich gesendet für ${member.user.tag}`);
      
      // Optional: Delete the default system message if bot has permission
      if (message.deletable) {
        await message.delete().catch(() => {});
      }
    } catch (err) {
      console.error("Fehler beim Senden des Boost-Embeds:", err);
    }
  }
});

// Interaktionen (Slash Commands, Modals, Buttons)
client.on('interactionCreate', async (interaction) => {
  const config = loadConfig();

  // 1. Slash Commands
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'set-verify-role') {
      const role = interaction.options.getRole('role');
      config.verify_role_id = role.id;
      saveConfig(config);
      return interaction.reply({
        content: `✅ Die Verifizierungs-Rolle wurde erfolgreich auf <@&${role.id}> gesetzt!`,
        ephemeral: true
      });
    }

    if (commandName === 'clear') {
      const amount = interaction.options.getInteger('amount');
      
      try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({
          content: `✅ Erfolgreich **${deleted.size}** Nachrichten gelöscht!`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Fehler beim Löschen von Nachrichten:", err);
        return interaction.reply({
          content: `❌ Fehler beim Löschen der Nachrichten: ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (commandName === 'setup-suggestions') {
      const channel = interaction.options.getChannel('channel');
      config.suggestions_channel_id = channel.id;
      saveConfig(config);
      return interaction.reply({
        content: `✅ Der Vorschlags-Kanal wurde erfolgreich auf <#${channel.id}> gesetzt!`,
        ephemeral: true
      });
    }

    if (commandName === 'setup-feedback') {
      const channel = interaction.options.getChannel('channel');
      config.feedback_channel_id = channel.id;
      saveConfig(config);
      return interaction.reply({
        content: `✅ Der Feedback-Kanal wurde erfolgreich auf <#${channel.id}> gesetzt!`,
        ephemeral: true
      });
    }

    if (commandName === 'setup-giveaway') {
      const channel = interaction.options.getChannel('channel');
      config.giveaway_channel_id = channel.id;
      saveConfig(config);
      return interaction.reply({
        content: `✅ Der Gewinnspiel-Kanal wurde erfolgreich auf <#${channel.id}> gesetzt!`,
        ephemeral: true
      });
    }

    if (commandName === 'setup-bugs') {
      const channel = interaction.options.getChannel('channel');
      const pingrole = interaction.options.getRole('pingrole');

      config.bugs_channel_id = channel.id;
      config.bugs_ping_role_id = pingrole ? pingrole.id : null;
      saveConfig(config);

      return interaction.reply({
        content: `✅ Der Bug-Report-Kanal wurde erfolgreich auf <#${channel.id}> gesetzt!${pingrole ? `\n🔔 Bei neuen Berichten wird die Rolle <@&${pingrole.id}> gepingt.` : ''}`,
        ephemeral: true
      });
    }

    if (commandName === 'setup-honeypot') {
      const channel = interaction.options.getChannel('channel');
      config.honeypot_channel_id = channel.id;
      saveConfig(config);

      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = {
          flags: 32768, // IS_COMPONENTS_V2
          components: [
            {
              type: 17, // Container
              accent_color: 16711680, // Red Color (#FF0000)
              accentColor: 16711680,
              components: [
                {
                  type: 10, // Text Display
                  content: `### ⚠️ WARNUNG: Schreibverbot!`
                },
                {
                  type: 14, // Separator
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10, // Text Display
                  content: `🛑 **Achtung:** Dies ist ein geschützter Honey-pot-Kanal!\n\nJede Nachricht, die in diesem Kanal geschrieben wird, führt zu einem **sofortigen und permanenten Ban** vom Server ohne Ausnahme!\n\n*Schreibe hier absolut nichts rein.*`
                },
                {
                  type: 14, // Separator
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10, // Text Display (Instruction)
                  content: `*Wenn du hier schreibst, wirst du gebannt.*`
                },
                {
                  type: 12, // Media Gallery
                  items: [
                    {
                      media: {
                        url: DEFAULT_BANNER_URL,
                        content_type: "image/png",
                        contentType: "image/png"
                      }
                    }
                  ]
                },
                {
                  type: 14, // Separator
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10, // Text Display
                  content: `-# Kazutora Security System • <t:${timestamp}:f>`
                }
              ]
            }
          ]
        };

        await channel.send(payload);

        return interaction.reply({
          content: `✅ Der Honey-pot-Kanal wurde auf <#${channel.id}> gesetzt und die Warnung wurde gesendet!`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Fehler beim Senden der Honeypot-Warnung:", err);
        return interaction.reply({
          content: `❌ Fehler beim Einrichten des Honeypot-Kanals: ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (commandName === 'setup-ticket') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      
      const modal = new ModalBuilder()
        .setCustomId(`modal_ticket_setup:${channel.id}`)
        .setTitle('Ticket-System Setup');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Überschrift')
        .setStyle(TextInputStyle.Short)
        .setValue('### 🎫 Support Ticket')
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Beschreibung')
        .setStyle(TextInputStyle.Paragraph)
        .setValue('### 🎫 Support & Hilfe Center\nWillkommen im Support-Bereich!\n📂 Wähle unten das passende Thema aus dem Menü, um ein privates Ticket zu erstellen.\n💡 Unser Team wird sich schnellstmöglich um dein Anliegen kümmern.')
        .setRequired(true);

      const categoriesInput = new TextInputBuilder()
        .setCustomId('categories')
        .setLabel('Kategorien (Format: Name:Emoji, ...)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue('Support:💬, Bewerbung:📝, Partnerschaft:🤝')
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId('imageUrl')
        .setLabel('Bild-URL (Optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const footerInput = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setValue('Kazutora Community | Hosted by Mogli')
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(categoriesInput),
        new ActionRowBuilder().addComponents(imageInput),
        new ActionRowBuilder().addComponents(footerInput)
      );

      return interaction.showModal(modal);
    }

    if (commandName === 'setup-welcome') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      
      const modal = new ModalBuilder()
        .setCustomId(`modal_welcome_setup:${channel.id}`)
        .setTitle('Willkommen Embed Setup');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Überschrift')
        .setStyle(TextInputStyle.Short)
        .setValue(config.welcome.title)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Beschreibung ({member} = User-Tag)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.welcome.description)
        .setRequired(true);

      const tipInput = new TextInputBuilder()
        .setCustomId('tip')
        .setLabel('Unser Tipp für den Start')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.welcome.tip)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId('imageUrl')
        .setLabel('Bild / Banner-URL')
        .setStyle(TextInputStyle.Short)
        .setValue(config.welcome.imageUrl)
        .setRequired(true);

      const footerInput = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setValue(config.welcome.footer)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(tipInput),
        new ActionRowBuilder().addComponents(imageInput),
        new ActionRowBuilder().addComponents(footerInput)
      );

      return interaction.showModal(modal);
    }

    if (commandName === 'setup-boost') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      
      const modal = new ModalBuilder()
        .setCustomId(`modal_boost_setup:${channel.id}`)
        .setTitle('Boost Embed Setup');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Überschrift')
        .setStyle(TextInputStyle.Short)
        .setValue(config.boost.title)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Beschreibung ({member} = User-Tag)')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.boost.description)
        .setRequired(true);

      const tipInput = new TextInputBuilder()
        .setCustomId('tip')
        .setLabel('Zusatz-Text / Vorteile')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.boost.tip)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId('imageUrl')
        .setLabel('Bild / Banner-URL')
        .setStyle(TextInputStyle.Short)
        .setValue(config.boost.imageUrl)
        .setRequired(true);

      const footerInput = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setValue(config.boost.footer)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(tipInput),
        new ActionRowBuilder().addComponents(imageInput),
        new ActionRowBuilder().addComponents(footerInput)
      );

      return interaction.showModal(modal);
    }

    if (commandName === 'setup-verify') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      
      const modal = new ModalBuilder()
        .setCustomId(`modal_verify_setup:${channel.id}`)
        .setTitle('Verifizierung Embed Setup');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Überschrift')
        .setStyle(TextInputStyle.Short)
        .setValue(config.verify.title)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Beschreibung / Text')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(config.verify.description)
        .setRequired(true);

      const buttonLabelInput = new TextInputBuilder()
        .setCustomId('buttonLabel')
        .setLabel('Button Aufschrift')
        .setStyle(TextInputStyle.Short)
        .setValue(config.verify.buttonLabel)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId('imageUrl')
        .setLabel('Bild / Banner-URL')
        .setStyle(TextInputStyle.Short)
        .setValue(config.verify.imageUrl)
        .setRequired(true);

      const footerInput = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setValue(config.verify.footer)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(buttonLabelInput),
        new ActionRowBuilder().addComponents(imageInput),
        new ActionRowBuilder().addComponents(footerInput)
      );

      return interaction.showModal(modal);
    }

    if (commandName === 'createembed') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      const modal = new ModalBuilder()
        .setCustomId(`modal_custom_embed:${channel.id}`)
        .setTitle('Embed erstellen');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Überschrift')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. ### 👋 Willkommen!')
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Inhalt / Text')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Gib hier den Haupttext des Embeds ein.')
        .setRequired(true);

      const tipInput = new TextInputBuilder()
        .setCustomId('tip')
        .setLabel('Tipp / Info (Optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Optionaler Text unter dem ersten Trennstrich.')
        .setRequired(false);

      const imageInput = new TextInputBuilder()
        .setCustomId('imageUrl')
        .setLabel('Bild-URL (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. https://example.com/image.png')
        .setRequired(false);

      const footerInput = new TextInputBuilder()
        .setCustomId('footer')
        .setLabel('Footer (Optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('z.B. Kazutora Community | Hosted by Mogli')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(tipInput),
        new ActionRowBuilder().addComponents(imageInput),
        new ActionRowBuilder().addComponents(footerInput)
      );

      return interaction.showModal(modal);
    }
  }

  // 2. Modal Submissions
  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith('modal_welcome_setup:')) {
      const channelId = customId.split(':')[1];
      
      config.welcome.channelId = channelId;
      config.welcome.title = interaction.fields.getTextInputValue('title');
      config.welcome.description = interaction.fields.getTextInputValue('description');
      config.welcome.tip = interaction.fields.getTextInputValue('tip');
      config.welcome.imageUrl = interaction.fields.getTextInputValue('imageUrl');
      config.welcome.footer = interaction.fields.getTextInputValue('footer');
      saveConfig(config);

      return interaction.reply({
        content: `✅ **Willkommens-Embed erfolgreich konfiguriert!**\nNachrichten werden ab jetzt in <#${channelId}> gesendet.`,
        ephemeral: true
      });
    }

    if (customId.startsWith('modal_boost_setup:')) {
      const channelId = customId.split(':')[1];
      
      config.boost.channelId = channelId;
      config.boost.title = interaction.fields.getTextInputValue('title');
      config.boost.description = interaction.fields.getTextInputValue('description');
      config.boost.tip = interaction.fields.getTextInputValue('tip');
      config.boost.imageUrl = interaction.fields.getTextInputValue('imageUrl');
      config.boost.footer = interaction.fields.getTextInputValue('footer');
      saveConfig(config);

      return interaction.reply({
        content: `✅ **Boost-Embed erfolgreich konfiguriert!**\nNachrichten werden ab jetzt in <#${channelId}> gesendet.`,
        ephemeral: true
      });
    }

    if (customId.startsWith('modal_verify_setup:')) {
      const channelId = customId.split(':')[1];
      
      config.verify.channelId = channelId;
      config.verify.title = interaction.fields.getTextInputValue('title');
      config.verify.description = interaction.fields.getTextInputValue('description');
      config.verify.buttonLabel = interaction.fields.getTextInputValue('buttonLabel');
      config.verify.imageUrl = interaction.fields.getTextInputValue('imageUrl');
      config.verify.footer = interaction.fields.getTextInputValue('footer');
      saveConfig(config);

      const targetChannel = interaction.guild.channels.cache.get(channelId);
      if (!targetChannel) {
        return interaction.reply({
          content: `❌ Fehler: Der Channel <#${channelId}> konnte nicht gefunden werden!`,
          ephemeral: true
        });
      }

      try {
        const payload = {
          flags: 32768, // IS_COMPONENTS_V2
          components: buildVerifyComponents(config.verify, interaction.guild)
        };
        await targetChannel.send(payload);
        
        return interaction.reply({
          content: `✅ **Verifizierungs-Embed erfolgreich konfiguriert und gesendet!** in <#${channelId}>.`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Fehler beim Senden des Verifizierungs-Embeds:", err);
        return interaction.reply({
          content: `❌ Fehler beim Senden des Verifizierungs-Embeds: ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (customId.startsWith('modal_custom_embed:')) {
      const channelId = customId.split(':')[1];
      const title = trimLines(interaction.fields.getTextInputValue('title'));
      const description = trimLines(interaction.fields.getTextInputValue('description'));
      const tip = trimLines(interaction.fields.getTextInputValue('tip'));
      const imageUrl = interaction.fields.getTextInputValue('imageUrl').trim();
      const footer = trimLines(interaction.fields.getTextInputValue('footer'));

      const targetChannel = interaction.guild.channels.cache.get(channelId);
      if (!targetChannel) {
        return interaction.reply({
          content: `❌ Fehler: Der Channel <#${channelId}> konnte nicht gefunden werden!`,
          ephemeral: true
        });
      }

      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const containerComponents = [
          {
            type: 10, // Text Display
            content: replacePlaceholders(title, null, interaction.guild)
          },
          {
            type: 10, // Text Display
            content: replacePlaceholders(description, null, interaction.guild)
          }
        ];

        if (tip && tip.trim() !== "") {
          containerComponents.push(
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: replacePlaceholders(tip, null, interaction.guild)
            }
          );
        }

        const imgToUse = imageUrl && imageUrl.trim() !== "" ? imageUrl : DEFAULT_BANNER_URL;
        if (imgToUse) {
          containerComponents.push(
            {
              type: 12, // Media Gallery
              items: [
                {
                  media: {
                    url: imgToUse,
                    content_type: "image/png",
                    contentType: "image/png"
                  }
                }
              ]
            }
          );
        }

        if (footer && footer.trim() !== "") {
          containerComponents.push(
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `-# ${replacePlaceholders(footer, null, interaction.guild)} • <t:${timestamp}:f>`
            }
          );
        }

        const payload = {
          flags: 32768, // IS_COMPONENTS_V2
          components: [
            {
              type: 17, // Container
              accent_color: 4530517, // #452155
              accentColor: 4530517,
              components: containerComponents
            }
          ]
        };

        await targetChannel.send(payload);

        return interaction.reply({
          content: `✅ **Custom-Embed erfolgreich gesendet!** in <#${channelId}>.`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Fehler beim Senden des Custom-Embeds:", err);
        return interaction.reply({
          content: `❌ Fehler beim Senden des Custom-Embeds: ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (customId.startsWith('modal_ticket_setup:')) {
      const channelId = customId.split(':')[1];
      const title = trimLines(interaction.fields.getTextInputValue('title'));
      const description = trimLines(interaction.fields.getTextInputValue('description'));
      const categoriesInput = trimLines(interaction.fields.getTextInputValue('categories'));
      const imageUrl = interaction.fields.getTextInputValue('imageUrl').trim();
      const footer = trimLines(interaction.fields.getTextInputValue('footer'));

      const targetChannel = interaction.guild.channels.cache.get(channelId);
      if (!targetChannel) {
        return interaction.reply({
          content: `❌ Fehler: Der Channel <#${channelId}> konnte nicht gefunden werden!`,
          ephemeral: true
        });
      }

      try {
        const parts = categoriesInput.split(',').map(p => p.trim()).filter(Boolean);
        const selectOptions = [];
        
        for (const part of parts) {
          const colonIndex = part.indexOf(':');
          let label = part;
          let emoji = null;
          
          if (colonIndex !== -1) {
            label = part.substring(0, colonIndex).trim();
            emoji = part.substring(colonIndex + 1).trim();
          }
          
          const option = {
            label: label,
            value: label.toLowerCase(),
            description: `Öffne ein Ticket für ${label}`
          };
          
          if (emoji) {
            option.emoji = { name: emoji };
          }
          
          selectOptions.push(option);
        }

        // Auto-append Kanal-Infos & Anleitungen option
        selectOptions.push({
          label: "Kanal-Infos & Anleitungen",
          value: "kanal_infos_help",
          description: "Zeigt die Schreib-Anleitungen für alle Kanäle an",
          emoji: { name: "📖" }
        });

        const selectMenuComponents = [
          {
            type: 3, // String Select Menu
            custom_id: 'ticket_select',
            customId: 'ticket_select',
            placeholder: 'Wähle eine Kategorie...',
            options: selectOptions.slice(0, 25)
          }
        ];

        const containerComponents = [
          {
            type: 10, // Text Display
            content: title
          },
          {
            type: 14, // Separator
            divider: true,
            spacing: 1
          },
          {
            type: 10, // Text Display
            content: `📂 **Bereich:** Support & Tickets\n🛠️ **System:** Ticket-Erstellung\n⏰ **Verfügbarkeit:** 24/7 Support\n💬 **Beschreibung:** ${description}`
          },
          {
            type: 14, // Separator
            divider: true,
            spacing: 1
          },
          {
            type: 10, // Text Display
            content: `*Wähle unten eine passende Kategorie aus, um ein Support-Ticket zu öffnen!*`
          }
        ];

        const imgToUse = imageUrl && imageUrl !== "" ? imageUrl : DEFAULT_BANNER_URL;
        if (imgToUse) {
          containerComponents.push(
            {
              type: 12, // Media Gallery
              items: [
                {
                  media: {
                    url: imgToUse,
                    content_type: "image/png",
                    contentType: "image/png"
                  }
                }
              ]
            }
          );
        }

        const timestamp = Math.floor(Date.now() / 1000);
        if (footer && footer !== "") {
          containerComponents.push(
            {
              type: 14, // Separator
              divider: true,
              spacing: 1
            },
            {
              type: 10, // Text Display
              content: `-# ${footer} • <t:${timestamp}:f>`
            }
          );
        }

        const payload = {
          flags: 32768, // IS_COMPONENTS_V2
          components: [
            {
              type: 17, // Container
              accent_color: 4530517, // #452155
              accentColor: 4530517,
              components: containerComponents
            }
          ]
        };

        if (selectMenuComponents[0].options.length > 0) {
          payload.components.push({
            type: 1, // Action Row
            components: selectMenuComponents
          });
        }

        await targetChannel.send(payload);

        return interaction.reply({
          content: `✅ **Ticket-System erfolgreich gesendet und eingerichtet!** in <#${channelId}>.`,
          ephemeral: true
        });

      } catch (err) {
        console.error("Fehler beim Senden des Ticket-Panels:", err);
        return interaction.reply({
          content: `❌ Fehler beim Einrichten des Ticket-Panels: ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (customId.startsWith('modal_verify_solve:')) {
      const expectedCode = customId.split(':')[1];
      const userCode = interaction.fields.getTextInputValue('user_code').trim();

      if (userCode.toUpperCase() !== expectedCode.toUpperCase()) {
        return interaction.reply({
          content: `❌ Falscher Verifizierungs-Code! Bitte klicke erneut auf den Button und gib den angezeigten Code korrekt ein.`,
          ephemeral: true
        });
      }

      const roleId = config.verify_role_id;
      if (!roleId) {
        return interaction.reply({
          content: `❌ Es wurde noch keine Verifizierungs-Rolle eingerichtet! Bitte einen Administrator, \`/set-verify-role\` auszuführen.`,
          ephemeral: true
        });
      }

      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({
          content: `❌ Die eingerichtete Verifizierungs-Rolle konnte auf diesem Server nicht gefunden werden!`,
          ephemeral: true
        });
      }

      try {
        await interaction.member.roles.add(role);
        return interaction.reply({
          content: `✅ Du hast den Code richtig eingegeben und bist jetzt erfolgreich verifiziert! Viel Spaß auf dem Server! 🎉`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Fehler beim Hinzufügen der Verifizierungs-Rolle:", err);
        return interaction.reply({
          content: `❌ Fehler: Ich konnte dir die Rolle nicht geben. Bitte stelle sicher, dass meine Bot-Rolle in der Discord Rollenhierarchie über der Verifizierungs-Rolle liegt!\n\n*Fehlerdetails: ${err.message}*`,
          ephemeral: true
        });
      }
    }

    if (customId === 'modal_ticket_rename') {
      const newName = interaction.fields.getTextInputValue('new_name').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      
      if (!newName) {
        return interaction.reply({
          content: `❌ Ungültiger Name!`,
          ephemeral: true
        });
      }

      try {
        await interaction.channel.setName(newName);
        return interaction.reply({
          content: `✅ Das Ticket wurde erfolgreich in **${newName}** umbenannt!`,
          ephemeral: true
        });
      } catch (err) {
        console.error("Fehler beim Umbenennen des Tickets:", err);
        return interaction.reply({
          content: `❌ Fehler beim Umbenennen: ${err.message}`,
          ephemeral: true
        });
      }
    }
  }

  // 3. Button Interactions
  if (interaction.isButton()) {
    if (interaction.customId === 'ticket_info_channels') {
      const config = loadConfig();
      const timestamp = Math.floor(Date.now() / 1000);

      const suggChan = config.suggestions_channel_id ? `<#${config.suggestions_channel_id}>` : `*Nicht eingerichtet*`;
      const feedChan = config.feedback_channel_id ? `<#${config.feedback_channel_id}>` : `*Nicht eingerichtet*`;
      const giveChan = config.giveaway_channel_id ? `<#${config.giveaway_channel_id}>` : `*Nicht eingerichtet*`;
      const bugChan = config.bugs_channel_id ? `<#${config.bugs_channel_id}>` : `*Nicht eingerichtet*`;
      const honeyChan = config.honeypot_channel_id ? `<#${config.honeypot_channel_id}>` : `*Nicht eingerichtet*`;

      const helpPayload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
          {
            type: 17, // Container
            accent_color: 4530517, // #452155
            accentColor: 4530517,
            components: [
              {
                type: 10, // Text Display (Title)
                content: `### 📖 Kazutora Kanal-Anleitungen`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Body)
                content: `💡 **Vorschläge:** ${suggChan} • Idee direkt absenden\n💬 **Feedback:** ${feedChan} • \`[Kommentar] [Supporter] [Sterne]\` (z.B. \`Super Hilfe Mogli 5\`)\n🎁 **Giveaway:** ${giveChan} • \`[Preis] [Gewinner] [Minuten]\` (z.B. \`Nitro 1 30\`)\n🐛 **Bug-Reports:** ${bugChan} • Bug direkt melden\n⚠️ **Honey-pot:** ${honeyChan} • **Schreibverbot! (Insta-Ban)**`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Footnote)
                content: `*Diese Anleitung ist nur für dich sichtbar.*`
              },
              {
                type: 12, // Media Gallery
                items: [
                  {
                    media: {
                      url: DEFAULT_BANNER_URL,
                      content_type: "image/png",
                      contentType: "image/png"
                    }
                  }
                ]
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Footer)
                content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
              }
            ]
          }
        ]
      };

      return interaction.reply({
        ...helpPayload,
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith('suggestion_star:')) {
      const suggestionId = interaction.customId.split(':')[1];
      const config = loadConfig();
      
      if (!config.suggestions) config.suggestions = {};
      const suggestion = config.suggestions[suggestionId];
      if (!suggestion) {
        return interaction.reply({
          content: `❌ Dieser Vorschlag existiert nicht mehr in der Datenbank!`,
          ephemeral: true
        });
      }

      if (!suggestion.stars) suggestion.stars = [];
      
      const userId = interaction.user.id;
      const index = suggestion.stars.indexOf(userId);
      if (index === -1) {
        suggestion.stars.push(userId);
      } else {
        suggestion.stars.splice(index, 1);
      }
      
      saveConfig(config);

      const count = suggestion.stars.length;
      const timestamp = Math.floor(interaction.message.createdTimestamp / 1000);

      const payload = {
        components: [
          {
            type: 17, // Container
            accent_color: 4530517,
            accentColor: 4530517,
            components: [
              {
                type: 10, // Text Display (Title)
                content: `### 💡 Community-Vorschlag`
              },
              {
                type: 14,
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Body)
                content: `👤 **Eingereicht von:** <@${suggestion.authorId}>\n💡 **Idee:** ${trimLines(suggestion.content)}\n⭐ **Sterne-Bewertung:** ${count}\n⏰ **Eingestellt am:** <t:${timestamp}:f>\n📢 **Diskussion:** Thread wurde unten erstellt!`
              },
              {
                type: 14,
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Instruction)
                content: `*Bewerte den Vorschlag mit dem Stern-Button unten!*`
              },
              {
                type: 12, // Media Gallery
                items: [
                  {
                    media: {
                      url: DEFAULT_BANNER_URL,
                      content_type: "image/png",
                      contentType: "image/png"
                    }
                  }
                ]
              },
              {
                type: 14,
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display (Footer)
                content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
              }
            ]
          },
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button
                style: 1, // Primary
                label: `${count}`,
                emoji: { name: "⭐" },
                custom_id: `suggestion_star:${suggestionId}`,
                customId: `suggestion_star:${suggestionId}`
              },
              {
                type: 2, // Button
                style: 4, // Danger
                label: `Löschen`,
                emoji: { name: "🗑️" },
                custom_id: `suggestion_delete:${suggestionId}`,
                customId: `suggestion_delete:${suggestionId}`
              }
            ]
          }
        ]
      };

      await interaction.update(payload);
      return;
    }

    if (interaction.customId.startsWith('suggestion_delete:')) {
      const suggestionId = interaction.customId.split(':')[1];
      
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                      interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

      if (!isAdmin) {
        return interaction.reply({
          content: `❌ Nur Teammitglieder können Vorschläge löschen!`,
          ephemeral: true
        });
      }

      const config = loadConfig();
      const suggestion = config.suggestions?.[suggestionId];
      
      // Delete the message
      await interaction.message.delete().catch(() => {});
      
      // Delete the thread if we have its ID
      if (suggestion && suggestion.threadId) {
        const thread = interaction.guild.channels.cache.get(suggestion.threadId);
        if (thread) {
          await thread.delete().catch(() => {});
        }
      }

      if (config.suggestions && config.suggestions[suggestionId]) {
        delete config.suggestions[suggestionId];
        saveConfig(config);
      }
      return;
    }
    if (interaction.customId.startsWith('bug_delete:')) {
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                      interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

      if (!isAdmin) {
        return interaction.reply({
          content: `❌ Nur Teammitglieder können Bug-Reports löschen!`,
          ephemeral: true
        });
      }

      await interaction.message.delete().catch(() => {});
      return;
    }

    if (interaction.customId.startsWith('bug_claim:') || 
        interaction.customId.startsWith('bug_resolve:') || 
        interaction.customId.startsWith('bug_reject:')) {

      const parts = interaction.customId.split(':');
      const action = parts[0];
      const reporterId = parts[1];

      // Check if user is moderator/admin
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                      interaction.member.permissions.has(PermissionFlagsBits.ManageMessages);

      if (!isAdmin) {
        return interaction.reply({
          content: `❌ Nur Teammitglieder können Bug-Reports bearbeiten!`,
          ephemeral: true
        });
      }

      // Read current embed content
      const embedComponent = interaction.message.components[0];
      if (!embedComponent || embedComponent.type !== 17) {
        return interaction.reply({
          content: `❌ Bug-Report-Daten konnten nicht gelesen werden.`,
          ephemeral: true
        });
      }

      const bodyComponent = embedComponent.components[2];
      if (!bodyComponent) {
        return interaction.reply({
          content: `❌ Bug-Report-Daten konnten nicht gelesen werden.`,
          ephemeral: true
        });
      }

      let textDisplayComponent;
      if (bodyComponent.type === 9) {
        textDisplayComponent = bodyComponent.components[0];
      } else if (bodyComponent.type === 10) {
        textDisplayComponent = bodyComponent;
      } else {
        return interaction.reply({
          content: `❌ Fehler beim Lesen der Bug-Beschreibung.`,
          ephemeral: true
        });
      }

      let text = textDisplayComponent.content;

      // Extract details
      const descMatch = text.match(/📝 \*\*Beschreibung:\*\* ([\s\S]*?)\n⚙️/);
      const bugDescription = descMatch ? descMatch[1] : "Unbekannt";

      if (action === 'bug_claim') {
        if (text.includes('⚙️ **Status:** 🟡 In Bearbeitung')) {
          return interaction.reply({
            content: `❌ Dieser Bug-Report wird bereits bearbeitet!`,
            ephemeral: true
          });
        }
        if (text.includes('⚙️ **Status:** 🟢 Gelöst') || text.includes('⚙️ **Status:** ⚫ Abgelehnt')) {
          return interaction.reply({
            content: `❌ Dieser Bug-Report ist bereits abgeschlossen!`,
            ephemeral: true
          });
        }

        // Update text
        const newText = text
          .replace(/⚙️ \*\*Status:\*\* .*/, `⚙️ **Status:** 🟡 In Bearbeitung`)
          .replace(/🤝 \*\*Bearbeiter:\*\* .*/, `🤝 **Bearbeiter:** <@${interaction.user.id}>`);

        textDisplayComponent.content = newText;

        // Edit the message
        await interaction.update({
          components: interaction.message.components
        });

        return;
      }

      if (action === 'bug_resolve' || action === 'bug_reject') {
        const isResolve = action === 'bug_resolve';
        const statusText = isResolve ? '🟢 Gelöst' : '⚫ Abgelehnt';

        // Update text
        const newText = text
          .replace(/⚙️ \*\*Status:\*\* .*/, `⚙️ **Status:** ${statusText}`)
          .replace(/🤝 \*\*Bearbeiter:\*\* .*/, `🤝 **Bearbeiter:** <@${interaction.user.id}>`);

        textDisplayComponent.content = newText;

        // Replace current action row with a red delete button
        const newActionRow = {
          type: 1, // Action Row
          components: [
            {
              type: 2, // Button
              style: 4, // Danger / Red
              label: "Bericht löschen",
              emoji: { name: "🗑️" },
              custom_id: `bug_delete:${reporterId}`,
              customId: `bug_delete:${reporterId}`
            }
          ]
        };

        // Update message
        await interaction.update({
          components: [
            interaction.message.components[0],
            newActionRow
          ]
        });

        // Notify the reporter in DM
        try {
          const reporter = await client.users.fetch(reporterId);
          if (reporter) {
            const timestamp = Math.floor(Date.now() / 1000);
            const dmPayload = {
              flags: 32768, // IS_COMPONENTS_V2
              components: [
                {
                  type: 17, // Container
                  accent_color: 4530517,
                  accentColor: 4530517,
                  components: [
                    {
                      type: 10,
                      content: `### 🐛 Bug-Report Update`
                    },
                    {
                      type: 14,
                      divider: true,
                      spacing: 1
                    },
                    {
                      type: 10,
                      content: `Dein Bug-Report auf **${interaction.guild.name}** wurde aktualisiert!\n⚙️ **Status:** ${statusText}\n👤 **Bearbeiter:** <@${interaction.user.id}>\n📝 **Deine Meldung:** ${bugDescription}`
                    },
                    {
                      type: 14,
                      divider: true,
                      spacing: 1
                    },
                    {
                      type: 10, // Text Display (Instruction)
                      content: `*Vielen Dank für deine Meldung! Gemeinsam halten wir den Server fehlerfrei.*`
                    },
                    {
                      type: 12,
                      items: [
                        {
                          media: {
                            url: DEFAULT_BANNER_URL,
                            content_type: "image/png",
                            contentType: "image/png"
                          }
                        }
                      ]
                    },
                    {
                      type: 14,
                      divider: true,
                      spacing: 1
                    },
                    {
                      type: 10,
                      content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
                    }
                  ]
                }
              ]
            };
            await reporter.send(dmPayload);
          }
        } catch (dmErr) {
          console.warn(`Konnte keine DM an Bug-Reporter ${reporterId} senden:`, dmErr);
        }

        return;
      }
    }

    if (interaction.customId === 'verify_rules') {
      const timestamp = Math.floor(Date.now() / 1000);
      const rulesPayload = {
        flags: 32768, // IS_COMPONENTS_V2
        components: [
          {
            type: 17, // Container
            accent_color: 4530517, // #452155
            accentColor: 4530517,
            components: [
              {
                type: 10, // Text Display
                content: `### 📘 Kazutora Regeln`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display
                content: `**1. 🤝 Respektvoll bleiben:** Behandle alle Mitglieder freundlich und respektvoll. Beleidigungen, Mobbing und persönliche Angriffe sind nicht erlaubt.\n**2. 🚫 Kein Spam:** Vermeide Spam, unnötige Nachrichten, Chat-Fluten und wiederholte Inhalte.\n**3. 🔞 Keine unangemessenen Inhalte:** Pornografische, extrem gewalttätige oder anderweitig unangemessene Inhalte sind verboten.\n**4. 📢 Keine Werbung ohne Erlaubnis:** Werbung für andere Server, Social-Media-Accounts oder Produkte ist nur mit Zustimmung des Teams erlaubt.\n**5. 🛡️ Privatsphäre respektieren:** Teile keine persönlichen Daten von dir oder anderen. Dazu gehören Namen, Adressen, Telefonnummern und private Bilder.\n**6. 💬 Nutze die richtigen Kanäle:** Poste Inhalte in den dafür vorgesehenen Channels und halte dich an deren jeweilige Regeln.\n**7. ⚠️ Keine Provokationen oder unnötigen Streitigkeiten:** Diskussionen sind willkommen, aber respektvoll. Absichtliches Provozieren oder Eskalieren ist nicht erlaubt.\n**8. 👮 Teammitglieder respektieren:** Anweisungen des Moderations- und Serverteams sind zu beachten. Entscheidungen können bei Bedarf sachlich hinterfragt werden.\n**9. 🐛 Keine Cheats, Hacks oder Exploits:** Das Ausnutzen von Bugs, Cheats oder anderen unfairen Methoden ist verboten.\n**10. ❤️ Habt Spaß und helft anderen:** Der Server soll ein freundlicher Ort für alle sein. Unterstützt neue Mitglieder und tragt zu einer angenehmen Community bei.`
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display
                content: `*Beachte die Regeln und halte dich auch daran.*`
              },
              {
                type: 12, // Media Gallery
                items: [
                  {
                    media: {
                      url: DEFAULT_BANNER_URL,
                      content_type: "image/png",
                      contentType: "image/png"
                    }
                  }
                ]
              },
              {
                type: 14, // Separator
                divider: true,
                spacing: 1
              },
              {
                type: 10, // Text Display
                content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
              }
            ]
          }
        ]
      };

      return interaction.reply({
        ...rulesPayload,
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith('giveaway_join:')) {
      const giveawayId = interaction.customId.split(':')[1];
      const config = loadConfig();
      const giveaway = config.giveaways?.[giveawayId];

      if (!giveaway) {
        return interaction.reply({
          content: `❌ Dieses Gewinnspiel existiert nicht mehr oder ist bereits beendet!`,
          ephemeral: true
        });
      }

      if (!giveaway.participants) giveaway.participants = [];

      const userId = interaction.user.id;
      const isParticipating = giveaway.participants.includes(userId);

      if (isParticipating) {
        giveaway.participants = giveaway.participants.filter(id => id !== userId);
        saveConfig(config);

        const timestamp = Math.floor(giveaway.endTimestamp / 1000);
        const originalPayload = {
          flags: 32768,
          components: [
            ...buildGiveawayComponents(giveaway.prize, giveaway.winnersCount, giveaway.endTimestamp, giveaway.participants.length),
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: "Teilnehmen",
                  emoji: { name: "🎉" },
                  custom_id: `giveaway_join:${giveawayId}`,
                  customId: `giveaway_join:${giveawayId}`
                }
              ]
            }
          ]
        };
        await interaction.message.edit(originalPayload).catch(() => {});

        return interaction.reply({
          content: `❌ Du nimmst nicht mehr am Gewinnspiel teil.`,
          ephemeral: true
        });
      } else {
        giveaway.participants.push(userId);
        saveConfig(config);

        const originalPayload = {
          flags: 32768,
          components: [
            ...buildGiveawayComponents(giveaway.prize, giveaway.winnersCount, giveaway.endTimestamp, giveaway.participants.length),
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: "Teilnehmen",
                  emoji: { name: "🎉" },
                  custom_id: `giveaway_join:${giveawayId}`,
                  customId: `giveaway_join:${giveawayId}`
                }
              ]
            }
          ]
        };
        await interaction.message.edit(originalPayload).catch(() => {});

        return interaction.reply({
          content: `✅ Du nimmst nun erfolgreich am Gewinnspiel teil! Viel Glück! 🍀`,
          ephemeral: true
        });
      }
    }

    if (interaction.customId.startsWith('ticket_open_dm:')) {
      const parts = interaction.customId.split(':');
      const guildId = parts[1];
      const categoryName = parts[2];

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return interaction.reply({
          content: `❌ Der Server für dieses Ticket konnte nicht gefunden werden!`,
          ephemeral: true
        });
      }

      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch (e) {
        return interaction.reply({
          content: `❌ Du bist kein Mitglied des Servers **${guild.name}** mehr!`,
          ephemeral: true
        });
      }

      const existingChannel = guild.channels.cache.find(c => 
        c.name.includes(`ticket-${categoryName}-${member.user.username.toLowerCase()}`) ||
        (c.name.startsWith('ticket-') && c.name.endsWith(`-${member.user.username.toLowerCase()}`)) ||
        c.name.endsWith(`-${member.user.username.toLowerCase()}`)
      );

      if (existingChannel) {
        return interaction.reply({
          content: `❌ Du hast bereits ein offenes Ticket auf diesem Server: <#${existingChannel.id}>`,
          ephemeral: true
        });
      }

      const loadingMsg = await interaction.reply({
        content: `⏳ Ticket wird auf dem Server **${guild.name}** erstellt...`,
        ephemeral: true,
        fetchReply: true
      });

      await createTicket(guild, member, categoryName, interaction, loadingMsg, true);
      return;
    }

    if (interaction.customId.startsWith('ticket_close:')) {
      const ownerId = interaction.customId.split(':')[1];
      const isOwner = interaction.user.id === ownerId;
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                      interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

      if (!isOwner && !isAdmin) {
        return interaction.reply({
          content: `❌ Nur der Ersteller des Tickets oder Teammitglieder können dieses Ticket schließen!`,
          ephemeral: true
        });
      }

      await interaction.reply({
        content: `🔒 **Ticket wird in 5 Sekunden geschlossen und gelöscht...**`
      });

      setTimeout(async () => {
        try {
          await interaction.channel.delete();
        } catch (e) {
          console.error("Fehler beim Löschen des Ticket-Kanals:", e);
        }
      }, 5000);
      return;
    }

    if (interaction.customId.startsWith('ticket_claim:')) {
      const ownerId = interaction.customId.split(':')[1];
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                      interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

      if (!isAdmin) {
        return interaction.reply({
          content: `❌ Nur Teammitglieder können dieses Ticket beanspruchen!`,
          ephemeral: true
        });
      }

      try {
        const channelName = interaction.channel.name;
        if (channelName.startsWith('claimed-')) {
          return interaction.reply({
            content: `❌ Dieses Ticket wurde bereits beansprucht!`,
            ephemeral: true
          });
        }

        const newName = channelName.replace('ticket-', 'claimed-');
        await interaction.channel.setName(newName.substring(0, 100));

        await interaction.reply({
          content: `🤝 <@${interaction.user.id}> hat dieses Ticket beansprucht und wird dir nun helfen!`
        });
      } catch (err) {
        console.error("Fehler beim Beanspruchen des Tickets:", err);
        return interaction.reply({
          content: `❌ Fehler beim Beanspruchen des Tickets: ${err.message}`,
          ephemeral: true
        });
      }
      return;
    }

    if (interaction.customId.startsWith('ticket_rename:')) {
      const ownerId = interaction.customId.split(':')[1];
      const isOwner = interaction.user.id === ownerId;
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                      interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

      if (!isOwner && !isAdmin) {
        return interaction.reply({
          content: `❌ Keine Berechtigung zum Umbenennen dieses Tickets!`,
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`modal_ticket_rename`)
        .setTitle('Ticket umbenennen');

      const nameInput = new TextInputBuilder()
        .setCustomId('new_name')
        .setLabel('Neuer Kanalname')
        .setStyle(TextInputStyle.Short)
        .setValue(interaction.channel.name)
        .setMinLength(1)
        .setMaxLength(80)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
      return interaction.showModal(modal);
    }
    if (interaction.customId === 'verify_user') {
      const roleId = config.verify_role_id;
      if (!roleId) {
        return interaction.reply({
          content: `❌ Es wurde noch keine Verifizierungs-Rolle eingerichtet! Bitte einen Administrator, \`/set-verify-role\` auszuführen.`,
          ephemeral: true
        });
      }

      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({
          content: `❌ Die eingerichtete Verifizierungs-Rolle konnte auf diesem Server nicht gefunden werden!`,
          ephemeral: true
        });
      }

      if (interaction.member.roles.cache.has(roleId)) {
        return interaction.reply({
          content: `ℹ️ Du bist bereits verifiziert!`,
          ephemeral: true
        });
      }

      // Open the captcha modal!
      const captchaCode = generateVerifyCode(5);
      
      const modal = new ModalBuilder()
        .setCustomId(`modal_verify_solve:${captchaCode}`)
        .setTitle('Verifizierung');

      const codeInput = new TextInputBuilder()
        .setCustomId('user_code')
        .setLabel(`Code eingeben: ${captchaCode}`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Trage den obigen Code ein (Groß-/Kleinschreibung egal)')
        .setMinLength(5)
        .setMaxLength(5)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(codeInput));
      return interaction.showModal(modal);
    }
  }

  // 4. Select Menu Interactions
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'ticket_select') {
      const categoryName = interaction.values[0];

      if (categoryName === 'kanal_infos_help') {
        // Reset dropdown by updating components
        await interaction.update({ components: interaction.message.components }).catch(() => {});

        const config = loadConfig();
        const timestamp = Math.floor(Date.now() / 1000);

        const suggChan = config.suggestions_channel_id ? `<#${config.suggestions_channel_id}>` : `*Nicht eingerichtet*`;
        const feedChan = config.feedback_channel_id ? `<#${config.feedback_channel_id}>` : `*Nicht eingerichtet*`;
        const giveChan = config.giveaway_channel_id ? `<#${config.giveaway_channel_id}>` : `*Nicht eingerichtet*`;
        const bugChan = config.bugs_channel_id ? `<#${config.bugs_channel_id}>` : `*Nicht eingerichtet*`;
        const honeyChan = config.honeypot_channel_id ? `<#${config.honeypot_channel_id}>` : `*Nicht eingerichtet*`;

        const helpPayload = {
          flags: 32768, // IS_COMPONENTS_V2
          components: [
            {
              type: 17, // Container
              accent_color: 4530517, // #452155
              accentColor: 4530517,
              components: [
                {
                  type: 10, // Text Display (Title)
                  content: `### 📖 Kazutora Kanal-Anleitungen`
                },
                {
                  type: 14, // Separator
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10, // Text Display (Body)
                  content: `💡 **Vorschläge:** ${suggChan} • Idee direkt absenden\n💬 **Feedback:** ${feedChan} • \`[Kommentar] [Supporter] [Sterne]\` (z.B. \`Super Hilfe Mogli 5\`)\n🎁 **Giveaway:** ${giveChan} • \`[Preis] [Gewinner] [Minuten]\` (z.B. \`Nitro 1 30\`)\n🐛 **Bug-Reports:** ${bugChan} • Bug direkt melden\n⚠️ **Honey-pot:** ${honeyChan} • **Schreibverbot! (Insta-Ban)**`
                },
                {
                  type: 14, // Separator
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10, // Text Display (Footnote)
                  content: `*Diese Anleitung ist nur für dich sichtbar.*`
                },
                {
                  type: 12, // Media Gallery
                  items: [
                    {
                      media: {
                        url: DEFAULT_BANNER_URL,
                        content_type: "image/png",
                        contentType: "image/png"
                      }
                    }
                  ]
                },
                {
                  type: 14, // Separator
                  divider: true,
                  spacing: 1
                },
                {
                  type: 10, // Text Display (Footer)
                  content: `-# Kazutora Community | Hosted by Mogli • <t:${timestamp}:f>`
                }
              ]
            }
          ]
        };

        return interaction.followUp({
          ...helpPayload,
          ephemeral: true
        });
      }

      const member = interaction.member;
      const guild = interaction.guild;

      const existingChannel = guild.channels.cache.find(c => 
        c.name.includes(`ticket-${categoryName}-${member.user.username.toLowerCase()}`) ||
        (c.name.startsWith('ticket-') && c.name.endsWith(`-${member.user.username.toLowerCase()}`)) ||
        c.name.endsWith(`-${member.user.username.toLowerCase()}`)
      );

      if (existingChannel) {
        // Reset dropdown by updating components
        await interaction.update({ components: interaction.message.components }).catch(() => {});
        return interaction.followUp({
          content: `❌ Du hast bereits ein offenes Ticket: <#${existingChannel.id}>`,
          ephemeral: true
        });
      }

      // Reset dropdown immediately
      await interaction.update({ components: interaction.message.components }).catch(() => {});

      // Send ephemeral loading follow-up
      const loadingMsg = await interaction.followUp({
        content: `⏳ Ticket wird erstellt...`,
        ephemeral: true
      });

      await createTicket(guild, member, categoryName, interaction, loadingMsg, false);
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Fehler: Kein DISCORD_TOKEN in der .env gefunden!");
  process.exit(1);
}

client.login(token).catch(err => {
  console.log("Fehler beim Einloggen des Bots:", err);
});

// Express keep-alive web server
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3099;

app.get('/', (req, res) => {
  res.send('Kazutora Bot is online and running!');
});

app.listen(PORT, () => {
  console.log(`Keep-alive web server is running on port ${PORT}`);
});

