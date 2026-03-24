using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public RoomsController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetRooms([FromQuery] string? status)
        {
            var query = _context.Rooms.AsQueryable();
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(r => r.Status.ToLower() == status.ToLower());
            }

            var rooms = await query.ToListAsync();
            return Ok(rooms);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetRoom(int id)
        {
            var room = await _context.Rooms.Include(r => r.Hotel).FirstOrDefaultAsync(r => r.RoomId == id);
            if (room == null) return NotFound();

            return Ok(room);
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchRooms([FromQuery] SearchRoomDto searchCriteria)
        {
            // Simple search: find rooms that do not have overlapping bookings with the search dates
            var overlappingBookings = _context.Bookings
                .Where(b => b.Status != "Cancelled" &&
                            b.CheckInDate < searchCriteria.CheckOutDate && 
                            b.CheckOutDate > searchCriteria.CheckInDate)
                .Select(b => b.RoomId);

            var availableRooms = await _context.Rooms
                .Where(r => r.Status == "Available" && !overlappingBookings.Contains(r.RoomId))
                .ToListAsync();

            // Note: Add MinCapacity filtering if the Room entity gets a Capacity property in the future.
            
            return Ok(availableRooms);
        }
    }
}
