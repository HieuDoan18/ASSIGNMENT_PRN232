using System;

namespace BusinessObjects.DTOs
{
    public class BookingDto
    {
        public int BookingId { get; set; }
        public int UserId { get; set; }
        public int RoomId { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public double TotalPrice { get; set; }
        public string Status { get; set; }
        public string UserName { get; set; }
        public string RoomNumber { get; set; }
    }

    public class BookingCreateDto
    {
        public int UserId { get; set; }
        public int RoomId { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
    }

    public class BookingUpdateDto
    {
        public int RoomId { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public string Status { get; set; }
    }

    public class RoomDto
    {
        public int RoomId { get; set; }
        public int HotelId { get; set; }
        public string RoomNumber { get; set; }
        public double Price { get; set; }
        public string Status { get; set; }
    }
}
