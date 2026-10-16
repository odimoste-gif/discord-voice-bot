
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
    VoiceConnectionStatus,
    entersState
} = require("@discordjs/voice");

// ================================
// إعدادات البوت
// ================================

const TOKEN = process.env.DISCORD_TOKEN;

const OWNER_ID = "987100237858496512";
const GUILD_ID = "1122914971395821639";
const VOICE_CHANNEL_ID = "1560623857260306462";

// ================================
// إنشاء البوت
// ================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// ================================
// أمر /send
// ================================

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

// ================================
// عند تشغيل البوت
// ================================

client.once("clientReady", async () => {
    console.log(`تم تسجيل الدخول: ${client.user.tag}`);

    if (!TOKEN) {
        console.error("خطأ: DISCORD_TOKEN غير موجود في Railway.");
        process.exit(1);
    }

    try {
        // جلب السيرفر
        const guild = await client.guilds.fetch(GUILD_ID);

        console.log("تم العثور على السيرفر:", guild.name);

        // تسجيل أمر /send
        const rest = new REST({ version: "10" }).setToken(TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: commands }
        );

        console.log("تم تسجيل أمر /send بنجاح!");

        // جلب الروم مباشرة من Discord
        const channel = await client.channels.fetch(
            VOICE_CHANNEL_ID
        );

        if (!channel) {
            console.error("لم يتم العثور على الروم الصوتي.");
            return;
        }

        console.log("نوع الروم:", channel.type);
        console.log("آيدي السيرفر للروم:", channel.guildId);

        // التحقق من نوع الروم والسيرفر
        if (channel.guildId !== GUILD_ID) {
            console.error(
                "الروم الصوتي لا يتبع السيرفر المحدد في GUILD_ID."
            );
            return;
        }

        if (
            channel.type !== ChannelType.GuildVoice &&
            channel.type !== ChannelType.GuildStageVoice
        ) {
            console.error(
                "الآيدي يعود إلى قناة ليست رومًا صوتيًا أو روم Stage."
            );
            return;
        }

        // الاتصال بالروم الصوتي
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guildId,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: false
        });

        connection.on(
            VoiceConnectionStatus.Ready,
            () => {
                console.log("نجح البوت في دخول الروم الصوتي!");
            }
        );

        connection.on(
            VoiceConnectionStatus.Disconnected,
            () => {
                console.log("انقطع اتصال البوت بالروم الصوتي.");
            }
        );

        connection.on("error", error => {
            console.error("خطأ في الاتصال الصوتي:", error);
        });

        try {
            await entersState(
                connection,
                VoiceConnectionStatus.Ready,
                30_000
            );
        } catch (error) {
            console.error(
                "لم يستطع البوت الاتصال بالروم خلال 30 ثانية:",
                error.message
            );
        }

    } catch (error) {
        console.error("خطأ أثناء تشغيل البوت:", error);
    }
});

// ================================
// تنفيذ أمر /send
// ================================

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "send") return;

    if (interaction.guildId !== GUILD_ID) {
        return interaction.reply({
            content: "هذا الأمر غير مفعّل في هذا السيرفر.",
            ephemeral: true
        });
    }

    if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
            content: "❌ ما عندك صلاحية تستخدم هذا الأمر.",
            ephemeral: true
        });
    }

    const message = interaction.options.getString("message");
    const file = interaction.options.getAttachment("file");

    try {
        await interaction.deferReply({ ephemeral: true });

        await interaction.channel.send({
            content: message,
            files: file ? [file.url] : []
        });

        await interaction.editReply("✅ تم إرسال الرسالة بنجاح!");

    } catch (error) {
        console.error("خطأ أثناء إرسال الرسالة:", error);

        if (interaction.deferred) {
            await interaction.editReply(
                "❌ حصل خطأ أثناء الإرسال. تأكد من صلاحيات البوت."
            );
        } else if (!interaction.replied) {
            await interaction.reply({
                content: "❌ حصل خطأ أثناء الإرسال.",
                ephemeral: true
            });
        }
    }
});

// ================================
// تشغيل البوت
// ================================

console.log("TOKEN موجود؟", Boolean(TOKEN));

if (!TOKEN) {
    console.error(
        "أضف DISCORD_TOKEN في Variables داخل Railway."
    );
} else {
    client.login(TOKEN).catch(error => {
        console.error("فشل تسجيل دخول البوت:", error);
    });
}
