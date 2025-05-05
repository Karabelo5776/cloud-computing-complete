import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Product from "./pages/Product";
import Sales from "./pages/Sales";
import IncomeStatement from "./pages/IncomeStatement";
import InvestorDashboard from "./pages/InvestorDashboard";
import ClientQueries from "./pages/ClientQueries";
import ClientQueryForm from "./pages/ClientQueryForm";
import QueryManagement from "./pages/QueryManagement";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import OnlineOrders from "./pages/OnlineOrders";
import ClientPurchase from "./pages/ClientPurchase";
import ClientQuery from "./pages/ClientQuery";
import PrimaryPartnerDashboard from "./pages/PrimaryPartnerDashboard"; 
import ProductCatalog from "./pages/ProductCatalog";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contact = lazy(() => import("./pages/Contact"));
//const ProductCatalog = lazy(() => import("./pages/ProductCatalog"));

function App() {
    return (
        <Router>
            <Navbar />
            <Suspense fallback={<div>Loading...</div>}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={
                        <PrivateRoute allowedRoles={["developer", "sales", "finance", "investor", "client", "primary-partner"]}>
                            <Dashboard />
                        </PrivateRoute>
                    } />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/product-catalog" element={<ProductCatalog />} />
                    <Route path="/products" element={
                        <PrivateRoute allowedRoles={["developer", "sales"]}>
                            <Product />
                        </PrivateRoute>
                    } />
                    <Route path="/sales" element={
                        <PrivateRoute allowedRoles={["developer", "sales"]}>
                            <Sales />
                        </PrivateRoute>
                    } />
                    <Route path="/orders" element={
                        <PrivateRoute allowedRoles={["developer", "sales"]}>
                            <OnlineOrders />
                        </PrivateRoute>
                    } />
                    <Route path="/clientqueryform" element={
                        <PrivateRoute allowedRoles={["developer", "client"]}>
                            <ClientQueryForm />
                        </PrivateRoute>
                    } />
                    <Route path="/income-statement" element={
                        <PrivateRoute allowedRoles={["developer", "finance", "investor", "primary-partner"]}>
                            <IncomeStatement />
                        </PrivateRoute>
                    } />
                    <Route path="/investor-dashboard" element={
                        <PrivateRoute allowedRoles={["developer", "investor"]}>
                            <InvestorDashboard />
                        </PrivateRoute>
                    } />
                    <Route path="/client-queries" element={
                        <PrivateRoute allowedRoles={["developer", "client"]}>
                            <ClientQueries />
                        </PrivateRoute>
                    } />
                    <Route path="/queries" element={
                        <PrivateRoute allowedRoles={["developer", "sales"]}>
                            <QueryManagement />
                        </PrivateRoute>
                    } />
                    <Route path="/developer" element={
                        <PrivateRoute allowedRoles={["developer"]}>
                            <DeveloperDashboard />
                        </PrivateRoute>
                    } />
                    <Route path="/clientpurchase" element={
                        <PrivateRoute allowedRoles={["client"]}>
                            <ClientPurchase />
                        </PrivateRoute>
                    } />

                    <Route path="/clientquery" element={
                        <PrivateRoute allowedRoles={["client"]}>
                            <ClientQuery />
                        </PrivateRoute>
                    } />
                    {/* New Primary Partner Dashboard Route */}
                    <Route path="/primary-partner" element={
                        <PrivateRoute allowedRoles={["primary-partner"]}>
                            <PrimaryPartnerDashboard />
                        </PrivateRoute>
                    } />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;