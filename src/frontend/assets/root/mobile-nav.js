// Mobile Navigation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mobileNavMenu = document.getElementById('mobile-nav-menu');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    
    if (hamburgerMenu && mobileNavMenu && mobileNavOverlay) {
        // Toggle mobile menu
        function toggleMobileMenu() {
            hamburgerMenu.classList.toggle('active');
            mobileNavMenu.classList.toggle('active');
            mobileNavOverlay.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (mobileNavMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
        
        // Event listeners
        hamburgerMenu.addEventListener('click', toggleMobileMenu);
        mobileNavOverlay.addEventListener('click', toggleMobileMenu);
        
        // Close menu when clicking on nav items
        const mobileNavButtons = mobileNavMenu.querySelectorAll('button');
        mobileNavButtons.forEach(button => {
            button.addEventListener('click', toggleMobileMenu);
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                // Close mobile menu on desktop
                hamburgerMenu.classList.remove('active');
                mobileNavMenu.classList.remove('active');
                mobileNavOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});

// Handle Dash callback updates
window.addEventListener('dash-update', function() {
    // Re-attach event listeners after Dash updates
    setTimeout(() => {
        const hamburgerMenu = document.getElementById('hamburger-menu');
        const mobileNavMenu = document.getElementById('mobile-nav-menu');
        const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
        
        if (hamburgerMenu && !hamburgerMenu.hasAttribute('data-mobile-nav-initialized')) {
            hamburgerMenu.setAttribute('data-mobile-nav-initialized', 'true');
            // Re-run initialization
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);
        }
    }, 100);
});