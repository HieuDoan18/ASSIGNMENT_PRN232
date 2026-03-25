using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BusinessObjects.Entities;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/admin/services")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminServicesController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public AdminServicesController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllServices()
        {
            var services = await _context.Services.ToListAsync();
            return Ok(services);
        }

        public class ServiceDto
        {
            public string Name { get; set; }
            public double Price { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> CreateService([FromBody] ServiceDto dto)
        {
            if (await _context.Services.AnyAsync(s => s.Name == dto.Name))
                return BadRequest(new { Message = "Service name already exists" });

            var service = new Service
            {
                Name = dto.Name,
                Price = dto.Price
            };
            _context.Services.Add(service);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Service created successfully", ServiceId = service.ServiceId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateService(int id, [FromBody] ServiceDto dto)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null) return NotFound("Service not found");

            if (await _context.Services.AnyAsync(s => s.Name == dto.Name && s.ServiceId != id))
                return BadRequest(new { Message = "Service name already exists" });

            service.Name = dto.Name;
            service.Price = dto.Price;

            await _context.SaveChangesAsync();
            return Ok(new { Message = "Service updated successfully" });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteService(int id)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null) return NotFound("Service not found");

            _context.Services.Remove(service);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Service deleted successfully" });
        }

        [HttpPut("{id}/price")]
        public async Task<IActionResult> UpdateServicePrice(int id, [FromBody] double newPrice)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null) return NotFound("Service not found");

            service.Price = newPrice;
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Service price updated successfully" });
        }
    }
}
