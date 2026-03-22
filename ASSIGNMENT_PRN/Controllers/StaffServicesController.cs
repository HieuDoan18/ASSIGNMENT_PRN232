using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.DataAccess;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;

namespace ASSIGNMENT_PRN.Controllers
{
    [ApiController]
    [Route("api/staff/bookings/{id}/services")]
    public class StaffServicesController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public StaffServicesController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetBookingServices(int id)
        {
            var services = await _context.BookingServices
                .Include(bs => bs.Service)
                .Where(bs => bs.BookingId == id)
                .Select(bs => new
                {
                    bs.ServiceId,
                    bs.Service.Name,
                    bs.Service.Price,
                    bs.Quantity,
                    Total = bs.Service.Price * bs.Quantity
                })
                .ToListAsync();

            return Ok(services);
        }

        [HttpPost]
        public async Task<IActionResult> AddServiceToBooking(int id, [FromBody] BookingAddServiceDto addSvcDto)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return NotFound("Booking not found");

            var service = await _context.Services.FindAsync(addSvcDto.ServiceId);
            if (service == null) return NotFound("Service not found");

            var existing = await _context.BookingServices
                .FirstOrDefaultAsync(bs => bs.BookingId == id && bs.ServiceId == addSvcDto.ServiceId);

            if (existing != null)
            {
                existing.Quantity += addSvcDto.Quantity;
            }
            else
            {
                _context.BookingServices.Add(new BookingService
                {
                    BookingId = id,
                    ServiceId = addSvcDto.ServiceId,
                    Quantity = addSvcDto.Quantity
                });
            }

            await _context.SaveChangesAsync();
            return Ok("Service added to booking");
        }

        [HttpDelete("{svcId}")]
        public async Task<IActionResult> RemoveServiceFromBooking(int id, int svcId)
        {
            var existing = await _context.BookingServices
                .FirstOrDefaultAsync(bs => bs.BookingId == id && bs.ServiceId == svcId);

            if (existing == null) return NotFound("Service not found in this booking");

            _context.BookingServices.Remove(existing);
            await _context.SaveChangesAsync();

            return Ok("Service removed from booking");
        }
    }

    public class BookingAddServiceDto
    {
        public int ServiceId { get; set; }
        public int Quantity { get; set; }
    }
}
