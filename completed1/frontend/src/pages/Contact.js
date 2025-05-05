import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import "./Contact.css";
import contactImage from "./assets/contact-image.jpeg";

const Contact = () => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Form submission logic would go here
    alert("Your message has been submitted!");
    navigate("/");
  };

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="contact-title"
          >
            Get in <span className="text-gradient">Touch</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="contact-subtitle"
          >
            We'd love to hear from you about your recycling needs
          </motion.p>
        </div>
      </section>

      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb">
        <Link to="/">Home</Link>
      </nav>

      {/* Main Content */}
      <div className="contact-container">
        {/* Contact Form */}
        <motion.section 
          className="contact-form-section"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <h2 className="section-title">Send Us a Message</h2>
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                placeholder="Your name" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="your.email@example.com" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <select id="subject" name="subject" required>
                <option value="">Select a subject</option>
                <option value="recycling">Recycling Inquiry</option>
                <option value="partnership">Partnership Opportunity</option>
                <option value="technical">Technical Support</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="message">Your Message</label>
              <textarea 
                id="message" 
                name="message" 
                rows="6" 
                placeholder="How can we help you?" 
                required
              ></textarea>
            </div>
            
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="submit-button"
            >
              Send Message
            </motion.button>
          </form>
        </motion.section>

        {/* Contact Info */}
        <motion.section 
          className="contact-info-section"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="contact-info-card">
            <h3 className="info-title">Contact Information</h3>
            <p className="info-text">
              Have questions about our recycling services? Reach out through any of these channels:
            </p>
            
            <div className="info-item">
              <i className="fas fa-map-marker-alt"></i>
              <div>
                <h4>Our Location</h4>
                <p>123 Recycling Way, Maseru 100, Lesotho</p>
              </div>
            </div>
            
            <div className="info-item">
              <i className="fas fa-phone-alt"></i>
              <div>
                <h4>Phone Number</h4>
                <p>+266 1234 5678</p>
              </div>
            </div>
            
            <div className="info-item">
              <i className="fas fa-envelope"></i>
              <div>
                <h4>Email Address</h4>
                <p>contact@iwb-recycling.co.ls</p>
              </div>
            </div>
            
            <div className="info-item">
              <i className="fas fa-clock"></i>
              <div>
                <h4>Working Hours</h4>
                <p>Monday - Friday: 8:00 - 17:00</p>
                <p>Saturday: 9:00 - 13:00</p>
              </div>
            </div>
          </div>
          
          <div className="contact-image">
            <img src={contactImage} alt="IWB Recycling Facility" />
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Contact;