import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { motion } from "framer-motion";
import recyclingHero from "./assets/recycling-hero.jpeg";
import ramImage from "./assets/ram-chips.jpeg";
import hddImage from "./assets/hard-drives.jpeg";
import motherboardImage from "./assets/motherboard.jpeg";
import recyclingVideo from "./assets/recycling-process.mp4";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

const Home = ({ isLoggedIn }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const images = [recyclingHero, ramImage, hddImage, motherboardImage];
    images.forEach((img) => new Image().src = img);
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="video-overlay"></div>
        <video autoPlay loop muted playsInline className="hero-video">
          <source src={recyclingVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="hero-content">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="hero-title"
          >
            Transforming <span className="text-gradient">E-Waste</span> Into Value
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="hero-subtitle"
          >
            Pioneering electronic recycling solutions in Southern Africa
          </motion.p>

          <div className="hero-buttons">
          <motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="primary-button"
  onClick={() => navigate("/product-catalog")} 
>
  Browse Products
</motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="secondary-button"
              onClick={() => navigate("/contact")}
            >
              Contact Us
            </motion.button>
          </div>
        </div>
      </section>

      {/* Navigation Bar */}
      <nav className="main-nav">
        <div className="nav-logo">IWB</div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#services">Services</a>
          <a href="#products">Products</a>
          
        </div>
        <div className="nav-buttons">
          <button onClick={() => navigate("/login")} className="login-button">Login</button>
          <button onClick={() => navigate("/register")} className="register-button">Register</button>
        </div>
      </nav>

      {/* About Section */}
      <motion.section
        id="about"
        className="about-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <motion.div className="about-content" variants={itemVariants}>
          <h2 className="section-title">
            <span className="highlight">Sustainable</span> Technology Solutions
          </h2>
          <p className="section-text">
            Founded in 2024 with a capital of M100,000, IWB has rapidly become a leader in
            electronic waste recycling across Southern Africa. Under the visionary leadership
            of Co-Founders Kenneth and Shadrack, we're revolutionizing how technology is
            repurposed and reused.
          </p>
        </motion.div>

        <motion.div className="about-stats" variants={itemVariants}>
          <div className="stat-card">
            <h3>100,000+</h3>
            <p>Components Recycled</p>
          </div>
          <div className="stat-card">
            <h3>50+</h3>
            <p>Corporate Clients</p>
          </div>
          <div className="stat-card">
            <h3>100%</h3>
            <p>Data Security</p>
          </div>
        </motion.div>
      </motion.section>

      {/* Materials We Recycle */}
      <section className="materials-section">
        <h2 className="section-title center">
          Components We <span className="highlight">Recycle</span>
        </h2>

        <div className="materials-grid">
          <motion.div whileHover={{ y: -10 }} className="material-card">
            <div className="material-image-container">
              <img src={ramImage} alt="RAM Components" />
            </div>
            <h3>RAM Components</h3>
            <p>Secure recycling of memory modules with precious metal recovery</p>
          </motion.div>

          <motion.div whileHover={{ y: -10 }} className="material-card">
            <div className="material-image-container">
              <img src={hddImage} alt="Hard Drives" />
            </div>
            <h3>Hard Drives</h3>
            <p>Complete data destruction and material reclamation</p>
          </motion.div>

          <motion.div whileHover={{ y: -10 }} className="material-card">
            <div className="material-image-container">
              <img src={motherboardImage} alt="Motherboard Components" />
            </div>
            <h3>Motherboard Components</h3>
            <p>Specialized processing of complex circuit boards</p>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <motion.section
        id="services"
        className="services-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <motion.div className="services-header" variants={itemVariants}>
          <h2 className="section-title">
            Our <span className="highlight">Services</span>
          </h2>
          <p className="section-subtitle">
            Comprehensive solutions for your electronic waste needs
          </p>
        </motion.div>

        <div className="services-grid">
          <motion.div className="service-card" variants={itemVariants}>
            <div className="service-icon">
              <i className="fas fa-recycle"></i>
            </div>
            <h3>Component Recycling</h3>
            <p>
              Environmentally responsible processing of all computer components with
              maximum material recovery and minimal waste.
            </p>
          </motion.div>

          <motion.div className="service-card" variants={itemVariants}>
            <div className="service-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3>Secure Data Destruction</h3>
            <p>
              Military-grade data wiping and physical destruction of storage media
              with certificate of destruction provided.
            </p>
          </motion.div>

          <motion.div className="service-card" variants={itemVariants}>
            <div className="service-icon">
              <i className="fas fa-truck"></i>
            </div>
            <h3>Collection Services</h3>
            <p>
              Convenient pickup services for businesses and institutions with bulk
              electronic waste disposal needs.
            </p>
          </motion.div>

          <motion.div className="service-card" variants={itemVariants}>
            <div className="service-icon">
              <i className="fas fa-certificate"></i>
            </div>
            <h3>Certified Processing</h3>
            <p>
              Fully documented recycling process meeting all international
              environmental and data security standards.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Responsibly Recycle Your Electronics?</h2>
          <p>
            Join hundreds of businesses and individuals who trust IWB with their
            electronic waste management needs.
          </p>
          <button
            className="cta-button"
            onClick={() => navigate("/contact")}
          >
            Get Started Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-about">
            <h3>IWB Recycling</h3>
            <p>
              Leading electronic recycling solutions in Southern Africa since 2024.
              Transforming e-waste into value through innovation and responsibility.
            </p>
          </div>
          <div className="footer-links">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#products">Products</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-contact">
            <h3>Contact Us</h3>
            <p>info@iwb-recycling.co.ls</p>
            <p>+266 1234 5678</p>
            <p>Maseru, Lesotho</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} IWB Recycling. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
