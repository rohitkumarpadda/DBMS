import React from 'react';
import './SignUp.css'; // Make sure file name matches

 

const SignUp = () => {
  document.title = "Lost And Found | Sign Up";
  return (
    <>
      <header>
        <nav>
          <div id="signupnavbar">
            <div id="signupnavbar1">
              <img src="/iiitaLogo.png" alt="IIITA Logo" />
              <h2>Lost & Found</h2>
            </div>
            <div id="signupnavbar2">
              <a href="/AboutUs">About Us</a>
              <a href="/">Preview</a>
            </div>
          </div>
        </nav>
      </header>
      <section id="signupsectionmain">
        <img src="LostFoundImg.webp" id="signupmainimg"></img>
        <section id="signupsection">
          <h1>Create An Account</h1>
          <p>Join Lost & Found to report and recover lost items</p>
          <form>
            <label htmlFor="fullname">Full Name</label>
            <div>
              <img src="user (2).svg"></img>
              <input type="text" id="fullname" name="fullname" required></input>
            </div>

            <label htmlFor="email">Email</label>
            <div>
              <img src="mail (2).svg"></img>
              <input type="email" id="email" name="email" required></input>
            </div>

            <label htmlFor="setpassword">Set Password</label>
            <div>
              <img src="lock.svg"></img>
              <input
                type="password"
                id="setpassword"
                name="setpassword"
                required
              ></input>
            </div>

            <label htmlFor="confirmpassword">Confirm Password</label>
            <div>
              <img src="lock.svg"></img>
              <input
                type="password"
                id="confirmpassword"
                name="confirmpassword"
                required
              ></input>
            </div>
            <button type="submit">Create Account</button>
            <p>
              Already Have An Account ? <a href="/">Login</a>
            </p>
          </form>
        </section>
      </section>
    </>
  );
};

export default SignUp;
