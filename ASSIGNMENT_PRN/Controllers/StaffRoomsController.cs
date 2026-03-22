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

        // PUT: /api/staff/rooms/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateRoomStatus(int id, [FromBody] string status)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return NotFound("Room not found");

            // Allow status update (e.g., Dirty, Clean, Maintenance, etc.)
            room.Status = status;

            await _context.SaveChangesAsync();
            return Ok($"Room status updated to {status}");
        }
    }
}
