using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BusinessObjects.Entities
{
    public class Room
    {
        public int RoomId { get; set; }

        public int HotelId { get; set; }

        public string RoomNumber { get; set; }

        public double Price { get; set; }

        public string Status { get; set; }

        public int? RoomTypeId { get; set; }
        public RoomType RoomType { get; set; }

        public Hotel Hotel { get; set; }

        public ICollection<Booking> Bookings { get; set; }
    }
}
