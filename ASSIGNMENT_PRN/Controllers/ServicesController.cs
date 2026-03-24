using Microsoft.AspNetCore.Mvc;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServicesController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public ServicesController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetServices()
        {
            var services = await _context.Services.ToListAsync();
            return Ok(services);
        }
    }
}
