using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReviewsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public ReviewsController(HotelDbContext context)
        {
            _context = context;
        }

        private int GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdStr ?? "0");
        }

        [HttpPost]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewDto model)
        {
            var userId = GetUserId();
            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.BookingId == model.BookingId && b.UserId == userId);

            if (booking == null) return NotFound("Booking not found");
            
            // Typical logic: only allow review if booking is completed
            // if (booking.Status != "Completed") return BadRequest("Can only review completed bookings");

            var existingReview = await _context.Reviews.AnyAsync(r => r.BookingId == model.BookingId);
            if (existingReview) return BadRequest("Review already exists for this booking");

            var review = new Review
            {
                BookingId = model.BookingId,
                Rating = model.Rating,
                Comment = model.Comment ?? "",
                CreatedAt = DateTime.UtcNow,
                StaffReply = ""
            };

            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();

            return Ok(review);
        }

        [HttpGet]
        public async Task<IActionResult> GetMyReviews()
        {
            var userId = GetUserId();
            var reviews = await _context.Reviews
                .Include(r => r.Booking)
                    .ThenInclude(b => b.Room)
                .Where(r => r.Booking.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(reviews);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateReview(int id, [FromBody] UpdateReviewDto model)
        {
            var userId = GetUserId();
            var review = await _context.Reviews
                .Include(r => r.Booking)
                .FirstOrDefaultAsync(r => r.ReviewId == id && r.Booking.UserId == userId);

            if (review == null) return NotFound();

            review.Rating = model.Rating;
            review.Comment = model.Comment;
            
            await _context.SaveChangesAsync();

            return Ok(new { Message = "Review updated successfully", Review = review });
        }
    }
}
