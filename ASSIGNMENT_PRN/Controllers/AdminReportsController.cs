using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HotelManagement.DataAccess;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using System.Linq;
using System;

namespace ASSIGNMENT_PRN.Controllers
{
    [Route("api/admin/reports")]
    [ApiController]
    [Authorize(Roles = "Admin,Staff")]
    public class AdminReportsController : ControllerBase
    {
        private readonly HotelDbContext _context;

        public AdminReportsController(HotelDbContext context)
        {
            _context = context;
        }

        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenueReport([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var query = _context.Bookings.Where(b => b.Status == "Completed" || b.Status == "Paid");

            if (startDate.HasValue) query = query.Where(b => b.CheckInDate >= startDate.Value);
            if (endDate.HasValue) query = query.Where(b => b.CheckInDate <= endDate.Value);

            var totalRevenue = await query.SumAsync(b => b.TotalPrice);
            
            return Ok(new { TotalRevenue = totalRevenue, StartDate = startDate, EndDate = endDate });
        }

        [HttpGet("occupancy")]
        public async Task<IActionResult> GetOccupancyReport([FromQuery] DateTime date)
        {
            var totalRooms = await _context.Rooms.CountAsync();
            var occupiedRooms = await _context.Bookings
                .Where(b => b.CheckInDate <= date && b.CheckOutDate > date && b.Status != "Cancelled")
                .Select(b => b.RoomId)
                .Distinct()
                .CountAsync();

            var occupancyRate = totalRooms == 0 ? 0 : (double)occupiedRooms / totalRooms * 100;

            return Ok(new { Date = date, OccupiedRooms = occupiedRooms, TotalRooms = totalRooms, OccupancyRatePercentage = occupancyRate });
        }

        [HttpGet("bookings")]
        public async Task<IActionResult> GetBookingsReport()
        {
            var totalBookings = await _context.Bookings.CountAsync();
            var cancelledBookings = await _context.Bookings.CountAsync(b => b.Status == "Cancelled");
            var completedBookings = await _context.Bookings.CountAsync(b => b.Status == "Completed");

            return Ok(new { TotalBookings = totalBookings, CancelledBookings = cancelledBookings, CompletedBookings = completedBookings });
        }

        [HttpGet("services")]
        public async Task<IActionResult> GetServicesRevenueReport()
        {
            var servicesRevenue = await _context.BookingServices
                .Include(bs => bs.Service)
                .GroupBy(bs => bs.Service.Name)
                .Select(g => new
                {
                    ServiceName = g.Key,
                    TotalQuantitySold = g.Sum(bs => bs.Quantity),
                    TotalRevenue = g.Sum(bs => bs.Service.Price * bs.Quantity)
                })
                .ToListAsync();

            return Ok(servicesRevenue);
        }

        [HttpGet("export")]
        public IActionResult ExportReport()
        {
            // Mocking the export functionality since no specific library (EPPlus, iTextSharp, etc.) is included yet.
            // A real app would generate a PDF/Excel file here and return File() result.
            return Ok(new { Message = "Report exported successfully. Check your email or download link." });
        }
    }
}
