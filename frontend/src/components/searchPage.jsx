import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchPage.css';

const SearchPage = () => {
	const [searchQuery, setSearchQuery] = useState('');
	const [category, setCategory] = useState('electronics');
	const [type, setType] = useState('all'); // New state for type filter
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [previewImage, setPreviewImage] = useState(null);
	const fileInputRef = useRef(null);
	const navigate = useNavigate();

	const handleSearch = async (e) => {
		e.preventDefault();

		if (!searchQuery.trim() && !fileInputRef.current?.files?.length) {
			setError('Please provide a search query or upload an image.');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const formData = new FormData();
			formData.append('description', searchQuery);
			formData.append('category', category);
			formData.append('type', type); // Include type in the request
			if (fileInputRef.current?.files?.length) {
				formData.append('image', fileInputRef.current.files[0]);
			}

			const response = await fetch('http://localhost:5000/api/unifiedSearch', {
				method: 'POST',
				body: formData,
				credentials: 'include',
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Search failed');
			}

			const data = await response.json();
			setResults(data);
		} catch (err) {
			console.error('Search error:', err);
			setError(err.message || 'Failed to perform search. Please try again.');
			setResults([]);
		} finally {
			setLoading(false);
		}
	};

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString();
	};

	return (
		<>
			<nav>
				<div id='aboutusnavbar'>
					<div id='aboutusnavbar1'>
						<img src='/iiitaLogo.png' alt='IIITA Logo' />
						<h2>Lost & Found</h2>
					</div>
					<div id='aboutusnavbar2'>
						<a href='/'>Home</a>
						<a href='/AboutUs'>About Us</a>
						<button id='homepagelogoutlink' onClick={() => navigate('/')}>
							Logout
						</button>
					</div>
				</div>
			</nav>
			<div className='search-page'>
				<div className='search-container'>
					<h2>Search for Lost or Found Items</h2>
					<form id='search-form' onSubmit={handleSearch}>
						<div className='search-input-container'>
							<input
								type='text'
								id='search-input'
								name='description'
								placeholder="Describe the item you're looking for..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							<select
								id='category'
								name='category'
								value={category}
								onChange={(e) => setCategory(e.target.value)}
							>
								<option value='electronics'>Electronics</option>
								<option value='documents'>Documents</option>
								<option value='clothing'>Clothing</option>
								<option value='others'>Others</option>
							</select>
							<select
								id='type'
								name='type'
								value={type}
								onChange={(e) => setType(e.target.value)}
							>
								<option value='all'>All</option>
								<option value='lost'>Lost</option>
								<option value='found'>Found</option>
							</select>
							<div className='file-input-container'>
								<input
									type='file'
									id='image-input'
									name='image'
									accept='image/*'
									onChange={(e) =>
										setPreviewImage(URL.createObjectURL(e.target.files[0]))
									}
									ref={fileInputRef}
								/>
								<label htmlFor='image-input' className='file-input-label'>
									Upload Image
								</label>
							</div>
							<button type='submit' id='search-button'>
								Search
							</button>
						</div>
					</form>
					{previewImage && (
						<div className='image-preview'>
							<img src={previewImage} alt='Preview' />
						</div>
					)}
				</div>

				<main className='search-results-container'>
					{loading ? (
						<div id='loading-indicator'>
							<div className='spinner'></div>
							<p>Loading items...</p>
						</div>
					) : error ? (
						<div className='error-message'>{error}</div>
					) : (
						<div className='search-results'>
							{results.length > 0 ? (
								results.map((item, index) => (
									<div
										key={index}
										className={`item-card ${item.type}-item`}
										data-type={item.type}
									>
										<div className='card-header'>
											<h3>
												{item.type === 'lost' ? 'Lost Item' : 'Found Item'}
											</h3>
											{item.combinedScore && (
												<span className='match-score'>
													{Math.round(item.combinedScore * 100)}% match
												</span>
											)}
										</div>
										<div className='card-image'>
											{item.image ? (
												<img
													src={`http://localhost:5000/${item.image}`}
													alt={item.item}
												/>
											) : (
												<div className='no-image'>No image available</div>
											)}
										</div>
										<div className='card-body'>
											<h4 className='item-title'>{item.item}</h4>
											<span className='item-category'>{item.category}</span>
											<p className='item-date'>
												{item.type === 'lost' ? 'Lost on' : 'Found on'}:{' '}
												{formatDate(item.date)}
											</p>
											<p className='item-contact'>
												<i className='fa fa-user'></i> {item.name}
											</p>
											<p className='item-contact'>
												<i className='fa fa-phone'></i> {item.contactNo}
											</p>
											<p className='item-description'>{item.description}</p>
										</div>
									</div>
								))
							) : (
								<div id='no-results-message'>
									<p>No matching items found. Please try a different search.</p>
								</div>
							)}
						</div>
					)}
				</main>
			</div>
			<div id='aboutusbottom'>
				&copy; 2025 Your Company Name. All rights reserved
			</div>
		</>
	);
};

export default SearchPage;
