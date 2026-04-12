import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockGetAllUsers, mockDeleteUser, mockUpdateUserRole } from '../services/mockBackend';
import { User } from '../types';
import { Shield, Trash2, User as UserIcon, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchUsers = async () => {
      if (!user) return;
      const allUsers = await mockGetAllUsers(''); // Pass empty string to get ALL users including current if we want, but mockGetAllUsers filters out currentUserId. Let's pass empty string to get everyone else, or we can just fetch all.
      // Actually mockGetAllUsers(currentUserId) filters out the current user. Let's just use it.
      const fetchedUsers = await mockGetAllUsers(user.id);
      setUsers(fetchedUsers);
      setLoading(false);
    };

    fetchUsers();
  }, [user, navigate]);

  const handleDeleteUser = async (targetId: string) => {
    if (!user) return;
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      const success = await mockDeleteUser(user.id, targetId);
      if (success) {
        setUsers(users.filter(u => u.id !== targetId));
      } else {
        alert('Failed to delete user.');
      }
    }
  };

  const handleToggleRole = async (targetId: string, currentRole?: string) => {
    if (!user) return;
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      const success = await mockUpdateUserRole(user.id, targetId, newRole);
      if (success) {
        setUsers(users.map(u => u.id === targetId ? { ...u, role: newRole } : u));
      } else {
        alert('Failed to update user role.');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading Admin Panel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-red-500" />
            <div>
              <h1 className="text-3xl font-serif font-light tracking-wide">Admin Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Manage users and system permissions</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700 flex items-center gap-2"
          >
            <UserIcon className="w-4 h-4" />
            Back to Chat
          </button>
        </div>

        <div className="bg-messenger-surface border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900/50 border-b border-gray-800 text-xs uppercase tracking-wider text-gray-400">
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-gray-700" />
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-gray-500">ID: {u.id}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-300">{u.email}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {u.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleRole(u.id, u.role)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors border border-gray-700"
                        >
                          {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      No other users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
