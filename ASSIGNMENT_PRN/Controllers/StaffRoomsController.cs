using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.DataAccess;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;

namespace ASSIGNMENT_PRN.Controllers
{
    [ApiController]
    [Route("api/staff/rooms")]
    public class StaffRoomsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public StaffRoomsController(HotelDbContext context)
        {
            _context = context;
        }

        // GET: /api/staff/rooms
        [HttpGet]
        public async Task<IActionResult> GetRoomsStatus([FromQuery] DateTime? date)
        {
            var targetDate = date ?? DateTime.Today;

            var rooms = await _context.Rooms
                .Include(r => r.RoomType)
                .ToListAsync();

            var bookings = await _context.Bookings
                .Where(b => b.Status != "Cancelled" &&
                           b.CheckInDate.Date <= targetDate.Date &&
                           b.CheckOutDate.Date > targetDate.Date)
                .ToListAsync();

            var result = rooms.Select(r => new
            {
                r.RoomId,
                r.RoomNumber,
                r.Price,
                RoomType = r.RoomType?.Name ?? "Standard",
                Status = bookings.Any(b => b.RoomId == r.RoomId) 
                    ? "Occupied" 
                    : (targetDate.Date == DateTime.Today ? r.Status : (r.Status == "Maintenance" || r.Status == "Dirty" ? r.Status : "Available"))
            });

            return Ok(result);
        }

        // GET: /api/staff/rooms/availability
        [HttpGet("availability")]
        public async Task<ActionResult<IEnumerable<RoomDto>>> GetAvailableRooms([FromQuery] DateTime checkIn, [FromQuery] DateTime checkOut)
        {
            if (checkIn >= checkOut)
                return BadRequest("Check-in date must be before Check-out date");

            // Define rooms that are NOT available in this date range
            var occupiedRoomIds = await _context.Bookings
                .Where(b => b.Status != "Cancelled" &&
                           ((checkIn >= b.CheckInDate && checkIn < b.CheckOutDate) ||
                            (checkOut > b.CheckInDate && checkOut <= b.CheckOutDate) ||
                            (b.CheckInDate >= checkIn && b.CheckInDate < checkOut)))
                .Select(b => b.RoomId)
                .Distinct()
                .ToListAsync();

            // All rooms excluding the ones that are occupied
            var availableRooms = await _context.Rooms
                .Where(r => !occupiedRoomIds.Contains(r.RoomId) && r.Status == "Available")
                .Select(r => new RoomDto
                {
                    RoomId = r.RoomId,
                    HotelId = r.HotelId,
                    RoomNumber = r.RoomNumber,
                    Price = r.Price,
                    Status = r.Status
                })
                .ToListAsync();

            return Ok(availableRooms);
        }

        public class StatusUpdateDto
        {
            public string Status { get; set; }
        }

        // PUT: /api/staff/rooms/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateRoomStatus(int id, [FromBody] StatusUpdateDto dto)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return NotFound("Room not found");

            // Allow status update (e.g., Dirty, Clean, Maintenance, etc.)
            room.Status = dto.Status;

            await _context.SaveChangesAsync();
            return Ok(new { Message = $"Room status updated to {dto.Status}" });
        }
    }
}
