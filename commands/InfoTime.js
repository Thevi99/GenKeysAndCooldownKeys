const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders');
const Key = require('../models/Key'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName("infokey")
        .setDescription("Show key and time remaining"),

    async run(client, interaction) {
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply({ ephemeral: true }); 
            }

            const userId = interaction.user.id;

            const latestKey = await Key.findOne({ userId })
                .sort({ generatedAt: -1 })
                .exec();

            if (!latestKey) {
                const noKeyEmbed = new EmbedBuilder()
                    .setTitle("🔑  Key Information")
                    .setDescription("You don't have any keys. Please generate one.")
                    .setColor(0xAD8DEB) // สีม่วงอ่อน
                    .addFields(
                        { name: "No Key", value: "Please generate a key." }
                    ) 
                    .setImage('https://media1.tenor.com/m/WDSjkCTt7eEAAAAC/doggoflowersgirl-pixel.gif');

                await interaction.editReply({ embeds: [noKeyEmbed], ephemeral: true });
                return;
            }

            const now = Date.now();
            const timeLeft = latestKey.expiryDate - now;

            if (timeLeft <= 0) {
                const expiredKeyEmbed = new EmbedBuilder()
                    .setTitle("🔑  Key Information")
                    .setDescription("Your key has expired. Please generate a new one.")
                    .setColor(0xE1BEE7) // สีม่วงอ่อน
                    .addFields(
                        { name: "Expired", value: "Your key is no longer valid." }
                    ) 
                    .setImage('https://media1.tenor.com/m/WDSjkCTt7eEAAAAC/doggoflowersgirl-pixel.gif');

                await interaction.editReply({ embeds: [expiredKeyEmbed], ephemeral: true });
                return;
            }

            const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

            const keyEmbed = new EmbedBuilder()
                .setTitle("🔑  Key Information")
                .setDescription("Key information and time remaining")
                .setColor(0xBA68C8) // สีม่วงเข้มขึ้น
                .addFields(
                    { name: "Key", value: `\`\`\`lua\n${latestKey.key}\n\`\`\`` }, 
                    { name: "Time Remaining", value: `\`\`\`lua\n${hoursLeft} hour(s) ${minutesLeft} minute(s)\n\`\`\`` } 
                ) 
                .setImage('https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHRsaWlldmFmNjlsMXg3MG5iYmNhaHRoMHFzczJvZTRwc2YyNmN2YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QaDOoqfYUy1lS/giphy.gif');

            await interaction.editReply({ embeds: [keyEmbed], ephemeral: true });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("Error")
                .setDescription("An error occurred while executing the command.")
                .setColor(0xFF0000) // สีแดงเพื่อแสดงข้อผิดพลาด
                .addFields(
                    { name: "Error", value: "Please try again later." }
                )
                .setImage('https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHRsaWlldmFmNjlsMXg3MG5iYmNhaHRoMHFzczJvZTRwc2YyNmN2YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QaDOoqfYUy1lS/giphy.gif');

            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
