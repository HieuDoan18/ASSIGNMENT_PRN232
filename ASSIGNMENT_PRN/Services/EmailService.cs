using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using ASSIGNMENT_PRN.Settings;

namespace ASSIGNMENT_PRN.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;

        public EmailService(IOptions<EmailSettings> emailSettings)
        {
            _emailSettings = emailSettings.Value;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            using var client = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.SmtpPort)
            {
                Credentials = new NetworkCredential(_emailSettings.SenderEmail, _emailSettings.Password),
                EnableSsl = true
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_emailSettings.SenderEmail, _emailSettings.SenderName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };

            mailMessage.To.Add(toEmail);

            try {
                await client.SendMailAsync(mailMessage);
            } catch (Exception ex) {
                // Log exception if needed, continuing gracefully for demo purposes
                Console.WriteLine($"Failed to send email to {toEmail}: {ex.Message}");
            }
        }
    }
}
