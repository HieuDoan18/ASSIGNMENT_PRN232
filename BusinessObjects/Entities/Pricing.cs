using System;
using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.Entities
{
    public class Pricing
    {
        [Key]
        public int PricingId { get; set; }

        public int RoomTypeId { get; set; }
        public RoomType RoomType { get; set; }

        [Required]
        public string SeasonName { get; set; } // e.g., "Summer", "Holiday"

        [Required]
        public double Multiplier { get; set; } // e.g., 1.5 for 50% increase, 0.8 for 20% discount

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }
    }
}
