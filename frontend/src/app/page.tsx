'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { authAPI, serviceAPI } from '@/lib/api';
import { Service, StudentServiceRegistration, User, USER_ROLE } from '@/types';
import { toast, Toaster } from 'react-hot-toast';
import ServiceCard from '@/components/ServiceCard';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  BookOpen, 
  Award, 
  Target, 
  BarChart3, 
  Globe, 
  Zap, 
  ArrowRight, 
  Play, 
  Layout, 
  Briefcase, 
  CheckCircle2, 
  Gem,
  Clock,
  Shield,
  TrendingUp,
  Heart
} from 'lucide-react';

// Animation Settings
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.1 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } }
};

// Data from PPT
const stakeholderData = [
  {
    title: 'STUDENTS',
    icon: Users,
    items: [
      'Register, build and execute personalized education and career readiness plans',
      'Access verified service providers for tutoring, coaching, test prep, and career guidance',
      'Track goals, skills, and milestones in one secure, intuitive interface'
    ]
  },
  {
    title: 'PARENTS & GUARDIANS',
    icon: UserCheck,
    items: [
      'Monitor academic progress, readiness metrics, and service delivery in real time',
      'Collaborate with ops, teachers and mentors to support student success',
      'Receive alerts, insights, and reports customized for your child\'s goals'
    ]
  },
  {
    title: 'EDUCATORS',
    icon: GraduationCap,
    items: [
      'Track student growth beyond academics - across readiness indicators and life skills',
      'Coordinate with parents and service providers in a structured digital environment',
      'Access data-driven insights to support interventions and enrichment'
    ]
  },
  {
    title: 'ALUMNI MENTORS',
    icon: Award,
    items: [
      'Give back something to student community through guided mentorship',
      'Share insights, review student plans, and support readiness development',
      'Stay connected to your school or institution through a centralized network'
    ]
  },
  {
    title: 'VERIFIED SERVICE PROVIDERS',
    icon: BookOpen,
    items: [
      'Deliver educational services to matched students via a trusted, well-regulated and governed platform',
      'Get verified by ADMITra for quality assurance and impact measurement',
      'Integrate scheduling, feedback, and reporting - all within CORE'
    ]
  }
];

const whyDifferent = [
  {
    icon: Target,
    title: "BUILT FOR GLOBAL ADMISSION SUCCESS",
    desc: "Unlike generic education tools, CORE is engineered for students pursuing elite university admissions and career-focused international study."
  },
  {
    icon: Clock,
    title: "STRUCTURED, NOT STRESSFUL",
    desc: "With CORE, students stay ahead of deadlines, meet readiness milestones, and access the right help - without the chaos of doing it alone."
  },
  {
    icon: Shield,
    title: "GUIDED BY PROVEN FRAMEWORKS",
    desc: "CORE's operating system is governed by ADMITra, a structured framework that ensures your journey is transparent, supported, and results-focused."
  },
  {
    icon: Globe,
    title: "ALL-IN-ONE PLATFORM",
    desc: "No more scattered services and misaligned strategies. CORE brings everything - planning, mentorship, consulting, and progress tracking - into one governed ecosystem."
  }
];

const features = [
  {
    title: 'PERSONALIZED READINESS PLANS',
    description: 'Customized timelines and task trackers for college admissions and career prep',
    icon: Target
  },
  {
    title: 'IVY LEAGUE & GLOBAL ADMISSION GUIDANCE',
    description: 'Access curated services and verified experts in admissions consulting',
    icon: GraduationCap
  },
  {
    title: 'MENTORSHIP FROM ALUMNI',
    description: 'Get one-on-one support from students and alumni of top global universities',
    icon: Users
  },
  {
    title: 'PROGRESS MONITORING DASHBOARDS',
    description: 'Real-time insights for students, parents, and educators',
    icon: BarChart3
  },
  {
    title: 'ACCESS TO VERIFIED SERVICE PROVIDERS',
    description: 'Choose from trusted, vetted providers for IELTS/SAT/ACT/PTE prep, essay writing, research programs & more',
    icon: Award
  }
];

const results = [
  {
    title: 'STRONGER ADMISSIONS OUTCOMES',
    description: 'From Ivy League admits to top STEM and business programs globally, CORE helps students build standout profiles that get noticed.',
    icon: TrendingUp
  },
  {
    title: 'CLARITY AT EVERY STEP',
    description: 'Know exactly what to do - and when - with milestone-based planning, verified expert input and reminders.',
    icon: CheckCircle2
  },
  {
    title: 'CAREER READINESS BEYOND THE ADMIT',
    description: 'CORE doesn\'t stop at acceptance. It aligns academics, internships, and mentorships with long-term career goals.',
    icon: Zap
  }
];

export default function Home() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [registrations, setRegistrations] = useState<StudentServiceRegistration[]>([]);
  const [registeringServiceId, setRegisteringServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchServices();
  }, []);
  
  // Auto-advance carousel every 4 seconds
  useEffect(() => {
    if (!isPaused && services.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => prev + 1);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isPaused, services.length]);


  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await authAPI.getProfile();
        setUser(response.data.data.user);
        setIsLoggedIn(true);
        if (response.data.data.user.role === USER_ROLE.STUDENT) {
          fetchMyServices();
        }
      }
    } catch (error) {
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await serviceAPI.getAllServices();
      setServices(response.data.data.services.slice(0, 6));
    } catch (error: any) {
      console.error('Failed to fetch services:', error);
    }
  };

  const fetchMyServices = async () => {
    try {
      const response = await serviceAPI.getMyServices();
      setRegistrations(response.data.data.registrations);
    } catch (error: any) {
      console.error('Failed to fetch my services:', error);
    }
  };

  const isRegistered = (serviceId: string) => {
    return registrations.some((r: any) => {
      if (!r.serviceId) return false;
      const id = typeof r.serviceId === 'object' ? r.serviceId._id : r.serviceId;
      return id === serviceId;
    });
  };

  const handleRegister = async (serviceId: string) => {
    if (!isLoggedIn) {
      toast.error('Please login to register for services');
      router.push('/login');
      return;
    }

    if (user?.role !== USER_ROLE.STUDENT) {
      toast.error('Only students can register for services');
      return;
    }

    // Check if service is configured (only study-abroad is currently configured)
    const service = services.find(s => s._id === serviceId);
    if (service && service.slug !== 'study-abroad') {
      toast('This service will be available soon for registration.');
      return;
    }

    setRegisteringServiceId(serviceId);
    try {
      await serviceAPI.registerForService(serviceId);
      toast.success('Successfully registered for service!');
      fetchMyServices();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to register';
      toast.error(message);
    } finally {
      setRegisteringServiceId(null);
    }
  };

  const handleViewDetails = (serviceId: string) => {
    const registration = registrations.find((r: any) => {
      if (!r.serviceId) return false;
      const id = typeof r.serviceId === 'object' ? r.serviceId._id : r.serviceId;
      return id === serviceId;
    });

    if (registration) {
      router.push(`/student/registration/${registration._id}`);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Toaster position="top-right" />

      {/* Hero Section */}
      <section className="relative pt-37 pb-30 px-6 bg-gradient-to-b from-[#d0e5f5] to-[#e8f3fa] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/40 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.h1 
              variants={fadeInUp} 
              className="text-5xl lg:text-5xl font-black text-[#0e5080] leading-[1.1] mb-8"
            >
              Plan your study-abroad, build your profile, and get mentored by Ivy League alumni<br />
            </motion.h1>

            <motion.p 
              variants={fadeInUp} 
              className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed"
            >
              <span className="font-bold text-[#0e5080]">CORE</span> – Centralized Operation & Readiness Eco-system
              <br />
              <span className="block text-right">
                – Powered by <span className="font-bold text-[#0876b8]">ADMITra</span>
              </span>
            </motion.p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 mb-20"
          >
            <div>
              <img 
                src="/image1.png" 
                alt="CORE Platform Dashboard" 
                className="w-full h-auto object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* What is CORE Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto border-t border-slate-100">
        {/* Centered Heading - Matching Other Sections */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-black text-slate-900 mb-6">
            What is <span className="text-[#0876b8]">CORE?</span>
          </motion.h2>
        </motion.div>

        {/* Two Column Layout - Content and Cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid lg:grid-cols-2 gap-16 items-center mt-12"
        >
          {/* Left Side - Three Pillars Content */}
          <div>
            <motion.div variants={fadeInUp}>
              <p className="text-xl text-slate-600 leading-relaxed max-w-4xl mx-auto">
                <span className="font-bold text-[#0e5080]">CORE</span> - A <span className="font-bold text-[#0876b8]">career and admissions readiness ecosystem</span> designed for students pursuing top-tier global universities and future-focused careers.
              </p>
              <br /><br />
              <h3 className="text-3xl font-black text-[#0876b8] mb-4 border-[#6aacd4]">
                Three Pillars of Excellence
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed pl-4 border-l-4">
                Whether you're aiming for the Ivy League, Oxbridge, or top programs in Canada, Europe, Middle East or South-East Asia - CORE keeps every piece of your journey <span className="font-bold text-[#0876b8]">aligned</span>, <span className="font-bold text-[#0876b8]">strategic</span>, and <span className="font-bold text-[#0876b8]">transparent</span>.
              </p>
            </motion.div>
          </div>
          
          {/* Right Side - Overlapping Stacked Cards */}
          <div className="relative h-[450px]">
            {/* Card 1 - Personalized Planning */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="absolute top-0 right-0 w-72 bg-white rounded-2xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl hover:z-50 transition-all z-30"
            >
              <Layout className="text-[#0876b8] mb-3" size={28} />
              <h4 className="font-bold text-lg mb-2">Personalized Planning</h4>
              <p className="text-s text-slate-500 leading-relaxed">
                Custom educational roadmaps built for your specific trajectory.
              </p>
            </motion.div>

            {/* Card 2 - Expert Services */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute top-32 right-12 w-72 bg-white rounded-2xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl hover:z-50 transition-all z-20"
            >
              <Users className="text-[#3991c6] mb-3" size={28} />
              <h4 className="font-bold text-lg mb-2">Expert Services</h4>
              <p className="text-s text-slate-500 leading-relaxed">
                Curated resources from top-tier educational consultants.
              </p>
            </motion.div>

            {/* Card 3 - Alumni Mentorship */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="absolute top-64 right-24 w-72 bg-white rounded-2xl p-6 shadow-xl border border-slate-100 hover:shadow-2xl hover:z-50 transition-all z-10"
            >
              <GraduationCap className="text-[#6aacd4] mb-3" size={28} />
              <h4 className="font-bold text-lg mb-2">Alumni Mentorship</h4>
              <p className="text-s text-slate-500 leading-relaxed">
                Connect with those who have already succeeded in your field.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How CORE Works - Stakeholder Bento Grid */}
      <section className="py-24 px-6 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >

            <motion.h2 variants={fadeInUp} className="text-4xl font-black text-slate-900 mb-4">
              How <span className="text-[#0876b8]">it</span> Works?
            </motion.h2>
            
            <motion.p variants={fadeInUp} className="text-slate-500 text-xl">
              Tailored experiences for every member of the educational journey
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Large Featured Card - Students */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              className="md:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-[#6aacd4] to-[#2083bf] rounded-2xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform">
                <Users className="text-white" size={36} />
              </div>
              <h3 className="text-3xl font-black mb-6">{stakeholderData[0].title}</h3>
              <ul className="space-y-3 mb-10">
                {stakeholderData[0].items.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600">
                    <CheckCircle2 className="w-5 h-5 text-[#0876b8] flex-shrink-0 mt-0.5" />
                    <span className="text-base leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl overflow-hidden shadow-md">
                <img 
                  src="/image2.jpg" 
                  alt="Student Dashboard Preview" 
                  className="w-full h-75 object-cover"
                />
              </div>

            </motion.div>

            {/* Stacked Smaller Cards */}
            <div className="space-y-6">
              {stakeholderData.slice(1, 3).map((stakeholder, index) => {
                const Icon = stakeholder.icon;
                return (
                  <motion.div
                    key={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={scaleIn}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-[#6aacd4] to-[#2083bf] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                      <Icon className="text-white" size={36} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{stakeholder.title}</h3>
                    <ul className="space-y-2">
                      {stakeholder.items.slice(0, 2).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-500 text-base">
                          <CheckCircle2 className="w-5 h-5 text-[#0876b8] flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Remaining Stakeholders */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-6 mt-6"
          >
            {stakeholderData.slice(3).map((stakeholder, index) => {
              const Icon = stakeholder.icon;
              return (
                <motion.div
                  key={index}
                  variants={scaleIn}
                  className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-[#6aacd4] to-[#2083bf] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                    <Icon className="text-white" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold mb-5">{stakeholder.title}</h3>
                  <ul className="space-y-3">
                    {stakeholder.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-[#0876b8] flex-shrink-0 mt-0.5" />
                        <span className="text-base leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Why CORE is Different */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-4xl font-black text-slate-900 mb-4">
            Why CORE is <span className="text-[#0876b8]">Different</span>?
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {whyDifferent.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                variants={scaleIn}
                className="p-10 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 text-center hover:bg-white hover:shadow-xl transition-all"
              >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#6aacd4] to-[#2083bf] flex items-center justify-center shadow-xl mb-6">
                  <Icon className="text-white" size={36} />
                </div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-slate-500 text-base leading-relaxed">{item.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* What You'll Get Features */}
      <section className="py-24 px-6 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            
            <motion.h2 variants={fadeInUp} className="text-4xl font-black text-slate-900 mb-4">
              What You'll <span className="text-[#0876b8]">Get Here</span>?
            </motion.h2>
          </motion.div>

          {/* Features Grid - First 3 items */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8"
          >
            {features.slice(0, 3).map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={scaleIn}
                  className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-[#6aacd4] to-[#2083bf] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                    <Icon className="text-white" size={36} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-500 text-base leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>

{/* Last 2 items - Centered */}
<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true }}
  variants={staggerContainer}
  className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
>
  {features.slice(3, 5).map((feature, index) => {
    const Icon = feature.icon;
    return (
      <motion.div
        key={index + 3}
        variants={scaleIn}
        className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-[#6aacd4] to-[#2083bf] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
          <Icon className="text-white" size={36} />
        </div>
        <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
      </motion.div>
    );
  })}
</motion.div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-4xl font-black text-slate-900 mb-4">
            Results You Can <span className="text-[#0876b8]">Expect</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <motion.div
                key={index}
                variants={scaleIn}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#6aacd4] to-[#2083bf] flex items-center justify-center shadow-xl">
                  <Icon className="text-white" size={36} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{result.title}</h3>
                <p className="text-slate-600 leading-relaxed">{result.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Services Grid */}
      {services.length > 0 && (
        <section className="py-24 px-6 bg-gradient-to-b from-white to-blue-50/30 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            {/* Heading Section */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center mb-16"
            >  
              <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
                Explore Our <span className="text-[#0876b8]">Services</span>
              </motion.h2>
              
              <motion.p variants={fadeInUp} className="text-lg text-slate-500 max-w-3xl mx-auto mb-2">
                Premium modules designed for every stage of your readiness journey.
              </motion.p>
              
              {!isLoggedIn && (
                <motion.p variants={fadeInUp} className="text-sm text-slate-400">
                  Sign in to register and get started
                </motion.p>
              )}
            </motion.div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 border-4 border-[#0876b8] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600 text-lg font-medium">Loading services...</p>
              </div>
            ) : (
              <div className="relative">
                {/* Carousel Container */}
                <div 
                  className="relative overflow-hidden"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                >
                  {/* Cards Wrapper - Circular Loop with Duplicates */}
                  <div 
                    className="flex transition-transform duration-700 ease-in-out"
                    style={{ 
                      transform: `translateX(-${((currentSlide % services.length) + services.length) * (100 / 3)}%)`,
                    }}
                  >
                    {/* Render services 3 times for seamless infinite loop */}
                    {[...services, ...services, ...services].map((service, index) => {
                      const canRegister = user?.role === USER_ROLE.STUDENT;
                      const showRegisterButton = isLoggedIn && canRegister;
                      const actualIndex = index % services.length;

                      return (
                        <div
                          key={`${service._id}-${index}`}
                          className="flex-shrink-0 w-full md:w-1/3 px-4"
                        >
                          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl hover:shadow-2xl hover:border-[#0876b8] transition-all duration-500 overflow-hidden h-full group">
                            {/* Animated Gradient Top Border */}
                            <div className="h-2 bg-gradient-to-r from-[#0876b8] via-[#3991c6] to-[#6aacd4] relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                            </div>
                            
                            <div className="p-8">
                              {/* Icon with Pulse Animation */}
                              <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 bg-blue-100 rounded-2xl animate-pulse opacity-50"></div>
                                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                                  <BookOpen className="text-[#0876b8]" size={36} strokeWidth={2.5} />
                                </div>
                              </div>

                              {/* Service Title */}
                              <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-[#0876b8] transition-colors duration-300 min-h-[64px]">
                                {service.name}
                              </h3>

                              {/* Service Description */}
                              <p className="text-slate-600 text-base leading-relaxed mb-6 min-h-[72px] line-clamp-3">
                                {service.description || 'Expert guidance and support for your educational journey with personalized attention.'}
                              </p>


                              {/* Action Buttons */}
                              <div className="space-y-3">
                                {showRegisterButton && !isRegistered(service._id) ? (
                                  <>
                                    <button
                                      onClick={() => handleRegister(service._id)}
                                      disabled={registeringServiceId === service._id}
                                      className="w-full px-6 py-4 bg-gradient-to-r from-[#0876b8] to-[#0660a0] text-white rounded-2xl font-bold hover:from-[#0660a0] hover:to-[#0876b8] transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                      {registeringServiceId === service._id ? (
                                        <span className="flex items-center justify-center gap-2">
                                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          Registering...
                                        </span>
                                      ) : (
                                        <span className="flex items-center justify-center gap-2">
                                          Register Now
                                          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </span>
                                      )}
                                    </button>
                                    {service.learnMoreUrl ? (
                                      <button
                                        onClick={() => window.open(service.learnMoreUrl, '_blank')}
                                        className="w-full px-6 py-4 text-[#0876b8] border-2 border-[#0876b8] rounded-2xl font-bold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                      >
                                        <span className="flex items-center justify-center gap-2">
                                          Learn More
                                          <ArrowRight size={18} />
                                        </span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => toast('Coming soon!')}
                                        className="w-full px-6 py-4 text-[#0876b8] border-2 border-[#0876b8] rounded-2xl font-bold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                      >
                                        <span className="flex items-center justify-center gap-2">
                                          Learn More
                                          <ArrowRight size={18} />
                                        </span>
                                      </button>
                                    )}
                                  </>
                                ) : isRegistered(service._id) ? (
                                  <>
                                    <button
                                      onClick={() => handleViewDetails(service._id)}
                                      className="w-full px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-2xl font-bold border-2 border-green-200 hover:from-green-100 hover:to-green-200 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1"
                                    >
                                      <span className="flex items-center justify-center gap-2">
                                        <CheckCircle2 size={18} />
                                        View Details
                                      </span>
                                    </button>
                                    {service.learnMoreUrl ? (
                                      <button
                                        onClick={() => window.open(service.learnMoreUrl, '_blank')}
                                        className="w-full px-6 py-4 text-[#0876b8] border-2 border-[#0876b8] rounded-2xl font-bold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                      >
                                        <span className="flex items-center justify-center gap-2">
                                          Learn More
                                          <ArrowRight size={18} />
                                        </span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => toast('Coming soon!')}
                                        className="w-full px-6 py-4 text-[#0876b8] border-2 border-[#0876b8] rounded-2xl font-bold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                      >
                                        <span className="flex items-center justify-center gap-2">
                                          Learn More
                                          <ArrowRight size={18} />
                                        </span>
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  service.learnMoreUrl ? (
                                    <button
                                      onClick={() => window.open(service.learnMoreUrl, '_blank')}
                                      className="w-full px-6 py-4 text-[#0876b8] border-2 border-[#0876b8] rounded-2xl font-bold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                    >
                                      <span className="flex items-center justify-center gap-2">
                                        Learn More
                                        <ArrowRight size={18} />
                                      </span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => toast('Coming soon!')}
                                      className="w-full px-6 py-4 text-[#0876b8] border-2 border-[#0876b8] rounded-2xl font-bold hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                    >
                                      <span className="flex items-center justify-center gap-2">
                                        Learn More
                                        <ArrowRight size={18} />
                                      </span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation Dots */}
                <div className="flex justify-center items-center gap-3 mt-12">
                  {services.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`transition-all duration-300 rounded-full ${
                        (currentSlide % services.length) === index
                          ? 'w-12 h-3 bg-[#0876b8]'
                          : 'w-3 h-3 bg-slate-300 hover:bg-slate-400'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation Arrows */}
                <button
                  onClick={() => setCurrentSlide((prev) => prev - 1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-[#0876b8] hover:bg-[#0876b8] hover:text-white transition-all duration-300 hover:scale-110 z-10"
                  aria-label="Previous slide"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => setCurrentSlide((prev) => prev + 1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-14 h-14 bg-white rounded-full shadow-xl flex items-center justify-center text-[#0876b8] hover:bg-[#0876b8] hover:text-white transition-all duration-300 hover:scale-110 z-10"
                  aria-label="Next slide"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* View All Services Link */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeInUp}
                  className="text-center mt-16"
                >
                </motion.div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="bg-gradient-to-r from-[#0876b8] to-[#2083bf] rounded-[3rem] p-16 text-center text-white shadow-2xl relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-5xl font-black mb-8">
                Ready to join the <br /> eco-system?
              </h2>
              <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto">
                Start your journey with CORE today and unlock access to premium resources, global mentors, and a community dedicated to your success.
              </p>
              
              {!isLoggedIn && (
                <div className="flex flex-wrap justify-center gap-4">
                  <Link 
                    href="/signup" 
                    className="px-10 py-5 bg-white text-[#0876b8] rounded-full font-bold hover:scale-105 transition-all shadow-lg"
                  >
                    Sign Up
                  </Link>
                  <Link 
                    href="/login" 
                    className="px-10 py-5 border-2 border-white/20 backdrop-blur-sm rounded-full font-bold hover:bg-white/10 transition-all"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>

            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          </motion.div>
        </div>
      </section>
    </div>
  );
}

