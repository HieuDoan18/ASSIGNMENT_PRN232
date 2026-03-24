using System;
using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.DTOs
{
    public class CreateUserAdminDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; }

        [Required]
        public string FullName { get; set; }

        [Required]
        public string Role { get; set; } // Admin, Staff, Customer
    }

    public class UpdateUserAdminDto
    {
        [Required]
        public string FullName { get; set; }
        
        // Other fields if needed
    }

    public class ChangeRoleDto
    {
        [Required]
        public string Role { get; set; }
    }
}
