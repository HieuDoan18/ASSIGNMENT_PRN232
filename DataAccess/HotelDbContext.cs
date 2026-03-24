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
        public DbSet<Service> Services { get; set; }
        public DbSet<BookingService> BookingServices { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<CustomerRequest> CustomerRequests { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<InventoryItem> InventoryItems { get; set; }

        public DbSet<RoomType> RoomTypes { get; set; }
        public DbSet<Pricing> Pricings { get; set; }
        public DbSet<Promotion> Promotions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<BookingService>()
                .HasKey(bs => new { bs.BookingId, bs.ServiceId });
        }
    }
}