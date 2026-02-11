# Frontend Components

This directory contains reusable React components for the Community Platform frontend.

## Components

### Navbar

**File:** `Navbar.tsx`

A responsive navigation bar component that provides consistent navigation across the application.

**Features:**
- **Sticky Navigation:** Stays at the top of the page while scrolling
- **Responsive Design:** Includes a mobile-friendly hamburger menu
- **Authentication State:** Dynamically shows different navigation based on login status
- **Active Route Highlighting:** Highlights the current page in the navigation
- **User Welcome Message:** Displays the logged-in user's name
- **Mobile Menu:** Collapsible menu for small screens

**Authentication States:**
- **Logged Out:** Shows Home, Login, and Sign Up links
- **Logged In:** Shows Home, Dashboard, user name, and Logout button

**Technical Details:**
- Uses Next.js `usePathname` for route detection
- Uses `localStorage` to check authentication state
- Client-side component (`'use client'`)
- Implements smooth transitions and hover effects

**Usage:**
The Navbar is automatically included in the root layout and appears on all pages.

---

### Footer

**File:** `Footer.tsx`

A comprehensive footer component providing links, social media, and legal information.

**Features:**
- **Brand Section:** Logo and platform description
- **Social Media Links:** Facebook, Twitter, LinkedIn, and GitHub icons
- **Quick Links:** Navigation to main pages (Home, Dashboard, Sign Up, Login)
- **Support Links:** Help resources (Forgot Password, Resend Verification, Help Center, Contact)
- **Legal Links:** Privacy Policy, Terms of Service, Cookie Policy
- **Responsive Grid:** Adapts layout for mobile and desktop screens
- **Dynamic Copyright:** Automatically updates year

**Sections:**
1. **Brand Column (2 columns on desktop):** Platform name, description, and social media
2. **Quick Links Column:** Main navigation shortcuts
3. **Support Column:** Help and support resources
4. **Bottom Bar:** Copyright and legal links

**Technical Details:**
- Server-side component (default Next.js behavior)
- Mobile-first responsive design
- Hover effects on all links
- Grid layout for organized content

**Usage:**
The Footer is automatically included in the root layout and appears on all pages.

---

## Implementation

Both components are integrated into the root layout (`app/layout.tsx`):

```tsx
<body className="flex flex-col min-h-screen">
  <Navbar />
  <main className="grow">
    {children}
  </main>
  <Footer />
</body>
```

This ensures:
- The navbar is always at the top
- The main content grows to fill available space
- The footer is always at the bottom
- Pages with minimal content still have the footer at the bottom

## Styling

Both components use:
- **Tailwind CSS** for styling
- **Responsive breakpoints** (`sm:`, `md:`, `lg:`)
- **Consistent color scheme:**
  - Primary: Blue (`blue-600`, `blue-700`)
  - Neutral: Gray (`gray-50` to `gray-900`)
  - Accent: Red for logout/destructive actions
  - Success: Green for status indicators

## Navigation Flow

### Public Routes (Unauthenticated)
- Home (`/`)
- Login (`/login`)
- Sign Up (`/signup`)
- Forgot Password (`/forgot-password`)
- Reset Password (`/reset-password`)
- Verify Email (`/verify-email`)
- Resend Verification (`/resend-verification`)

### Protected Routes (Authenticated)
- Dashboard (`/dashboard`)

### Authentication Detection

The Navbar checks for:
1. `token` in localStorage (authentication status)
2. `user` object in localStorage (user details)

When these are present, it displays authenticated navigation. When absent, it shows public navigation.

## Customization

### Updating the Brand Name
Change the brand name in both components:

**Navbar:**
```tsx
<span className="text-2xl font-bold text-blue-600">Community</span>
<span className="text-2xl font-light text-gray-700 ml-1">Platform</span>
```

**Footer:**
```tsx
<span className="text-2xl font-bold text-white">Community</span>
<span className="text-2xl font-light text-gray-400 ml-1">Platform</span>
```

### Adding Navigation Links

In `Navbar.tsx`, add links to the desktop and mobile sections:

**Desktop:**
```tsx
<Link
  href="/new-page"
  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive('/new-page')
      ? 'text-blue-600 bg-blue-50'
      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
  }`}
>
  New Page
</Link>
```

**Mobile:**
```tsx
<Link
  href="/new-page"
  onClick={() => setMobileMenuOpen(false)}
  className={`block px-3 py-2 rounded-md text-base font-medium ${
    isActive('/new-page')
      ? 'text-blue-600 bg-blue-50'
      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
  }`}
>
  New Page
</Link>
```

### Updating Social Media Links

In `Footer.tsx`, update the `href` attributes:

```tsx
<a
  href="https://facebook.com/yourpage"
  className="text-gray-400 hover:text-white transition-colors"
  aria-label="Facebook"
>
  {/* SVG icon */}
</a>
```

## Accessibility

Both components include:
- **Semantic HTML:** `<nav>`, `<footer>`, `<header>` tags
- **ARIA labels:** For icon-only buttons and links
- **Keyboard navigation:** All interactive elements are keyboard accessible
- **Focus indicators:** Visual feedback for keyboard users
- **Screen reader text:** Hidden text for context (e.g., "Open main menu")

## Performance

- **Client-side only where needed:** Navbar is client-side for interactivity; Footer is server-side
- **Efficient re-renders:** Uses React hooks properly to minimize re-renders
- **No external dependencies:** Beyond Next.js and React built-ins
- **Optimized SVG icons:** Inline SVG for fast loading

## Browser Support

Both components work on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements:
1. **User Avatar/Dropdown:** Replace logout button with user menu
2. **Notifications:** Add notification bell in navbar
3. **Dark Mode Toggle:** Theme switcher in navbar
4. **Search Bar:** Global search functionality
5. **Breadcrumbs:** Show navigation path for nested pages
6. **Newsletter Signup:** Add email subscription form in footer
7. **Multi-language Support:** i18n integration for translations
8. **Megamenu:** Dropdown menus for complex navigation structures


