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
            var query = _context.Rooms.Include(r => r.RoomType).AsQueryable();
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
            var room = await _context.Rooms
                .Include(r => r.RoomType)
                .Include(r => r.Hotel)
                .FirstOrDefaultAsync(r => r.RoomId == id);
            if (room == null) return NotFound();
            return Ok(room);
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchRooms(
            [FromQuery] string checkIn,
            [FromQuery] string checkOut)
        {
            if (!DateTime.TryParse(checkIn, out DateTime checkInDate) ||
                !DateTime.TryParse(checkOut, out DateTime checkOutDate))
                return BadRequest("Invalid date format. Use YYYY-MM-DD.");

            if (checkInDate.Date >= checkOutDate.Date)
                return BadRequest("Check-in must be before check-out.");

            // Get IDs of rooms that have ANY active (non-cancelled) booking overlapping the requested dates
            var bookedRoomIds = await _context.Bookings
                .Where(b => b.Status != "Cancelled"
                    && b.CheckInDate.Date < checkOutDate.Date
                    && b.CheckOutDate.Date > checkInDate.Date)
                .Select(b => b.RoomId)
                .Distinct()
                .ToListAsync();

            // Return ALL rooms not under maintenance, but mark them Occupied if they overlap
            var rooms = await _context.Rooms
                .Include(r => r.RoomType)
                .AsNoTracking() // Important: Prevent EF from saving the temporary status changes back to DB
                .Where(r => r.Status != "Maintenance")
                .ToListAsync();

            foreach (var room in rooms)
            {
                if (bookedRoomIds.Contains(room.RoomId))
                {
                    room.Status = "Occupied";
                }
                else
                {
                    room.Status = "Available";
                }
            }

            return Ok(rooms);
        }
    }
}
