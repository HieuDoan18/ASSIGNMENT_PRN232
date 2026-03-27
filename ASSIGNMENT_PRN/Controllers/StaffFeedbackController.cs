using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.DataAccess;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;

namespace ASSIGNMENT_PRN.Controllers
{
    [ApiController]
    [Route("api/staff")]
    public class StaffFeedbackController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public StaffFeedbackController(HotelDbContext context)
        {
            _context = context;
        }

        // Requests
        [HttpGet("requests")]
        public async Task<ActionResult<IEnumerable<CustomerRequest>>> GetRequests()
        {
            var requests = await _context.CustomerRequests
                .Include(r => r.Booking)
                    .ThenInclude(b => b.User)
                .Include(r => r.Booking)
                    .ThenInclude(b => b.Room)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(requests);
        }

        [HttpPut("requests/{id}/resolve")]
        public async Task<IActionResult> ResolveRequest(int id)
        {
            var request = await _context.CustomerRequests.FindAsync(id);
            if (request == null) return NotFound();

            request.Status = "Resolved";
            await _context.SaveChangesAsync();

            return Ok("Request resolved");
        }

        // Reviews
        [HttpGet("reviews")]
        public async Task<ActionResult<IEnumerable<Review>>> GetReviews()
        {
            var reviews = await _context.Reviews
                .Include(r => r.Booking)
                    .ThenInclude(b => b.User)
                .Include(r => r.Booking)
                    .ThenInclude(b => b.Room)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpPut("reviews/{id}/reply")]
        public async Task<IActionResult> ReplyToReview(int id, [FromBody] string reply)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();

            review.StaffReply = reply;
            await _context.SaveChangesAsync();

            return Ok("Reply posted");
        }
    }
}
