using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminPricingController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public AdminPricingController(HotelDbContext context)
        {
            _context = context;
        }

        // ---------- PRICING ----------
        [HttpGet("pricing")]
        public async Task<IActionResult> GetPricing()
        {
            var pricings = await _context.Pricings.Include(p => p.RoomType).ToListAsync();
            return Ok(pricings);
        }

        [HttpPost("pricing")]
        public async Task<IActionResult> CreatePricing([FromBody] Pricing pricing)
        {
            _context.Pricings.Add(pricing);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Pricing created successfully", PricingId = pricing.PricingId });
        }

        [HttpPut("pricing/{id}")]
        public async Task<IActionResult> UpdatePricing(int id, [FromBody] Pricing updatedPricing)
        {
            var pricing = await _context.Pricings.FindAsync(id);
            if (pricing == null) return NotFound("Pricing not found");

            pricing.RoomTypeId = updatedPricing.RoomTypeId;
            pricing.SeasonName = updatedPricing.SeasonName;
            pricing.Multiplier = updatedPricing.Multiplier;
            pricing.StartDate = updatedPricing.StartDate;
            pricing.EndDate = updatedPricing.EndDate;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Pricing updated successfully" });
        }

        // ---------- PROMOTIONS ----------
        [HttpGet("promotions")]
        public async Task<IActionResult> GetPromotions()
        {
            var promotions = await _context.Promotions.ToListAsync();
            return Ok(promotions);
        }

        [HttpPost("promotions")]
        public async Task<IActionResult> CreatePromotion([FromBody] Promotion promotion)
        {
            _context.Promotions.Add(promotion);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Promotion created successfully", PromotionId = promotion.PromotionId });
        }

        [HttpPut("promotions/{id}")]
        public async Task<IActionResult> UpdatePromotion(int id, [FromBody] Promotion updatedPromotion)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound("Promotion not found");

            promotion.Code = updatedPromotion.Code;
            promotion.DiscountPercentage = updatedPromotion.DiscountPercentage;
            promotion.StartDate = updatedPromotion.StartDate;
            promotion.EndDate = updatedPromotion.EndDate;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Promotion updated successfully" });
        }

        [HttpDelete("promotions/{id}")]
        public async Task<IActionResult> DeletePromotion(int id)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound("Promotion not found");

            _context.Promotions.Remove(promotion);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Promotion deleted successfully" });
        }
    }
}
