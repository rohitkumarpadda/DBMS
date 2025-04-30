import React,{useState,useEffect} from 'react';
import ReactDOM from 'react-dom';
import './AboutUs.css';
const AboutUs = () => {
    document.title = "Lost And Found | AboutUs";
    return (
      <>
        <header>
          <nav>
            <div id="aboutusnavbar">
              <div id="aboutusnavbar1">
                <img src="/iiitaLogo.png"></img>
                <h2>Lost & Found</h2>
              </div>
              <div id="aboutusnavbar2">
                <a href="/">Home</a>
                <a href='/SignUp'>Sign Up</a>
              </div>
            </div>
          </nav>
        </header>
        <section id="aboutussection1">
          <h1>About Lost & Found</h1>
          <p>
            Connecting people with their lost belongings through a streamlined,
            secure platform.
          </p>
        </section>
        <section id="aboutussection2">
          <div id="aboutussection2div1">
            <h1>Mission & Vision</h1>
            <div id="aboutussection2childdiv">
              <div>
                <h3>Mission</h3>
                <p>
                  Our mission is to create a seamless connection between
                  individuals who have lost items and those who have found them.
                  We aim to reduce the stress and inconvenience of losing
                  personal belongings by providing a centralized, user-friendly
                  platform that facilitates quick and secure item recovery.
                </p>
              </div>
              <div>
                <h3>Vision</h3>
                <p>
                  We envision a world where lost items consistently find their
                  way back to their rightful owners, fostering a community of
                  trust, cooperation, and mutual support. Our platform aims to
                  be the go-to solution for lost and found services, setting the
                  standard for efficiency, security, and user satisfaction.
                </p>
              </div>
            </div>
          </div>
          <div id="aboutussection2div2">
            <img src="About-Us.png"></img>
          </div>
        </section>
        <section id="aboutussection3">
          <h1>Our Story</h1>
          <div id="aboutussection3div1">
            <p>
              The Lost & Found platform was born out of a common frustration
              experienced by students at IIITA. The traditional method of
              sending mass emails about lost items was inefficient and often led
              to cluttered inboxes with no resolution.
            </p>
            <p>
              Recognizing this problem, a team of dedicated students and faculty
              members came together to develop a specialized platform that would
              streamline the process of reporting and recovering lost items on
              campus.
            </p>
            <p>
              Since our launch, we have successfully reunited hundreds of
              students with their lost belongings, from valuable electronics to
              cherished personal items. What started as a campus initiative has
              grown into a comprehensive platform that continues to evolve based
              on user feedback and technological advancements.
            </p>
            <p>
              Today, Lost & Found stands as a testament to innovation driven by
              real-world needs, offering a solution that brings peace of mind to
              our community members and strengthens the bonds of trust and
              cooperation within our institution.
            </p>
          </div>
        </section>
        <section id="aboutussection4">
          <h1>Privacy & Security</h1>
          <div id="aboutussection4div">
            <div>
              <h3>Data Protection</h3>
              <p>
                We implement industry-standard encryption protocols to protect
                all user data. Personal information is stored securely and is
                never shared with third parties without explicit consent.
              </p>
            </div>

            <div>
              <h3>Secure Communications</h3>
              <p>
                Our in-platform messaging system ensures that users can
                communicate without revealing personal contact information until
                they choose to do so.
              </p>
            </div>

            <div>
              <h3>Identity Verification</h3>
              <p>
                We verify user identities through institutional email addresses
                and additional verification steps to maintain a trusted
                community and prevent fraudulent claims.
              </p>
            </div>
          </div>
        </section>
        <section id="aboutussection5">
          <h1>Get in Touch</h1>
          <p>
            Have questions or suggestions? Our team is here to help. Reach out
            to us through any of the following channels.
          </p>
          <div id="aboutussection5div">
            <div>
              <img src="mail.svg"></img>
              <h4>Mail</h4>
              <p>Support@email.com</p>
            </div>
            <div>
              <img src="phone (1).svg"></img>
              <h4>Phone</h4>
              <p>8328501487</p>
            </div>
            <div>
              <img src="map-pin (1).svg"></img>
              <h4>Location</h4>
              <p>CC-3,IIITA</p>
            </div>
          </div>
        </section>
        <div id="aboutusbottom">
          &copy; 2025 Your Company Name. All rights reserved
        </div>
      </>
    );
}

export default AboutUs;
