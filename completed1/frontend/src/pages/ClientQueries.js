import React, { useState, useEffect } from "react";
import axios from "axios";

const ClientQueries = () => {
  const [queries, setQueries] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [loading, setLoading] = useState(false);  // To track loading state

  // Set Axios base URL globally (useful for all API calls)
  const axiosInstance = axios.create({
    baseURL: "http://localhost:5000/",
  });

  useEffect(() => {
    fetchQueries();
  }, []);

  const fetchQueries = async () => {
    try {
      setLoading(true); // Start loading
      const res = await axiosInstance.get("queries");
      setQueries(res.data);
    } catch (err) {
      console.error("Error fetching queries:", err);
    } finally {
      setLoading(false); // End loading
    }
  };

  const submitQuery = async () => {
    if (!name || !email || !message) {
      alert("Please fill in all the fields");
      return;
    }

    try {
      setLoading(true);
      const res = await axiosInstance.post("queries", { name, email, message });
      alert(res.data.message);
      setName("");
      setEmail("");
      setMessage("");
      fetchQueries();
    } catch (err) {
      console.error("Error submitting query:", err);
      alert("Failed to submit query");
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = async () => {
    if (!selectedQuery || !response) return;
    try {
      setLoading(true);
      await axiosInstance.put(`queries/${selectedQuery.id}`, { response });
      alert("Response updated successfully!");
      setResponse("");
      setSelectedQuery(null);
      fetchQueries();
    } catch (err) {
      console.error("Error updating response:", err);
      alert("Failed to update response");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {/* Submit Query Form */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-4">
        <h2 className="text-xl font-bold mb-2">Submit a Query</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          className="w-full p-2 border border-gray-300 rounded mb-2"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
          className="w-full p-2 border border-gray-300 rounded mb-2"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Your Message"
          className="w-full p-2 border border-gray-300 rounded mb-2"
        />
        <button
          onClick={submitQuery}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={loading} // Disable button when loading
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>

      {/* Query Table */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <h2 className="text-xl font-bold mb-2">Client Queries</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Name</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Message</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Response</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((query) => (
                <tr key={query.id} className="border">
                  <td className="border p-2">{query.customer_name}</td>
                  <td className="border p-2">{query.customer_email}</td>
                  <td className="border p-2">{query.message}</td>
                  <td className="border p-2">{query.status}</td>
                  <td className="border p-2">
                    {query.auto_reply || "No response yet"}
                  </td>
                  <td className="border p-2">
                    {query.status === "pending" && (
                      <button
                        onClick={() => setSelectedQuery(query)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        Respond
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Response Form */}
      {selectedQuery && (
        <div className="bg-white shadow-md rounded-lg p-4 mt-4">
          <h2 className="text-xl font-bold mb-2">Respond to Query</h2>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response..."
            className="w-full p-2 border border-gray-300 rounded mb-2"
          />
          <button
            onClick={updateResponse}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Updating..." : "Send Response"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientQueries;
