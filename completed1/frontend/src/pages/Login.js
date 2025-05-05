import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("sales");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [show2FAModal, setShow2FAModal] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [tempUser, setTempUser] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await axios.post("http://localhost:5000/login", { 
                email, 
                password, 
                role 
            });

            if (res.data.requires2FA) {
                setTempToken(res.data.tempToken);
                setTempUser(res.data.user);
                setShow2FAModal(true);
                return;
            }

            // Store all user data
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            localStorage.setItem("userRole", res.data.user.role);
            localStorage.setItem("userId", res.data.user.id);

            redirectUser(res.data.user.role);
        } catch (error) {
            console.error("Login Error:", error);
            setError(error.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await axios.post("http://localhost:5000/login/verify-2fa", {
                tempToken,
                token: verificationCode
            });

            // Store all user data
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            localStorage.setItem("userRole", res.data.user.role);
            localStorage.setItem("userId", res.data.user.id);

            setShow2FAModal(false);
            redirectUser(res.data.user.role);
        } catch (error) {
            console.error("2FA Verification Error:", error);
            setError(error.response?.data?.message || "Verification failed. Please check your code.");
        } finally {
            setLoading(false);
        }
    };

    const redirectUser = (userRole) => {
        switch (userRole) {
            case "sales":
                navigate("/sales");
                break;
            case "finance":
                navigate("/income-statement");
                break;
            case "developer":
                navigate("/developer");
                break;
            case "investor":
                navigate("/investor-dashboard");
                break;
            case "client":
                navigate("/clientqueryform");
                break;
            case "primary_partner": 
                navigate("/primary-partner");
                break;
            default:
                navigate("/");
        }
    };

    return (
        <div className="iwb-login-portal">
            {show2FAModal && (
                <div className="iwb-verification-modal">
                    <div className="iwb-verification-content">
                        <h3>Two-Factor Authentication</h3>
                        <p>We've sent a 6-digit verification code to your email address. Please enter it below:</p>
                        
                        {error && <div className="iwb-login-error">{error}</div>}
                        
                        <form onSubmit={handle2FASubmit}>
                            <div className="iwb-input-group">
                                <label htmlFor="verificationCode">Verification Code</label>
                                <input
                                    type="text"
                                    id="verificationCode"
                                    placeholder="Enter 6-digit code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    required
                                />
                            </div>
                            
                            <button 
                                className="iwb-login-button" 
                                type="submit" 
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="iwb-button-loading">
                                        <span className="iwb-spinner"></span>
                                        Verifying...
                                    </span>
                                ) : (
                                    "Verify"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="iwb-login-container">
                <div className="iwb-login-left"></div>

                <div className="iwb-login-right">
                    <div className="iwb-login-header">
                        <div className="iwb-logo-placeholder"></div>
                        <h2 className="iwb-login-title">IWB Portal Login</h2>
                        <p className="iwb-login-subtitle">Secure access to your workspace</p>
                    </div>
                    
                    {error && !show2FAModal && <div className="iwb-login-error">{error}</div>}
                    
                    <form className="iwb-login-form" onSubmit={handleLogin}>
                        <div className="iwb-input-group">
                            <label htmlFor="email">Email</label>
                            <input 
                                type="email"
                                id="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="iwb-input-group">
                            <label htmlFor="password">Password</label>
                            <input 
                                type="password"
                                id="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="iwb-input-group">
                            <label htmlFor="role">Role</label>
                            <select 
                                id="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                required
                            >
                                <option value="sales">Sales Personnel</option>
                                <option value="finance">Finance Personnel</option>
                                <option value="developer">Developer</option>
                                <option value="investor">Investor</option>
                                <option value="client">Client</option>
                                <option value="primary_partner">Primary Partner (IWC)</option>
                            </select>
                        </div>

                        <button 
                            className="iwb-login-button" 
                            type="submit" 
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="iwb-button-loading">
                                    <span className="iwb-spinner"></span>
                                    Authenticating...
                                </span>
                            ) : (
                                "Login"
                            )}
                        </button>
                    </form>

                    <div className="iwb-login-footer">
                        <p>
                            Don't have an account? <Link to="/register">Register here</Link>
                        </p>
                        <p>
                            <Link to="/">← Return to Home</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;