require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Fehler: Kein DISCORD_TOKEN in der .env gefunden!");
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Starte Registrierung der Slash Commands...');

    const clientId = Buffer.from(token.split('.')[0], 'base64').toString('ascii');
    console.log(`Verwende Client-ID: ${clientId}`);

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('Slash Commands wurden erfolgreich global registriert!');
  } catch (error) {
    console.error('Fehler beim Registrieren der Slash Commands:', error);
  }
})();
