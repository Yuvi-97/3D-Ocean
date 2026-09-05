import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBell } from 'react-icons/fa';
import logoImage from '../../Assets/logo.png';

const Header = () => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [dropdownVisible, setDropdownVisible] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentDateTime(new Date()), 60000);
    return () => clearInterval(intervalId);
  }, []);

  const formatDateTime = (date) => {
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit' };
    return `${date.toLocaleDateString([], optionsDate)} ${date.toLocaleTimeString([], optionsTime)}`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-gray-100 px-8 py-3 font-['Roboto'] shadow-sm">
      {/* Left Section */}
      <div className="flex items-center">
        <img src={logoImage} alt="Logo" className="w-[59px] h-[69px] mr-3 pl-2" />
        <div>
          <h1 className="text-lg font-bold text-gray-800 leading-tight">INCOIS 3D Ocean Visualizer</h1>
          <p className="text-[11px] text-teal-700 font-medium">MoES Ocean Data Platform</p>
        </div>
      </div>

      {/* Center Navigation */}
      <nav className="flex-1 flex justify-center">
        <ul className="flex gap-6 list-none">
          {[
            { to: '/', label: 'Dashboard' },
            { to: '/explorer', label: '3D Explorer' },
            { to: '/observations', label: 'Observations' },
            { to: '/comparison', label: 'Model vs Observation' },
            { to: '/alerts', label: 'Alerts & Forecasts' },
            { to: '/analytics', label: 'Analytics & Reports' },
            { to: '/data', label: 'Data Catalog' },
            { to: '/about', label: 'About' },
          ].map(({ to, label }) => (
            <Link
              key={label}
              to={to}
              className="relative text-teal-600 font-medium text-sm transition-all duration-300 hover:text-teal-700 hover:-translate-y-0.5 pb-1
              before:content-[''] before:absolute before:w-0 before:h-[2px] before:bg-teal-600 before:bottom-[-4px] before:left-0 before:transition-all hover:before:w-full"
            >
              {label}
            </Link>
          ))}
        </ul>
      </nav>

      {/* Right Section */}
      <div className="flex items-center space-x-6">
        <p className="text-gray-700 font-semibold text-sm tracking-wide">{formatDateTime(currentDateTime)}</p>

        {/* Notification Dropdown */}
        <div className="relative">
          <FaBell
            onClick={() => setDropdownVisible(!dropdownVisible)}
            className="text-black text-xl cursor-pointer hover:text-teal-600 transition-colors"
          />
          {dropdownVisible && (
            <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-md shadow-lg w-48 flex flex-col py-2 z-50">
              <Link
                to="/alerts"
                className="px-3 py-2 text-gray-700 hover:bg-teal-600 hover:text-white transition-colors text-sm"
              >
                Marine Hazard Alerts
              </Link>
              <Link
                to="/observations"
                className="px-3 py-2 text-gray-700 hover:bg-teal-600 hover:text-white transition-colors text-sm"
              >
                In-Situ Instrument Feeds
              </Link>
              <Link
                to="/about"
                className="px-3 py-2 text-gray-700 hover:bg-teal-600 hover:text-white transition-colors text-sm"
              >
                About INCOIS Project
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
