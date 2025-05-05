import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SystemConfiguration = () => {
    const [config, setConfig] = useState({
        apiEndpoints: [],
        dbSchema: {},
        serverStatus: {}
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/system-config')
            .then(res => {
                setConfig(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching config:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div>Loading system configuration...</div>;

    return (
        <div className="system-config">
            <h2>System Configuration</h2>
            
            <div className="config-section">
                <h3>API Endpoints</h3>
                <ul>
                    {config.apiEndpoints.map(endpoint => (
                        <li key={endpoint.path}>
                            <strong>{endpoint.method}</strong> {endpoint.path}
                            <span> - {endpoint.description}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="config-section">
                <h3>Database Schema</h3>
                <pre>{JSON.stringify(config.dbSchema, null, 2)}</pre>
            </div>
            
            <div className="config-section">
                <h3>Server Status</h3>
                <div>
                    <p>Memory: {config.serverStatus.memory}% used</p>
                    <p>CPU: {config.serverStatus.cpu}% load</p>
                    <p>Uptime: {config.serverStatus.uptime}</p>
                </div>
            </div>
        </div>
    );
};

export default SystemConfiguration;