import { Link, useNavigate } from 'react-router-dom';
import { CiSearch } from 'react-icons/ci';

import './home.css';

function Home() {
	document.title = 'Lost And Found | Home';

	const navigate = useNavigate();

	const handleLogout = async () => {
		try {
			const response = await fetch('http://localhost:5000/api/logout', {
				method: 'GET',
				credentials: 'include',
			});
			const data = await response.json();
			if (response.ok && data.success) {
				alert('Logged out successfully!');
				navigate('/'); // Redirect to the homepage
			} else {
				alert(data.error || 'Error logging out');
			}
		} catch (error) {
			console.error('Error during logout:', error);
			alert('Something went wrong. Please try again.');
		}
	};

	return (
		<div className='home-container'>
			<header>
				<nav>
					<div id='aboutusnavbar'>
						<div id='aboutusnavbar1'>
							<img src='/iiitaLogo.png' alt='IIITA Logo' />
							<h2>Lost & Found</h2>
						</div>
						<div className='search-container'>
							<div className='search-bar'>
								<input
									type='text'
									placeholder='Search for lost items...'
									className='search-input'
								/>
								<button className='search-icon'>
									<CiSearch size={20} />
								</button>
							</div>
						</div>
						<div id='aboutusnavbar2'>
							<a href='/ViewReports'>Reports</a>
							<a href='/AboutUs'>About Us</a>
							<button id='homepagelogoutlink' onClick={handleLogout}>
								<img src='log-out (1).svg' id='homepagelogout' alt='Logout' />
							</button>
						</div>
					</div>
				</nav>
			</header>
			<main className='main-content'>
				<section className='hero-section'>
					<div className='section-container flex-row'>
						<div className='hero-text'>
							<h1 className='hero-heading'>
								Hate that sinking feeling when you realize you've lost
								something? Us too!
							</h1>
							<p className='hero-description'>
								Let us help you turn that sinking feeling into a sigh of relief.
								Our team meticulously works to help locate you in finding what
								you've misplaced, quickly and efficiently. Whether it's your
								Keys, wallet, or something more precious, we've got you covered.
								Our dedicated team is here to help.
							</p>
						</div>
						<div className='hero-image'>
							<img src='LostNFoundQuoteImg.png' />
						</div>
					</div>
				</section>

				<section
					className='lost-section'
					style={{ backgroundColor: 'rgb(218,218,218)' }}
				>
					<div className='section-container flex-row'>
						<div className='lost-image'>
							<img src='report-lost.webp' />
						</div>
						<div className='lost-text'>
							<h2 className='section-heading'>Lost??? No Worries!!!</h2>
							<p className='section-description'>
								Just click on the button and report the lost item. We will find
								it for you...
							</p>
							<div>
								<button
									className='found-button'
									onClick={() => {
										window.location.href = '/ReportForm';
									}}
								>
									Report
								</button>
							</div>
						</div>
					</div>
				</section>

				<section className='found-section'>
					<div className='section-container flex-row'>
						<div className='found-text'>
							<h2 className='section-heading text-dark'>
								Found an Item!!! You have done a great job
							</h2>
							<p className='section-description text-dark'>
								Where the journey of a lost item transforms into the joy of its
								rediscovery, turning strangers into saviors and moments of
								despair into stories of hope. Just click on the button and
								report the found item.
							</p>
							<div>
								<button className='found-button' onClick={() => {
										window.location.href = '/ReportForm';
									}}>Report</button>
							</div>
						</div>
						<div className='found-image'>
							<img src='report-found.webp' />
						</div>
					</div>
				</section>
			</main>
			<div id='previewparentdiv1'>
				<div id='previewdiv2'>
					<img src='facebook.svg' className='img-logo'></img>
					<img src='instagram.svg' className='img-logo'></img>
					<img src='twitter.svg' className='img-logo'></img>
				</div>
			</div>
			<div id='aboutusbottom'>
				&copy; 2025 Your Company Name. All rights reserved
			</div>
		</div>
	);
}

export default Home;
