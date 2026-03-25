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

        // ---------- DTOs ----------
        public class PricingDto
        {
            public int RoomTypeId { get; set; }
            public string SeasonName { get; set; }
            public double Multiplier { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
        }

        public class PromotionDto
        {
            public string Code { get; set; }
            public double DiscountPercentage { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
        }

        // ---------- PRICING ----------
        [HttpGet("pricing")]
        public async Task<IActionResult> GetPricing()
        {
            var pricings = await _context.Pricings.Include(p => p.RoomType).ToListAsync();
            return Ok(pricings);
        }

        [HttpPost("pricing")]
        public async Task<IActionResult> CreatePricing([FromBody] PricingDto dto)
        {
            if (dto.EndDate <= dto.StartDate)
                return BadRequest(new { Message = "End date must be greater than start date" });

            var pricing = new Pricing
            {
                RoomTypeId = dto.RoomTypeId,
                SeasonName = dto.SeasonName,
                Multiplier = dto.Multiplier,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate
            };
            _context.Pricings.Add(pricing);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Pricing created successfully", PricingId = pricing.PricingId });
        }

        [HttpPut("pricing/{id}")]
        public async Task<IActionResult> UpdatePricing(int id, [FromBody] PricingDto dto)
        {
            var pricing = await _context.Pricings.FindAsync(id);
            if (pricing == null) return NotFound("Pricing not found");

            var now = DateTime.UtcNow;
            if (pricing.StartDate <= now && pricing.EndDate >= now)
                return BadRequest(new { Message = "Cannot edit pricing that is currently active" });
            if (pricing.EndDate < now)
                return BadRequest(new { Message = "Cannot edit pricing that has already expired" });

            if (dto.EndDate <= dto.StartDate)
                return BadRequest(new { Message = "End date must be greater than start date" });

            pricing.RoomTypeId = dto.RoomTypeId;
            pricing.SeasonName = dto.SeasonName;
            pricing.Multiplier = dto.Multiplier;
            pricing.StartDate = dto.StartDate;
            pricing.EndDate = dto.EndDate;

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
        public async Task<IActionResult> CreatePromotion([FromBody] PromotionDto dto)
        {
            if (dto.EndDate <= dto.StartDate)
                return BadRequest(new { Message = "End date must be greater than start date" });

            if (await _context.Promotions.AnyAsync(p => p.Code == dto.Code))
                return BadRequest(new { Message = "Promotion code already exists" });

            var promotion = new Promotion
            {
                Code = dto.Code,
                DiscountPercentage = dto.DiscountPercentage,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate
            };
            _context.Promotions.Add(promotion);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Promotion created successfully", PromotionId = promotion.PromotionId });
        }

        [HttpPut("promotions/{id}")]
        public async Task<IActionResult> UpdatePromotion(int id, [FromBody] PromotionDto dto)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound("Promotion not found");

            var now = DateTime.UtcNow;
            if (promotion.StartDate <= now && promotion.EndDate >= now)
                return BadRequest(new { Message = "Cannot edit promotion that is currently active" });
            if (promotion.EndDate < now)
                return BadRequest(new { Message = "Cannot edit promotion that has already expired" });

            if (dto.EndDate <= dto.StartDate)
                return BadRequest(new { Message = "End date must be greater than start date" });

            if (await _context.Promotions.AnyAsync(p => p.Code == dto.Code && p.PromotionId != id))
                return BadRequest(new { Message = "Promotion code already exists" });

            promotion.Code = dto.Code;
            promotion.DiscountPercentage = dto.DiscountPercentage;
            promotion.StartDate = dto.StartDate;
            promotion.EndDate = dto.EndDate;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Promotion updated successfully" });
        }

        [HttpDelete("promotions/{id}")]
        public async Task<IActionResult> DeletePromotion(int id)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound("Promotion not found");

            var now = DateTime.UtcNow;
            if (promotion.StartDate <= now && promotion.EndDate >= now)
                return BadRequest(new { Message = "Cannot delete promotion that is currently active" });

            _context.Promotions.Remove(promotion);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Promotion deleted successfully" });
        }
    }
}
