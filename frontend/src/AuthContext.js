import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        fetch('/api/user')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Not logged in");
            })
            .then(data => {
                if (data.authenticated) {
                    setUser(data.user);
                }
            })
            .catch(() => {
                setUser(null);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const login = async (email, password) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            setUser(data.user);
            return true;
        }
        return false;
    };

    const register = async (name, email, password) => {
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (res.ok) {
                    return { success: true };
                }
                return { success: false, message: data.error || 'Registration failed' };
            } else {
                const text = await res.text();
                // Check if it looks like a proxy error or HTML
                console.error("Non-JSON response:", text);
                return { success: false, message: `Server returned non-JSON error: ${res.status} ${res.statusText}` };
            }
        } catch (e) {
            return { success: false, message: e.message };
        }
    };

    const verifyOtp = async (email, otp) => {
        try {
            const res = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const data = await res.json();
            if (res.ok) {
                return { success: true };
            }
            return { success: false, message: data.error || 'Verification failed' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    };

    const logout = async () => {
        await fetch('/api/logout', { method: 'POST' });
        setUser(null);
    };

    const forgotPassword = async (email) => {
        try {
            const res = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            return res.ok;
        } catch (error) {
            console.error("Forgot Password Error:", error);
            return false;
        }
    };

    const resetPassword = async (token, password) => {
        const res = await fetch(`/api/reset-password/${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return res.ok;
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOtp, logout, forgotPassword, resetPassword, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
