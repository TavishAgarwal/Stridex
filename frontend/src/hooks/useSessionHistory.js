import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/siteConfig';

export default function useSessionHistory() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSessions = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${BACKEND_URL}/get-history`);
            setSessions(response.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const deleteSession = useCallback(async (session_id, timestamp) => {
        try {
            const params = { session_id };
            if (timestamp != null) params.timestamp = timestamp;
            await axios.delete(`${BACKEND_URL}/delete-session`, { params });
            // Optimistically remove from local state
            setSessions(prev =>
                prev.filter(s =>
                    !(s.session_id === session_id &&
                        (timestamp == null || Math.abs((s.timestamp || 0) - timestamp) < 1))
                ).reduce((acc, s, _, arr) => {
                    // Only remove the first match if no timestamp provided
                    if (timestamp == null && !acc.removed && s.session_id === session_id) {
                        acc.removed = true;
                        return acc;
                    }
                    acc.list.push(s);
                    return acc;
                }, { list: [], removed: false }).list
            );
            // Re-fetch to sync with server
            await fetchSessions();
        } catch (err) {
            console.error('Failed to delete session:', err);
            throw err;
        }
    }, [fetchSessions]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    return { sessions, loading, error, refetch: fetchSessions, deleteSession };
}
