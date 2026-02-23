import { useState, useCallback } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config/siteConfig';

export default function useVideoAnalysis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    const analyze = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('--- UPLOAD DEBUG ---');
            console.log('File type:', file.type);
            console.log('File size:', file.size);
            console.log('File name:', file.name);
            console.log('FormData has file:', formData.has('file'));
            console.log('FormData raw entries:', Array.from(formData.entries()));

            const response = await axios.post(`${BACKEND_URL}/analyze-video-enhanced`, formData, {
                onUploadProgress: (e) => {
                    if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
                },
            });

            setData(response.data);
            return response.data;
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || 'Analysis failed.';
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setProgress(0);
    }, []);

    return { analyze, data, loading, error, progress, reset };
}
