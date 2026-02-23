import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/siteConfig';

export default function useFrameAnalysis() {
    const [latestResult, setLatestResult] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [latency, setLatency] = useState(0);
    const sessionIdRef = useRef(`session_${Date.now()}`);

    const analyzeFrame = useCallback(async (imageBlob, sessionId) => {
        const start = performance.now();
        try {
            const formData = new FormData();
            formData.append('file', imageBlob, 'frame.jpg');
            formData.append('session_id', sessionId || sessionIdRef.current);

            const response = await axios.post(`${BACKEND_URL}/analyze-frame`, formData, {
                timeout: 5000,
            });

            setLatency(Math.round(performance.now() - start));
            setIsConnected(true);
            setLatestResult(response.data);
            return response.data;
        } catch (err) {
            setIsConnected(false);
            return null;
        }
    }, []);

    const resetSession = useCallback(() => {
        sessionIdRef.current = `session_${Date.now()}`;
        setLatestResult(null);
        setLatency(0);
    }, []);

    return { analyzeFrame, latestResult, isConnected, latency, sessionId: sessionIdRef.current, resetSession };
}
