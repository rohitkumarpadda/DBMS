import React, { useState } from 'react';
import './SignUp.css';

const SignUp = () => {
	document.title = 'Lost And Found | Sign Up';

	const [formData, setFormData] = useState({
		fullname: '',
		email: '',
		setpassword: '',
		confirmpassword: '',
	});

	const [message, setMessage] = useState('');

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData({ ...formData, [name]: value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const response = await fetch('http://localhost:5000/api/signup', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(formData),
			});

			const data = await response.json();
			if (response.ok) {
				setMessage('Account created successfully! Redirecting to Home...');
				setTimeout(() => {
					window.location.href = '/Home';
				}, 2000);
			} else {
				setMessage(data.error || 'Error creating account');
			}
		} catch (error) {
			console.error('Error:', error);
			setMessage('Something went wrong. Please try again.');
		}
	};

	return (
		<>
			<header>
				<nav>
					<div id='signupnavbar'>
						<div id='signupnavbar1'>
							<img src='/iiitaLogo.png' alt='IIITA Logo' />
							<h2>Lost & Found</h2>
						</div>
						<div id='signupnavbar2'>
							<a href='/AboutUs'>About Us</a>
							<a href='/'>Preview</a>
						</div>
					</div>
				</nav>
			</header>
			<section id='signupsectionmain'>
				<img src='LostFoundImg.webp' id='signupmainimg' alt='Lost and Found' />
				<section id='signupsection'>
					<h1>Create An Account</h1>
					<p>Join Lost & Found to report and recover lost items</p>
					<form onSubmit={handleSubmit}>
						<label htmlFor='fullname'>Full Name</label>
						<div>
							<img src='user (2).svg' alt='User Icon' />
							<input
								type='text'
								id='fullname'
								name='fullname'
								value={formData.fullname}
								onChange={handleChange}
								required
							/>
						</div>

						<label htmlFor='email'>Email</label>
						<div>
							<img src='mail (2).svg' alt='Mail Icon' />
							<input
								type='email'
								id='email'
								name='email'
								value={formData.email}
								onChange={handleChange}
								required
							/>
						</div>

						<label htmlFor='setpassword'>Set Password</label>
						<div>
							<img src='lock.svg' alt='Lock Icon' />
							<input
								type='password'
								id='setpassword'
								name='setpassword'
								value={formData.setpassword}
								onChange={handleChange}
								required
							/>
						</div>

						<label htmlFor='confirmpassword'>Confirm Password</label>
						<div>
							<img src='lock.svg' alt='Lock Icon' />
							<input
								type='password'
								id='confirmpassword'
								name='confirmpassword'
								value={formData.confirmpassword}
								onChange={handleChange}
								required
							/>
						</div>
						<button type='submit'>Create Account</button>
						{message && <p>{message}</p>}
						<p>
							Already Have An Account? <a href='/'>Login</a>
						</p>
					</form>
				</section>
			</section>
		</>
	);
};

export default SignUp;
