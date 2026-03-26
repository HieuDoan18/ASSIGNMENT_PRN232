using System.ComponentModel.DataAnnotations;

namespace BusinessObjects.DTOs
{
    public class UserProfileDto
    {
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Avatar { get; set; }
    }

    public class UpdateProfileDto
    {
        [Required]
        public string FullName { get; set; }
    }

    public class ChangePasswordDto
    {
        [Required]
        public string CurrentPassword { get; set; }

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; }
    }

    public class UploadAvatarDto
    {
        [Required]
        public string AvatarUrl { get; set; }
    }
}
