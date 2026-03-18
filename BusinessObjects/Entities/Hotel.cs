using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BusinessObjects.Entities
{
    public class Hotel
    {
        public int HotelId { get; set; }

        public string Name { get; set; }

        public string Location { get; set; }

        public string Description { get; set; }

        public double Rating { get; set; }

        public ICollection<Room> Rooms { get; set; }
    }
}
