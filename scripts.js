document.addEventListener('DOMContentLoaded', () => {
    // Load Items
    const item_list_tbody = document.getElementById('item-list-tbody');
    const searchInput = document.getElementById('search');
    const sortNav = document.getElementById('items-sort-nav');
    const itemsBookedTbody = document.getElementById('items-booked-tbody');
    const totalCostSpan = document.getElementById('total-cost');
    let totalCost = 0;

    let itemsStore = [];
    let currentCategory = 'all';
    let currentSearch = '';

    function fetchItems() {
        fetch('https://party-rental.greatsite.net/party_rental/items_api.php')
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error(data.message);
                    item_list_tbody.innerHTML = `<tr><td colspan="5">${data.message}</td></tr>`;
                    return;
                }

                itemsStore = data.data || [];
                buildCategoryNav();
                applyFilters();
            })
            .catch(err => {
                console.error(err);
                item_list_tbody.innerHTML = `<tr><td colspan="5">Error loading items.</td></tr>`;
            });
    }

    function buildCategoryNav() {
        if (!sortNav) return;
        const categories = Array.from(new Set(itemsStore.map(i => i.category))).filter(Boolean);
        const lis = [`<li data-category="all" class="active">All</li>`].concat(categories.map(c => `<li data-category="${c}">${c}</li>`));
        sortNav.innerHTML = lis.join('');

        // attach listeners
        Array.from(sortNav.querySelectorAll('li')).forEach(li => {
            li.addEventListener('click', () => {
                Array.from(sortNav.querySelectorAll('li')).forEach(x => x.classList.remove('active'));
                li.classList.add('active');
                currentCategory = li.getAttribute('data-category') || 'all';
                applyFilters();
            });
        });
    }

    function applyFilters() {
        let filtered = itemsStore.slice();
        if (currentCategory && currentCategory !== 'all') {
            filtered = filtered.filter(i => i.category === currentCategory);
        }
        if (currentSearch && currentSearch.trim() !== '') {
            const q = currentSearch.trim().toLowerCase();
            filtered = filtered.filter(i => i.item_name.toLowerCase().includes(q));
        }
        renderItems(filtered);
    }

    function renderItems(list) {
        if (!list || list.length === 0) {
            item_list_tbody.innerHTML = `<tr><td colspan="5">No items found.</td></tr>`;
            return;
        }

        item_list_tbody.innerHTML = list.map((it) => {
            // find original index for reference
            const origIdx = itemsStore.indexOf(it);
            return `
                <tr data-index="${origIdx}">
                    <td>${it.item_name}</td>
                    <td class="stock">${it.quantity_available}</td>
                    <td>
                        <input type="date" class="req-date" data-index="${origIdx}">
                        <input type="number" class="req-qty" data-index="${origIdx}" min="1" value="1" style="width:60px;margin-left:8px;">
                    </td>
                    <td><span class="available" data-index="${origIdx}">Select Date</span></td>
                    <td class="book-btn"><button class="book-button" data-index="${origIdx}" style="display:none">Book</button></td>
                </tr>`;
        }).join('');

        // attach availability handlers to visible rows
        list.forEach(it => {
            const origIdx = itemsStore.indexOf(it);
            const dateInput = document.querySelector(`.req-date[data-index="${origIdx}"]`);
            const qtyInput = document.querySelector(`.req-qty[data-index="${origIdx}"]`);
            const availSpan = document.querySelector(`.available[data-index="${origIdx}"]`);
            const bookBtn = document.querySelector(`.book-button[data-index="${origIdx}"]`);

            if (!dateInput || !qtyInput) return;

                    function updateAvailability() {
                        const date = dateInput.value;
                        const qty = parseInt(qtyInput.value, 10) || 0;
                        const stock = parseInt(it.quantity_available, 10) || 0;

                        // clear previous state classes
                        if (availSpan.classList) {
                            availSpan.classList.remove('avail--neutral', 'avail--no', 'avail--yes');
                        }

                        if (!date) {
                            availSpan.textContent = 'Select Date';
                            if (availSpan.classList) availSpan.classList.add('avail--neutral');
                            bookBtn.style.display = 'none';
                            return;
                        }

                        if (qty <= 0) {
                            availSpan.textContent = 'Enter quantity';
                            if (availSpan.classList) availSpan.classList.add('avail--neutral');
                            bookBtn.style.display = 'none';
                            return;
                        }

                        if (qty <= stock && stock > 0) {
                            availSpan.textContent = 'Yes';
                            if (availSpan.classList) availSpan.classList.add('avail--yes');
                            bookBtn.style.display = 'inline-block';
                        } else {
                            availSpan.textContent = 'No';
                            if (availSpan.classList) availSpan.classList.add('avail--no');
                            bookBtn.style.display = 'none';
                        }
                    }

            dateInput.addEventListener('change', updateAvailability);
            qtyInput.addEventListener('input', updateAvailability);
            // run once to set initial availability text
            updateAvailability();

            // book button handler
            if (bookBtn) {
                bookBtn.addEventListener('click', () => {
                    const qty = parseInt(qtyInput.value, 10) || 0;
                    const date = dateInput.value;
                    if (!date) return;
                    if (qty <= 0) return;
                    const stock = parseInt(it.quantity_available, 10) || 0;
                    if (qty > stock) {
                        alert('Requested quantity exceeds available stock.');
                        return;
                    }

                    const pricePer = parseFloat(it.rental_cost_jmd) || 0;
                    const cost = qty * pricePer;

                    // append booked row
                    if (itemsBookedTbody) {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td>${qty} ${it.item_name}</td><td>${date}</td><td>$${cost.toFixed(2)}</td>`;
                        itemsBookedTbody.appendChild(tr);
                    }

                    // update total
                    totalCost += cost;
                    if (totalCostSpan) totalCostSpan.textContent = `$${totalCost.toFixed(2)}`;
                });
            }
        });
    }

    // search handler
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value || '';
            applyFilters();
        });
    }

    // initial fetch
    fetchItems();

    // Navigation: ensure header nav has an active section on load
    const firstNavItem = document.querySelector('#header-nav li');
    if (firstNavItem) {
        // If no nav item already active, trigger the first one
        if (!document.querySelector('#header-nav li.active')) {
            firstNavItem.click();
        } else {
            document.querySelector('#header-nav li.active').click();
        }
    }
});

function showSection(id, clicked) {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => section.classList.remove('active-section'));

    const selectedSection = document.getElementById(id);
    if (selectedSection) {
        selectedSection.classList.add('active-section');
    }

    const navItems = document.querySelectorAll('#header-nav li');
    navItems.forEach(li => li.classList.remove('active'));
    if (clicked && clicked.classList) clicked.classList.add('active');

}
