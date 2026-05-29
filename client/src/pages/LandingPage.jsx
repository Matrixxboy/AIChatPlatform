import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Import Modular Components
import Navbar from '../components/Landing/Navbar';
import Hero from '../components/Landing/Hero';
import Stats from '../components/Landing/Stats';
import ProblemSection from '../components/Landing/ProblemSection';
import Problems from '../components/Landing/Problems';
import HowItWorks from '../components/Landing/HowItWorks';
import Features from '../components/Landing/Features';
import LanguagesOrbit from '../components/Landing/LanguagesOrbit';
import UseCases from '../components/Landing/UseCases';
import PlatformShowcase from '../components/Landing/PlatformShowcase';
import WhyLoveIt from '../components/Landing/WhyLoveIt';
import Testimonials from '../components/Landing/Testimonials';
import ContactUs from '../components/Landing/ContactUs';
import CTA from '../components/Landing/CTA';
import Footer from '../components/Landing/Footer';

export default function LandingPage({ user, onLogout }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  // Languages data
  const languages = [
    { name: 'English', native: 'English', flag: '🇬🇧' },
    { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
    { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { name: 'French', native: 'Français', flag: '🇫🇷' },
    { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    { name: 'Korean', native: '한국어', flag: '🇰🇷' },
    { name: 'Chinese (Mandarin)', native: '中文', flag: '🇨🇳' },
    { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    { name: 'Portuguese', native: 'Português', flag: '🇵🇹' },
    { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    { name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    { name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
    { name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' }
  ];

  // Scroll active section tracker
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      
      const sections = [
        { id: 'hero', offset: 0 },
        { id: 'how-it-works', element: document.getElementById('how-it-works') },
        { id: 'features', element: document.getElementById('features') },
        { id: 'languages', element: document.getElementById('languages') },
        { id: 'use-cases', element: document.getElementById('use-cases') },
        { id: 'contact', element: document.getElementById('contact') }
      ];

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        if (sec.id === 'hero' && scrollPos >= 0) {
          setActiveSection('hero');
          break;
        }
        if (sec.element && scrollPos >= sec.element.offsetTop) {
          setActiveSection(sec.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Conversation Simulator State
  const [simStep, setSimStep] = useState(0);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(null);

  useEffect(() => {
    const simulatorSequence = async () => {
      // Step 0: Idle / Reset
      setMessages([]);
      setTyping(null);
      await new Promise(r => setTimeout(r, 1000));

      // Step 1: Gujarati typing...
      setTyping('Gujarati User');
      await new Promise(r => setTimeout(r, 2000));
      setTyping(null);

      // Step 2: Gujarati sends message
      const msg1 = {
        id: 1,
        sender: 'Gujarati User',
        senderLang: 'Gujarati',
        text: 'આજે મીટિંગ કેટલા વાગ્યે છે?',
        translation: 'આજે મીટિંગ કેટલા વાગ્યે છે?',
        isTranslated: false,
        time: '10:00 AM'
      };
      setMessages([msg1]);
      await new Promise(r => setTimeout(r, 1200));

      // Step 3: Trigger Neural Translation Animation
      setMessages(prev => prev.map(m => m.id === 1 ? { ...m, translating: true } : m));
      await new Promise(r => setTimeout(r, 1500));

      // Step 4: Translation complete (Hindi version appears)
      setMessages(prev => prev.map(m => m.id === 1 ? { 
        ...m, 
        translating: false, 
        isTranslated: true, 
        text: 'आज मीटिंग कितने बजे है?', 
        note: 'Translated from Gujarati' 
      } : m));
      await new Promise(r => setTimeout(r, 2500));

      // Step 5: Hindi user typing...
      setTyping('Hindi User');
      await new Promise(r => setTimeout(r, 2000));
      setTyping(null);

      // Step 6: Hindi user sends message
      const msg2 = {
        id: 2,
        sender: 'Hindi User',
        senderLang: 'Hindi',
        text: 'शाम 5 बजे',
        translation: 'शाम 5 बजे',
        isTranslated: false,
        time: '10:01 AM'
      };
      setMessages(prev => [...prev, msg2]);
      await new Promise(r => setTimeout(r, 1200));

      // Step 7: Trigger Neural Translation Animation
      setMessages(prev => prev.map(m => m.id === 2 ? { ...m, translating: true } : m));
      await new Promise(r => setTimeout(r, 1500));

      // Step 8: Translation complete (Gujarati version appears)
      setMessages(prev => prev.map(m => m.id === 2 ? { 
        ...m, 
        translating: false, 
        isTranslated: true, 
        text: 'સાંજે 5 વાગ્યે', 
        note: 'Translated from Hindi' 
      } : m));
      
      // Loop sequence after a delay
      await new Promise(r => setTimeout(r, 5000));
      setSimStep(prev => prev + 1);
    };

    simulatorSequence();
  }, [simStep]);

  // Handle CTA buttons click
  const handleStartChatting = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div id="hero" className="min-h-screen bg-slate-50 text-slate-800 font-body overflow-x-clip selection:bg-brand selection:text-white relative">
      {/* Assembly of Modular Components */}
      <Navbar 
        user={user} 
        navigate={navigate} 
        handleStartChatting={handleStartChatting} 
        mobileMenuOpen={mobileMenuOpen} 
        setMobileMenuOpen={setMobileMenuOpen} 
        activeSection={activeSection}
      />

      <Hero 
        navigate={navigate} 
        handleStartChatting={handleStartChatting} 
        languages={languages} 
        messages={messages} 
        typing={typing} 
      />

      <Stats />

      <ProblemSection />

      <Problems />

      <HowItWorks />

      <Features />

      <LanguagesOrbit languages={languages} />

      <UseCases />

      <PlatformShowcase handleStartChatting={handleStartChatting} />

      <WhyLoveIt />

      <Testimonials />

      <ContactUs />

      <CTA handleStartChatting={handleStartChatting} navigate={navigate} />

      <Footer />
    </div>
  );
}
