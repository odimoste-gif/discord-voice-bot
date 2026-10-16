const {
    Client,
    GatewayIntentBits,
    ChannelType,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const {
    joinVoiceChannel,
    VoiceConnectionStatus
} = require("@discordjs/voice");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// حط آيدي حسابك هنا
const OWNER_ID = "987100237858496512";

// حط آيدي السيرفر هنا
const GUILD_ID = "1122914971395821639";

const VOICE_CHANNEL_ID = "1560623857260306462";

// أمر /send
const commands = [
    new SlashCommandBuilder()
        .setName("send")
        .setDescription("إرسال رسالة من البوت")
        .addStringOption(option =>
            option
                .setName("message")
                .setDescription("الرسالة التي تريد إرسالها")
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option
                .setName("file")
                .setDescription("صورة أو فيديو أو ملف")
                .setRequired(false)
        )
].map(command => command.toJSON());

client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // تسجيل الأمر في السيرفر
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );

        console.log("تم تسجيل أمر /send!");
    } catch (error) {
        console.error("خطأ في تسجيل الأمر:", error);
    }

    // دخول الروم الصوتي
    const channel = client.channels.cache.get(VOICE_CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
        console.log("لم أجد الروم الصوتي.");
        return;
    }

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log("البوت دخل الروم الصوتي!");
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log("البوت انفصل من الروم.");
    });
});

// تنفيذ /send
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName !== "send") return;

    // فقط أنت تستطيع استخدام الأمر
    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
            content: "❌ ما عندك صلاحية تستخدم هذا الأمر.",
            ephemeral: true
        });
    }

    const message = interaction.options.getString("message");
    const file = interaction.options.getAttachment("file");

    try {
        await interaction.channel.send({
            content: message,
            files: file ? [file.url] : []
        });

        await interaction.reply({
            content: "✅ تم الإرسال.",
            ephemeral: true
        });

    } catch (error) {
        console.error(error);

        await interaction.reply({
            content: "❌ حصل خطأ أثناء الإرسال.",
            ephemeral: true
        });
    }
});

console.log("TOKEN موجود؟", !!TOKEN);
console.log("طول التوكن:", TOKEN ? TOKEN.length : 0);

client.login(TOKEN);
