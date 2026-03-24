using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/admin/users")]
    [ApiController]
    [Authorize(Roles = "Admin")] // Require Admin role
    public class AdminUsersController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public AdminUsersController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users.ToListAsync();
            // In real app, map to DTO to hide passwords
            return Ok(users);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found");
            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserAdminDto model)
        {
            if (await _context.Users.AnyAsync(u => u.Email == model.Email))
            {
                return BadRequest("Email already exists");
            }

            var user = new User
            {
                Email = model.Email,
                Password = model.Password, // Hash it!
                FullName = model.FullName,
                Role = model.Role,
                IsLocked = false
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User created successfully", UserId = user.UserId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserAdminDto model)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found");

            user.FullName = model.FullName;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "User deleted successfully" });
        }

        [HttpPut("{id}/role")]
        public async Task<IActionResult> ChangeRole(int id, [FromBody] ChangeRoleDto model)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found");

            if (model.Role != "Admin" && model.Role != "Staff" && model.Role != "Customer")
            {
                return BadRequest("Invalid role");
            }

            user.Role = model.Role;
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Role updated successfully" });
        }

        [HttpPut("{id}/lock")]
        public async Task<IActionResult> ToggleLockUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found");

            user.IsLocked = !user.IsLocked;
            await _context.SaveChangesAsync();

            var status = user.IsLocked ? "locked" : "unlocked";
            return Ok(new { Message = $"User {status} successfully" });
        }
    }
}
