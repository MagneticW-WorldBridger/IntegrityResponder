import React, { useEffect, useState } from 'react';

interface Conversation {
  id: string;
  guest_name: string;
  last_message: string;
  last_message_at: string;
  status: string;
  is_read: boolean;
  message_count: number;
  automated_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: string;
  created_at: string;
  is_automated: boolean;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [botStates, setBotStates] = useState<Record<string, boolean>>({});

  const fetchConversations = async () => {
    try {
      console.log('Fetching conversations...');
      const res = await fetch('/api/inbox');
      const data = await res.json();
      console.log('Conversations received:', data);
      if (Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      } else {
        console.error('Received invalid conversations data:', data);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/inbox/${conversationId}/messages`);
      const data = await res.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/inbox/${conversationId}/read`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const fetchBotStates = async () => {
    try {
      const promises = conversations.map(async (conv) => {
        const res = await fetch(`/api/bot/status?conversationId=${conv.id}`);
        const data = await res.json();
        return { id: conv.id, isActive: data.is_active };
      });

      const states = await Promise.all(promises);
      const statesObject = states.reduce((acc, { id, isActive }) => ({
        ...acc,
        [id]: isActive
      }), {});

      setBotStates(statesObject);
    } catch (error) {
      console.error('Error fetching bot states:', error);
    }
  };

  const handleToggleBot = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const res = await fetch('/api/bot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });
      
      const data = await res.json();
      setBotStates(prev => ({
        ...prev,
        [conversationId]: data.is_active
      }));
    } catch (error) {
      console.error('Error toggling bot:', error);
    }
  };

  useEffect(() => {
    console.log('Initial useEffect running');
    fetchConversations();
    const interval = setInterval(fetchConversations, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    fetchMessages(selectedConversation);
    const interval = setInterval(() => {
      fetchMessages(selectedConversation);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedConversation]);

  useEffect(() => {
    if (conversations.length > 0) {
      fetchBotStates();
    }
  }, [conversations]);

  console.log('Render state:', { loading, conversationsLength: conversations?.length || 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-lg font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6">
        <div className="flex bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            </div>
            <div className="divide-y divide-gray-200 overflow-y-auto" style={{maxHeight: 'calc(100vh - 10rem)'}}>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv.id);
                    fetchMessages(conv.id);
                    if (!conv.is_read) markAsRead(conv.id);
                  }}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150
                    ${!conv.is_read ? 'bg-blue-50' : 'bg-white'}
                    ${selectedConversation === conv.id ? 'border-l-4 border-blue-500' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900">{conv.guest_name}</h3>
                    <button
                      onClick={(e) => handleToggleBot(conv.id, e)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
                        ${botStates[conv.id] 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                    >
                      Bot {botStates[conv.id] ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{conv.last_message}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <span>Messages: {conv.message_count}</span>
                    <span className="text-gray-300">•</span>
                    <span>Auto: {conv.automated_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="w-2/3 flex flex-col">
            {selectedConversation ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{maxHeight: 'calc(100vh - 8rem)'}}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'fromGuest' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xl rounded-lg p-4 ${
                        msg.sender_type === 'fromGuest'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className={`text-xs mt-1 ${
                        msg.sender_type === 'fromGuest' ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {new Date(msg.created_at).toLocaleString()}
                        {msg.is_automated && ' • Bot'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}