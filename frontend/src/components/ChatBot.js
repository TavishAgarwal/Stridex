import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/siteConfig';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hey! 👋 I\'m **StrideX AI**, your sports biomechanics assistant. Ask me anything about injury prevention, movement analysis, or training optimization!' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isOpen]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg = { role: 'user', content: input.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post(`${BACKEND_URL}/chat`, {
                messages: newMessages.filter(m => m.role !== 'system'),
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t connect to the server. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatMessage = (text) => {
        // Simple markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(6,182,212,0.15);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
            .replace(/\n- /g, '\n• ')
            .replace(/\n/g, '<br/>');
    };

    // Styles
    const s = {
        // Floating button
        fab: {
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(6,182,212,0.4)', transition: 'all 0.3s',
            fontSize: '24px', color: '#fff',
        },
        // Small dialog
        dialog: {
            position: 'fixed', bottom: '90px', right: '24px', zIndex: 9998,
            width: '380px', height: '500px',
            background: '#0f172a', borderRadius: '16px', overflow: 'hidden',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.3s ease-out',
        },
        // Full-screen overlay
        fullScreen: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998,
            background: '#0f172a',
            display: 'flex', flexDirection: 'column',
        },
        // Header
        header: {
            background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.05))',
            padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(148,163,184,0.15)', flexShrink: 0,
        },
        headerTitle: {
            display: 'flex', alignItems: 'center', gap: '10px',
        },
        titleText: { color: '#f1f5f9', fontWeight: 700, fontSize: '15px', margin: 0 },
        subtitle: { color: '#94a3b8', fontSize: '11px', margin: 0 },
        // Messages area
        messagesArea: {
            flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
        },
        // Message bubbles
        userBubble: {
            alignSelf: 'flex-end', maxWidth: '80%', background: 'rgba(6,182,212,0.2)',
            border: '1px solid rgba(6,182,212,0.3)', borderRadius: '14px 14px 4px 14px',
            padding: '10px 14px', color: '#e0f2fe', fontSize: '13px', lineHeight: '1.5',
        },
        aiBubble: {
            alignSelf: 'flex-start', maxWidth: '85%', background: 'rgba(30,41,59,0.8)',
            border: '1px solid rgba(148,163,184,0.15)', borderRadius: '14px 14px 14px 4px',
            padding: '10px 14px', color: '#e2e8f0', fontSize: '13px', lineHeight: '1.5',
        },
        // Input area
        inputArea: {
            padding: '12px 16px', borderTop: '1px solid rgba(148,163,184,0.15)',
            display: 'flex', gap: '8px', flexShrink: 0, background: 'rgba(15,23,42,0.9)',
        },
        input: {
            flex: 1, background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(148,163,184,0.2)',
            borderRadius: '10px', padding: '10px 14px', color: '#f1f5f9', fontSize: '13px',
            outline: 'none', resize: 'none', fontFamily: 'inherit',
        },
        sendBtn: {
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: 'none',
            borderRadius: '10px', padding: '10px 16px', cursor: 'pointer',
            color: '#fff', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap',
            opacity: 1, transition: 'opacity 0.2s',
        },
        // Header buttons
        iconBtn: {
            background: 'rgba(148,163,184,0.15)', border: 'none', borderRadius: '8px',
            padding: '6px 8px', cursor: 'pointer', color: '#94a3b8', fontSize: '14px',
            transition: 'all 0.2s',
        },
    };

    const containerStyle = isFullScreen ? s.fullScreen : s.dialog;

    const quickPrompts = [
        '🦵 How to fix knee valgus?',
        '🏃 Best warm-up routine?',
        '⚡ Reduce injury risk tips',
        '💪 Core strengthening exercises',
    ];

    return (
        <>
            {/* CSS animation */}
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                .stridex-chat-scroll::-webkit-scrollbar { width: 4px; }
                .stridex-chat-scroll::-webkit-scrollbar-track { background: transparent; }
                .stridex-chat-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 4px; }
            `}</style>

            {/* Floating Action Button */}
            {!isFullScreen && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ ...s.fab, transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)', animation: !isOpen ? 'pulse 2s infinite' : 'none' }}
                    title="Chat with StrideX AI"
                >
                    {isOpen ? '✕' : '💬'}
                </button>
            )}

            {/* Chat Dialog */}
            {isOpen && (
                <div style={containerStyle}>
                    {/* Header */}
                    <div style={s.header}>
                        <div style={s.headerTitle}>
                            <span style={{ fontSize: '22px' }}>🤖</span>
                            <div>
                                <p style={s.titleText}>StrideX AI</p>
                                <p style={s.subtitle}>Sport Science Assistant</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setIsFullScreen(!isFullScreen)}
                                style={s.iconBtn} title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}>
                                {isFullScreen ? '⊖' : '⊕'}
                            </button>
                            <button onClick={() => { setIsOpen(false); setIsFullScreen(false); }}
                                style={s.iconBtn} title="Close">✕</button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="stridex-chat-scroll" style={s.messagesArea}>
                        {messages.map((msg, i) => (
                            <div key={i} style={msg.role === 'user' ? s.userBubble : s.aiBubble}>
                                {msg.role === 'assistant' && (
                                    <span style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>🤖 StrideX AI</span>
                                )}
                                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                            </div>
                        ))}
                        {isLoading && (
                            <div style={s.aiBubble}>
                                <span style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>🤖 StrideX AI</span>
                                <span style={{ color: '#94a3b8' }}>Thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />

                        {/* Quick prompts (show only if 1 message) */}
                        {messages.length <= 1 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                {quickPrompts.map((p, i) => (
                                    <button key={i} onClick={() => { setInput(p); }}
                                        style={{
                                            background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
                                            borderRadius: '20px', padding: '6px 12px', color: '#67e8f9',
                                            fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s',
                                        }}>{p}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div style={s.inputArea}>
                        <textarea ref={inputRef}
                            value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about biomechanics, exercises, training..."
                            rows={1}
                            style={s.input}
                        />
                        <button onClick={sendMessage} disabled={isLoading || !input.trim()}
                            style={{ ...s.sendBtn, opacity: isLoading || !input.trim() ? 0.4 : 1, cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer' }}>
                            Send
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatBot;
