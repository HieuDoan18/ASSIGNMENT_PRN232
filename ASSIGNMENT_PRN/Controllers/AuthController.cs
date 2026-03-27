using Microsoft.AspNetCore.Mvc;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using ASSIGNMENT_PRN.Settings;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authorization;
using System.Security.Cryptography;
using ASSIGNMENT_PRN.Services;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly HotelDbContext _context;
        private readonly JwtSettings _jwtSettings;
        private readonly IEmailService _emailService;

        public AuthController(HotelDbContext context, IOptions<JwtSettings> jwtSettings, IEmailService emailService)
        {
            _context = context;
            _jwtSettings = jwtSettings.Value;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest("Email already exists");
            }

            var user = new User
            {
                Email = model.Email,
                Password = model.Password, // In a real app, hash this!
                FullName = model.FullName,
                Role = "Customer"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User registered successfully" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email && u.Password == model.Password);

            if (user == null)
            {
                return Unauthorized(new { Message = "Invalid credentials" });
            }

            if (user.IsLocked)
            {
                return Unauthorized(new { Message = "User is locked" });
            }

            var token = GenerateJwtToken(user);
            var refreshToken = GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays);
            await _context.SaveChangesAsync();

            return Ok(new AuthResponseDto
            {
                Token = token,
                RefreshToken = refreshToken,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role
            });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdStr, out var userId))
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    user.RefreshToken = null;
                    user.RefreshTokenExpiryTime = null;
                    await _context.SaveChangesAsync();
                }
            }
            return Ok(new { Message = "Logged out successfully" });
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == model.RefreshToken);

            if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                return Unauthorized("Invalid or expired refresh token");
            }

            var newJwtToken = GenerateJwtToken(user);
            var newRefreshToken = GenerateRefreshToken();

            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationInDays);
            await _context.SaveChangesAsync();

            return Ok(new AuthResponseDto
            {
                Token = newJwtToken,
                RefreshToken = newRefreshToken,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
            if (user == null)
                return Ok(new { Message = "If that email is in our database, we have sent a password reset token." });

            user.ResetPasswordToken = GenerateRefreshToken(); // Using same logic for simplicity
            user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddHours(1);
            await _context.SaveChangesAsync();

            // Send Real Email!
            var subject = "Hotel Management - Password Reset Request";
            var body = $@"
                <h3>Password Reset Request</h3>
                <p>Hello {user.FullName},</p>
                <p>You requested a password reset. Please use the token below to reset your password:</p>
                <div style='background: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px;'>
                    <strong style='font-size: 1.2em;'>{user.ResetPasswordToken}</strong>
                </div>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best Regards,<br>Hotel Management Team</p>";

            await _emailService.SendEmailAsync(user.Email, subject, body);

            return Ok(new { Message = "If that email is in our database, we have sent a password reset token." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto model)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == model.Email && u.ResetPasswordToken == model.Token);

            if (user == null || user.ResetPasswordTokenExpiry <= DateTime.UtcNow)
                return BadRequest("Invalid or expired reset token");

            user.Password = model.NewPassword; // Real app: hash it
            user.ResetPasswordToken = null;
            user.ResetPasswordTokenExpiry = null;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Password reset successfully" });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetMe()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdStr, out var userId)) return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            return Ok(new
            {
                user.UserId,
                user.Email,
                user.FullName,
                user.Role,
                user.Avatar
            });
        }

        private string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSettings.Key);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Name, user.FullName),
                    new Claim(ClaimTypes.Role, user.Role)
                }),
                Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpirationInMinutes),
                Issuer = _jwtSettings.Issuer,
                Audience = _jwtSettings.Audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }
    }
}
