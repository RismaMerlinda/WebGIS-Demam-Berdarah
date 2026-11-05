import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ChatbotWidget from '../components/ChatbotWidget';

export default function PublicLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fbfbfa] text-[#17221e] relative">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      {/* Fitur 12: Public AI Chatbot Assistant */}
      <ChatbotWidget />
    </div>
  );
}
