import { supabase, signInWithGoogle, signOut, getUser } from './supabase.js';
import { triggerGoldConfetti } from './confetti.js'; // Imported confetti

// State
let allStalls = [];
let currentUser = null;

// Mock Data (Fallback until DB is ready)
// Mock Data (Fallback until DB is ready)
const MOCK_STALLS = [
    // Category A - Base 60000, Reg 3000, Size 20x20
    { id: 101, name: 'Water bottles', category: 'Category A', base_price: 60000, reg_fee: 3000, size: '20x20', description: 'Premium hydration stall.' },
    { id: 102, name: 'Biryani', category: 'Category A', base_price: 60000, reg_fee: 3000, size: '20x20', description: 'Authentic flavor rich biryani.' },
    { id: 103, name: 'Ice cream', category: 'Category A', base_price: 60000, reg_fee: 3000, size: '20x20', description: 'Cool treats for everyone.' },
    { id: 104, name: 'Shawarma', category: 'Category A', base_price: 60000, reg_fee: 3000, size: '20x20', description: 'Hot and spicy shawarma rolls.' },

    // Category B - Base 30000, Reg 1000, Size 10x10
    { id: 201, name: 'Cool drinks', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Refreshing beverages.' },
    { id: 202, name: 'Frankie', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Delicious rolls.' },
    { id: 203, name: 'Waffles', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Sweet and crispy waffles.' },
    { id: 204, name: 'French fries and spring potatoes', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Crispy potato snacks.' },
    { id: 205, name: 'Tiffins', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Traditional tiffins.' },
    { id: 206, name: 'Goli soda', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Classic fizzy drink.' },
    { id: 207, name: 'Milkshakes', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Creamy milkshakes.' },
    { id: 208, name: 'Kebabs', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Grilled delicacies.' },
    { id: 209, name: 'Chaat and pani puri', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Spicy street food.' },
    { id: 210, name: 'Maggi', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'All time favorite noodles.' },
    { id: 211, name: 'Fast food', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Pizza, Burgers etc.' },
    { id: 212, name: 'Juices', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Fresh fruit juices.' },
    { id: 213, name: 'Chocolate fountain', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Chocolatey delight.' },
    { id: 214, name: 'Tacos', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Mexican style tacos.' },
    { id: 215, name: 'Burgers and pizzas', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Cheesy delights.' },
    { id: 216, name: 'Falooda', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Rich dessert drink.' },
    { id: 217, name: 'Mojitos', category: 'Category B', base_price: 30000, reg_fee: 1000, size: '10x10', description: 'Non-alcoholic refreshing mix.' },

    // Category C - Base 16000, Reg 1000, Size 10x10
    { id: 301, name: 'Accessories', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Trendy accessories.' },
    { id: 302, name: 'Jewellery', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Handmade and fashion jewellery.' },
    { id: 303, name: 'Keychains', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Custom and fun keychains.' },
    { id: 304, name: 'Posters & Stickers', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Artistic prints and stickers.' },
    { id: 305, name: 'Bakery items', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Cakes and pastries.' },
    { id: 306, name: 'Flower stall', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Fresh flowers and bouquets.' },
    { id: 307, name: 'Photobooth', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Capture memories.' },
    { id: 308, name: 'Handicrafts(DIY)', category: 'Category C', base_price: 16000, reg_fee: 1000, size: '10x10', description: 'Creative DIY crafts.' },
];


document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check Auth Status
    currentUser = await getUser();
    updateAuthUI();

    // 2. Load Stalls
    await fetchStalls();

    // 3. Load User Bids (if auth)
    if (currentUser) {
        await fetchUserBids();
    }

    // 4. Event Listeners
    setupEventListeners();
});

function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userProfile = document.getElementById('user-profile');
    const userName = document.getElementById('user-name');

    if (currentUser) {
        authBtn.style.display = 'none'; // Explicit Force Hide
        userProfile.style.display = 'flex'; // Explicit Force Show
        userProfile.classList.remove('hidden');
        userName.textContent = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];
    } else {
        authBtn.style.display = 'block';
        userProfile.style.display = 'none';
        authBtn.classList.remove('hidden');
    }
}

// Sidebar Logic
async function fetchUserBids() {
    // Fetch bids from Supabase
    const { data: bids, error } = await supabase
        .from('bids')
        .select(`
            amount,
            stall:stalls (name, category)
        `)
        .eq('user_id', currentUser.id);

    if (bids && bids.length > 0) {
        renderBids(bids);
        document.getElementById('my-bids-btn').style.display = 'inline-block';
    } else {
        document.getElementById('my-bids-btn').style.display = 'none';
    }
}

function renderBids(bids) {
    const container = document.getElementById('bids-list');
    container.innerHTML = '';

    bids.forEach(bid => {
        const item = document.createElement('div');
        item.className = 'bid-item';
        item.innerHTML = `
            <h4>${bid.stall.name}</h4>
            <p>${bid.stall.category}</p>
            <span class="bid-amount">Bid: ₹${bid.amount}</span>
        `;
        container.appendChild(item);
    });
}


async function fetchStalls() {
    const stallContainer = document.getElementById('stalls-grid');
    stallContainer.innerHTML = '<div class="loading-spinner">Loading...</div>';

    // Fetch real data from Supabase
    const { data: stalls, error } = await supabase
        .from('stalls')
        .select('*')
        .order('id', { ascending: true }); // Order by ID to keep consistent list

    if (error) {
        console.error('Error fetching stalls:', error);
        stallContainer.innerHTML = '<p class="error-msg">Failed to load stalls. Please try again later.</p>';
        return;
    }

    allStalls = stalls;
    renderStalls(allStalls);
}

function renderStalls(stalls) {
    const container = document.getElementById('stalls-grid');
    container.innerHTML = '';

    if (stalls.length === 0) {
        container.innerHTML = '<p class="no-results">No stalls found.</p>';
        return;
    }

    stalls.forEach(stall => {
        const card = document.createElement('div');
        card.className = 'stall-card';
        card.innerHTML = `
            <div class="stall-header">
                <h3 class="stall-title">${stall.name}</h3>
                <span class="stall-category">${stall.category}</span>
            </div>
            <div class="stall-body">
                <p class="stall-desc">${stall.description}</p>
                <div class="stall-details" style="font-size: 0.85rem; color: #888; margin-bottom: 0.5rem;">
                    Size: ${stall.size} | Reg Fee: ₹${stall.reg_fee.toLocaleString()}
                </div>
                <div class="stall-price">
                    ₹${stall.base_price.toLocaleString()} <span>Base Price</span>
                </div>
            </div>
            <button class="btn btn-gold btn-block apply-btn" 
                data-id="${stall.id}" 
                data-name="${stall.name}" 
                data-category="${stall.category}"
                data-price="${stall.base_price}"
                data-reg-fee="${stall.reg_fee}"
                data-size="${stall.size}">
                Register for Bidding
            </button>
        `;
        container.appendChild(card);
    });

    // Re-attach listeners to new buttons
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', (e) => openAuctionModal(e.target.dataset));
    });
}

function setupEventListeners() {
    // Sidebar Toggles
    const sidebar = document.getElementById('bids-sidebar');
    const myBidsBtn = document.getElementById('my-bids-btn');

    if (myBidsBtn) {
        myBidsBtn.addEventListener('click', () => {
            sidebar.classList.remove('hidden');
        });
    }

    document.getElementById('close-sidebar').addEventListener('click', () => {
        sidebar.classList.add('hidden');
    });

    // Auth
    document.getElementById('auth-btn').addEventListener('click', signInWithGoogle);
    document.getElementById('logout-btn').addEventListener('click', signOut);

    // Search
    document.getElementById('stall-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filterStalls(term, getCurrentCategory());
    });

    // Filter
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterStalls(document.getElementById('stall-search').value.toLowerCase(), e.target.dataset.category);
        });
    });

    // Modal Closing
    document.querySelector('.close-modal').addEventListener('click', closeAuctionModal);

    // Auction Form
    document.getElementById('auction-form').addEventListener('submit', handleAuctionSubmit);

    // Success close
    document.getElementById('close-success').addEventListener('click', () => {
        document.getElementById('success-overlay').classList.add('hidden');
        closeAuctionModal();
    });
}

function getCurrentCategory() {
    return document.querySelector('.filter-btn.active').dataset.category;
}

function filterStalls(searchTerm, category) {
    const filtered = allStalls.filter(stall => {
        const matchesSearch = stall.name.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || stall.category === category;
        return matchesSearch && matchesCategory;
    });
    renderStalls(filtered);
}

// Auction Logic
// Auction Logic
function openAuctionModal(data) {
    if (!currentUser) {
        alert('Please sign in first to apply for an auction.');
        signInWithGoogle();
        return;
    }

    const modal = document.getElementById('auction-modal');
    modal.dataset.stallId = data.id;
    modal.dataset.category = data.category;

    // UI Updates
    document.getElementById('modal-stall-name').innerHTML = `${data.name} <span style="font-size:0.8em; color:var(--text-muted)">(${data.size})</span>`;
    document.getElementById('modal-base-price').textContent = parseInt(data.price).toLocaleString();
    document.getElementById('modal-reg-fee').textContent = parseInt(data.regFee).toLocaleString();

    // Set validation limits based on category
    let maxBid = 0;
    if (data.category === 'Category A') maxBid = 120000;
    else if (data.category === 'Category B') maxBid = 60000;
    else if (data.category === 'Category C') maxBid = 29087;

    modal.dataset.maxBid = maxBid;

    // Input setup
    const bidInput = document.getElementById('bid-amount');
    bidInput.min = data.price;
    bidInput.max = maxBid;
    bidInput.placeholder = "Enter your max bid";

    // Auto-fill Name & Email (Read-only)
    const nameInput = document.querySelector('input[name="full_name"]');
    nameInput.value = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];
    nameInput.readOnly = true;
    nameInput.style.opacity = '0.7';
    nameInput.style.cursor = 'not-allowed';

    // Reset Form
    document.getElementById('auction-form').reset();

    // Re-apply name (reset clears it)
    nameInput.value = currentUser.user_metadata.full_name || currentUser.email.split('@')[0];

    modal.classList.remove('hidden');
}

function closeAuctionModal() {
    document.getElementById('auction-modal').classList.add('hidden');
}

async function handleAuctionSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const bidAmount = parseInt(formData.get('amount'));
    const basePrice = parseInt(document.getElementById('modal-base-price').textContent.replace(/,/g, ''));
    const modal = document.getElementById('auction-modal');
    const maxBid = parseInt(modal.dataset.maxBid);

    if (bidAmount < basePrice) {
        alert(`Bid amount must be at least ₹${basePrice.toLocaleString()}`);
        return;
    }

    if (bidAmount > maxBid) {
        alert(`Please enter a true valid bid. Amount should not exceed ₹${maxBid.toLocaleString()}`);
        return;
    }

    // Email Validation
    const gitamMail = formData.get('gitam_mail');
    const personalMail = formData.get('personal_mail');

    if (!gitamMail && !personalMail) {
        alert('Please provide either Gitam Mail or Personal Mail.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Registering...';
    submitBtn.disabled = true;

    const stallId = modal.dataset.stallId;
    const category = modal.dataset.category;

    try {
        const { data, error } = await supabase.functions.invoke('submit-bid', {
            body: {
                stall_id: parseInt(stallId),
                user_id: currentUser.id,
                amount: bidAmount,
                full_name: document.querySelector('input[name="full_name"]').value, // Read only value
                phone: formData.get('phone'),
                gitam_mail: formData.get('gitam_mail'),
                personal_mail: formData.get('personal_mail')
            }
        })

        if (error) throw error;

        showSuccess(category);
        fetchUserBids();
    } catch (err) {
        console.error('Bid Error:', err);
        let msg = err.message || 'Unknown error';
        if (err.context && err.context.json) {
            const json = await err.context.json();
            msg = json.error || msg;
        }
        alert('Failed to register: ' + msg);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }

}

function showSuccess(category) {
    const overlay = document.getElementById('success-overlay');

    // Hide old elements if any
    const fssaiNotice = document.getElementById('fssai-notice');
    if (fssaiNotice) fssaiNotice.classList.add('hidden'); // Hide FSSAI for now or keep if needed, prompt says update *all*

    // Update Content
    const successTitle = overlay.querySelector('h2');
    const successDesc = overlay.querySelector('p');

    successTitle.textContent = "Registration Successful!";
    successDesc.innerHTML = "Bidding date & venue will be revealed soon.<br><strong>Offline Bidding.</strong>";

    // No confetti

    overlay.classList.remove('hidden');
}
