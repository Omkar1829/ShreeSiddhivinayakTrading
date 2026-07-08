import { Link } from 'react-router-dom';
import { Phone, MessageSquare, MapPin, Calendar, FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-primary-900 text-primary-100 border-t border-primary-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* About Section */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-bold text-white tracking-wide">
              SHRI SIDDHIVINAYAK TRADING
            </h4>
            <p className="text-xs text-primary-200 leading-relaxed max-w-sm">
              Providing premium quality groceries, transparent prices, and reliable doorstep delivery to Panvel families. Serving the neighborhood with trust and freshness since 2007.
            </p>
            <div className="flex items-center gap-2 text-[10px] bg-primary-850 rounded-lg p-2.5 max-w-xs border border-primary-800">
              <FileText size={14} className="text-accent-500 shrink-0" />
              <span>
                FSSAI License: 11514024002414 <br />
                GSTIN: 27ABLFS6784R1ZV
              </span>
            </div>
          </div>

          {/* Timings & Delivery */}
          <div className="space-y-4">
            <h4 className="font-display text-base font-bold text-white tracking-wide">
              Working Hours & Delivery
            </h4>
            <ul className="space-y-3 text-xs text-primary-200">
              <li className="flex items-center gap-2">
                <Calendar size={15} className="text-accent-500 shrink-0" />
                <span>Monday - Sunday: 08:00 AM - 09:00 PM</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={15} className="text-accent-500 shrink-0" />
                <span>
                  Shop No. 4, Opp. Krishna Tower, <br />
                  Uran Naka, Panvel – 410206, Maharashtra
                </span>
              </li>
              {/*<li className="rounded-lg bg-emerald-950 px-3 py-1.5 inline-block text-[11px] font-bold text-emerald-400 border border-emerald-900">
                ⚡ Free Doorstep Delivery across Panvel (MVP Scope)
              </li>*/}
            </ul>
          </div>

          {/* Contact Support */}
          <div className="space-y-4">
            <h4 className="font-display text-base font-bold text-white tracking-wide">
              Contact Store Directly
            </h4>
            <p className="text-xs text-primary-200">
              Need assistance placing an order, checking stock, or arranging a return? Connect with Yatish or Manas:
            </p>
            <div className="flex flex-wrap gap-3">
              <a 
                href="tel:+918452921123" 
                className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-primary-900 hover:bg-gray-100 transition shadow-sm"
              >
                <Phone size={14} /> Call Store
              </a>
              <a 
                href="https://wa.me/918452921123" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-sm"
              >
                <MessageSquare size={14} /> WhatsApp Chat
              </a>
            </div>
          </div>

        </div>

        <div className="mt-12 border-t border-primary-850 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-primary-300">
          <p>© {new Date().getFullYear()} SHRI SIDDHIVINAYAK TRADING. All rights reserved.</p>
          <div className="flex gap-4 mt-2 sm:mt-0 font-medium">
            <Link to="/catalog" className="hover:text-white transition">Product Catalog</Link>
            <span className="text-primary-800">|</span>
            <Link to="/delivery/scan" className="hover:text-white transition">Rider Scanner</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
