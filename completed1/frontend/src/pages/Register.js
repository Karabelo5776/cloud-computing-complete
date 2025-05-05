import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import './Register.css';

const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("sales");
    const [loading, setLoading] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const validatePassword = (password) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return "Password must be at least 8 characters long";
        }
        if (!hasUpperCase) {
            return "Password must contain at least one uppercase letter";
        }
        if (!hasLowerCase) {
            return "Password must contain at least one lowercase letter";
        }
        if (!hasNumbers) {
            return "Password must contain at least one number";
        }
        if (!hasSpecialChars) {
            return "Password must contain at least one special character";
        }
        return "";
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        
        const error = validatePassword(password);
        if (error) {
            setPasswordError(error);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post("http://localhost:5000/register", { 
                name, 
                email, 
                password, 
                role
            });
            alert(response.data.message || "Registration successful!");
            navigate("/login");
        } catch (error) {
            console.error("Registration Error:", error.response?.data || error.message);
            setError(error.response?.data?.message || "Registration failed!");
        }
        setLoading(false);
    };

    return (
        <div className="iwb-register-page-container">
            <div className="iwb-register-content">
                <div className="iwb-register-image"></div>
                <div className="iwb-register-form-container">
                    <form className="iwb-register-form-box" onSubmit={handleRegister}>
                        <h2 className="iwb-register-title">Create Your Account</h2>

                        {error && <div className="iwb-register-error">{error}</div>}

                        <input 
                            type="text" 
                            className="iwb-register-input iwb-register-name" 
                            placeholder="Full Name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                        />

                        <input 
                            type="email" 
                            className="iwb-register-input iwb-register-email" 
                            placeholder="Email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />

                        <div className="iwb-password-input-container">
                            <input 
                                type="password" 
                                className={`iwb-register-input iwb-register-password ${passwordError ? 'iwb-error' : ''}`}
                                placeholder="Password" 
                                value={password} 
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordError(validatePassword(e.target.value));
                                }}
                                required 
                            />
                            {passwordError && (
                                <div className="iwb-password-error">{passwordError}</div>
                            )}
                            <div className="iwb-password-hints">
                                Password must contain:
                                <ul>
                                    <li className={password.length >= 8 ? 'iwb-valid' : ''}>8+ characters</li>
                                    <li className={/[A-Z]/.test(password) ? 'iwb-valid' : ''}>Uppercase letter</li>
                                    <li className={/[a-z]/.test(password) ? 'iwb-valid' : ''}>Lowercase letter</li>
                                    <li className={/\d/.test(password) ? 'iwb-valid' : ''}>Number</li>
                                    <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'iwb-valid' : ''}>Special character</li>
                                </ul>
                            </div>
                        </div>

                        <select 
                            className="iwb-register-select" 
                            value={role} 
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="sales">Sales</option>
                            <option value="finance">Finance</option>
                            <option value="developer">Developer</option>
                            <option value="investor">Investor</option>
                            <option value="client">Client</option>
                            <option value="primary_partner">Primary Partner (IWC)</option>
                        </select>

                        <button 
                            type="submit" 
                            className={`iwb-register-button ${loading ? 'iwb-loading' : ''}`}
                            disabled={loading || passwordError}
                        >
                            {loading ? "Registering..." : "Register"}
                        </button>

                        <p className="iwb-register-footer">
                            Already have an account? <Link className="iwb-register-link" to="/login">Login</Link>
                        </p>
                        <p className="iwb-register-footer">
                            <Link className="iwb-register-link-home" to="/">← Return Home</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;