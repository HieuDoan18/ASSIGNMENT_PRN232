using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PromotionsController : ControllerBase
    {
        private readonly HotelDbContext _context;
        public PromotionsController(HotelDbContext context) => _context = context;

        public class ValidatePromoDto
        {
            public string Code { get; set; }
            public double OriginalAmount { get; set; }
        }

        [HttpPost("validate")]
        public async Task<IActionResult> ValidatePromo([FromBody] ValidatePromoDto model)
        {
            if (string.IsNullOrWhiteSpace(model.Code))
                return BadRequest(new { Message = "Promo code is required." });

            var today = DateTime.Now.Date;
            var promo = await _context.Promotions
                .FirstOrDefaultAsync(p => p.Code == model.Code
                    && p.StartDate.Date <= today && p.EndDate.Date >= today);

            if (promo == null)
                return NotFound(new { Message = "Invalid or expired promo code." });

            var discount = model.OriginalAmount * (promo.DiscountPercentage / 100.0);
            var finalAmount = model.OriginalAmount - discount;

            return Ok(new
            {
                Code = promo.Code,
                DiscountPercentage = promo.DiscountPercentage,
                DiscountAmount = Math.Round(discount, 2),
                FinalAmount = Math.Round(finalAmount, 2)
            });
        }
    }
}
