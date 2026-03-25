document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        window.location.href = '../index.html';
        return;
    }
    
    // UI Navigation
    const sections = ['inventorySection', 'bookingsSection'];
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            const targetId = item.getAttribute('data-target');
            sections.forEach(sec => document.getElementById(sec).classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
            
            if (targetId === 'inventorySection') loadInventory();
            if (targetId === 'bookingsSection') loadBookings();
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = '../index.html';
    });

    // INIT
    loadInventory();

    // ------------------- INVENTORY -------------------
    async function loadInventory() {
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        try {
            const data = await ApiService.get('/staff/inventory');
            tbody.innerHTML = '';
            
            if(!data || data.length === 0) {
                 tbody.innerHTML = '<tr><td colspan="4" class="text-center">No inventory found</td></tr>';
                 return;
            }

            data.forEach(i => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${i.itemName}</td>
                    <td>${i.quantity}</td>
                    <td>$${i.unitPrice}</td>
                    <td>
                        <button class="btn btn-secondary text-sm" onclick="promptStock(${i.itemId})">Update Stock</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-error">Failed: ${error.message}</td></tr>`;
        }
    }

    window.promptStock = async (itemId) => {
        const p = prompt("Enter new quantity:");
        if (!p) return;
        try {
            await fetch(`http://localhost:5032/api/staff/inventory/${itemId}/stock`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                },
                body: JSON.stringify(parseInt(p))
            });
            loadInventory();
        } catch(error) {
            alert(error.message);
        }
    };

    // ------------------- BOOKINGS (Demo) -------------------
    async function loadBookings() {
        // Here normally we call an endpoint like GET /api/admin/bookings to get ALL bookings.
        // For now, customer endpoints only return their own bookings.
        const tbody = document.getElementById('allBookingsTableBody');
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">You can view bookings here once an appropriate Admin/Staff Bookings endpoint is implemented. By default /api/bookings gets Customer's own bookings.</td></tr>`;
    }
});
