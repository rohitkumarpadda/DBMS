import React, { useState } from 'react';
import './ForgotPassword.css';

const ForgotPassword = () => {
	const [otpSent, setOtpSent] = useState(false);
	const [email, setEmail] = useState('');
	const [otp, setOtp] = useState('');
	const [newPassword, setNewPassword] = useState('');

	const handleSendOtp = async (e) => {
		e.preventDefault();
		try {
			const response = await fetch(
				'http://localhost:5000/api/forgot-password',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ email }),
				}
			);
			const data = await response.json();
			if (response.ok) {
				alert('OTP sent to your email!');
				setOtpSent(true); // Show the second form after OTP is sent
			} else {
				alert(data.error || 'Error sending OTP.');
			}
		} catch (error) {
			console.error('Error sending OTP:', error);
			alert('Something went wrong. Please try again.');
		}
	};

	const handleVerifyOtp = async (e) => {
		e.preventDefault();
		try {
			const response = await fetch('http://localhost:5000/api/reset-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, otp, newPassword }),
			});
			const data = await response.json();
			if (response.ok) {
				alert('Password reset successfully!');
				window.location.href = '/';
			} else {
				alert(data.error || 'Error verifying OTP.');
			}
		} catch (error) {
			console.error('Error verifying OTP:', error);
			alert('Something went wrong. Please try again.');
		}
	};

	return (
		<>
			<h1 id='forgotpasswordheading'>Forgot Password</h1>
			<p id='forgotpasswordpara'>Don't worry you are almost there!</p>
			{!otpSent ? (
				<form id='forgotpasswordform' onSubmit={handleSendOtp}>
					<label htmlFor='email'>Email :</label>
					<input
						type='email'
						id='email'
						name='email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
					<br />
					<button type='submit'>Send OTP</button>
				</form>
			) : (
				<form id='forgotpasswordform2' onSubmit={handleVerifyOtp}>
					<p>Enter the OTP and New Password</p>
					<label htmlFor='otp'>Enter OTP:</label>
					<input
						type='text'
						id='otp'
						name='otp'
						value={otp}
						onChange={(e) => setOtp(e.target.value)}
						required
					/>
					<br />
					<label htmlFor='newpassword'>Password:</label>
					<input
						type='password'
						id='newpasswordhere'
						name='newpassword'
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						required
					/>
					<br />
					<button type='submit'>Verify OTP</button>
				</form>
			)}
		</>
	);
};

export default ForgotPassword;
