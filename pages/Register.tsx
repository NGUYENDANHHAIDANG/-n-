import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockCheckEmail } from '../services/mockBackend';
import emailjs from '@emailjs/browser';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { register, isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isInitializing, navigate]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const emailExists = await mockCheckEmail(email);
      if (emailExists) {
        setError('Email is already in use.');
        setLoading(false);
        return;
      }

      // Generate a 6-digit OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        // Use EmailJS
        try {
          await emailjs.send(
            serviceId,
            templateId,
            {
              to_email: email,
              to_name: name,
              otp_code: newOtp,
              otp: newOtp,
              message: newOtp,
              reply_to: 'noreply@chatapp.com'
            },
            publicKey
          );
          setOtpSent(true);
          setSuccessMsg(`Mã OTP đã được gửi đến email ${email} của bạn!`);
        } catch (emailError) {
          console.error('EmailJS Error:', emailError);
          setError('Không thể gửi email OTP. Vui lòng kiểm tra cấu hình EmailJS.');
        }
      } else {
        // Fallback to backend API if EmailJS is not configured
        const response = await fetch('/api/auth/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: newOtp })
        });
        
        const data = await response.json();

        if (data.success) {
          setOtpSent(true);
          setSuccessMsg(`Mã OTP đã được gửi đến email ${email} của bạn!`);
        } else {
          setError(data.message || 'Failed to send OTP email.');
        }
      }
      
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (otp !== generatedOtp) {
      setError('Mã OTP không chính xác.');
      setLoading(false);
      return;
    }

    try {
      const success = await register(email, password, name);
      if (success) {
        navigate('/');
      } else {
        setError('Registration failed. Email might be in use.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="bg-messenger-surface p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-light text-white tracking-wide">Create Account</h1>
          <p className="text-gray-400 mt-3 text-sm tracking-wide uppercase">Join ChatApp today</p>
        </div>

        {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                {error}
            </div>
        )}

        {successMsg && (
            <div className="bg-green-500 bg-opacity-10 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                {successMsg}
            </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">Full Name</label>
                <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-messenger-primary focus:ring-1 focus:ring-messenger-primary transition-all"
                required
                />
            </div>
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
                className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3.5 rounded-lg transition-colors duration-200 disabled:opacity-50 mt-8"
            >
                {loading ? 'Sending OTP...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="space-y-6">
            <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-widest">Mã OTP</label>
                <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập mã 6 số"
                className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-messenger-primary focus:ring-1 focus:ring-messenger-primary transition-all text-center tracking-[0.5em] text-xl"
                maxLength={6}
                required
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-3.5 rounded-lg transition-colors duration-200 disabled:opacity-50 mt-8"
            >
                {loading ? 'Registering...' : 'Verify & Register'}
            </button>
            <button
                type="button"
                onClick={() => { setOtpSent(false); setSuccessMsg(''); setError(''); }}
                className="w-full bg-transparent hover:bg-gray-800 text-gray-400 font-semibold py-3.5 rounded-lg transition-colors duration-200 mt-2"
            >
                Back
            </button>
          </form>
        )}
        
        <div className="mt-8 text-center border-t border-gray-800 pt-6">
            <p className="text-gray-400 text-sm">Already have an account? <Link to="/login" className="text-white hover:text-messenger-primary transition-colors">Sign In</Link></p>
            
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

export default Register;