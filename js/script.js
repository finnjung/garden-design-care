// DOM Elements
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const contactForm = document.getElementById('contactForm');

// Navbar Scroll Effect
let lastScrollTop = 0;
window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add scrolled class for background effect
    if (scrollTop > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Update active nav link based on scroll position
    updateActiveNavLink();
    
    lastScrollTop = scrollTop;
});

// Mobile Navigation Toggle
hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close mobile menu when clicking nav links
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});

// Smooth Scrolling for all internal anchor links (nav + buttons)
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const targetId = link.getAttribute('href');
    if (targetId === '#') return;
    const targetSection = document.querySelector(targetId);
    if (targetSection) {
        e.preventDefault();
        const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
});

// Update Active Navigation Link
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            navLinks.forEach(link => link.classList.remove('active'));
            const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
            if (activeLink) activeLink.classList.add('active');
        }
    });
}

// Hero Scroll Arrow Click
const heroScroll = document.querySelector('.hero-scroll');
if (heroScroll) {
    heroScroll.addEventListener('click', () => {
        const servicesSection = document.getElementById('services');
        if (servicesSection) {
            servicesSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// Form Handling
if (contactForm) {
    contactForm.addEventListener('submit', handleFormSubmit);
}

// Lokale Entwicklungsumgebung oder HTTP (kein SSL) erkennen
const isLocalDev = ['localhost', '127.0.0.1', ''].includes(window.location.hostname) || window.location.protocol === 'http:';

// Turnstile Callback Functions
window.onTurnstileSuccess = function(token) {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
};

window.onTurnstileError = function(error) {
    if (isLocalDev) {
        // Lokal: Fehler ignorieren, Button trotzdem aktivieren
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        return;
    }
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    showNotification('Spam-Schutz konnte nicht geladen werden. Bitte laden Sie die Seite neu.', 'error');
};

// Lokal / HTTP: Submit-Button direkt aktivieren, Turnstile ausblenden
if (isLocalDev) {
    document.addEventListener('DOMContentLoaded', () => {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        }
        const securityCheck = document.querySelector('.security-check');
        if (securityCheck) securityCheck.style.display = 'none';
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Get form data
    const formData = new FormData(contactForm);
    
    // Client-side validation
    const name = formData.get('name').trim();
    const email = formData.get('email').trim();
    const message = formData.get('message').trim();
    const service = formData.get('service');
    
    // Check if Turnstile is completed (nur auf HTTPS)
    const turnstileToken = formData.get('cf-turnstile-response');
    if (!turnstileToken && !isLocalDev) {
        showNotification('Bitte bestätigen Sie zuerst den Spam-Schutz.', 'error');
        return;
    }

    // Basic validation
    if (!name || name.length < 2) {
        showNotification('Bitte geben Sie einen gültigen Namen ein.', 'error');
        return;
    }
    
    if (!email || !isValidEmail(email)) {
        showNotification('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'error');
        return;
    }
    
    if (!service) {
        showNotification('Bitte wählen Sie eine gewünschte Leistung aus.', 'error');
        return;
    }
    
    if (!message || message.length < 10) {
        showNotification('Bitte geben Sie eine Nachricht mit mindestens 10 Zeichen ein.', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    
    try {
        // Send form data to PHP script
        const response = await fetch('contact.php', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            contactForm.reset();
            
            // Reset Turnstile widget after successful submission
            if (window.turnstile) {
                window.turnstile.reset();
            }
            
            // Re-disable submit button until Turnstile is completed again
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            
            // Track successful form submission
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_submit', {
                    'event_category': 'Contact',
                    'event_label': 'Contact Form Success'
                });
            }
        } else {
            let errorMessage = result.message;
            if (result.errors && Array.isArray(result.errors)) {
                errorMessage += '\n• ' + result.errors.join('\n• ');
            }
            showNotification(errorMessage, 'error');
        }
        
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Entschuldigung, beim Senden der Nachricht ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt unter 0170-5842052.', 'error');
        
        // Track form submission error
        if (typeof gtag !== 'undefined') {
            gtag('event', 'form_error', {
                'event_category': 'Contact',
                'event_label': 'Contact Form Error',
                'value': error.message
            });
        }
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
    }
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#2d5016' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.service-card, .gallery-item, .contact-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});



// Lazy Loading for Background Images (if using real images)
function lazyLoadImages() {
    const images = document.querySelectorAll('[data-bg]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.style.backgroundImage = `url(${img.dataset.bg})`;
                img.removeAttribute('data-bg');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading
document.addEventListener('DOMContentLoaded', lazyLoadImages);

// Service Card Hover Effects
const serviceCards = document.querySelectorAll('.service-card');
serviceCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });
});

// Testimonial Slider (if testimonials are added later)
function initTestimonialSlider() {
    // This function would initialize a testimonial slider if testimonials are added
    console.log('Testimonial slider ready to be implemented');
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Giovanni Rovere Garden Design website loaded successfully!');
    
    // Update active nav link on page load
    updateActiveNavLink();
    
    // Initialize any additional features
    initTestimonialSlider();
});

// Performance Optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to scroll event
const debouncedScrollHandler = debounce(() => {
    updateActiveNavLink();
}, 10);const GALERIE_BILDER = [
  {datei: "images/galerie/design-001.jpg", kat: "Gartengestaltung & Design", desc: "Ein modern gestalteter Garten mit einer Holzterrasse, einer Pergola, einem Outdoor-K\u00fcchebereich und einem Sitzbereich mit Sofas. Das Bild zeigt eine ansprechende und professionell wirkende Gartengestaltung."},
  {datei: "images/galerie/design-002.jpg", kat: "Gartengestaltung & Design", desc: "Ein gepflegter Garten mit einer zentralen Pflanze, die von wei\u00dfbl\u00fchenden Hortensien umgeben ist. Die Hecken sind pr\u00e4zise geschnitten und der Boden ist mit Rasen bedeckt."},
  {datei: "images/galerie/terrasse-001.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Mann steht auf einem Balkon und pflanzt Bambus. Im Hintergrund ist eine st\u00e4dtische Skyline mit Hochh\u00e4usern und gr\u00fcnen B\u00e4umen zu sehen."},
  {datei: "images/galerie/garten-001.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit einer langen Blumenk\u00fcbelreihe, die farbenfrohe Blumen und Pflanzen enth\u00e4lt. Im Hintergrund ist eine Terrasse mit einem Tisch und St\u00fchlen zu sehen, sowie ein Rasenbereich und ein gepflegter Baum."},
  {datei: "images/galerie/pflanzen-001.jpg", kat: "Pflanzen & Blumen", desc: "Ein Bienenbesuch auf blauen Bl\u00fcten in einem Garten. Die Bl\u00fcten sind lebhaft und die Biene ist detailreich dargestellt."},
  {datei: "images/galerie/garten-002.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit k\u00fcnstlichem Rasen, Blumenk\u00fcbeln und einer Rasenm\u00e4hmaschine im Hintergrund."},
  {datei: "images/galerie/terrasse-002.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Innenhof mit einem Laterne, einer Metallgittert\u00fcr und einer Mauer mit Pflanzen. Das Ambiente wirkt ruhig und gepflegt."},
  {datei: "images/galerie/pflanzen-002.jpg", kat: "Pflanzen & Blumen", desc: "Ein farbenfrohes Blumenbeet mit Tulpen, Nelken, Veilchen und Hyazinthen, das eine fr\u00f6hliche und gepflegte Erscheinung vermittelt."},
  {datei: "images/galerie/terrasse-003.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Terrassenbereich mit Holzboden, Pflanzen in Topf und einem Rasenst\u00fcck im Hintergrund. Ein kleiner Baum steht im Vordergrund, umgeben von Blumenbeeten und Str\u00e4uchern."},
  {datei: "images/galerie/terrasse-004.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Gartenweg mit einem alten, dekorativen Laternenpfahl und einem Fahrradst\u00e4nder. Im Hintergrund sind gepflegte Hecken und M\u00fclltonnen zu sehen."},
  {datei: "images/galerie/terrasse-005.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Gartenbereich mit einem alten Laternenpfahl, einem Metalltor und einer gepflegten Hecke. Im Hintergrund sind Geb\u00e4ude zu sehen."},
  {datei: "images/galerie/garten-003.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Gartenbereich mit einem alten, dekorativen Stra\u00dfenlaternturm und einem gepflegten Heckenzaun. Im Hintergrund sind Geb\u00e4ude und B\u00e4ume zu sehen."},
  {datei: "images/galerie/terrasse-006.jpg", kat: "Terrasse & Außenbereich", desc: "Ein historischer Stra\u00dfenlaterne steht vor einem Geb\u00e4ude mit klassischer Fassade. Die Szene wirkt gepflegt und st\u00e4dtisch."},
  {datei: "images/galerie/terrasse-007.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflasterter Au\u00dfenbereich mit einem Fahrradst\u00e4nder und einer Reihe von dunklen Containerboxen im Hintergrund. Links ist ein Teil eines Laternenpfahls zu sehen."},
  {datei: "images/galerie/terrasse-008.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Baustellenbild mit zwei Fahrradst\u00e4ndern, die in Bodenl\u00f6chern eingelassen werden. Um die St\u00e4nder herum liegen unregelm\u00e4\u00dfig gestapelte Pflastersteine."},
  {datei: "images/galerie/design-003.jpg", kat: "Gartengestaltung & Design", desc: "Ein Mercedes-Benz Sprinter mit der Aufschrift 'Garden Design & Care' und der Kontaktdaten f\u00fcr den Garten- und Landschaftspflegebetrieb Giovanni Rovere. Das Fahrzeug ist mit einem Jubil\u00e4umsabzeichen f\u00fcr 25 Jahre Betrieb versehen."},
  {datei: "images/galerie/design-004.jpg", kat: "Gartengestaltung & Design", desc: "Ein modern gestalteter Gartenbereich mit einer Mischung aus Steinen, Pflanzen und einer Terrasse. Die Wand ist wei\u00df gestrichen und mit einer Steinverkleidung versehen, w\u00e4hrend die Pflanzen ein farbenfrohes Element bieten."},
  {datei: "images/galerie/terrasse-009.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Blick auf einen gepflegten Gartenbereich mit Rasenfl\u00e4che, B\u00e4umen und einem Terrassenbereich. Die Struktur zeigt moderne Elemente wie eine Terrassen\u00fcberdachung und eine wei\u00dfe Mauer."},
  {datei: "images/galerie/terrasse-010.jpg", kat: "Terrasse & Außenbereich", desc: "Ein modern gestalteter Eingangsbereich mit Pflanzen, Steinen und einer Terrasse. Die Architektur kombiniert wei\u00dfe W\u00e4nde mit Natursteinverkleidungen und gr\u00fcnen Pflanzen."},
  {datei: "images/galerie/garten-004.jpg", kat: "Garten & Rasen", desc: "Ein Ausschnitt eines Gartens mit neu angelegtem Rasen und einem Rand aus Kieseln, der die Grenze zum Haus markiert."},
  {datei: "images/galerie/terrasse-011.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Eingangsbereich mit Ziegelpflasterstufen und einer T\u00fcr mit Glasfenstern. Die Stufen sind mit einem Metallstreifen abgesteckt, was auf eine Ma\u00dfnahme zur Sicherheit oder Pflege hinweist."},
  {datei: "images/galerie/terrasse-012.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Wohngeb\u00e4ude mit Terrasse und einem M\u00fcllcontainer im Vordergrund. Die Umgebung wirkt gepflegt, aber der Boden ist uneben und bedeckt mit Bl\u00e4ttern und Schmutz."},
  {datei: "images/galerie/design-005.jpg", kat: "Gartengestaltung & Design", desc: "Ein gepflegter Gartenweg mit Mulch und Hecken ist im Vordergrund zu sehen. Im Hintergrund befindet sich ein Haus mit einem Zaun und weiteren B\u00e4umen."},
  {datei: "images/galerie/pflanzen-003.jpg", kat: "Pflanzen & Blumen", desc: "Ein Bienenbesuch auf einer Bl\u00fcte einer Wei\u00dfdornpflanze mit farblich abgestuften Bl\u00fcten und gr\u00fcnen Bl\u00e4ttern. Im Hintergrund sind Metallpfosten und weitere Pflanzen zu sehen."},
  {datei: "images/galerie/terrasse-013.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Bild einer Terrasse mit einer neu gestrichenen Treppe und einem eleganten Gel\u00e4nder. Im Hintergrund ist ein gro\u00dfes Fenster mit Blick auf einen Innenraum, der mit Kunstwerken und M\u00f6beln dekoriert ist."},
  {datei: "images/galerie/garten-005.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Gartenweg mit rosa Hortensien und Gr\u00e4sern, die entlang einer wei\u00dfen Mauer mit schwarzen Beleuchtungselementen wachsen."},
  {datei: "images/galerie/design-006.jpg", kat: "Gartengestaltung & Design", desc: "Ein gepflegter Gartenweg mit einer Mauer aus wei\u00dfem Putz und Stein, flankiert von rosa Hortensien und gr\u00fcnen Gr\u00e4sern. Die Szene wirkt ruhig und gepflegt."},
  {datei: "images/galerie/terrasse-014.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Mitarbeiter eines Garten- und Landschaftspflegebetriebs arbeitet an der Renovierung einer Steintreppe. Er tr\u00e4gt Schutzausr\u00fcstung und verwendet Werkzeuge, um Sch\u00e4den zu beseitigen und die Treppe zu reparieren."},
  {datei: "images/galerie/terrasse-015.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflasterter Au\u00dfenbereich mit einer Wand und einem Gittertor im Hintergrund. Ein Gartenschlauch h\u00e4ngt an der Wand."},
  {datei: "images/galerie/terrasse-016.jpg", kat: "Terrasse & Außenbereich", desc: "Ein neuer Pflasterweg wird gerade verlegt, mit einem Muster aus quadratischen Steinen und einer Randverzierung aus runden Steinen. Im Hintergrund ist ein Haus mit Garage und einem Zaun zu sehen."},
  {datei: "images/galerie/terrasse-017.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Holzsteg mit Pflanzen und Blumen am Rand, Schuhe und eine Wasserflasche auf den Stufen, im Hintergrund ein Fenster mit einem Hund und einem Tisch mit St\u00fchlen."},
  {datei: "images/galerie/terrasse-018.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Eingangsbereich mit einer wei\u00dfen T\u00fcr, einer Briefkastenanlage und einer Treppe aus Holz. Die Umgebung wirkt sauber und gepflegt."},
  {datei: "images/galerie/garten-006.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit Rasenfl\u00e4che, Blumenbeeten und einer Zierpflanze im Zentrum. Die Terrasse im Vordergrund zeigt eine Sitzgruppe und Pflanzenk\u00e4sten."},
  {datei: "images/galerie/terrasse-019.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Garten mit einer neu errichteten Sichtschutzmauer aus Holz und gelben Streifen. Eine Person arbeitet im Hintergrund an weiteren Bauarbeiten."},
  {datei: "images/galerie/terrasse-020.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Mann installiert eine gelbe Sichtschutzblende an einer Hauswand. Er tr\u00e4gt Handschuhe und arbeitet sorgf\u00e4ltig an der Montage."},
  {datei: "images/galerie/design-007.jpg", kat: "Gartengestaltung & Design", desc: "Ein neuer Zaun mit gelben Streifen und wei\u00dfem Rahmen wird aufgestellt. Im Hintergrund sind B\u00e4ume und ein bew\u00f6lkter Himmel zu sehen."},
  {datei: "images/galerie/pflanzen-004.jpg", kat: "Pflanzen & Blumen", desc: "Ein farbenfrohes Blumenbeet mit Tulpen, Nelken und Hyazinthen in einem gepflegten Garten."},
  {datei: "images/galerie/garten-007.jpg", kat: "Garten & Rasen", desc: "Ein pr\u00e4chtig gestalteter Blumenbeet mit einer Vielzahl von Fr\u00fchjahrsblumen wie Tulpen, Hyazinthen und Narzissen ist auf einem Holzboden platziert. Im Hintergrund sind ein Gartentisch mit einer Plane und ein Rasen zu sehen."},
  {datei: "images/galerie/terrasse-021.jpg", kat: "Terrasse & Außenbereich", desc: "Ein farbenfrohes Blumenbeet mit Tulpen, Narzissen und anderen Fr\u00fchlingsblumen auf einer Terrasse mit Holzboden und Rasen im Hintergrund."},
  {datei: "images/galerie/terrasse-022.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Mann reinigt eine gepflasterte Terrasse mit einem Hochdruckreiniger. Im Hintergrund sind ein Haus und gepflegte Pflanzen zu sehen."},
  {datei: "images/galerie/garten-008.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit k\u00fcnstlichem Rasen, Holzterrasse und Pflanzenbeeten, die mit Blumen dekoriert sind. Im Hintergrund sind B\u00e4ume und H\u00e4user sichtbar."},
  {datei: "images/galerie/terrasse-023.jpg", kat: "Terrasse & Außenbereich", desc: "Ein pr\u00e4chtig gestalteter Blumenbeet mit einer Vielzahl von Fr\u00fchlingsblumen, darunter Tulpen, Nelken und andere farbenfrohe Pflanzen, ist auf einer Terrasse platziert."},
  {datei: "images/galerie/garten-009.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Gartenweg mit k\u00fcnstlichem Rasen f\u00fchrt durch einen schmalen, von einem dunklen Zaun umgebenen Bereich. Links befindet sich ein Haus mit Fenstern und einer Terrasse."},
  {datei: "images/galerie/garten-010.jpg", kat: "Garten & Rasen", desc: "Ein Garten mit vielen M\u00e4usespuren auf dem Rasen, einer Mauer, einem Spielplatz und einem Fu\u00dfballtor im Hintergrund."},
  {datei: "images/galerie/garten-011.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit gr\u00fcnem Rasen, einer Bl\u00fctenpflanze im Zentrum, einer Holzterrasse und mehreren Blument\u00f6pfen. Die Umgebung ist von B\u00e4umen und Hecken umgeben."},
  {datei: "images/galerie/pflanzen-005.jpg", kat: "Pflanzen & Blumen", desc: "Ein lila Clematis-Bl\u00fcte mit einem gr\u00fcnen Heuschrecken darauf ist im Vordergrund zu sehen. Im Hintergrund sind weitere Bl\u00fcten und Bl\u00e4tter sichtbar."},
  {datei: "images/galerie/garten-012.jpg", kat: "Garten & Rasen", desc: "Ein neu installierter, rechteckiger Pool mit klarem Wasser steht in einem Garten mit frischem Boden und Pflanzen im Hintergrund."},
  {datei: "images/galerie/terrasse-024.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Garten mit Terrasse, Rasen und Terrassenm\u00f6beln. Im Hintergrund sind H\u00e4user und B\u00e4ume zu sehen."},
  {datei: "images/galerie/terrasse-025.jpg", kat: "Terrasse & Außenbereich", desc: "Ein modern gestalteter Garten mit einer Terrasse, Rasenfl\u00e4che und einem Teich im Hintergrund. Die Anlage wirkt gepflegt und ist f\u00fcr eine professionelle Pr\u00e4sentation geeignet."},
  {datei: "images/galerie/terrasse-026.jpg", kat: "Terrasse & Außenbereich", desc: "Ein modern gestalteter Garten mit Rasenfl\u00e4che, Terrasse und einem Skatepark im Hintergrund. Die Anlage wirkt gepflegt und ist f\u00fcr eine professionelle Pr\u00e4sentation geeignet."},
  {datei: "images/galerie/garten-013.jpg", kat: "Garten & Rasen", desc: "Ein neu angelegter Rasenbereich mit einer Steinmauer und einer Terrasse. Der Rasen ist frisch geschnitten und die Steinmauer ist sauber und gut eingefasst."},
  {datei: "images/galerie/garten-014.jpg", kat: "Garten & Rasen", desc: "Ein modern gestalteter Garten mit k\u00fcnstlichem Rasen, einer Terrasse und einem Whirlpool. Die Anordnung wirkt gepflegt und stilvoll."},
  {datei: "images/galerie/garten-015.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Rasen mit sichtbaren M\u00e4harichtungen und einer gut gepflegten Hecke im Hintergrund. Das Bild zeigt einen Teil eines Gartens mit einem modernen Design."},
  {datei: "images/galerie/terrasse-027.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Blick auf eine Terrasse mit einem Betonbelag, umgeben von gr\u00fcnen Hecken und einem Geb\u00e4ude im Hintergrund. Die Terrasse zeigt Spuren von Verwitterung und Pflegebedarf."},
  {datei: "images/galerie/terrasse-028.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Garten mit Rasen, Terrasse und moderner Architektur. Ein Terrassengel\u00e4nder aus Holz und Gabionen ist sichtbar, sowie zwei Fahrr\u00e4der auf der Terrasse."},
  {datei: "images/galerie/garten-016.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Rasenbereich mit bepflanzten Beeten und einer Terrasse im Hintergrund. Das Bild zeigt eine moderne und gepflegte Gartenlandschaft."},
  {datei: "images/galerie/design-008.jpg", kat: "Gartengestaltung & Design", desc: "Ein modern gestalteter Garten mit Holz- und Gabionenmauern, einer Whirlpool-Anlage und gepflegten Pflanzen."},
  {datei: "images/galerie/garten-017.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit Rasen, Terrasse aus Holz und einer modernen Bebauung im Hintergrund. Das Bild zeigt eine ansprechende und professionell wirkende Landschaft."},
  {datei: "images/galerie/garten-018.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit Rasen, Terrasse und Pflanzen vor einem modernen Haus unter einem bew\u00f6lkten Himmel."},
  {datei: "images/galerie/garten-019.jpg", kat: "Garten & Rasen", desc: "Ein neu installierter, quadratischer Pool mit wei\u00dfer Umrandung steht in einem Garten mit frischem Gras und gepflegten Hecken. Im Hintergrund sind H\u00e4user und B\u00e4ume sichtbar."},
  {datei: "images/galerie/pflanzen-006.jpg", kat: "Pflanzen & Blumen", desc: "Ein gr\u00fcner Heuschrecke sitzt auf einer violett-blauen Clematisbl\u00fcte mit gelben Staubbl\u00e4ttern. Das Bild zeigt eine nat\u00fcrliche und lebendige Szene."},
  {datei: "images/galerie/garten-020.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Rasen mit streifenf\u00f6rmiger Musterung und einer wei\u00dfen Mauer im Hintergrund. B\u00e4ume und Hecken grenzen den Garten ab."},
  {datei: "images/galerie/terrasse-029.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Mann arbeitet an einer Baugrube f\u00fcr eine neue Terrasse oder einen Gartenbau. Die Grube ist gerade ausgehoben und der Boden ist noch nicht verf\u00fcllt oder gestaltet."},
  {datei: "images/galerie/pflanzen-007.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme von frischen Tulpen und Narzissen in einem Garten. Die Blumen sind in verschiedenen Farben wie Rosa, Wei\u00df und Orange gehalten und scheinen frisch und gepflegt zu sein."},
  {datei: "images/galerie/pflanzen-008.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme von Tulpen in verschiedenen Farben, darunter rosa und wei\u00df, mit Wassertr\u00f6pfchen darauf. Die Tulpen sind frisch und die Bl\u00e4tter gr\u00fcn, was auf eine gepflegte Gartenanlage hindeutet."},
  {datei: "images/galerie/pflanzen-009.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme von frischen Tulpen und Narzissen, die mit Regentropfen bedeckt sind, was auf frische und gepflegte Pflanzen hindeutet."},
  {datei: "images/galerie/pflanzen-010.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine frische Blumenanordnung mit rosa Tulpen und einer wei\u00dfen Narzisse, die mit Regentropfen bedeckt sind. Die Pflanzen sind in einem Gartenbeet gepflanzt, das gepflegt und ordentlich aussieht."},
  {datei: "images/galerie/pflanzen-011.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme von rosa Hyazinthen und Tulpenbl\u00fcten in einem Garten. Die Bl\u00fcten sind frisch und die Bl\u00e4tter gl\u00e4nzen feucht, was auf eine frische Pflanzung oder Pflege hindeutet."},
  {datei: "images/galerie/garten-021.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Rasen mit scharfen Streifen, der von einer wei\u00dfen Mauer und B\u00e4umen umgeben ist. Der Himmel ist blau mit einigen Wolken."},
  {datei: "images/galerie/terrasse-030.jpg", kat: "Terrasse & Außenbereich", desc: "Ein modern gestalteter Dachterrasengarten mit Rasenfl\u00e4che, Pflanzk\u00fcbeln und einer Terrasse mit Sitzm\u00f6beln. Im Hintergrund sind B\u00e4ume und Nachbarh\u00e4user zu sehen."},
  {datei: "images/galerie/garten-022.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit k\u00fcnstlichem Rasen, einer Terrasse mit Glasfront und einer Holzverbauung im Hintergrund."},
  {datei: "images/galerie/garten-023.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Rasen mit sorgf\u00e4ltig gestreiftem Muster, umgeben von gr\u00fcnen Hecken und einem Geb\u00e4ude im Hintergrund."},
  {datei: "images/galerie/garten-024.jpg", kat: "Garten & Rasen", desc: "Ein gro\u00dfes, schwarzes Container-\u00e4hnliches Ger\u00e4t wird von einem Kran gehoben, was auf eine Installation oder den Transport im Garten- und Landschaftsbereich hinweist."},
  {datei: "images/galerie/terrasse-031.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Bauprojekt f\u00fcr eine Betonwanne in einem Garten mit Werkzeugen und Materialien im Hintergrund."},
  {datei: "images/galerie/garten-025.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit Rasen, Beeten und Pflanzen, umgeben von einem Haus und B\u00e4umen. Der Himmel ist blau mit einigen Wolken."},
  {datei: "images/galerie/terrasse-032.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Gartenweg mit Steinplatten, umgeben von gepflegten Hecken und B\u00fcschen. Rechts ist ein modernes Geb\u00e4ude mit Rollladen zu sehen."},
  {datei: "images/galerie/terrasse-033.jpg", kat: "Terrasse & Außenbereich", desc: "Ein modern gestalteter Gartenweg mit einer Kombination aus Steinplatten und Holzplanken, flankiert von einer hohen Hecke und einer Glaswand."},
  {datei: "images/galerie/design-009.jpg", kat: "Gartengestaltung & Design", desc: "Ein gepflegter Garten mit einer Steinpyramide im Vordergrund, umgeben von gepflegten Hecken und B\u00fcschen. Im Hintergrund sind Geb\u00e4ude und ein Zaun zu sehen."},
  {datei: "images/galerie/design-010.jpg", kat: "Gartengestaltung & Design", desc: "Ein modern gestalteter Garten mit einem Steinbeet, einer Kiesfl\u00e4che und gepflegten Hecken. Ein kleiner Brunnen ist im Zentrum des Steinbeetes platziert."},
  {datei: "images/galerie/design-011.jpg", kat: "Gartengestaltung & Design", desc: "Ein gepflegter Garten mit einer Kombination aus Str\u00e4uchern, Topiarien und einem Steinkreis, der von einem Kettenzug gehalten wird."},
  {datei: "images/galerie/garten-026.jpg", kat: "Garten & Rasen", desc: "Ein Garten mit pr\u00e4chtigen lila Hortensien im Vordergrund und einer gepflegten Hecke aus Zypressen im Hintergrund. Ein Mitarbeiter mit Gartenger\u00e4t ist dabei, den Rasen zu m\u00e4hen."},
  {datei: "images/galerie/terrasse-034.jpg", kat: "Terrasse & Außenbereich", desc: "Ein elegantes Terrassen-Set mit Holztisch und wei\u00dfen St\u00fchlen steht inmitten eines gepflegten Gartens mit Hecken und B\u00e4umen."},
  {datei: "images/galerie/terrasse-035.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Blick auf einen Garten mit einer Terrasse, einer Pergola und einer Steinmauer im Vordergrund. Das Bild zeigt eine gepflegte Umgebung mit einem Baum und einigen Pflanzen."},
  {datei: "images/galerie/pflanzen-012.jpg", kat: "Pflanzen & Blumen", desc: "Ein pr\u00e4chtiger Blumenbeet mit einer zentralen wei\u00dfen Blume, umgeben von lila und violetten Bl\u00fcten, die von gr\u00fcnen Hecken und B\u00e4umen im Hintergrund begrenzt werden."},
  {datei: "images/galerie/garten-027.jpg", kat: "Garten & Rasen", desc: "Ein pr\u00e4chtiger Blumenbeet mit lila und wei\u00dfen Bl\u00fcten, umgeben von gr\u00fcnen Hecken und B\u00e4umen. Die Pflanzen sind gut gepflegt und der Garten wirkt gepflegt und einladend."},
  {datei: "images/galerie/garten-028.jpg", kat: "Garten & Rasen", desc: "Ein sonniger Garten mit einer Vielzahl von Blumen, darunter Alliums und Iris, die in einem Beet angepflanzt sind. Im Hintergrund sind B\u00e4ume und Str\u00e4ucher zu sehen."},
  {datei: "images/galerie/terrasse-036.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Garten mit einer Steinmauer, einem Baum, einem Holztisch und St\u00fchlen auf einer Terrasse. Im Hintergrund ist ein Haus mit einer Terrassen\u00fcberdachung zu sehen."},
  {datei: "images/galerie/terrasse-037.jpg", kat: "Terrasse & Außenbereich", desc: "Ein unvollst\u00e4ndiges Treppenstufenprojekt aus Steinbl\u00f6cken, das noch nicht befestigt ist. Die Umgebung ist mit frischer Erde bedeckt, was darauf hindeutet, dass es sich um eine aktuelle Baustelle handelt."},
  {datei: "images/galerie/pflanzen-013.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Vielzahl von bl\u00fchenden Pflanzen mit lila und violetten Bl\u00fcten, die in einem Garten oder einer Pflanzung angepflanzt sind. Die Bl\u00fcten sind in verschiedenen Stadien der Bl\u00fcte, von knospenartig bis vollst\u00e4ndig ge\u00f6ffnet, was auf eine gesunde und gepflegte Pflanzung hinweist."},
  {datei: "images/galerie/garten-029.jpg", kat: "Garten & Rasen", desc: "Ein gut gepflegter Gem\u00fcsegarten mit sortenreicher Auswahl an Salat- und Blattgem\u00fcsepflanzen. Die Pflanzen sind ordentlich angeordnet und von einer Holzleiste abgegrenzt."},
  {datei: "images/galerie/garten-030.jpg", kat: "Garten & Rasen", desc: "Ein gut gepflegter Gem\u00fcsegarten mit verschiedenen Salatarten, Blattkohl und Blattkohlkraut. Die Pflanzen sind ordentlich angeordnet und von einer Mulchschicht umgeben."},
  {datei: "images/galerie/garten-031.jpg", kat: "Garten & Rasen", desc: "Das Bild zeigt einen gut gepflegten Gem\u00fcsegarten in einem Gew\u00e4chshaus mit verschiedenen Salatarten und Blattgem\u00fcse. Die Pflanzen sind ordentlich angeordnet und die Umgebung wirkt sauber und gepflegt."},
  {datei: "images/galerie/pflanzen-014.jpg", kat: "Pflanzen & Blumen", desc: "Ein farbenfrohes Blumenbeet mit verschiedenen Pflanzen, darunter Hosta, Astilbe und Teppichblumen, vor einem modernen Hintergrund."},
  {datei: "images/galerie/pflanzen-015.jpg", kat: "Pflanzen & Blumen", desc: "Ein farbenfrohes Blumenbeet mit verschiedenen Blumenarten wie Lupinen, Fuchsien und Astilben, das gut gepflegt und vielseitig gestaltet ist."},
  {datei: "images/galerie/garten-032.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit pr\u00e4chtigen lila Hortensien im Vordergrund und einer Reihe von dicht stehenden, sorgf\u00e4ltig geschnittenen Hecken im Hintergrund. Zwei Personen sind dabei, den Rasen zu m\u00e4hen."},
  {datei: "images/galerie/pflanzen-016.jpg", kat: "Pflanzen & Blumen", desc: "Ein pr\u00e4chtiger Blumenbeet mit einer Mischung aus lila und wei\u00dfen Bl\u00fcten, umgeben von gr\u00fcnen Bl\u00e4ttern und hohen Str\u00e4uchern im Hintergrund."},
  {datei: "images/galerie/pflanzen-017.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Vielzahl von Tulpen in verschiedenen Farben, darunter Lila, Rosa und Wei\u00df, die in einem Garten gepflanzt sind. Im Hintergrund sind gepflegte Hecken und B\u00e4ume zu sehen."},
  {datei: "images/galerie/pflanzen-018.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenanordnung mit Tulpen in verschiedenen Farben, darunter Wei\u00df und Dunkelrot, vor einem Hintergrund mit einem Hund und einer Terrasse."},
  {datei: "images/galerie/pflanzen-019.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Gruppe von Tulpen in verschiedenen Farben, darunter Wei\u00df und Rot, vor einem Haus mit einer T\u00fcr im Hintergrund. Die Tulpen sind frisch und gut gepflegt, was auf eine professionelle Gartenpflege hindeutet."},
  {datei: "images/galerie/pflanzen-020.jpg", kat: "Pflanzen & Blumen", desc: "Ein Bild von einer gepflegten Tulpenanpflanzung vor einem Haus mit Treppe und Fenster im Hintergrund."},
  {datei: "images/galerie/terrasse-038.jpg", kat: "Terrasse & Außenbereich", desc: "Ein modernes Haus mit einer Terrasse, die von einer transparenten \u00dcberdachung gesch\u00fctzt wird. Bl\u00fchende B\u00e4ume und gepflegte Pflanzen umgeben den Bereich, was auf eine sorgf\u00e4ltige Gartenpflege hinweist."},
  {datei: "images/galerie/pflanzen-021.jpg", kat: "Pflanzen & Blumen", desc: "Ein Blumenbeet mit lila und wei\u00df bl\u00fchenden Allium-Arten, umgeben von gr\u00fcnen Bl\u00e4ttern und anderen Pflanzen. Das Bild zeigt eine frische und gepflegte Gartenlandschaft."},
  {datei: "images/galerie/pflanzen-022.jpg", kat: "Pflanzen & Blumen", desc: "Ein pr\u00e4chtiger Blumenbeet mit lila und wei\u00df bl\u00fchenden Alliums und anderen Blumen, die in einem sonnigen Garten wachsen."},
  {datei: "images/galerie/pflanzen-023.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenbeet mit einer Vielzahl von Blumen, haupts\u00e4chlich Alliums, in Wei\u00df und Lila. Die Pflanzen sind gut gepflegt und das Bild ist klar und farbenfroh."},
  {datei: "images/galerie/pflanzen-024.jpg", kat: "Pflanzen & Blumen", desc: "Ein pr\u00e4chtiger Blumenbeet mit Irisen und Zierlauch in einem gepflegten Garten mit Blick auf ein Haus im Hintergrund."},
  {datei: "images/galerie/garten-033.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit gr\u00fcner Rasenfl\u00e4che, einer ordentlichen Hecke und einer Blumenbeet-Einfassung aus Boxenhecken. Im Hintergrund sind Terrassen und weitere Pflanzen zu sehen."},
  {datei: "images/galerie/terrasse-039.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Blumenk\u00fcbel mit Tulpen in verschiedenen Farben, darunter Wei\u00df, Lila und Dunkelrot, steht auf einer Terrasse. Im Hintergrund sind Treppen und ein Zaun zu sehen."},
  {datei: "images/galerie/design-012.jpg", kat: "Gartengestaltung & Design", desc: "Ein hochwertig gestalteter Gartenbeet mit frischen Salatpflanzen, gr\u00fcnen Bl\u00fcten und einer Topfpflanze mit Tulpen. Im Hintergrund sind weitere Pflanzen und ein Zaun zu sehen."},
  {datei: "images/galerie/pflanzen-025.jpg", kat: "Pflanzen & Blumen", desc: "Ein farbenfroher Blumenbeet mit verschiedenen Blumenarten, darunter Alliums und Irisen, ist im Vordergrund zu sehen. Im Hintergrund sind gr\u00fcne Hecken und B\u00e4ume sichtbar."},
  {datei: "images/galerie/terrasse-040.jpg", kat: "Terrasse & Außenbereich", desc: "Ein modernes Haus mit Terrasse und einer neuen Terrassen\u00fcberdachung ist im Vordergrund zu sehen. Die Umgebung ist gepflegt mit jungen Pflanzen und B\u00fcschen."},
  {datei: "images/galerie/pflanzen-026.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme von Tulpen und Hyazinthen in verschiedenen Farben, darunter Rosa, Wei\u00df und Dunkelrot, vor einer neutralen Wand im Hintergrund."},
  {datei: "images/galerie/pflanzen-027.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme von Tulpen und Hyazinthen in einem Garten, mit einem neutralen Hintergrund aus einer gelben Wand. Die Tulpen sind in verschiedenen Farben wie Rosa und Wei\u00df, w\u00e4hrend die Hyazinthen rosa sind. Die Pflanzen sind gut gepflegt und die Bl\u00fcten sind in voller Bl\u00fcte."},
  {datei: "images/galerie/terrasse-041.jpg", kat: "Terrasse & Außenbereich", desc: "Ein moderner Terrassen\u00fcberdachungsbau mit Glasdach und Metallkonstruktion, umgeben von gepflegtem Gr\u00fcn und Bl\u00fctenstr\u00e4uchern. Die Terrasse ist mit gro\u00dfen Fliesen ausgelegt und bietet einen eleganten Au\u00dfenaufenthalt."},
  {datei: "images/galerie/garten-034.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit Tulpen, Hecken und einer Skulptur auf einer Treppe. Im Hintergrund sind Terrassensitze und ein Geb\u00e4ude zu sehen."},
  {datei: "images/galerie/pflanzen-028.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenbeet mit Tulpen in verschiedenen Farben, umgeben von B\u00e4umen und Hecken. Im Hintergrund sind Bl\u00fctenb\u00e4ume und ein Teil eines Hauses sichtbar."},
  {datei: "images/galerie/terrasse-042.jpg", kat: "Terrasse & Außenbereich", desc: "Das Bild zeigt eine gepflegte Terrasse mit Pflanzenk\u00e4sten, die mit wei\u00dfen Tulpen und Narzissen best\u00fcckt sind. Im Hintergrund ist ein Glasdach und ein Teil des Innenraums sichtbar."},
  {datei: "images/galerie/pflanzen-029.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenpflanze mit wei\u00dfen Tulpen und Narzissen in einem Topf auf einer Terrasse. Die Pflanze ist gesund und pr\u00e4chtig, mit frischen Bl\u00e4ttern und Bl\u00fcten."},
  {datei: "images/galerie/pflanzen-030.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenpflanze mit wei\u00dfen Tulpen und Narzissen in voller Bl\u00fcte, umgeben von gr\u00fcnen Bl\u00e4ttern. Die Blumen sind frisch und gut gepflegt."},
  {datei: "images/galerie/pflanzen-031.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenbeet mit gelben Tulpen und Narzissen in voller Bl\u00fcte, umgeben von gr\u00fcnen Bl\u00e4ttern. Die Szene wirkt frisch und lebhaft, typisch f\u00fcr einen Fr\u00fchlingstag."},
  {datei: "images/galerie/pflanzen-032.jpg", kat: "Pflanzen & Blumen", desc: "Ein Blumenbeet mit Tulpen und Hyazinthen in verschiedenen Farben vor einem Haus mit Terrasse und Fenstern."},
  {datei: "images/galerie/garten-035.jpg", kat: "Garten & Rasen", desc: "Ein hochaufl\u00f6sendes Bild eines bepflanzten Hochbeetes mit gr\u00fcnen und roten Bl\u00e4ttern, das in einem sonnigen Garten steht."},
  {datei: "images/galerie/pflanzen-033.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme einer wei\u00dfen Narzisse mit gelbem Zentrum, umgeben von gr\u00fcnen Bl\u00e4ttern. Im Hintergrund sind weitere Narzissen und ein Teil eines Geb\u00e4udes zu sehen."},
  {datei: "images/galerie/pflanzen-034.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenbeet mit Narzissen und Tulpen vor einem Haus. Die Narzissen sind in verschiedenen Stadien der Bl\u00fcte, von knospenhaft bis vollst\u00e4ndig ge\u00f6ffnet. Das Bild ist hell und klar, was eine ansprechende Darstellung der Pflanzen bietet."},
  {datei: "images/galerie/pflanzen-035.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Gruppe von Narzissen mit cremefarbenen Bl\u00fcten und leichten Orange- und Rosa-T\u00f6nen, die in einem Garten auf einer grauen Steinplatte stehen. Im Hintergrund sind gr\u00fcne Pflanzen und B\u00e4ume sichtbar."},
  {datei: "images/galerie/pflanzen-036.jpg", kat: "Pflanzen & Blumen", desc: "Ein farbenfrohes Blumenarrangement mit Tulpen, Hyazinthen und anderen Blumen in einem Topf, das ansprechend und professionell wirkt."},
  {datei: "images/galerie/garten-036.jpg", kat: "Garten & Rasen", desc: "Ein Holzbeet mit frischen Kr\u00e4utern und Salatpflanzen steht im Vordergrund, im Hintergrund ist ein wei\u00dfer Hund auf einer Rasenfl\u00e4che zu sehen. Im Hintergrund sind weitere Pflanzen und Str\u00e4ucher sichtbar."},
  {datei: "images/galerie/garten-037.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit Holzbeeten, Pflanzen und Blumen. Im Hintergrund ist ein Haus mit einer gr\u00fcnen Wand und Terrassenm\u00f6beln zu sehen."},
  {datei: "images/galerie/garten-038.jpg", kat: "Garten & Rasen", desc: "Ein gepflasterter Weg durch einen Rasenbereich, der von gr\u00fcnem Gras umgeben ist. Die Pflastersteine sind in Reihen angeordnet und teilweise von neuem Gras \u00fcberwachsen."},
  {datei: "images/galerie/pflanzen-037.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Nahaufnahme von Tulpen und Hyazinthen in einem Gartenbeet, umgeben von Gr\u00e4sern und anderen Pflanzen. Die Farben sind lebhaft und die Bildqualit\u00e4t ist gut."},
  {datei: "images/galerie/garten-039.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Gartenbereich mit einem Muster aus Kies und Gras, umgeben von B\u00e4umen und einem wei\u00dfen Zaun. Im Hintergrund sind Wohngeb\u00e4ude sichtbar."},
  {datei: "images/galerie/garten-040.jpg", kat: "Garten & Rasen", desc: "Das Bild zeigt einen Abschnitt eines Gartens mit einem gepflasterten Weg und einer Steinmauer, die mit kleinen Steinen gef\u00fcllt ist. Rechts ist ein Grasstreifen sichtbar."},
  {datei: "images/galerie/design-013.jpg", kat: "Gartengestaltung & Design", desc: "Ein gepflegter Baum steht inmitten eines Kreisweges aus Pflastersteinen, umgeben von Gr\u00fcnfl\u00e4chen und einem Zaun im Hintergrund. Das Bild zeigt eine professionell gestaltete Gartenlandschaft."},
  {datei: "images/galerie/design-014.jpg", kat: "Gartengestaltung & Design", desc: "Ein Mitarbeiter eines Garten- und Landschaftspflegebetriebs legt einen Kreis aus Pflastersteinen auf einem Rasen. Die Arbeit wird mit Werkzeugen und Materialien unterst\u00fctzt."},
  {datei: "images/galerie/design-015.jpg", kat: "Gartengestaltung & Design", desc: "Ein gepflegter Garten mit einem runden Pflasterweg, umgeben von Gras und B\u00e4umen. Im Zentrum steht ein Baum mit einer Sitzbank darum herum."},
  {datei: "images/galerie/garten-041.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Rasenbereich mit Blumenbeeten und einer gepflegten Hecke im Hintergrund. Ein geparktes Auto und ein Wohnhaus sind im Hintergrund sichtbar."},
  {datei: "images/galerie/pflanzen-038.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Blumenbeet mit Allium-Bl\u00fcten in rosa Farben, die in einer ordentlichen Anordnung stehen. Im Hintergrund sind gr\u00fcne Str\u00e4ucher zu sehen."},
  {datei: "images/galerie/design-016.jpg", kat: "Gartengestaltung & Design", desc: "Ein pr\u00e4chtig gestalteter Garten mit einer Vielzahl von Blumen und Pflanzen, die in verschiedenen Farben und Gr\u00f6\u00dfen angeordnet sind. Im Hintergrund ist eine Terrasse mit einem Tisch und St\u00fchlen zu sehen, umgeben von gr\u00fcnen Hecken und B\u00e4umen."},
  {datei: "images/galerie/pflanzen-039.jpg", kat: "Pflanzen & Blumen", desc: "Ein Bienenbesuch auf einer purpurfarbenen Bl\u00fcte, die von einer gro\u00dfen, dichten Bl\u00fctenkugel umgeben ist. Die Szene zeigt die nat\u00fcrliche Interaktion zwischen Insekt und Pflanze."},
  {datei: "images/galerie/terrasse-043.jpg", kat: "Terrasse & Außenbereich", desc: "Ein Bauprozess zeigt die Installation von Betonplatten f\u00fcr eine Terrasse oder einen Au\u00dfenbereich. Die Platten liegen noch unverlegt auf dem Boden."},
  {datei: "images/galerie/garten-042.jpg", kat: "Garten & Rasen", desc: "Das Bild zeigt einen Garten mit bl\u00fchenden Agapanthus-Blumen und einer Terrasse im Hintergrund. Ein Haus und eine Statue sind ebenfalls sichtbar."},
  {datei: "images/galerie/pflanzen-040.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt zwei gelbe Bl\u00fcten einer K\u00fcrbisart in einem Garten. Die Bl\u00fcten sind gro\u00df und aufwendig, umgeben von gr\u00fcnen Bl\u00e4ttern und St\u00e4ngeln."},
  {datei: "images/galerie/garten-043.jpg", kat: "Garten & Rasen", desc: "Das Bild zeigt eine Auswahl von Gem\u00fcse, darunter Zucchini, Auberginen und Paprika, auf einem Holztisch."},
  {datei: "images/galerie/pflanzen-041.jpg", kat: "Pflanzen & Blumen", desc: "Ein Nahaufnahme einer lila Bl\u00fcte mit gr\u00fcnen Bl\u00e4ttern und einem unscharfen Hintergrund, der auf einen Garten hinweist."},
  {datei: "images/galerie/garten-044.jpg", kat: "Garten & Rasen", desc: "Das Bild zeigt eine sonnige Gartenszene mit bl\u00fchenden Agapanthus-Blumen und anderen Pflanzen. Im Hintergrund sind ein Haus und eine Terrasse zu sehen."},
  {datei: "images/galerie/garten-045.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit pr\u00e4gnanten Hecken, Blumenbeeten und einer Rasenfl\u00e4che. Die Pflanzen sind gut gepflegt und der Rasen ist saftig gr\u00fcn."},
  {datei: "images/galerie/garten-046.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit Steinwegen, Str\u00e4uchern und Blumenpflanzen. Ein Holzterrasse und eine Steinmauer sind im Hintergrund zu sehen."},
  {datei: "images/galerie/terrasse-044.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Garten mit Holztisch und St\u00fchlen auf einer Terrasse. Der Hintergrund zeigt gepflegte Hecken, Blumenbeete und B\u00e4ume."},
  {datei: "images/galerie/terrasse-045.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Garten mit einer Terrasse aus Holz und Stein, darauf steht ein Tisch mit St\u00fchlen. Im Vordergrund sind Blumen und Pflanzen zu sehen, im Hintergrund sind B\u00e4ume und Hecken sichtbar."},
  {datei: "images/galerie/garten-047.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit einer Holzterrasse, einer Reihe von St\u00fchlen und einem Blumenbeet mit lila Bl\u00fcten. Die Anordnung ist ordentlich und die Pflanzen sind gut gepflegt."},
  {datei: "images/galerie/garten-048.jpg", kat: "Garten & Rasen", desc: "Ein gepflegter Garten mit gr\u00fcnem Rasen, gepflegten Hecken und Blumenbeeten. Die Szene wirkt gepflegt und ordentlich."},
  {datei: "images/galerie/terrasse-046.jpg", kat: "Terrasse & Außenbereich", desc: "Ein gepflegter Terrassenbereich mit Sitzm\u00f6beln, Pflanzen und einem Wasserbecken, umgeben von gr\u00fcnen Hecken und B\u00e4umen."},
  {datei: "images/galerie/pflanzen-042.jpg", kat: "Pflanzen & Blumen", desc: "Ein Blumenbeet mit einer Vielzahl von Blumen in verschiedenen Farben und Formen, darunter rote Clematis, lila Bl\u00fcten und wei\u00dfe Glockenblumen, ist im Vordergrund zu sehen. Im Hintergrund ist ein graues Pflanzgef\u00e4\u00df mit weiteren Blumen zu erkennen. Die Szene ist in einem hellen Raum mit gro\u00dfen Fenstern, vermutlich einem Wintergarten oder einer Terrasse, aufgenommen."},
  {datei: "images/galerie/pflanzen-043.jpg", kat: "Pflanzen & Blumen", desc: "Das Bild zeigt eine Pflanze mit leuchtend roten und wei\u00dfen Bl\u00fcten in einem sonnigen Innenraum, wahrscheinlich in einem Gew\u00e4chshaus."},
  {datei: "images/galerie/pflanzen-044.jpg", kat: "Pflanzen & Blumen", desc: "Ein Blumenbeet mit einer Vielzahl von Blumen und gr\u00fcnen Pflanzen, darunter helle und dunkle Bl\u00fcten, ist im Vordergrund zu sehen. Im Hintergrund ist ein gepflasterter Boden sichtbar."},
  {datei: "images/galerie/terrasse-047.jpg", kat: "Terrasse & Außenbereich", desc: "Das Bild zeigt eine Pflanze mit gro\u00dfen, wei\u00dfen Bl\u00fcten in einem grauen Pflanzk\u00fcbel auf einer Terrasse. Im Hintergrund sind Holzst\u00fchle und ein Fenster zu sehen."},
  {datei: "images/galerie/terrasse-048.jpg", kat: "Terrasse & Außenbereich", desc: "Ein sonniger Balkon mit Holzm\u00f6beln, Pflanzenk\u00fcbeln und Blick auf gr\u00fcne B\u00e4ume und H\u00fcgel im Hintergrund."},
  {datei: "images/galerie/terrasse-049.jpg", kat: "Terrasse & Außenbereich", desc: "Ein sonniger Balkon mit Holztisch und St\u00fchlen, umgeben von Pflanzen und Blumen in grauen Pflanzk\u00fcbeln. Die Terrasse ist mit wei\u00dfen Jalousien und einer Glaswand abgeschlossen."},
  {datei: "images/galerie/garten-049.jpg", kat: "Garten & Rasen", desc: "Ein neuer Rasen mit deutlichen Spuren von Grasfrischung und einer Randbehandlung aus Kies. Im Hintergrund sind B\u00e4ume und Hecken zu sehen."},
  {datei: "images/galerie/terrasse-050.jpg", kat: "Terrasse & Außenbereich", desc: "Ein neuer Grasbelag wird auf einem Dachterrassenbereich angelegt, um ihn als Gr\u00fcnfl\u00e4che zu nutzen. Eine Person arbeitet daran, w\u00e4hrend umgebende B\u00e4ume und ein Haus im Hintergrund zu sehen sind."},
];

// =============================================
// Hero Slideshow
// =============================================
(function() {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides.length) return;
    let current = 0;
    setInterval(() => {
        slides[current].classList.remove('active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('active');
    }, 5000);
})();

// =============================================
// Fotogalerie
// =============================================
const FOTO_PRO_SEITE = 12;
let fotoAktiveKat = 'alle';
let fotoAngezeigt = 0;
let fotoGefilterteBilder = [];

function fotoGetFiltered() {
    if (fotoAktiveKat === 'alle') return GALERIE_BILDER;
    return GALERIE_BILDER.filter(b => b.kat === fotoAktiveKat);
}

function fotoRender(append = false) {
    const grid = document.getElementById('fotoGrid');
    const mehr = document.getElementById('fotoMehrBtn');
    if (!grid) return;

    if (!append) {
        grid.innerHTML = '';
        fotoAngezeigt = 0;
        fotoGefilterteBilder = fotoGetFiltered();
    }

    const batch = fotoGefilterteBilder.slice(fotoAngezeigt, fotoAngezeigt + FOTO_PRO_SEITE);
    batch.forEach((bild, i) => {
        const idx = fotoAngezeigt + i;
        const item = document.createElement('div');
        item.className = 'foto-item';
        item.dataset.idx = idx;
        item.innerHTML = `
            <img src="${bild.datei}" alt="${bild.desc.substring(0, 80)}" loading="lazy">
            <div class="foto-item-overlay"><i class="fas fa-expand"></i></div>
        `;
        item.addEventListener('click', () => lightboxOpen(idx));
        grid.appendChild(item);
    });

    fotoAngezeigt += batch.length;
    mehr.style.display = fotoAngezeigt >= fotoGefilterteBilder.length ? 'none' : 'inline-block';
}

document.querySelectorAll('.foto-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.foto-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fotoAktiveKat = btn.dataset.kat;
        fotoRender(false);
    });
});

document.getElementById('fotoMehrBtn')?.addEventListener('click', () => fotoRender(true));

// Initial render
fotoRender(false);

// =============================================
// Lightbox
// =============================================
let lightboxCurrentIdx = 0;

function lightboxOpen(idx) {
    lightboxCurrentIdx = idx;
    const bild = fotoGefilterteBilder[idx];
    document.getElementById('lightboxImg').src = bild.datei;
    document.getElementById('lightboxImg').alt = bild.desc;
    document.getElementById('lightboxDesc').textContent = bild.desc;
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function lightboxClose() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
}

function lightboxNav(dir) {
    lightboxCurrentIdx = (lightboxCurrentIdx + dir + fotoGefilterteBilder.length) % fotoGefilterteBilder.length;
    const bild = fotoGefilterteBilder[lightboxCurrentIdx];
    const img = document.getElementById('lightboxImg');
    img.style.opacity = '0';
    setTimeout(() => {
        img.src = bild.datei;
        img.alt = bild.desc;
        document.getElementById('lightboxDesc').textContent = bild.desc;
        img.style.opacity = '1';
    }, 150);
}

document.getElementById('lightboxClose')?.addEventListener('click', lightboxClose);
document.getElementById('lightboxPrev')?.addEventListener('click', () => lightboxNav(-1));
document.getElementById('lightboxNext')?.addEventListener('click', () => lightboxNav(1));
document.getElementById('lightbox')?.addEventListener('click', e => {
    if (e.target === document.getElementById('lightbox')) lightboxClose();
});
document.addEventListener('keydown', e => {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') lightboxClose();
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
});
document.getElementById('lightboxImg').style.transition = 'opacity 0.15s ease';
