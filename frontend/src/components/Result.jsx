import { useEffect, useState } from 'react';
import './result.css';

export default function Result() {
	const [results, setResults] = useState([]);
	const [type, setType] = useState('');
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const category = params.get('category');
		const item = params.get('item');
		const typeParam = params.get('type');
		const description = params.get('description') || ''; // Optional
		const imageId = params.get('imageId') || ''; // Optional
		setType(typeParam);

		// Construct the API URL with all query parameters
		const apiUrl = `http://localhost:5000/api/searchItems?category=${category}&item=${item}&type=${typeParam}&description=${description}&imageId=${imageId}`;

		fetch(apiUrl, {
			credentials: 'include',
		})
			.then((res) => res.json())
			.then((data) => {
				setLoading(false);
				console.log(data);
				if (data.length === 0) {
					if (typeParam === 'lost') {
						setMessage(
							"Oops! No items found. Your report is saved. We'll notify you if found."
						);
					} else if (typeParam === 'found') {
						setMessage('No found items match your search. Try again later.');
					} else {
						setMessage('No results found.');
					}
				} else {
					setResults(data);
				}
			})
			.catch((err) => {
				setLoading(false);
				setMessage('Error fetching results.');
				console.error(err);
			});
	}, []);

	if (loading) return <p>Loading...</p>;

	return (
		<div className='results-container'>
			<header>
				<nav>
					<div id='aboutusnavbar'>
						<div id='aboutusnavbar1'>
							<img src='/iiitaLogo.png' alt='Logo' />
							<h2>Lost & Found</h2>
						</div>
						<div id='aboutusnavbar2'>
							<a href='/Home'>Home</a>
							<a href='/AboutUs'>About Us</a>
						</div>
					</div>
				</nav>
			</header>
			<div className='results-header'>
				<h2>Search Results</h2>
				<p>Search query: {type}</p>
				<p>Found {results.length} matching items</p>
			</div>
			<div className='results-buttons'>
				<button onClick={() => (window.location.href = '/Home')}>
					Back to Dashboard
				</button>
				<button onClick={() => (window.location.href = '/search')}>
					New Search
				</button>
			</div>
			<div className='results-items'>
				{results.length === 0 ? (
					<p className='no-items'>{message}</p>
				) : (
					results.map((item, index) => {
						const date = item.date ? new Date(item.date) : null;
						const formattedDate =
							date && !isNaN(date)
								? `${date.getDate().toString().padStart(2, '0')}-${(
										date.getMonth() + 1
								  )
										.toString()
										.padStart(2, '0')}-${date.getFullYear()}`
								: 'Not Mentioned';

						return (
							<div className='result-item' key={index}>
								<h3>{type === 'lost' ? 'Lost Item' : 'Found Item'}</h3>
								<img
									src={`http://localhost:5000/${item.image}`}
									alt='Uploaded' className='img-cont'
								/>
								<p>
									<strong>Reported By:</strong> {item.name}
								</p>
								<p>
									<strong>Contact No:</strong> {item.contactNo}
								</p>
								<p>
									<strong>Email:</strong> {item.userEmail}
								</p>
								<p>
									<strong>Category:</strong> {item.category}
								</p>
								<p>
									<strong>Item:</strong> {item.item}
								</p>
								<p>
									<strong>{type === 'lost' ? 'Lost on' : 'Found on'}:</strong>{' '}
									{formattedDate}
								</p>
								<p>{item.description}</p>
								<button className='notify-btn'>Notify</button>
							</div>
						);
					})
				)}
			</div>
			<div id='footter'>&copy; IIITA LOST AND FOUND. All rights reserved</div>
		</div>
	);
}
