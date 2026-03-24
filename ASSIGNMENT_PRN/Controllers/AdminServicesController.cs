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

        [HttpPost]
        public async Task<IActionResult> CreateService([FromBody] Service service)
        {
            _context.Services.Add(service);
            await _context.SaveChangesAsync();
            return Ok(new { Message = "Service created successfully", ServiceId = service.ServiceId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateService(int id, [FromBody] Service updatedService)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null) return NotFound("Service not found");

            service.Name = updatedService.Name;
            service.Price = updatedService.Price;

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
