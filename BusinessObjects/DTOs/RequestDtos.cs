using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.DTOs
{
    public class CreateRequestDto
    {
        public int? BookingId { get; set; }

        [Required]
        public string RequestContent { get; set; }
    }
}
