using Microsoft.EntityFrameworkCore;
using BusinessObjects.Entities;
using System.Collections.Generic;

namespace HotelManagement.DataAccess
{
    public class HotelDbContext : DbContext
    {
        public HotelDbContext(DbContextOptions<HotelDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }

        public DbSet<Hotel> Hotels { get; set; }

        public DbSet<Room> Rooms { get; set; }

        public DbSet<Booking> Bookings { get; set; }
    }
}