using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.DTOs
{
    public class CreateReviewDto
    {
        [Required]
        public int BookingId { get; set; }

        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        public string Comment { get; set; }
    }

    public class UpdateReviewDto
    {
        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        public string Comment { get; set; }
    }
}
