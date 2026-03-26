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
            if (await _context.Rooms.AnyAsync(r => r.RoomNumber == room.RoomNumber))
                return BadRequest(new { Message = "Room number already exists" });

            if (room.HotelId == null || room.HotelId == 0)
            {
                var hotel = await _context.Hotels.FirstOrDefaultAsync();
                if (hotel == null)
                {
                    hotel = new Hotel 
                    { 
                        Name = "Main Hotel", 
                        Location = "Unknown", 
                        Description = "Default Hotel", 
                        Rating = 5 
                    };
                    _context.Hotels.Add(hotel);
                    await _context.SaveChangesAsync();
                }
                room.HotelId = hotel.HotelId;
            }

            _context.Rooms.Add(room);
            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { Message = "Room created successfully", RoomId = room.RoomId });
            }
            catch (Exception ex)
            {
                var errorMsg = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { Message = $"An error occurred: {errorMsg}" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRoom(int id, [FromBody] Room updatedRoom)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null) return NotFound("Room not found");

            if (await _context.Rooms.AnyAsync(r => r.RoomNumber == updatedRoom.RoomNumber && r.RoomId != id))
                return BadRequest(new { Message = "Room number already exists" });

            room.RoomNumber = updatedRoom.RoomNumber;
            room.Price = updatedRoom.Price;
            room.Status = updatedRoom.Status;
            room.RoomTypeId = updatedRoom.RoomTypeId;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { Message = "Room updated successfully" });
            }
            catch (Exception ex)
            {
                var errorMsg = ex.InnerException?.Message ?? ex.Message;
                return StatusCode(500, new { Message = $"An error occurred updating: {errorMsg}" });
            }
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
            if (await _context.RoomTypes.AnyAsync(rt => rt.Name == roomType.Name))
                return BadRequest(new { Message = "Room type name already exists" });

            _context.RoomTypes.Add(roomType);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Room type created successfully", RoomTypeId = roomType.RoomTypeId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRoomType(int id, [FromBody] RoomType updatedRoomType)
        {
            var type = await _context.RoomTypes.FindAsync(id);
            if (type == null) return NotFound("Room type not found");

            if (await _context.RoomTypes.AnyAsync(rt => rt.Name == updatedRoomType.Name && rt.RoomTypeId != id))
                return BadRequest(new { Message = "Room type name already exists" });

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
