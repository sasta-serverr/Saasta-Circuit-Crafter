// --- SEARCH LOGIC (UPDATED FOR GRID) ---
function filterComponents() {
    let input = document.getElementById('componentSearch').value.toLowerCase();
    let productCards = document.querySelectorAll('.product');

    // Hide or show individual products
    productCards.forEach(card => {
        let name = card.querySelector('.product-info span').innerText.toLowerCase();
        card.style.display = name.includes(input) ? "flex" : "none";
    });

    // Hide or show entire categories and their grids if empty
    let headings = document.querySelectorAll('h3');
    headings.forEach(h3 => {
        let grid = h3.nextElementSibling;
        if (grid && (grid.classList.contains('product-grid') || grid.id === 'resistor-container' || grid.id === 'capacitor-container' || grid.id === 'request-container')) {
            // Check if any product inside this specific grid is visible
            let hasVisibleProduct = Array.from(grid.querySelectorAll('.product')).some(card => card.style.display !== 'none');
            
            h3.style.display = hasVisibleProduct || input === "" ? "block" : "none";
            grid.style.display = hasVisibleProduct || input === "" ? "grid" : "none";
        }
    });
}

// --- NAVIGATION LOGIC ---
function nextStep(stepNumber) {
    document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
    document.getElementById('step-' + stepNumber).classList.add('active');
    
    document.querySelectorAll('.step-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + stepNumber).classList.add('active');
    
    calculateTotal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPayment() {
    calculateTotal(); 
    nextStep(3);
}

// --- DYNAMIC PROJECT FIELDS ---
function toggleProjectFields() {
    const isChecked = document.getElementById("projectService").checked;
    const detailsBox = document.getElementById("projectDetails");
    if (isChecked) {
        detailsBox.style.display = "block";
    } else {
        detailsBox.style.display = "none";
        document.querySelector('textarea[name="Project Description"]').value = "";
        document.querySelector('input[name="Project Link"]').value = "";
    }
    calculateTotal();
}

// --- DYNAMIC ROWS (Resistors, Capacitors, Custom Requests) ---

let resCount = 1;
function addResistorRow() {
    resCount++;
    const container = document.getElementById('resistor-container');
    const newRow = document.createElement('div');
    newRow.className = 'product resistor-row';
    newRow.innerHTML = `
        <img src="images/resistors.jpg" alt="Resistors">
        <div class="product-info"><span>Specific Resistor</span><small>Price TBD</small></div>
        <div class="input-group" style="width: 100%;">
            <input type="text" name="Resistor Value ${resCount}" placeholder="Value (e.g. 1kΩ)" style="width: 100%; margin-bottom: 5px;">
            <input type="number" name="Resistor Qty ${resCount}" class="res-qty" min="0" value="0" data-price="0" onchange="calculateTotal()" style="width: 100%;">
        </div>
    `;
    container.appendChild(newRow);
}

let capCount = 1;
function addCapacitorRow() {
    capCount++;
    const container = document.getElementById('capacitor-container');
    const newRow = document.createElement('div');
    newRow.className = 'product cap-row';
    newRow.innerHTML = `
        <img src="images/Capcitors.jpg" alt="Capacitors">
        <div class="product-info"><span>Specific Capacitor</span><small>Price TBD</small></div>
        <div class="input-group" style="width: 100%;">
            <input type="text" name="Capacitor Value ${capCount}" placeholder="Value (e.g. 10uF)" style="width: 100%; margin-bottom: 5px;">
            <input type="number" name="Capacitor Qty ${capCount}" class="cap-qty" min="0" value="0" data-price="0" onchange="calculateTotal()" style="width: 100%;">
        </div>
    `;
    container.appendChild(newRow);
}

let reqCount = 1;
function addRequestRow() {
    reqCount++;
    const container = document.getElementById('request-container');
    const newRow = document.createElement('div');
    newRow.className = 'product request-row';
    newRow.innerHTML = `
        <img src="https://placehold.co/100x100/e2e8f0/1e293b?text=Custom" alt="Custom Request">
        <div class="product-info"><span>Custom Item</span><small>Price TBD</small></div>
        <div class="input-group" style="width: 100%;">
            <input type="text" name="Custom Request ${reqCount}" placeholder="Item Name & Details" style="width: 100%; margin-bottom: 5px;">
            <input type="number" name="Custom Qty ${reqCount}" placeholder="Qty" min="0" value="0" data-price="0" style="width: 100%;">
        </div>
    `;
    container.appendChild(newRow);
}

// --- BILL CALCULATION WITH DELIVERY FEE ---
function calculateTotal() {
    // 1. Determine Delivery Fee
    let deliveryFee = 99; // Default Standard Delivery
    let displayLabel = "Delivery Charge: ₹99";
    
    if (document.getElementById("deliveryExpress") && document.getElementById("deliveryExpress").checked) {
        deliveryFee = 299;
        displayLabel = "Express Delivery Charge: ₹299";
    }

    // Update the UI label in Step 3
    if(document.getElementById("deliveryDisplay")) {
        document.getElementById("deliveryDisplay").innerText = displayLabel;
    }

    // 2. Calculate Items
    let itemTotal = 0;
    let allInputs = document.querySelectorAll("input[type='number']");
    allInputs.forEach(input => {
        itemTotal += (parseInt(input.value) || 0) * (parseInt(input.dataset.price) || 0);
    });

    // 3. Set Total (Only add delivery fee if they bought an item)
    let finalTotal = 0;
    if (itemTotal > 0) {
        finalTotal = itemTotal + deliveryFee;
    }

    document.getElementById("total").innerText = "₹" + finalTotal;
    document.getElementById("hiddenTotal").value = "₹" + finalTotal;
}

// --- RAZORPAY & BACKEND INTEGRATION ---
async function payWithRazorpay() {
    // 1. Gather Details
    let name = document.getElementById("cName").value.trim();
    let phone = document.getElementById("cPhone").value.trim();
    let email = document.getElementById("cEmail").value.trim();
    let pledgeYes = document.getElementById("pledgeYes").checked;
    let totalAmount = parseInt(document.getElementById("total").innerText.replace("₹", ""));

    // 2. Validate Everything
    let hasCustomRequests = Array.from(document.querySelectorAll('input[name^="Custom Qty"]')).some(input => parseInt(input.value) > 0);
    let wantsProject = document.getElementById("projectService").checked;
    
    // If they bought nothing and didn't request a project/custom item
    if (totalAmount <= 0 && !hasCustomRequests && !wantsProject) { 
        alert("Please select components from Step 1 first!"); 
        nextStep(1); 
        return; 
    }
    
    if (!name || !phone || !email) { alert("Please fill out all Contact Details in Step 2!"); nextStep(2); return; }
    if (!pledgeYes) { alert("You must agree to the pledge before paying."); return; }

    try {
        // If the bill is 0 but they requested a project/custom item, skip Razorpay
        if (totalAmount === 0 && (hasCustomRequests || wantsProject)) {
            submitFormspreeOrderOnly();
            return;
        }

        // 3. Ask Node Backend for an Order ID
        const response = await fetch('https://circuit-crafter-server.onrender.com/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalAmount })
        });
        
        if (!response.ok) throw new Error("Backend server is not running!");
        const order = await response.json();

        // 4. Configure Razorpay Popup
        var options = {
            "key": "rzp_test_SJjM5EzjnFRi7Z", // YOUR TEST KEY ID
            "amount": order.amount,
            "currency": "INR",
            "name": "Saasta Circuit Crafter",
            "description": "Electronic Components Order",
            "order_id": order.id, 
            "theme": { "color": "#0ea5e9" },
            "prefill": { "name": name, "email": email, "contact": phone },
            "handler": async function (rzp_response) {
                // 5. Success! Verify with Backend
                const verifyRes = await fetch('https://circuit-crafter-server.onrender.com/verify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: rzp_response.razorpay_order_id,
                        razorpay_payment_id: rzp_response.razorpay_payment_id,
                        razorpay_signature: rzp_response.razorpay_signature,
                        customerDetails: { name, email, phone }
                    })
                });
                
                const verifyData = await verifyRes.json();
                
                // 6. IF VERIFIED, SHOW SUCCESS PAGE & SILENTLY EMAIL
                if(verifyData.success) {
                    document.getElementById('razorpay_payment_id').value = rzp_response.razorpay_payment_id;
                    submitFormspreeOrderOnly();
                } else {
                    alert("Payment verification failed! Please contact support.");
                }
            }
        };
        
        var rzp = new Razorpay(options);
        rzp.on('payment.failed', function (res){
            alert("Payment Failed: " + res.error.description);
        });
        rzp.open();

    } catch (err) {
        alert("Server Error! Make sure your Node.js backend is running.");
        console.error(err);
    }
}

// Helper function to submit form without repeating code
function submitFormspreeOrderOnly() {
    const form = document.getElementById("orderForm");
    const formData = new FormData(form);
    
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
    }).then(response => {
        console.log("Formspree email sent successfully.");
    }).catch(error => {
        console.error("Formspree Error:", error);
    });

    document.querySelectorAll('.step-section').forEach(el => el.classList.remove('active'));
    document.getElementById('step-success').classList.add('active');
    document.querySelectorAll('.step-tab').forEach(el => el.style.opacity = '0.3');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Attempt to open Instagram app; fallback to web profile
function openInstagram() {
    const username = 'saasta_circuit_crafter_store';
    const appUrl = `instagram://user?username=${username}`;
    const webUrl = `https://www.instagram.com/${username}/`;

    // Try app deep link first, then fallback to web after a short delay
    const timeout = setTimeout(() => { window.location.href = webUrl; }, 700);
    try {
        window.location.href = appUrl;
    } catch (e) {
        clearTimeout(timeout);
        window.location.href = webUrl;
    }
}

window.onload = function() {
    calculateTotal(); 
}
