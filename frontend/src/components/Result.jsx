import { useEffect, useState } from 'react';

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
		setType(typeParam);

		fetch(
			`http://localhost:5000/api/searchItems?category=${category}&item=${item}&type=${typeParam}`,
			{
				credentials: 'include',
			}
		)
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
		<div>
			<h2>Search Results</h2>
			{message && <p>{message}</p>}
			{results.map((item, index) => {
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
					<div
						key={index}
						style={{
							border: '1px solid gray',
							margin: '20px',
							padding: '10px',
						}}
					>
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
							<strong>Date:</strong> {formattedDate}
						</p>
						<p>
							<strong>Description:</strong> {item.description}
						</p>
						{item.image && (
							<img
								src={`../backend/${item.image}`}
								alt='Uploaded'
								style={{ maxWidth: '200px' }}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}
