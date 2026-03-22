using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.DataAccess;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;

namespace ASSIGNMENT_PRN.Controllers
{
    [ApiController]
    [Route("api/staff/bookings/{id}")]
    public class StaffPaymentController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public StaffPaymentController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet("invoice")]
        public async Task<ActionResult<object>> GetInvoice(int id)
        {
            var booking = await _context.Bookings
                .Include(b => b.Room)
                .Include(b => b.User)
                .Include(b => b.BookingServices)
                    .ThenInclude(bs => bs.Service)
                .FirstOrDefaultAsync(b => b.BookingId == id);

            if (booking == null) return NotFound();

            var servicesTotal = booking.BookingServices.Sum(bs => bs.Service.Price * bs.Quantity);
            var roomCharge = booking.TotalPrice;

            return Ok(new
            {
                BookingId = booking.BookingId,
                CustomerName = booking.User.FullName,
                RoomNumber = booking.Room.RoomNumber,
                CheckIn = booking.CheckInDate,
                CheckOut = booking.CheckOutDate,
                RoomCharge = roomCharge,
                ServiceCharge = servicesTotal,
                TotalAmount = roomCharge + servicesTotal,
                Services = booking.BookingServices.Select(bs => new
                {
                    bs.Service.Name,
                    bs.Service.Price,
                    bs.Quantity,
                    Subtotal = bs.Service.Price * bs.Quantity
                })
            });
        }

        [HttpPost("payment")]
        public async Task<IActionResult> ProcessPayment(int id, [FromBody] ProcessPaymentDto paymentDto)
        {
            var booking = await _context.Bookings.FindAsync(id);
            if (booking == null) return NotFound();

            var payment = new Payment
            {
                BookingId = id,
                Amount = paymentDto.Amount,
                PaymentDate = DateTime.Now,
                PaymentMethod = paymentDto.PaymentMethod,
                Status = "Paid"
            };

            booking.Status = "Paid";
            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            return Ok("Payment processed");
        }

        [HttpPost("refund")]
        public async Task<IActionResult> ProcessRefund(int id, [FromBody] double amount)
        {
            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.BookingId == id && p.Status == "Paid");

            if (payment == null) return BadRequest("Payment not found or already refunded");

            payment.Status = "Refunded";
            
            var refund = new Payment
            {
                BookingId = id,
                Amount = -amount,
                PaymentDate = DateTime.Now,
                PaymentMethod = payment.PaymentMethod,
                Status = "Refunded"
            };

            _context.Payments.Add(refund);
            await _context.SaveChangesAsync();

            return Ok("Refund processed");
        }
    }

    public class ProcessPaymentDto
    {
        public double Amount { get; set; }
        public string PaymentMethod { get; set; }
    }
}
