import { useState } from 'react';
import './report.css';

export default function ReportForm1() {
	document.title = 'Lost And Found | Found Report';

	const [formData, setFormData] = useState({
		name: '',
		mobileNo: '',
		category: 'electronics',
		item: '',
		dateFound: '',
		description: '',
		image: null,
	});

	const handleChange = (e) => {
		const { name, value, type, files } = e.target;
		setFormData({
			...formData,
			[name]: type === 'file' ? files[0] : value,
		});
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		const formDataObj = new FormData();
		formDataObj.append('Name', formData.name);
		formDataObj.append('ContactNo', formData.mobileNo);
		formDataObj.append('category', formData.category);
		formDataObj.append('Item', formData.item);
		formDataObj.append('DateFound', formData.dateFound);
		formDataObj.append('Description', formData.description);
		if (formData.image) {
			formDataObj.append('Image', formData.image);
		}

		try {
			const response = await fetch('http://localhost:5000/api/reportFound', {
				method: 'POST',
				body: formDataObj,
				credentials: 'include', // Ensures cookies (like session) are sent
			});

			const data = await response.json();
			if (response.ok) {
				alert('Item reported successfully!');
				window.location.href = data.redirect;
			} else {
				alert(data.error || 'Error reporting item.');
			}
		} catch (error) {
			console.error(error);
			alert('Error reporting item.');
		}
	};

	return (
		<div className='form-page'>
			<header>
				<nav>
					<div id='aboutusnavbar'>
						<div id='aboutusnavbar1'>
							<img src='/iiitaLogo.png' alt='IIITA Logo' />
							<h2>Lost & Found</h2>
						</div>
						<div id='aboutusnavbar2'>
							<a href='/Home'>Home</a>
							<a href='/AboutUs'>About Us</a>
						</div>
					</div>
				</nav>
			</header>
			<div className='form'>
				<div className='form-header'>
					<h1 className='form-header-title'>Great! You found something?</h1>
					<p className='form-header-subtitle'>Report the Found Item here</p>
				</div>

				<div className='form-cont'>
					<div className='form-cont-img-cont'>
						<img
							src='RegistrationImage.avif'
							id='reportformimg'
							alt='Lost Item'
						/>
					</div>
					<div className='form-contents'>
						<h2 className='form-title'>Report the Found Item here</h2>
						<form className='lost-item-form' onSubmit={handleSubmit}>
							<label className='form-label'>
								Name:
								<input
									type='text'
									name='name'
									placeholder='Your Name Here'
									className='form-input'
									value={formData.name}
									onChange={handleChange}
								/>
							</label>
							<label className='form-label'>
								Mobile No.:
								<input
									type='text'
									name='mobileNo'
									placeholder='Enter Mobile No.'
									className='form-input'
									value={formData.mobileNo}
									onChange={handleChange}
								/>
							</label>
							<label className='form-label'>
								Select category:
								<select
									name='category'
									className='form-input'
									value={formData.category}
									onChange={handleChange}
								>
									<option value='electronics'>Electronics</option>
									<option value='documents'>Documents</option>
									<option value='clothing'>Clothing</option>
									<option value='others'>Others</option>
								</select>
							</label>
							<label className='form-label'>
								Item:
								<input
									type='text'
									name='item'
									placeholder='Enter Found Item'
									className='form-input'
									value={formData.item}
									onChange={handleChange}
								/>
							</label>
							<label className='form-label'>
								When the Item was found:
								<input
									type='date'
									name='dateFound'
									className='form-input'
									value={formData.dateFound}
									onChange={handleChange}
								/>
							</label>
							<label className='form-label'>
								About Found Item:
								<textarea
									name='description'
									placeholder='Give a short description about the found item'
									className='form-textarea'
									value={formData.description}
									onChange={handleChange}
								></textarea>
							</label>
							<label className='form-label'>
								Upload an Image of Found Item:
								<input
									type='file'
									name='image'
									className='form-input'
									onChange={handleChange}
								/>
							</label>
							<button type='submit' className='form-submit-button'>
								Submit
							</button>
						</form>
					</div>
				</div>
			</div>

			<div id='aboutusbottom'>
				&copy; IIITA LOST AND FOUND. All rights reserved
			</div>
		</div>
	);
}
