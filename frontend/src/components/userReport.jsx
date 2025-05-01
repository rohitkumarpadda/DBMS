import { useEffect, useState } from 'react';
import './result.css';

export default function ViewReports() {
	document.title = 'Lost And Found | Report';
	const [lostItems, setLostItems] = useState([]);
	const [foundItems, setFoundItems] = useState([]);
	const [type, setType] = useState('');
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const typeParam = params.get('type');
		setType(typeParam);

		fetch(`http://localhost:5000/api/userReports`, {
			credentials: 'include',
		})
			.then((res) => res.json())
			.then((data) => {
				setLoading(false);
				console.log(data);

				// Handle the API response structure
				if (data.lostItems && Array.isArray(data.lostItems)) {
					setLostItems(data.lostItems);
				}
				if (data.foundItems && Array.isArray(data.foundItems)) {
					setFoundItems(data.foundItems);
				}

				// Set a message if both arrays are empty
				if (
					(!data.lostItems || data.lostItems.length === 0) &&
					(!data.foundItems || data.foundItems.length === 0)
				) {
					setMessage('No reports found.');
				}
			})
			.catch((err) => {
				setLoading(false);
				setMessage('Error fetching reports.');
				console.error(err);
			});
	}, []);

	// Function to handle resolving an item
	const handleResolve = (id, type) => {
		fetch(`http://localhost:5000/api/resolveItem`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ id, type }),
			credentials: 'include',
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success) {
					alert(data.message);
					// Move the resolved item to the end of the list
					if (type === 'lost') {
						setLostItems((prev) => {
							const item = prev.find((item) => item.id === id);
							return [
								...prev.filter((item) => item.id !== id),
								{ ...item, resolved: !item.resolved },
							];
						});
					} else if (type === 'found') {
						setFoundItems((prev) => {
							const item = prev.find((item) => item.id === id);
							return [
								...prev.filter((item) => item.id !== id),
								{ ...item, resolved: !item.resolved },
							];
						});
					}
				} else {
					alert('Failed to resolve the item.');
				}
			})
			.catch((err) => {
				console.error('Error resolving item:', err);
				alert('An error occurred while resolving the item.');
			});
	};

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
				<h2>User Reports</h2>
				<p>Search query: {type}</p>
				<p>
					Found {lostItems.length} lost items and {foundItems.length} found
					items
				</p>
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
				{lostItems.length === 0 && foundItems.length === 0 ? (
					<p className='no-items'>{message}</p>
				) : (
					<>
						{lostItems.map((item, index) => {
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
								<div className='result-item' key={`lost-${index}`}>
									<h3>Lost Item</h3>
									<div id='result-itemmaindiv'>
										<img src={`../backend/${item.image}`} alt='Uploaded' />
									</div>
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
										<strong>Location:</strong> {item.location}
									</p>
									<p>
										<strong>Lost on:</strong> {formattedDate}
									</p>
									<p>{item.description}</p>
									<button
										id='resolve-button'
										onClick={() => handleResolve(item.id, 'lost')}
									>
										Resolve
									</button>
								</div>
							);
						})}
						{foundItems.map((item, index) => {
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
								<div className='result-item' key={`found-${index}`}>
									<h3>Found Item</h3>
									<img
										src={`http://localhost:5000/${item.image}`}
										alt='Uploaded'
										className='img-cont'
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
										<strong>Found on:</strong> {formattedDate}
									</p>
									<p>{item.description}</p>
									<button
										id='resolve-button'
										onClick={() => handleResolve(item.id, 'found')}
									>
										Resolve
									</button>
								</div>
							);
						})}
					</>
				)}
			</div>
		</div>
	);
}
