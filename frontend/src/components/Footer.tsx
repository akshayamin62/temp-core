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
                <a href="https://www.kareerstudio.com/education-n-career-planning.html" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Education Planning
                </a>
              </li>
              <li>
                <a href="https://www.kareerstudio.com/study-abroad.html" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
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
                <a href="https://www.kareerstudio.com/ielts.html" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  IELTS Coaching
                </a>
              </li>
              <li>
                <a href="https://www.kareerstudio.com/gre.html" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-purple-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  GRE Coaching
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="animate-fade-in" style={{animationDelay: '0.2s'}}>
            <h3 className="text-white font-semibold mb-4 text-lg">Support</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-cyan-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="group flex items-center hover:text-white transition-all duration-300 hover:translate-x-1">
                  <span className="w-0 h-0.5 bg-cyan-500 group-hover:w-4 transition-all duration-300 mr-0 group-hover:mr-2"></span>
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800/50 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm flex items-center">
              <span className="mr-1">©</span> {currentYear} CORE. 
              <span className="ml-1 text-gray-500">Made with</span>
              <span className="mx-1 text-red-500 animate-pulse">♥</span>
              <span className="text-gray-500">for the community</span>
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-all duration-300 hover:underline hover:underline-offset-4">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-all duration-300 hover:underline hover:underline-offset-4">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-all duration-300 hover:underline hover:underline-offset-4">
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}


