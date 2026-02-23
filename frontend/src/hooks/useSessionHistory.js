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

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    return { sessions, loading, error, refetch: fetchSessions };
}
