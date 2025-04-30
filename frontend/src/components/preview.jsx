import React, { useState } from 'react';
import './preview.css';

function Preview() {
  document.title = "Lost And Found | Preview";

  // State for login form visibility and password toggle
  const [loginformtoggle, setLoginformtoggle] = useState("eye (1).svg");
  const [loginformtype, setLoginformtype] = useState("password");
  const loginformblock = { display: "block" };
  const loginformnone = { display: "none" };
  const [loginformdisplay, setLoginformdisplay] = useState(loginformnone);

  // State for form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Toggle password visibility
  function loginformtogglefun() {
    if (loginformtoggle === "eye (1).svg") {
      setLoginformtoggle("eye-off (1).svg");
      setLoginformtype("text");
    } else {
      setLoginformtoggle("eye (1).svg");
      setLoginformtype("password");
    }
  }

  // Submit login form
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔐 Submitting login form...');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Request sent. Waiting for response...');
      const data = await response.json();
      console.log('📥 Response received:', data);

      if (response.ok && data.success) {
        console.log('✅ Login successful. Redirecting...');
        alert('Login successful');
        window.location.href = '/Home';
      } else {
        console.warn('❌ Login failed:', data.error || 'Unknown error');
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('🔥 Error during login request:', error);
      alert('Something went wrong. Check console for details.');
    }
  };

  return (
    <>
      <div id="loginformmaindiv" style={loginformdisplay}>
        <section id="loginformsection">
          <div id="loginformx">
            <img
              src="x.svg"
              alt="Close"
              onClick={() => setLoginformdisplay(loginformnone)}
            />
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <div>
              <img src="mail (2).svg" alt="email icon" />
              <input
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div id="loginformpassword">
              <img src="lock.svg" alt="lock icon" />
              <input
                type={loginformtype}
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <img
                src={loginformtoggle}
                alt="toggle password visibility"
                onClick={loginformtogglefun}
              />
            </div>

            <div id="loginformabtn">
              <a href="/ForgotPassword">Forgot Password?</a>
              <button type="submit">Sign In</button>
            </div>

            <p>
              Don't Have An Account? <a href="/SignUp">Sign Up</a>
            </p>
          </form>
        </section>
      </div>

      <header>
        <nav>
          <div id="previewnavbar">
            <div id="previewnavbar1">
              <img src="/iiitaLogo.png" alt="IIITA logo" />
              <h2>Lost & Found</h2>
            </div>
            <div id="previewnavbar2">
              <a href="/AboutUs">About Us</a>
              <a onClick={() => setLoginformdisplay(loginformblock)}>Login</a>
            </div>
          </div>
        </nav>
      </header>

      <section id="previewloginform"></section>

      <section id="previewsection1">
        <div id="previewsection1div1">
          <h4>Welcome to IIITA Lost & Found</h4>
          <h1>
            Lost doesn't mean forever: Reuniting you with what you've lost
          </h1>
          <p>
            No more waiting for your emails to be answered and an end to the
            mails spam-o-war. Unite with your lost items in just a few clicks!
          </p>
          <button>Get Started</button>
        </div>
        <div id="previewsection1div2">
          <img src="LostFoundImg2.webp" alt="Lost and Found" />
        </div>
      </section>

      <section id="previewsection2">
        <h1>How It Works?</h1>
        <p>In three steps</p>
        <div id="previewsection2div1">
          <img src="1.svg" alt="step 1" />
          <img src="2.svg" alt="step 2" />
          <img src="3.svg" alt="step 3" />
        </div>

        <h1>Why Lost & Found</h1>
        <div id="previewsection2div2">
          {[
            "Lost something? Found something? you can post the details of the lost/found items with ease",
            "No need to spam emails that nobody reads everafter!",
            "Normalised because Lost and Found is made for the sole purpose of finding the lost items.",
            "If bulk quantity of items are lost, Lost&Found helps you find your lost items faster than you can imagine!",
            "Easy to connect with users that have Found/Lost something.",
          ].map((text, index) => (
            <div className="previewsection2points" key={index}>
              <img src="square-check.svg" alt="check icon" />
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div id="previewparentdiv">
        <div id="previewdiv1">
          <h1>Ready to meet up with your long lost things?</h1>
          <button>Get Started</button>
        </div>
      </div>

      <div id="previewparentdiv1">
        <div id="previewdiv2">
          <img src="facebook.svg" alt="facebook" />
          <img src="instagram.svg" alt="instagram" />
          <img src="twitter.svg" alt="twitter" />
        </div>
      </div>

      <div id="previewbottom">
        &copy; 2025 IIITA LOST AND FOUND. All rights reserved
      </div>
    </>
  );
}

export default Preview;
