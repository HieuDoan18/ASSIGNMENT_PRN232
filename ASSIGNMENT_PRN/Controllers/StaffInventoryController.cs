using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelManagement.DataAccess;
using BusinessObjects.Entities;
using BusinessObjects.DTOs;

namespace ASSIGNMENT_PRN.Controllers
{
    [ApiController]
    [Route("api/staff/inventory")]
    public class StaffInventoryController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public StaffInventoryController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<InventoryItem>>> GetInventory()
        {
            return await _context.InventoryItems.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<InventoryItem>> GetInventoryItem(int id)
        {
            var item = await _context.InventoryItems.FindAsync(id);
            if (item == null) return NotFound();
            return item;
        }

        [HttpPost]
        public async Task<ActionResult<InventoryItem>> AddInventoryItem(InventoryItem item)
        {
            _context.InventoryItems.Add(item);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetInventoryItem), new { id = item.InventoryItemId }, item);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInventoryItem(int id, InventoryItem item)
        {
            if (id != item.InventoryItemId) return BadRequest();
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInventoryItem(int id)
        {
            var item = await _context.InventoryItems.FindAsync(id);
            if (item == null) return NotFound();
            _context.InventoryItems.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("low-stock")]
        public async Task<ActionResult<IEnumerable<InventoryItem>>> GetLowStock()
        {
            return await _context.InventoryItems
                .Where(i => i.Quantity <= i.MinStockLevel)
                .ToListAsync();
        }

        [HttpPut("{id}/quantity")]
        public async Task<IActionResult> UpdateQuantity(int id, [FromBody] int newQuantity)
        {
            var item = await _context.InventoryItems.FindAsync(id);
            if (item == null) return NotFound();

            item.Quantity = newQuantity;
            await _context.SaveChangesAsync();
            return Ok($"Quantity updated to {newQuantity}");
        }
    }
}
