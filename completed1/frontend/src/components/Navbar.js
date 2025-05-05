import React from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = ({ isLoggedIn, onLogout }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout(); 
        navigate("/"); 
    };

    return (
        <nav style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: "#333", color: "white" }}>
            <div>
                
            </div>
          
        </nav>
    );
};

export default Navbar;