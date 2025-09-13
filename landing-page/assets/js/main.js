// ========================================
// RetentionAI - Main JavaScript
// assets/js/main.js
// ========================================

// Configuration
const config = {
    apiUrl: process.env.API_URL || 'http://localhost:8000',
    appUrl: process.env.APP_URL || 'http://localhost:5173',
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY || '',
    gaId: process.env.GA_ID || '',
};

// Utility Functions
const utils = {
    // Debounce function for performance
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Format currency
    formatCurrency: (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    },

    // Format number with commas
    formatNumber: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Validate email
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Check if work email
    isWorkEmail: (email) => {
        const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
        const domain = email.split('@')[1];
        return !personalDomains.includes(domain);
    },

    // Get URL parameters
    getUrlParams: () => {
        const params = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const [key, value] of searchParams) {
            params[key] = value;
        }
        return params;
    },

    // Set cookie
    setCookie: (name, value, days) => {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    },

    // Get cookie
    getCookie: (name) => {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },
};

// Navigation Handler
class Navigation {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.mobileToggle = document.querySelector('.mobile-menu-toggle');
        this.navLinks = document.querySelector('.nav-links');
        this.init();
    }

    init() {
        // Scroll handler
        window.addEventListener('scroll', utils.throttle(() => {
            if (window.scrollY > 50) {
                this.navbar?.classList.add('scrolled');
            } else {
                this.navbar?.classList.remove('scrolled');
            }
        }, 100));

        // Mobile menu toggle
        this.mobileToggle?.addEventListener('click', () => {
            this.mobileToggle.classList.toggle('active');
            this.navLinks?.classList.toggle('active');
        });

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    // Close mobile menu if open
                    this.navLinks?.classList.remove('active');
                    this.mobileToggle?.classList.remove('active');
                }
            });
        });

        // Active nav link
        this.setActiveNavLink();
    }

    setActiveNavLink() {
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-links a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
}

// Form Handler
class FormHandler {
    constructor(formId) {
        this.form = document.getElementById(formId);
        this.init();
    }

    init() {
        if (!this.form) return;

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Real-time validation
        this.form.querySelectorAll('input').forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        const name = field.name;
        let isValid = true;
        let errorMessage = '';

        // Required field
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }

        // Email validation
        if (type === 'email' && value) {
            if (!utils.validateEmail(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            if (name === 'email' && !utils.isWorkEmail(value)) {
                errorMessage = 'Please use your work email address';
            }
        }

        // Password validation
        if (type === 'password' && value) {
            if (value.length < 8) {
                isValid = false;
                errorMessage = 'Password must be at least 8 characters';
            }
        }

        // Show/hide error
        this.toggleFieldError(field, isValid, errorMessage);
        return isValid;
    }

    toggleFieldError(field, isValid, message = '') {
        const errorElement = field.parentElement.querySelector('.form-error');
        
        if (!isValid) {
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = message;
            } else {
                const error = document.createElement('div');
                error.className = 'form-error';
                error.textContent = message;
                field.parentElement.appendChild(error);
            }
        } else {
            field.classList.remove('error');
            if (errorElement) {
                errorElement.remove();
            }
        }
    }

    async handleSubmit() {
        // Validate all fields
        const inputs = this.form.querySelectorAll('input');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        if (!isValid) return;

        // Get form data
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);

        // Show loading state
        const submitBtn = this.form.querySelector('[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;

        try {
            // Make API call
            const response = await fetch(`${config.apiUrl}/api/${this.form.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                this.handleSuccess(await response.json());
            } else {
                this.handleError(await response.json());
            }
        } catch (error) {
            this.handleError({ message: 'Network error. Please try again.' });
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    handleSuccess(response) {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success';
        successMessage.textContent = response.message || 'Success!';
        this.form.prepend(successMessage);

        // Reset form
        this.form.reset();

        // Redirect if needed
        if (response.redirect) {
            setTimeout(() => {
                window.location.href = response.redirect;
            }, 2000);
        }
    }

    handleError(error) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger';
        errorMessage.textContent = error.message || 'An error occurred. Please try again.';
        this.form.prepend(errorMessage);

        // Remove error after 5 seconds
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }
}

// Analytics Handler
class Analytics {
    constructor() {
        this.init();
    }

    init() {
        // Initialize Google Analytics
        if (config.gaId) {
            this.loadGoogleAnalytics();
        }

        // Track page views
        this.trackPageView();

        // Track events
        this.trackEvents();
    }

    loadGoogleAnalytics() {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaId}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', config.gaId);
        window.gtag = gtag;
    }

    trackPageView() {
        if (window.gtag) {
            gtag('event', 'page_view', {
                page_title: document.title,
                page_location: window.location.href,
                page_path: window.location.pathname
            });
        }
    }

    trackEvents() {
        // Track CTA clicks
        document.querySelectorAll('.btn-primary').forEach(btn => {
            btn.addEventListener('click', () => {
                this.trackEvent('CTA', 'click', btn.textContent);
            });
        });

        // Track form submissions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', () => {
                this.trackEvent('Form', 'submit', form.id);
            });
        });

        // Track video plays
        document.querySelectorAll('video').forEach(video => {
            video.addEventListener('play', () => {
                this.trackEvent('Video', 'play', video.id || 'unnamed');
            });
        });
    }

    trackEvent(category, action, label = null, value = null) {
        if (window.gtag) {
            gtag('event', action, {
                event_category: category,
                event_label: label,
                value: value
            });
        }
    }

    trackConversion(value = 1.0) {
        if (window.gtag) {
            gtag('event', 'conversion', {
                'send_to': 'AW-CONVERSION_ID',
                'value': value,
                'currency': 'USD'
            });
        }
    }
}

// Animation Handler
class AnimationHandler {
    constructor() {
        this.init();
    }

    init() {
        this.observeElements();
        this.initCounters();
        this.initParallax();
    }

    observeElements() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fadeInUp');
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        // Observe elements with data-animate attribute
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });
    }

    initCounters() {
        const counters = document.querySelectorAll('[data-counter]');
        
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-counter'));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };

            // Start animation when element is visible
            const observer = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    updateCounter();
                    observer.disconnect();
                }
            });

            observer.observe(counter);
        });
    }

    initParallax() {
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        window.addEventListener('scroll', utils.throttle(() => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach(el => {
                const speed = el.getAttribute('data-parallax') || 0.5;
                const yPos = -(scrolled * speed);
                el.style.transform = `translateY(${yPos}px)`;
            });
        }, 16));
    }
}

// Pricing Calculator
class PricingCalculator {
    constructor() {
        this.employees = 100;
        this.plan = 'professional';
        this.billing = 'monthly';
        this.init();
    }

    init() {
        this.bindEvents();
        this.updatePrice();
    }

    bindEvents() {
        // Employee slider
        const slider = document.getElementById('employee-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.employees = parseInt(e.target.value);
                document.getElementById('employee-count').textContent = this.employees;
                this.updatePrice();
            });
        }

        // Plan selector
        document.querySelectorAll('[data-plan]').forEach(el => {
            el.addEventListener('click', () => {
                this.plan = el.getAttribute('data-plan');
                document.querySelectorAll('[data-plan]').forEach(p => p.classList.remove('selected'));
                el.classList.add('selected');
                this.updatePrice();
            });
        });

        // Billing toggle
        document.querySelectorAll('[data-billing]').forEach(el => {
            el.addEventListener('click', () => {
                this.billing = el.getAttribute('data-billing');
                document.querySelectorAll('[data-billing]').forEach(b => b.classList.remove('active'));
                el.classList.add('active');
                this.updatePrice();
            });
        });
    }

    calculatePrice() {
        const plans = {
            starter: { base: 499, perEmployee: 2, max: 100 },
            professional: { base: 999, perEmployee: 1.5, max: 500 },
            enterprise: { base: 0, perEmployee: 0, max: Infinity }
        };

        const plan = plans[this.plan];
        
        if (this.plan === 'enterprise') {
            return 'Custom';
        }

        if (this.employees > plan.max) {
            return 'Contact Sales';
        }

        let price = plan.base;
        if (this.employees > 50) {
            price += (this.employees - 50) * plan.perEmployee;
        }

        // Apply annual discount
        if (this.billing === 'annual') {
            price = price * 0.8; // 20% discount
        }

        return Math.round(price);
    }

    updatePrice() {
        const price = this.calculatePrice();
        const priceElement = document.getElementById('calculated-price');
        
        if (priceElement) {
            if (typeof price === 'number') {
                priceElement.innerHTML = `${utils.formatCurrency(price)}<span>/month</span>`;
            } else {
                priceElement.textContent = price;
            }
        }

        // Update savings badge
        const savingsElement = document.getElementById('annual-savings');
        if (savingsElement && this.billing === 'annual' && typeof price === 'number') {
            const monthlySavings = Math.round(price * 0.25 * 12);
            savingsElement.textContent = `Save ${utils.formatCurrency(monthlySavings)}/year`;
            savingsElement.style.display = 'inline-block';
        } else if (savingsElement) {
            savingsElement.style.display = 'none';
        }
    }
}

// ROI Calculator
class ROICalculator {
    constructor() {
        this.inputs = {
            employees: 500,
            avgSalary: 75000,
            turnoverRate: 20,
            replacementCost: 50
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.calculate();
    }

    bindEvents() {
        document.querySelectorAll('.roi-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.inputs[e.target.name] = parseFloat(e.target.value);
                this.calculate();
            });
        });
    }

    calculate() {
        const { employees, avgSalary, turnoverRate, replacementCost } = this.inputs;
        
        // Current costs
        const employeesLeaving = Math.round(employees * (turnoverRate / 100));
        const currentCost = employeesLeaving * avgSalary * (replacementCost / 100);
        
        // With RetentionAI (40% reduction)
        const reducedTurnover = turnoverRate * 0.6;
        const reducedEmployeesLeaving = Math.round(employees * (reducedTurnover / 100));
        const reducedCost = reducedEmployeesLeaving * avgSalary * (replacementCost / 100);
        
        // Savings
        const annualSavings = currentCost - reducedCost;
        const employeesSaved = employeesLeaving - reducedEmployeesLeaving;
        
        // Update UI
        this.updateResults({
            currentCost,
            reducedCost,
            annualSavings,
            employeesSaved,
            roi: Math.round((annualSavings / 12000) * 100) // Assuming $1000/month cost
        });
    }

    updateResults(results) {
        const elements = {
            'current-cost': utils.formatCurrency(results.currentCost),
            'reduced-cost': utils.formatCurrency(results.reducedCost),
            'annual-savings': utils.formatCurrency(results.annualSavings),
            'employees-saved': results.employeesSaved,
            'roi-percentage': `${results.roi}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
}

// Demo Request Handler
class DemoHandler {
    constructor() {
        this.init();
    }

    init() {
        const demoForm = document.getElementById('demo-form');
        if (!demoForm) return;

        demoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.scheduleDemo(e.target);
        });
    }

    async scheduleDemo(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Validate
        if (!utils.isWorkEmail(data.email)) {
            alert('Please use your work email address');
            return;
        }

        try {
            // Show loading
            const btn = form.querySelector('[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Scheduling...';

            // Send request (mock for demo)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Success
            form.style.display = 'none';
            const success = document.createElement('div');
            success.className = 'alert alert-success';
            success.innerHTML = `
                <h3>Demo Scheduled!</h3>
                <p>We'll send a calendar invite to ${data.email} shortly.</p>
            `;
            form.parentElement.appendChild(success);

            // Track conversion
            if (window.analytics) {
                window.analytics.trackConversion();
            }

        } catch (error) {
            alert('Error scheduling demo. Please try again.');
        }
    }
}

// Chat Widget
class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createWidget();
        this.bindEvents();
    }

    createWidget() {
        const widget = document.createElement('div');
        widget.className = 'chat-widget';
        widget.innerHTML = `
            <button class="chat-trigger">
                <span class="chat-icon">💬</span>
                <span class="chat-text">Need help?</span>
            </button>
            <div class="chat-window">
                <div class="chat-header">
                    <h4>Hi there! 👋</h4>
                    <button class="chat-close">×</button>
                </div>
                <div class="chat-body">
                    <p>How can we help you today?</p>
                    <div class="chat-options">
                        <button onclick="window.location.href='demo.html'">Schedule a Demo</button>
                        <button onclick="window.location.href='pricing.html'">View Pricing</button>
                        <button onclick="window.location.href='contact.html'">Contact Sales</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(widget);
    }

    bindEvents() {
        const trigger = document.querySelector('.chat-trigger');
        const close = document.querySelector('.chat-close');
        const window = document.querySelector('.chat-window');

        trigger?.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            window?.classList.toggle('open', this.isOpen);
        });

        close?.addEventListener('click', () => {
            this.isOpen = false;
            window?.classList.remove('open');
        });
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modules
    new Navigation();
    new AnimationHandler();
    new Analytics();
    
    // Initialize form handlers
    document.querySelectorAll('form').forEach(form => {
        new FormHandler(form.id);
    });

    // Initialize calculators if on pricing page
    if (document.querySelector('.pricing-calculator')) {
        new PricingCalculator();
    }

    if (document.querySelector('.roi-calculator')) {
        new ROICalculator();
    }

    // Initialize demo handler
    new DemoHandler();

    // Initialize chat widget (delay for better performance)
    setTimeout(() => {
        new ChatWidget();
    }, 3000);

    // Handle lazy loading images
    if ('loading' in HTMLImageElement.prototype) {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            img.src = img.dataset.src;
        });
    } else {
        // Fallback for older browsers
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
        document.body.appendChild(script);
    }

    // Cookie consent
    if (!utils.getCookie('consent')) {
        setTimeout(() => {
            const consent = document.createElement('div');
            consent.className = 'cookie-consent';
            consent.innerHTML = `
                <p>We use cookies to improve your experience. By continuing, you agree to our use of cookies.</p>
                <button onclick="acceptCookies()">Accept</button>
            `;
            document.body.appendChild(consent);
        }, 2000);
    }
});

// Global functions
window.acceptCookies = () => {
    utils.setCookie('consent', 'true', 365);
    document.querySelector('.cookie-consent')?.remove();
};

// Export for use in other scripts
window.RetentionAI = {
    utils,
    Analytics,
    FormHandler,
    PricingCalculator,
    ROICalculator
};