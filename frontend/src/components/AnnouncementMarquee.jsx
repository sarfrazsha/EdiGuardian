import React, { useEffect, useState } from 'react';

const AnnouncementMarquee = ({ role }) => {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        if (!role || role.toLowerCase() === 'admin') return;

        const fetchAnnouncements = () => {
            fetch(`http://localhost:8080/api/announcements?role=${role.toLowerCase()}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setAnnouncements(data);
                })
                .catch(err => console.error('Marquee fetch error:', err));
        };

        fetchAnnouncements();
        // Refresh every 60 seconds so new announcements show up without page reload
        const interval = setInterval(fetchAnnouncements, 60000);
        return () => clearInterval(interval);
    }, [role]);

    if (!announcements.length || !role || role.toLowerCase() === 'admin') return null;

    // Build a single scrolling string from all announcements
    const marqueeText = announcements
        .map(a => `📢 ${a.title}: ${a.content}`)
        .join('     ⭐     ');

    return (
        <div style={styles.wrapper}>
            <span style={styles.label}>📣 LIVE</span>
            <div style={styles.marqueeContainer}>
                <div style={styles.marqueeTrack}>
                    <span style={styles.text}>{marqueeText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{marqueeText}</span>
                </div>
            </div>

            <style>{`
                @keyframes marqueeScroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .marquee-track {
                    animation: marqueeScroll 30s linear infinite;
                    white-space: nowrap;
                    display: inline-block;
                }
                .marquee-track:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};

const styles = {
    wrapper: {
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(90deg, #1a237e 0%, #283593 100%)',
        color: '#fff',
        padding: '6px 0',
        fontSize: '0.85rem',
        fontWeight: '500',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        letterSpacing: '0.01em',
    },
    label: {
        background: '#e53935',
        color: '#fff',
        fontWeight: '700',
        fontSize: '0.75rem',
        padding: '3px 10px',
        borderRadius: '0 20px 20px 0',
        marginRight: '16px',
        flexShrink: 0,
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
    },
    marqueeContainer: {
        overflow: 'hidden',
        flex: 1,
    },
    marqueeTrack: {
        animation: 'marqueeScroll 30s linear infinite',
        whiteSpace: 'nowrap',
        display: 'inline-block',
    },
    text: {
        color: '#e3f2fd',
    },
};

// Apply class for hover pause (inline style animation-play-state doesn't work with :hover)
// We use a wrapper div with the class
const AnnouncementMarqueeWrapper = ({ role }) => {
    const [announcements, setAnnouncements] = useState([]);

    useEffect(() => {
        if (!role || role.toLowerCase() === 'admin') return;

        const fetchAnnouncements = () => {
            fetch(`http://localhost:8080/api/announcements?role=${role.toLowerCase()}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setAnnouncements(data);
                })
                .catch(err => console.error('Marquee fetch error:', err));
        };

        fetchAnnouncements();
        const interval = setInterval(fetchAnnouncements, 60000);
        return () => clearInterval(interval);
    }, [role]);

    if (!announcements.length || !role || role.toLowerCase() === 'admin') return null;

    const marqueeText = announcements
        .map(a => `📢 ${a.title}: ${a.content}`)
        .join('          ⭐          ');

    return (
        <>
            <style>{`
                @keyframes marqueeScroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .announcement-marquee-track {
                    animation: marqueeScroll 35s linear infinite;
                    white-space: nowrap;
                    display: inline-block;
                }
                .announcement-marquee-track:hover {
                    animation-play-state: paused;
                    cursor: default;
                }
            `}</style>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(90deg, #1a237e 0%, #283593 100%)',
                color: '#fff',
                padding: '7px 0',
                fontSize: '0.84rem',
                fontWeight: '500',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(26,35,126,0.25)',
                letterSpacing: '0.01em',
                zIndex: 999,
                position: 'relative',
            }}>
                <span style={{
                    background: '#e53935',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.72rem',
                    padding: '3px 12px',
                    borderRadius: '0 20px 20px 0',
                    marginRight: '16px',
                    flexShrink: 0,
                    letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                }}>
                    📣 Notice
                </span>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                    <div className="announcement-marquee-track">
                        <span style={{ color: '#e3f2fd' }}>
                            {marqueeText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{marqueeText}
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AnnouncementMarqueeWrapper;
