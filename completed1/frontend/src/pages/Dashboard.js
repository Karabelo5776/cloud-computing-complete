import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        axios.get("http://localhost:5000/profile", { headers: { Authorization: `Bearer ${token}` } })
            .then(res => setUser(res.data))
            .catch(() => navigate("/login"));
    }, [navigate]);

    if (!user) return <p>Loading...</p>;

    return (
        <div>
            <h2>Welcome, {user.name}</h2>
            <p>Role: {user.role}</p>
            {user.role === "sales" && <button onClick={() => navigate("/sales")}>View Sales</button>}
            {user.role === "finance" && <button onClick={() => navigate("/income")}>View Income Statement</button>}
            {user.role === "developer" && <button onClick={() => navigate("/developer")}>Manage System</button>}
        </div>
    );
};

export default Dashboard;
