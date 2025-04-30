import React from 'react';
import ReactDOM from 'react-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
	return (
		<>
			<h1 id='forgotpasswordheading'>Forgot Password</h1>
			<p id='forgotpasswordpara'>Don't worry you are almost their!</p>
			<form id='forgotpasswordform'>
				<label htmlFor='email'>Email :</label>
				<input type='email' id='email' name='email' required />
				<br></br>
				<button type='submit'>Send Otp</button>
			</form>
			<form id='forgotpasswordform2'>
				<p>Enter the OTP and New Password</p>
				<label htmlFor='otp'>Enter Otp:</label>
				<input type='text' id='otp' name='otp' required />
				<br></br>
				<label htmlFor='newpassword'>Password:</label>
				<input
					type='password'
					id='newpasswordhere'
					name='newpassword'
					required
				/>
				<br></br>
				<button type='submit'>Verify Otp</button>
			</form>
		</>
	);
};

export default ForgotPassword;
