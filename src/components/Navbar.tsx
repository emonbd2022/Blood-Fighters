import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Droplet, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-red-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <Droplet className="h-8 w-8 fill-white" />
              <span className="font-bold text-xl tracking-tight">Blood Fighters</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/requests" className="hover:bg-red-700 px-3 py-2 rounded-md font-medium">Requests</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="hover:bg-red-700 px-3 py-2 rounded-md font-medium">Dashboard</Link>
                <button onClick={handleLogout} className="bg-white text-red-600 hover:bg-gray-100 px-4 py-2 rounded-md font-medium">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:bg-red-700 px-3 py-2 rounded-md font-medium">Login</Link>
                <Link to="/register" className="bg-white text-red-600 hover:bg-gray-100 px-4 py-2 rounded-md font-medium">
                  Register
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-gray-200">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-red-700">
            <Link to="/requests" className="block hover:bg-red-800 px-3 py-2 rounded-md font-medium">Requests</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="block hover:bg-red-800 px-3 py-2 rounded-md font-medium">Dashboard</Link>
                <button onClick={handleLogout} className="block w-full text-left hover:bg-red-800 px-3 py-2 rounded-md font-medium">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block hover:bg-red-800 px-3 py-2 rounded-md font-medium">Login</Link>
                <Link to="/register" className="block hover:bg-red-800 px-3 py-2 rounded-md font-medium">Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
