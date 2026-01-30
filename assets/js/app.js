import { supabase, signInWithGoogle, signOut, getUser } from './supabase.js';
import { triggerGoldConfetti } from './confetti.js'; // Imported confetti

// State
let allStalls = [];
let currentUser = null;

// Mock Data (Fallback until DB is ready)
// Mock Data (Fallback until DB is ready)
const MOCK_STALLS = [
    // Category A - 3000
    { id: 101, name: 'Water bottles', category: 'Category A', base_price: 3000, description: 'Premium hydration stall.' },
    { id: 102, name: 'Biryani', category: 'Category A', base_price: 3000, description: 'Authentic flavor rich biryani.' },
    { id: 103, name: 'Ice cream', category: 'Category A', base_price: 3000, description: 'Cool treats for everyone.' },
    { id: 104, name: 'Shawarma', category: 'Category A', base_price: 3000, description: 'Hot and spicy shawarma rolls.' },

    // Category B - 1000
    { id: 201, name: 'Cool drinks', category: 'Category B', base_price: 1000, description: 'Refreshing beverages.' },
    { id: 202, name: 'Frankie', category: 'Category B', base_price: 1000, description: 'Delicious rolls.' },
    { id: 203, name: 'Waffles', category: 'Category B', base_price: 1000, description: 'Sweet and crispy waffles.' },
    { id: 204, name: 'French fries and spring potatoes', category: 'Category B', base_price: 1000, description: 'Crispy potato snacks.' },
    { id: 205, name: 'Tiffins', category: 'Category B', base_price: 1000, description: 'Traditional tiffins.' },
    { id: 206, name: 'Goli soda', category: 'Category B', base_price: 1000, description: 'Classic fizzy drink.' },
    { id: 207, name: 'Milkshakes', category: 'Category B', base_price: 1000, description: 'Creamy milkshakes.' },
    { id: 208, name: 'Kebabs', category: 'Category B', base_price: 1000, description: 'Grilled delicacies.' },
    { id: 209, name: 'Chaat and pani puri', category: 'Category B', base_price: 1000, description: 'Spicy street food.' },
    { id: 210, name: 'Maggi', category: 'Category B', base_price: 1000, description: 'All time favorite noodles.' },
    { id: 211, name: 'Fast food', category: 'Category B', base_price: 1000, description: 'Pizza, Burgers etc.' },
    { id: 212, name: 'Juices', category: 'Category B', base_price: 1000, description: 'Fresh fruit juices.' },
    { id: 213, name: 'Chocolate fountain', category: 'Category B', base_price: 1000, description: 'Chocolatey delight.' },
    { id: 214, name: 'Tacos', category: 'Category B', base_price: 1000, description: 'Mexican style tacos.' },
    { id: 215, name: 'Burgers and pizzas', category: 'Category B', base_price: 1000, description: 'Cheesy delights.' },
    { id: 216, name: 'Falooda', category: 'Category B', base_price: 1000, description: 'Rich dessert drink.' },
    { id: 217, name: 'Mojitos', category: 'Category B', base_price: 1000, description: 'Non-alcoholic refreshing mix.' },

    // Category C - 1000
    { id: 301, name: 'Accessories', category: 'Category C', base_price: 1000, description: 'Trendy accessories.' },
    { id: 302, name: 'Jewellery', category: 'Category C', base_price: 1000, description: 'Handmade and fashion jewellery.' },
    { id: 303, name: 'Keychains', category: 'Category C', base_price: 1000, description: 'Custom and fun keychains.' },
    { id: 304, name: 'Posters & Stickers', category: 'Category C', base_price: 1000, description: 'Artistic prints and stickers.' },
    { id: 305, name: 'Bakery items', category: 'Category C', base_price: 1000, description: 'Cakes and pastries.' },
    { id: 306, name: 'Flower stall', category: 'Category C', base_price: 1000, description: 'Fresh flowers and bouquets.' },
    { id: 307, name: 'Photobooth', category: 'Category C', base_price: 1000, description: 'Capture memories.' },
    { id: 308, name: 'Handicrafts(DIY)', category: 'Category C', base_price: 1000, description: 'Creative DIY crafts.' },
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

    // TODO: Replace with real DB call
    // const { data, error } = await supabase.from('stalls').select('*');

    // Simulating delay for effect
    await new Promise(r => setTimeout(r, 800));

    allStalls = MOCK_STALLS; // Replace with 'data' later
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
                <div class="stall-price">
                    ₹${stall.base_price.toLocaleString()} <span>Base Price</span>
                </div>
            </div>
            <button class="btn btn-gold btn-block apply-btn" 
                data-id="${stall.id}" 
                data-name="${stall.name}" 
                data-category="${stall.category}"
                data-price="${stall.base_price}">
                Apply Auction
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
function openAuctionModal(data) {
    if (!currentUser) {
        alert('Please sign in first to apply for an auction.');
        signInWithGoogle();
        return;
    }

    const modal = document.getElementById('auction-modal');
    modal.dataset.stallId = data.id; // Store ID for submission
    document.getElementById('modal-stall-name').textContent = data.name;
    // document.getElementById('modal-category').value = data.category; // Removed as requested
    modal.dataset.category = data.category; // Store category for success msg
    document.getElementById('modal-base-price').textContent = data.price;
    document.getElementById('bid-amount').min = data.price;

    // Reset Form
    document.getElementById('auction-form').reset();

    modal.classList.remove('hidden');
}

function closeAuctionModal() {
    document.getElementById('auction-modal').classList.add('hidden');
}

async function handleAuctionSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const bidAmount = parseInt(formData.get('amount'));
    const basePrice = parseInt(document.getElementById('modal-base-price').textContent);
    // const category = document.getElementById('modal-category').value; // Removed

    if (bidAmount < basePrice) {
        alert(`Bid amount must be at least ₹${basePrice}`);
        return;
    }

    // Email Validation: Check if at least one is present
    const gitamMail = formData.get('gitam_mail');
    const personalMail = formData.get('personal_mail');

    if (!gitamMail && !personalMail) {
        alert('Please provide either Gitam Mail or Personal Mail.');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    // Get Stall ID from modal dataset
    const modal = document.getElementById('auction-modal');
    const stallId = modal.dataset.stallId;
    const category = modal.dataset.category;

    try {
        // Call Edge Function to process bid secureley
        const { data, error } = await supabase.functions.invoke('submit-bid', {
            body: {
                stall_id: parseInt(stallId),
                user_id: currentUser.id,
                amount: bidAmount,
                full_name: formData.get('full_name'),
                phone: formData.get('phone'),
                gitam_mail: formData.get('gitam_mail'),
                personal_mail: formData.get('personal_mail')
            }
        })

        if (error) throw error;

        showSuccess(category);
        // Refresh bids immediately
        fetchUserBids();
    } catch (err) {
        console.error('Bid Error:', err);
        // Extract inner error message if available
        let msg = err.message || 'Unknown error';
        if (err.context && err.context.json) {
            const json = await err.context.json();
            msg = json.error || msg;
        }
        alert('Failed to submit bid: ' + msg);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }

}

function showSuccess(category) {
    const overlay = document.getElementById('success-overlay');
    const fssaiNotice = document.getElementById('fssai-notice');

    // Trigger Confetti
    triggerGoldConfetti(); // Called here

    // Category A and B require FSSAI
    if (category === 'Category A' || category === 'Category B') {
        fssaiNotice.classList.remove('hidden');
    } else {
        fssaiNotice.classList.add('hidden');
    }

    overlay.classList.remove('hidden');
}
