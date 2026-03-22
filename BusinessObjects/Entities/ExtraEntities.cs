using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.Entities
{
    public class Service
    {
        [Key]
        public int ServiceId { get; set; }
        public string Name { get; set; }
        public double Price { get; set; }
        public ICollection<BookingService> BookingServices { get; set; }
    }

    public class BookingService
    {
        public int BookingId { get; set; }
        public Booking Booking { get; set; }
        public int ServiceId { get; set; }
        public Service Service { get; set; }
        public int Quantity { get; set; }
    }

    public class Payment
    {
        [Key]
        public int PaymentId { get; set; }
        public int BookingId { get; set; }
        public Booking Booking { get; set; }
        public double Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string PaymentMethod { get; set; }
        public string Status { get; set; }
    }

    public class CustomerRequest
    {
        [Key]
        public int RequestId { get; set; }
        public int? BookingId { get; set; }
        public Booking Booking { get; set; }
        public string RequestContent { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class Review
    {
        [Key]
        public int ReviewId { get; set; }
        public int BookingId { get; set; }
        public Booking Booking { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; }
        public string StaffReply { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class InventoryItem
    {
        [Key]
        public int InventoryItemId { get; set; }
        public string Name { get; set; }
        public int Quantity { get; set; }
        public string Unit { get; set; }
        public double Price { get; set; }
        public int MinStockLevel { get; set; }
    }
}
