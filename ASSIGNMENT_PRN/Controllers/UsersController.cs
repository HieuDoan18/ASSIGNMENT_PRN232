using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // All user profile endpoints require authentication
    public class UsersController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public UsersController(HotelDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdStr ?? "0");
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            return Ok(new UserProfileDto
            {
                Email = user.Email,
                FullName = user.FullName,
                Avatar = user.Avatar
            });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto model)
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.FullName = model.FullName;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Profile updated successfully" });
        }

        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            if (user.Password != model.CurrentPassword)
            {
                return BadRequest("Incorrect current password");
            }

            user.Password = model.NewPassword;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Password changed successfully" });
        }

        [HttpPost("avatar")]
        public async Task<IActionResult> UploadAvatar([FromBody] UploadAvatarDto model)
        {
            // In a real app, this would probably take a file upload and save the file/URL.
            // For simplicity with the provided schema, we take a URL.
            var userId = GetUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.Avatar = model.AvatarUrl;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Avatar updated successfully", AvatarUrl = user.Avatar });
        }
    }
}
