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
    [Authorize] // All booking endpoints require the user to be logged in
    public class BookingsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public BookingsController(HotelDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdStr ?? "0");
        }

        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto model)
        {
            var room = await _context.Rooms.FindAsync(model.RoomId);
            if (room == null || room.Status != "Available")
            {
                return BadRequest("Room is not available");
            }

            if (model.CheckInDate.Date < DateTime.UtcNow.Date)
            {
                return BadRequest("Cannot book dates in the past");
            }

            var days = (model.CheckOutDate - model.CheckInDate).Days;
            if (days <= 0) return BadRequest("Check-out must be after check-in");

            var booking = new Booking
            {
                UserId = GetUserId(),
                RoomId = model.RoomId,
                CheckInDate = model.CheckInDate,
                CheckOutDate = model.CheckOutDate,
                Status = "Pending", // Custom status logic
                TotalPrice = room.Price * days
            };

            // In a real app we might mark room as booked
            // room.Status = "Booked";

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return Ok(booking);
        }

        [HttpGet]
        public async Task<IActionResult> GetMyBookings()
        {
            var userId = GetUserId();
            var bookings = await _context.Bookings
                .Include(b => b.Room)
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CheckInDate)
                .ToListAsync();

            return Ok(bookings);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBookingDetails(int id)
        {
            var userId = GetUserId();
            var booking = await _context.Bookings
                .Include(b => b.Room)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

            if (booking == null) return NotFound();

            return Ok(booking);
        }

        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelBooking(int id)
        {
            var userId = GetUserId();
            var booking = await _context.Bookings
                .Include(b => b.Room)
                .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

            if (booking == null) return NotFound();
            if (booking.Status == "Cancelled") return BadRequest("Already cancelled");
            if (booking.Status == "Completed") return BadRequest("Cannot cancel completed booking");
            if (booking.Status == "Paid") return BadRequest("Cannot cancel a paid booking");

            booking.Status = "Cancelled";
            // Free the room back
            if (booking.Room != null)
                booking.Room.Status = "Available";

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Booking cancelled successfully" });
        }

        [HttpPost("{id}/services")]
        public async Task<IActionResult> AddServiceToBooking(int id, [FromBody] AddServiceToBookingDto model)
        {
            var userId = GetUserId();
            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

            if (booking == null) return NotFound();
            if (booking.Status == "Cancelled" || booking.Status == "Completed") 
                return BadRequest("Cannot add services to this booking");

            var service = await _context.Services.FindAsync(model.ServiceId);
            if (service == null) return NotFound("Service not found");

            var bookingService = new BookingService
            {
                BookingId = id,
                ServiceId = model.ServiceId,
                Quantity = model.Quantity
            };

            booking.TotalPrice += (service.Price * model.Quantity);

            _context.BookingServices.Add(bookingService);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Service added to booking successfully", TotalPrice = booking.TotalPrice });
        }

        [HttpGet("{id}/invoice")]
        public async Task<IActionResult> GetInvoice(int id)
        {
            var userId = GetUserId();
            var booking = await _context.Bookings
                .Include(b => b.Room)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

            if (booking == null) return NotFound();

            var roomTotal = booking.Room.Price * (booking.CheckOutDate - booking.CheckInDate).Days;
            var servicesTotal = booking.BookingServices.Sum(bs => bs.Service.Price * bs.Quantity);
            
            var invoice = new
            {
                BookingId = booking.BookingId,
                CustomerName = User.FindFirst(ClaimTypes.Name)?.Value,
                RoomNumber = booking.Room.RoomNumber,
                CheckInDate = booking.CheckInDate,
                CheckOutDate = booking.CheckOutDate,
                RoomTotal = roomTotal,
                ServicesTotal = servicesTotal,
                GrandTotal = booking.TotalPrice,
                Status = booking.Status,
                BookingServices = booking.BookingServices.Select(bs => new
                {
                    ServiceName = bs.Service.Name,
                    UnitPrice = bs.Service.Price,
                    Quantity = bs.Quantity,
                    SubTotal = bs.Service.Price * bs.Quantity
                }).ToList()
            };

            return Ok(invoice);
        }

        [HttpPost("{id}/payment")]
        public async Task<IActionResult> ProcessPayment(int id, [FromBody] ProcessPaymentDto model)
        {
            var userId = GetUserId();
            var booking = await _context.Bookings
                .Include(b => b.Room)
                .FirstOrDefaultAsync(b => b.BookingId == id && b.UserId == userId);

            if (booking == null) return NotFound();
            if (booking.Status == "Cancelled") return BadRequest("Booking is cancelled");
            if (booking.Status == "Paid") return BadRequest("Booking already paid");

            var payment = new Payment
            {
                BookingId = id,
                Amount = booking.TotalPrice,
                PaymentDate = DateTime.UtcNow,
                PaymentMethod = model.PaymentMethod,
                Status = "Success"
            };

            _context.Payments.Add(payment);
            booking.Status = "Paid";

            // Mark room as Occupied
            if (booking.Room != null)
                booking.Room.Status = "Occupied";

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Payment processed successfully", Payment = payment });
        }
    }
}
