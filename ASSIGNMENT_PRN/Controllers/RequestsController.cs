using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;
using HotelManagement.DataAccess;
using System.Security.Claims;
using System.Threading.Tasks;
using System;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RequestsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public RequestsController(HotelDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdStr ?? "0");
        }

        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] CreateRequestDto model)
        {
            var userId = GetUserId();

            // Validate booking if provided
            if (model.BookingId.HasValue)
            {
                var booking = await _context.Bookings.FindAsync(model.BookingId.Value);
                if (booking == null || booking.UserId != userId)
                {
                    return BadRequest("Invalid booking ID");
                }
            }

            var request = new CustomerRequest
            {
                BookingId = model.BookingId,
                RequestContent = model.RequestContent,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.CustomerRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Request submitted successfully", RequestId = request.RequestId });
        }
    }
}
