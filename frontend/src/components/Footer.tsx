import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 animate-fade-in">
            <div className="flex items-center mb-4 group">
              <div className="relative">
                {/* <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-300"></div> */}
                <img 
                  src="/logo2.png" 
                  alt="CORE Logo" 
                  className="relative h-16 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
              <b>CORE</b> is a centralized technology ecosystem where students execute their education and global readiness plans, parents and teachers monitor progress, alumni mentor, and verified service providers deliver services -within a structured, readiness-focused operating system governed by ADMITra.
            </p>
          </div>

          {/* Quick Links */}
          <div className="animate-fade-in" style={{animationDelay: '0.1s'}}>
            <h3 className="text-white font-semibold mb-4 text-lg">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-blue-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/signup" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-blue-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/login" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-blue-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="animate-fade-in" style={{animationDelay: '0.15s'}}>
            <h3 className="text-white font-semibold mb-4 text-lg">Services</h3>
            <ul className="space-y-3">
              <li>
                <a href="https://www.kareerrstudio.com/education-n-career-planning.html" target="_blank" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Education Planning
                </a>
              </li>
              <li>
                <a href="https://www.kareerrstudio.com/study-abroad.html" target="_blank" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Study Abroad
                </a>
              </li>
              <li>
                <a href="#" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Ivy League Preparation
                </a>
              </li>
              <li>
                <a href="https://www.kareerrstudio.com/ielts.html" target="_blank" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  IELTS Coaching
                </a>
              </li>
              <li>
                <a href="https://www.kareerrstudio.com/gre.html" target="_blank" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  GRE Coaching
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
            <h3 className="text-white font-semibold mb-4 text-lg">Support</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <div className=" text-sm leading-relaxed">
                  +91 7046673033
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <a href="mailto:hello@admitra.io" className=" text-sm hover:text-white transition-colors">
                  hello@admitra.io
                </a>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className=" text-sm leading-relaxed">
                  Mon - Sat: <strong className="text-gray-300">10:00 – 19:30</strong><br />
                  Sun: <strong className="text-gray-300">On Request</strong>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800/50 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              ©{currentYear} All Rights Reserved by <strong className="text-white">ADMITra</strong>
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy-policy" className="text-gray-400 hover:text-white text-sm transition-all duration-300 hover:underline hover:underline-offset-4">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="text-gray-400 hover:text-white text-sm transition-all duration-300 hover:underline hover:underline-offset-4">
                Terms of Service
              </Link>
              <Link href="/cookie-policy" className="text-gray-400 hover:text-white text-sm transition-all duration-300 hover:underline hover:underline-offset-4">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


