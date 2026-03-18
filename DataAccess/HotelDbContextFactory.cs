using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HotelManagement.DataAccess
{
    public class HotelDbContextFactory
        : IDesignTimeDbContextFactory<HotelDbContext>
    {
        public HotelDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<HotelDbContext>();

            optionsBuilder.UseSqlServer(
                "Server=localhost;Database=HotelManagementDB;Trusted_Connection=True;TrustServerCertificate=True");

            return new HotelDbContext(optionsBuilder.Options);
        }
    }
}