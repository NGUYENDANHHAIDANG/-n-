import React from 'react';
import { User } from '../types';

interface OnlineUsersSidebarProps {
  onlineUsers: User[];
  onSelectUser: (userId: string) => void;
}

const OnlineUsersSidebar: React.FC<OnlineUsersSidebarProps> = ({ onlineUsers, onSelectUser }) => {
  return (
    <div className="w-64 bg-[#1c1c1d] border-l border-gray-800 h-full flex flex-col hidden lg:flex">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-white font-medium tracking-wide">Online Friends</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {onlineUsers.length === 0 ? (
          <div className="text-center text-gray-500 py-4 text-sm">No one is online</div>
        ) : (
          onlineUsers.map(user => (
            <div 
              key={user.id}
              onClick={() => onSelectUser(user.id)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors"
            >
              <div className="relative">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1c1c1d] rounded-full"></div>
              </div>
              <span className="text-white font-medium text-sm">{user.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OnlineUsersSidebar;
