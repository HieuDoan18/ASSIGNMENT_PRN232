using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.DataAccess;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;

namespace ASSIGNMENT_PRN.Controllers
{
    [ApiController]
    [Route("api/staff/bookings")]
    public class StaffBookingsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public StaffBookingsController(HotelDbContext context)
        {
            _context = context;
        }

        // GET: /api/staff/bookings
        [HttpGet]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetAllBookings()
        {
            var bookings = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Room)
                .Select(b => new BookingDto
                {
                    BookingId = b.BookingId,
                    UserId = b.UserId,
                    RoomId = b.RoomId,
                    CheckInDate = b.CheckInDate,
                    CheckOutDate = b.CheckOutDate,
                    TotalPrice = b.TotalPrice,
                    Status = b.Status,
                    UserName = b.User.FullName,
                    RoomNumber = b.Room.RoomNumber
                })
                .ToListAsync();

            return Ok(bookings);
        }

        // GET: /api/staff/bookings/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<BookingDto>> GetBookingDetail(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Room)
                .Where(b => b.BookingId == id)
                .Select(b => new BookingDto
                {
                    BookingId = b.BookingId,
                    UserId = b.UserId,
                    RoomId = b.RoomId,
                    CheckInDate = b.CheckInDate,
                    CheckOutDate = b.CheckOutDate,
                    TotalPrice = b.TotalPrice,
                    Status = b.Status,
                    UserName = b.User.FullName,
                    RoomNumber = b.Room.RoomNumber
                })
                .FirstOrDefaultAsync();

            if (booking == null) return NotFound("Booking not found");

            return Ok(booking);
        }

        // POST: /api/staff/bookings (Walk-in)
        [HttpPost]
        public async Task<ActionResult<BookingDto>> CreateWalkInBooking(BookingCreateDto createDto)
        {
            var room = await _context.Rooms.FindAsync(createDto.RoomId);
            if (room == null) return BadRequest("Room not found");
            if (room.Status != "Available") return BadRequest("Room is not available");

            var user = await _context.Users.FindAsync(createDto.UserId);
            if (user == null) return BadRequest("Guest not found");

            var days = (createDto.CheckOutDate - createDto.CheckInDate).Days;
            if (days <= 0) days = 1; // At least one night

            var booking = new Booking
            {
                UserId = createDto.UserId,
                RoomId = createDto.RoomId,
                CheckInDate = createDto.CheckInDate,
                CheckOutDate = createDto.CheckOutDate,
                TotalPrice = room.Price * days,
                Status = "Confirmed" // Walk-ins are usually confirmed immediately
            };

            // Update room status
            room.Status = "Occupied";

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetBookingDetail), new { id = booking.BookingId }, booking);
        }

        // PUT: /api/staff/bookings/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBooking(int id, BookingUpdateDto updateDto)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return NotFound();

            booking.RoomId = updateDto.RoomId;
            booking.CheckInDate = updateDto.CheckInDate;
            booking.CheckOutDate = updateDto.CheckOutDate;
            booking.Status = updateDto.Status;

            // Recalculate price if room or dates changed
            var room = await _context.Rooms.FindAsync(updateDto.RoomId);
            if (room != null)
            {
                var days = (updateDto.CheckOutDate - updateDto.CheckInDate).Days;
                if (days <= 0) days = 1;
                booking.TotalPrice = room.Price * days;
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!BookingExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // PUT: /api/staff/bookings/{id}/cancel
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var booking = await _context.Bookings.Include(b => b.Room).FirstOrDefaultAsync(b => b.BookingId == id);
            if (booking == null) return NotFound();

            if (booking.Status == "Cancelled") return BadRequest("Already cancelled");

            booking.Status = "Cancelled";
            
            // Release room
            if (booking.Room != null)
            {
                booking.Room.Status = "Available";
            }

            await _context.SaveChangesAsync();
            return Ok("Booking cancelled");
        }

        // PUT: /api/staff/bookings/{id}/checkin
        [HttpPut("{id}/checkin")]
        public async Task<IActionResult> CheckIn(int id)
        {
            var booking = await _context.Bookings.Include(b => b.Room).FirstOrDefaultAsync(b => b.BookingId == id);
            if (booking == null) return NotFound();

            if (booking.Status != "Confirmed")
                return BadRequest("Booking must be Confirmed before Check-in");

            booking.Status = "CheckedIn";
            booking.ActualCheckIn = DateTime.Now;
            if (booking.Room != null)
            {
                booking.Room.Status = "Occupied";
            }

            await _context.SaveChangesAsync();
            return Ok("Checked In successfully");
        }

        // PUT: /api/staff/bookings/{id}/checkout
        [HttpPut("{id}/checkout")]
        public async Task<IActionResult> CheckOut(int id)
        {
            var booking = await _context.Bookings.Include(b => b.Room).FirstOrDefaultAsync(b => b.BookingId == id);
            if (booking == null) return NotFound();

            if (booking.Status != "CheckedIn")
                return BadRequest("Booking must be CheckedIn before Check-out");

            booking.Status = "Completed";
            booking.ActualCheckOut = DateTime.Now;
            if (booking.Room != null)
            {
                booking.Room.Status = "Dirty"; // Set to dirty after check-out
            }

            await _context.SaveChangesAsync();
            return Ok("Checked Out successfully");
        }

        // GET: /api/staff/bookings/today
        [HttpGet("today")]
        public async Task<ActionResult<object>> GetTodaySchedule()
        {
            var today = DateTime.Today;

            var checkIns = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Room)
                .Where(b => b.CheckInDate.Date == today && b.Status != "Cancelled")
                .Select(b => new BookingDto
                {
                    BookingId = b.BookingId,
                    UserName = b.User.FullName,
                    RoomNumber = b.Room.RoomNumber,
                    CheckInDate = b.CheckInDate,
                    CheckOutDate = b.CheckOutDate,
                    Status = b.Status
                })
                .ToListAsync();

            var checkOuts = await _context.Bookings
                .Include(b => b.User)
                .Include(b => b.Room)
                .Where(b => b.CheckOutDate.Date == today && b.Status != "Cancelled")
                .Select(b => new BookingDto
                {
                    BookingId = b.BookingId,
                    UserName = b.User.FullName,
                    RoomNumber = b.Room.RoomNumber,
                    CheckInDate = b.CheckInDate,
                    CheckOutDate = b.CheckOutDate,
                    Status = b.Status
                })
                .ToListAsync();

            return Ok(new
            {
                Date = today,
                CheckIns = checkIns,
                CheckOuts = checkOuts
            });
        }

        private bool BookingExists(int id) => _context.Bookings.Any(e => e.BookingId == id);
    }
}
