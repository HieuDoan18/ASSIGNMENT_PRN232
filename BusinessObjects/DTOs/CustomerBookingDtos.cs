using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.DTOs
{
    public class CreateBookingDto
    {
        [Required]
        public int RoomId { get; set; }

        [Required]
        public DateTime CheckInDate { get; set; }

        [Required]
        public DateTime CheckOutDate { get; set; }
    }

    public class AddServiceToBookingDto
    {
        [Required]
        public int ServiceId { get; set; }

        [Required]
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }

    public class ProcessPaymentDto
    {
        [Required]
        public string PaymentMethod { get; set; }
    }

    public class SearchRoomDto
    {
        [Required]
        public DateTime CheckInDate { get; set; }

        [Required]
        public DateTime CheckOutDate { get; set; }

        public int? MinCapacity { get; set; } // If Capacity was in Room, maybe filter by it
        // Depending on requirements, we can add more filters
    }
}
