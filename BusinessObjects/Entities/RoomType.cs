using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.Entities
{
    public class RoomType
    {
        [Key]
        public int RoomTypeId { get; set; }
        
        [Required]
        public string Name { get; set; }
        
        public string Description { get; set; }
        
        [Required]
        public double BasePrice { get; set; }

        public ICollection<Room> Rooms { get; set; }
        public ICollection<Pricing> Pricings { get; set; }
    }
}
