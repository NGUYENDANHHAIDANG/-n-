import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isInitializing, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-messenger-surface p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-light text-white tracking-wide">Welcome</h1>
          <p className="text-gray-400 mt-3 text-sm tracking-wide uppercase">Sign in to continue</p>
        </div>

        {error && (
          <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">Email / Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-messenger-primary focus:ring-1 focus:ring-messenger-primary transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-messenger-primary focus:ring-1 focus:ring-messenger-primary transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3.5 rounded-lg transition-colors duration-200 disabled:opacity-50 flex justify-center items-center mt-8"
          >
            {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-8 text-center border-t border-gray-800 pt-6">
            <p className="text-gray-400 text-sm">Don't have an account? <Link to="/register" className="text-white hover:text-messenger-primary transition-colors">Register</Link></p>
            
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="mt-6 text-xs text-gray-600 hover:text-red-500 transition-colors"
            >
              [Dev] Xóa toàn bộ dữ liệu (Reset Database)
            </button>
        </div>
      </div>
    </div>
  );
};

export default Login;