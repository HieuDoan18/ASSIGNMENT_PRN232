document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }
    
    // UI Elements
    const sections = ['roomsSection', 'bookingsSection', 'profileSection'];
    const navItems = document.querySelectorAll('.nav-item');
    
    let currentBookingId = null;

    // Navigation Logic
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => {
                document.getElementById(sec).classList.add('hidden');
            });
            document.getElementById(targetId).classList.remove('hidden');
            
            if (targetId === 'bookingsSection') loadBookings();
            if (targetId === 'roomsSection') loadRooms();
        });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = '../index.html';
    });

    // INIT
    await loadUserProfile();
    loadRooms();

    // ------------------- PROFILE -------------------
    async function loadUserProfile() {
        try {
            const up = await ApiService.get('/auth/me');
            
            // Handle edge cases where previous bugs saved "undefined" string to DB
            const displayFullName = (up.fullName && up.fullName !== 'undefined') ? up.fullName : (up.FullName && up.FullName !== 'undefined' ? up.FullName : '');
            const displayEmail = up.email || up.Email || '';
            const displayAvatar = up.avatar || up.Avatar || 'https://via.placeholder.com/100';

            document.getElementById('userNameDisplay').textContent = `Welcome, ${displayFullName || 'User'}`;
            document.getElementById('profEmail').value = displayEmail;
            document.getElementById('profFullName').value = displayFullName;
            
            document.getElementById('profAvatar').value = displayAvatar !== 'https://via.placeholder.com/100' ? displayAvatar : '';
            document.getElementById('avatarDisplay').src = displayAvatar;
        } catch (error) {
            console.error("Failed to load profile:", error);
        }
    }

    // Update basic info
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fname = document.getElementById('profFullName').value;
        const avatarUrl = document.getElementById('profAvatar').value;
        const alertBox = document.getElementById('profileAlert');
        try {
            await ApiService.put('/users/profile', { fullName: fname, avatar: avatarUrl });
            alertBox.textContent = "Profile updated!";
            alertBox.className = "alert alert-success";
            alertBox.style.display = "block";
            await loadUserProfile();
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.className = "alert alert-error";
            alertBox.style.display = "block";
        }
    });

    // Change Password
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const curPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confPass = document.getElementById('confirmPassword').value;
        const alertBox = document.getElementById('passwordAlert');
        
        if (newPass !== confPass) {
            alertBox.textContent = "New password and Confirm password do not match.";
            alertBox.className = "alert alert-error";
            alertBox.style.display = "block";
            return;
        }

        try {
            await ApiService.put('/users/change-password', {
                currentPassword: curPass,
                newPassword: newPass
            });
            alertBox.textContent = "Password changed successfully!";
            alertBox.className = "alert alert-success";
            alertBox.style.display = "block";
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.className = "alert alert-error";
            alertBox.style.display = "block";
        }
    });

    // Removed Send Reset Token explicitly -> Moved to index.html

    // ------------------- ROOMS -------------------
    document.getElementById('searchRoomsBtn').addEventListener('click', () => {
        const checkIn = document.getElementById('searchCheckIn').value;
        const checkOut = document.getElementById('searchCheckOut').value;
        if (checkIn && checkOut) {
            loadRooms(`/api/rooms/search?checkIn=${checkIn}&checkOut=${checkOut}`);
        } else {
            loadRooms();
        }
    });

    async function loadRooms(endpoint = '/rooms') {
        const tbody = document.getElementById('roomsTableBody');
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get(endpoint);
            tbody.innerHTML = '';
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No rooms found.</td></tr>';
                return;
            }
            data.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${r.roomNumber}</td>
                    <td>${r.roomType ? r.roomType.name : 'Standard'}</td>
                    <td>$${r.price}</td>
                    <td><span style="color: ${r.status === 'Available' ? '#10B981' : '#EF4444'}">${r.status}</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="bookRoom(${r.roomId})" ${r.status !== 'Available' ? 'disabled' : ''}>Book</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-error">Failed to load rooms: ${error.message}</td></tr>`;
        }
    }

    window.bookRoom = async (roomId) => {
        const checkIn = prompt("Enter Check-In Date (YYYY-MM-DD):");
        if (!checkIn) return;
        const checkOut = prompt("Enter Check-Out Date (YYYY-MM-DD):");
        if (!checkOut) return;

        try {
            await ApiService.post('/bookings', {
                roomId: roomId,
                checkInDate: checkIn,
                checkOutDate: checkOut
            });
            alert("Booking created successfully!");
            loadRooms();
            document.querySelector('[data-target="bookingsSection"]').click();
        } catch (error) {
            alert("Booking failed: " + error.message);
        }
    };

    // ------------------- BOOKINGS -------------------
    async function loadBookings() {
        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';
        document.getElementById('bookingDetailsContainer').classList.add('hidden');

        try {
            const data = await ApiService.get('/bookings');
            tbody.innerHTML = '';
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">You have no bookings.</td></tr>';
                return;
            }
            data.forEach(b => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${b.bookingId}</td>
                    <td>${b.roomId}</td>
                    <td>${new Date(b.checkInDate).toLocaleDateString()} - ${new Date(b.checkOutDate).toLocaleDateString()}</td>
                    <td>$${b.totalPrice}</td>
                    <td>${b.status}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="manageBooking(${b.bookingId}, '${b.status}')">Manage</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed to load bookings: ${error.message}</td></tr>`;
        }
    }

    window.manageBooking = async (id, status) => {
        currentBookingId = id;
        document.getElementById('detailsTitle').textContent = `Manage Booking #${id} (${status})`;
        document.getElementById('bookingDetailsContainer').classList.remove('hidden');

        const cancelBtn = document.getElementById('cancelBookingBtn');
        if (status === 'Cancelled' || status === 'Completed') {
            cancelBtn.style.display = 'none';
        } else {
            cancelBtn.style.display = 'inline-block';
        }

        // Load services
        try {
            const services = await ApiService.get('/services');
            const select = document.getElementById('serviceSelect');
            select.innerHTML = '<option value="">Select a service...</option>';
            services.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.serviceId;
                opt.textContent = `${s.name} - $${s.price}`;
                select.appendChild(opt);
            });
        } catch (error) {
            console.error("Failed to load services for dropdown");
        }
    };

    document.getElementById('cancelBookingBtn').addEventListener('click', async () => {
        if (!currentBookingId) return;
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        
        try {
            await ApiService.put(`/bookings/${currentBookingId}/cancel`, {});
            alert("Booking cancelled.");
            loadBookings();
        } catch (error) {
            alert("Failed to cancel: " + error.message);
        }
    });

    document.getElementById('addServiceBtn').addEventListener('click', async () => {
        if (!currentBookingId) return;
        const serviceId = document.getElementById('serviceSelect').value;
        const qty = parseInt(document.getElementById('serviceQty').value) || 1;
        
        if (!serviceId) {
            alert("Please select a service.");
            return;
        }

        try {
            await ApiService.post(`/bookings/${currentBookingId}/services`, {
                serviceId: parseInt(serviceId),
                quantity: qty
            });
            alert("Service added to booking.");
            loadBookings(); // To refresh price
        } catch (error) {
            alert("Failed to add service: " + error.message);
        }
    });
});
