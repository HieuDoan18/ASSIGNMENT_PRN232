using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BusinessObjects.Entities
{
    public class Booking
    {
        public int BookingId { get; set; }

        public int UserId { get; set; }

        public int RoomId { get; set; }

        public DateTime CheckInDate { get; set; }

        public DateTime CheckOutDate { get; set; }

        public double TotalPrice { get; set; }

        public User User { get; set; }

        public Room Room { get; set; }
    }
}
