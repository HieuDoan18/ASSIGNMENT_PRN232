using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/admin/rooms")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")] // Admin or Staff can manage rooms
    public class AdminRoomsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public AdminRoomsController(HotelDbContext context)
        {
            _context = context;
        }

        // ---------- ROOMS ----------

        [HttpGet]
        public async Task<IActionResult> GetAllRooms()
        {
            var rooms = await _context.Rooms.Include(r => r.RoomType).ToListAsync();
            return Ok(rooms);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRoom([FromBody] Room room)
        {
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room created successfully", RoomId = room.RoomId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRoom(int id, [FromBody] Room updatedRoom)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return NotFound("Room not found");

            room.RoomNumber = updatedRoom.RoomNumber;
            room.Price = updatedRoom.Price;
            room.Status = updatedRoom.Status;
            room.RoomTypeId = updatedRoom.RoomTypeId;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return NotFound("Room not found");

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room deleted successfully" });
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateRoomStatus(int id, [FromBody] string status)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return NotFound("Room not found");

            room.Status = status;
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room status updated successfully" });
        }
    }

    [Route("api/admin/room-types")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminRoomTypesController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public AdminRoomTypesController(HotelDbContext context)
        {
            _context = context;
        }

        // ---------- ROOM TYPES ----------
        [HttpGet]
        public async Task<IActionResult> GetRoomTypes()
        {
            var types = await _context.RoomTypes.ToListAsync();
            return Ok(types);
        }

        [HttpPost]
        public async Task<IActionResult> CreateRoomType([FromBody] RoomType roomType)
        {
            _context.RoomTypes.Add(roomType);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room type created successfully", RoomTypeId = roomType.RoomTypeId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRoomType(int id, [FromBody] RoomType updatedRoomType)
        {
            var type = await _context.RoomTypes.FindAsync(id);
            if (type == null) return NotFound("Room type not found");

            type.Name = updatedRoomType.Name;
            type.Description = updatedRoomType.Description;
            type.BasePrice = updatedRoomType.BasePrice;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room type updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRoomType(int id)
        {
            var type = await _context.RoomTypes.FindAsync(id);
            if (type == null) return NotFound("Room type not found");

            _context.RoomTypes.Remove(type);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room type deleted successfully" });
        }
    }
}
