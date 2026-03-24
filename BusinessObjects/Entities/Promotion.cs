using System;
using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.Entities
{
    public class Promotion
    {
        [Key]
        public int PromotionId { get; set; }

        [Required]
        public string Code { get; set; }

        [Required]
        [Range(0, 100)]
        public double DiscountPercentage { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }
    }
}
