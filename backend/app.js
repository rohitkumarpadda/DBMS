require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sequelize = require('./db');
const LoginData = require('./models/loginData');
const FoundItem = require('./models/foundItem');
const LostItem = require('./models/lostItem');
const { Op } = require('sequelize');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stopwords = require('stopword');
const nodemailer = require('nodemailer');
// Add image processing library
const { createCanvas, loadImage } = require('canvas');
const similarity = require('compute-cosine-similarity');

const app = express();

// Database connection
(async () => {
	try {
		await sequelize.authenticate();
		console.log('MySQL connection established.');
		await sequelize.sync({ alter: true });
	} catch (error) {
		console.error('Unable to connect to the database:', error);
	}
})();

// Trust first proxy
app.set('trust proxy', 1);

// Session configuration
app.use(
	session({
		secret: process.env.SESSION_SECRET,
		resave: false,
		saveUninitialized: true,
		cookie: {
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true,
			maxAge: 1000 * 60 * 30,
			sameSite: 'lax',
		},
	})
);

app.use(
	cors({
		origin: 'http://localhost:5173',
		credentials: true,
	})
);

// Body parsers
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Rate limiting
const rateLimiter = rateLimit({
	windowMs: 30 * 60 * 1000,
	max: 100000,
	standardHeaders: true,
});
app.use(rateLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication middleware
const isLoggedIn = (req, res, next) => {
	if (req.session.loggedInUser) {
		next();
	} else {
		res.status(401).json({ error: 'Not authenticated' });
	}
};

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.GMAIL_USER,
		pass: process.env.GMAIL_PASS,
	},
});

app.post('/api/notify', async (req, res) => {
	const { to, subject, text } = req.body;

	if (!to || !subject || !text) {
		return res.status(400).json({ error: 'All fields are required' });
	}

	try {
		await transporter.sendMail({
			from: process.env.GMAIL_USER,
			to,
			subject,
			text,
		});

		res
			.status(200)
			.json({ success: true, message: 'Notification sent successfully' });
	} catch (error) {
		console.error('Error sending email:', error);
		res.status(500).json({ error: 'Failed to send notification' });
	}
});

// API endpoints
// Authentication routes
app.post('/api/login', async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await LoginData.findOne({ where: { email } });
		if (!user || !bcrypt.compareSync(password, user.password)) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}
		req.session.loggedInUser = { id: user.id, email: user.email };
		res.json({ success: true, user: { email: user.email } });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

const otpStore = {}; // Temporary in-memory storage for OTPs

app.post('/api/signup', async (req, res) => {
	const { fullname, email, setpassword, confirmpassword } = req.body;
	try {
		if (!fullname || !email || !setpassword || !confirmpassword) {
			return res.status(400).json({ error: 'All fields are required' });
		}
		if (setpassword !== confirmpassword) {
			return res.status(400).json({ error: 'Passwords do not match' });
		}
		const existingUser = await LoginData.findOne({ where: { email } });
		if (existingUser) {
			return res.status(409).json({ error: 'Email already registered' });
		}

		// Generate OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		otpStore[email] = { otp, fullname, email, setpassword }; // Store OTP and user data temporarily

		// Send OTP via email
		await transporter.sendMail({
			from: process.env.GMAIL_USER,
			to: email,
			subject: 'Your OTP for Lost & Found Account Verification',
			text: `Your OTP is: ${otp}`,
		});

		res.status(200).json({ success: true, message: 'OTP sent to your email' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.post('/api/verify-otp', async (req, res) => {
	const { email, otp } = req.body;

	if (!email || !otp) {
		return res.status(400).json({ error: 'Email and OTP are required' });
	}

	const storedData = otpStore[email];
	if (!storedData || storedData.otp !== otp) {
		return res.status(400).json({ error: 'Invalid OTP' });
	}

	try {
		const hashedPassword = await bcrypt.hash(storedData.setpassword, 10);
		const newUser = await LoginData.create({
			email: storedData.email,
			password: hashedPassword,
			fullname: storedData.fullname,
		});

		req.session.loggedInUser = { id: newUser.id, email: newUser.email };

		delete otpStore[email];

		res.status(201).json({
			success: true,
			message: 'Account verified and created',
			user: { email: newUser.email },
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/api/auth/check', (req, res) => {
	if (req.session.loggedInUser) {
		res.json({
			isAuthenticated: true,
			user: { email: req.session.loggedInUser.email },
		});
	} else {
		res.json({ isAuthenticated: false });
	}
});

app.get('/api/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.status(500).json({ error: 'Logout failed' });
		}
		res.clearCookie('connect.sid', {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
		});
		res.json({ success: true, redirect: 'http://localhost:5173/' });
	});
});

const forgotPasswordOtpStore = {};

app.post('/api/forgot-password', async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.status(400).json({ error: 'Email is required' });
	}

	try {
		const user = await LoginData.findOne({ where: { email } });
		if (!user) {
			return res.status(404).json({ error: 'Email not registered' });
		}

		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		forgotPasswordOtpStore[email] = { otp, email };
		await transporter.sendMail({
			from: process.env.GMAIL_USER,
			to: email,
			subject: 'Your OTP for Password Reset',
			text: `Your OTP is: ${otp}`,
		});
		res.status(200).json({ success: true, message: 'OTP sent to your email' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.post('/api/reset-password', async (req, res) => {
	const { email, otp, newPassword } = req.body;
	if (!email || !otp || !newPassword) {
		return res.status(400).json({ error: 'All fields are required' });
	}
	const storedData = forgotPasswordOtpStore[email];
	if (!storedData || storedData.otp !== otp) {
		return res.status(400).json({ error: 'Invalid OTP' });
	}
	try {
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		await LoginData.update({ password: hashedPassword }, { where: { email } });
		delete forgotPasswordOtpStore[email];

		res
			.status(200)
			.json({ success: true, message: 'Password reset successfully' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

const storage = multer.diskStorage({
	destination: 'uploads/',
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		cb(
			null,
			file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
		);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
});

// Item reporting routes
app.post(
	'/api/reportFound',
	isLoggedIn,
	upload.single('Image'),
	async (req, res) => {
		try {
			const { Name, ContactNo, category, Item, DateFound, Description } =
				req.body;
			const imageUrl = req.file ? req.file.path.replace(/\\/g, '/') : '';

			const newItem = await FoundItem.create({
				name: Name,
				contactNo: ContactNo,
				category: category.toLowerCase(),
				item: Item.toLowerCase(),
				date: DateFound,
				description: Description,
				image: imageUrl,
				userEmail: req.session.loggedInUser.email,
			});

			res.status(201).json({
				success: true,
				message: 'Item reported successfully',
				item: newItem,
				redirect: `/results?category=${category}&item=${Item}&type=found&description=${Description}&image=${imageUrl}`,
			});
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: 'Error reporting item. Please try again.',
			});
		}
	}
);

app.post(
	'/api/reportLost',
	isLoggedIn,
	upload.single('Image'),
	async (req, res) => {
		try {
			const { Name, ContactNo, category, Item, DateLost, Description } =
				req.body;
			const imageUrl = req.file ? req.file.path.replace(/\\/g, '/') : '';

			const newItem = await LostItem.create({
				name: Name,
				contactNo: ContactNo,
				category: category.toLowerCase(),
				item: Item.toLowerCase(),
				date: DateLost,
				description: Description,
				image: imageUrl,
				userEmail: req.session.loggedInUser.email,
			});

			res.status(201).json({
				success: true,
				message: 'Item reported successfully',
				item: newItem,
				redirect: `/results?category=${category}&item=${Item}&type=lost&description=${Description}&image=${imageUrl}`,
			});
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: 'Error reporting item. Please try again.',
			});
		}
	}
);

app.get('/api/searchItems', isLoggedIn, async (req, res) => {
	try {
		const { category, item, type, description, imageId } = req.query;

		if (!category || !item || !type) {
			return res.status(400).json({ error: 'Missing parameters' });
		}

		const searchConditions = {
			category: sequelize.where(
				sequelize.fn('LOWER', sequelize.col('category')),
				Op.eq,
				category.toLowerCase().trim()
			),
			item: sequelize.where(
				sequelize.fn('LOWER', sequelize.col('item')),
				Op.eq,
				item.toLowerCase().trim()
			),
		};

		let searchItems;
		if (type === 'found') {
			searchItems = await LostItem.findAll({ where: searchConditions });
		} else if (type === 'lost') {
			searchItems = await FoundItem.findAll({ where: searchConditions });
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}

		// If description is provided, calculate match scores
		if (description) {
			const searchTokens = stopwords.removeStopwords(
				tokenizer.tokenize(description.toLowerCase())
			);

			searchItems = searchItems.map((item) => {
				const descScore = calculateMatchScore(item, searchTokens);
				return { ...item.dataValues, descScore };
			});
		}

		// If imageId is provided, calculate image similarity scores
		if (imageId) {
			let sourceImage;
			if (type === 'lost') {
				sourceImage = await FoundItem.findByPk(imageId);
			} else {
				sourceImage = await LostItem.findByPk(imageId);
			}

			if (sourceImage && sourceImage.image) {
				const sourceFeatures = await extractImageFeatures(sourceImage.image);

				if (sourceFeatures) {
					searchItems = await Promise.all(
						searchItems.map(async (item) => {
							if (item.image) {
								const itemFeatures = await extractImageFeatures(item.image);
								const imgScore = calculateImageSimilarity(
									sourceFeatures,
									itemFeatures
								);
								return { ...item, imgScore };
							}
							return { ...item, imgScore: 0 };
						})
					);
				}
			}
		}

		// Sort by combined score (weighted combination of descScore and imgScore)
		searchItems = searchItems.map((item) => ({
			...item,
			combinedScore: (item.descScore || 0) * 0.7 + (item.imgScore || 0) * 0.3,
		}));

		searchItems.sort((a, b) => b.combinedScore - a.combinedScore);

		res.json(searchItems);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/api/userReports', isLoggedIn, async (req, res) => {
	try {
		const userEmail = req.session.loggedInUser.email;
		const lostItems = await LostItem.findAll({ where: { userEmail } });
		const foundItems = await FoundItem.findAll({ where: { userEmail } });
		res.json({ lostItems, foundItems });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// Add search by description route
app.get('/api/searchByDescription', isLoggedIn, async (req, res) => {
	try {
		const { description, type } = req.query;

		if (!description) {
			return res.status(400).json({ error: 'Missing description parameter' });
		}

		// Tokenize and normalize the search query
		let searchTokens = tokenizer.tokenize(description.toLowerCase());
		searchTokens = stopwords.removeStopwords(searchTokens);

		// Define which model(s) to search in based on search type
		let foundItems = [];
		let lostItems = [];

		if (type === 'all' || type === 'found') {
			foundItems = await FoundItem.findAll();
		}

		if (type === 'all' || type === 'lost') {
			lostItems = await LostItem.findAll();
		}

		// Process and score items
		const results = [];

		// Process found items
		foundItems.forEach((item) => {
			const score = calculateMatchScore(item, searchTokens);
			if (score > 0.1) {
				// Threshold for relevance
				results.push({
					...item.dataValues,
					type: 'found',
					matchScore: score,
				});
			}
		});

		// Process lost items
		lostItems.forEach((item) => {
			const score = calculateMatchScore(item, searchTokens);
			if (score > 0.1) {
				// Threshold for relevance
				results.push({
					...item.dataValues,
					type: 'lost',
					matchScore: score,
				});
			}
		});

		// Sort by match score (highest first)
		results.sort((a, b) => b.matchScore - a.matchScore);

		res.json(results);
	} catch (error) {
		console.error('Search error:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// Helper function to calculate match score
function calculateMatchScore(item, searchTokens) {
	if (!searchTokens.length) return 0;

	// Combine relevant item fields for matching
	const itemText =
		`${item.category} ${item.item} ${item.description}`.toLowerCase();

	// Tokenize the item text
	let itemTokens = tokenizer.tokenize(itemText);
	itemTokens = stopwords.removeStopwords(itemTokens);

	// Calculate matches
	let matchCount = 0;
	for (const token of searchTokens) {
		if (itemTokens.includes(token)) {
			matchCount++;
		}
	}

	// Calculate score as percentage of matching tokens
	const score = matchCount / searchTokens.length;

	return score;
}

// Add image processing and search functionality
// Helper function to extract features from an image
async function extractImageFeatures(imagePath) {
	try {
		const img = await loadImage(path.join(__dirname, imagePath));
		const canvas = createCanvas(64, 64); // Resize for feature extraction
		const ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, 64, 64);

		// Simple histogram-based feature extraction
		const imageData = ctx.getImageData(0, 0, 64, 64).data;
		const histogram = Array(16).fill(0); // 16 bins for color histogram

		for (let i = 0; i < imageData.length; i += 4) {
			const r = Math.floor(imageData[i] / 16); // 0-15
			const g = Math.floor(imageData[i + 1] / 16); // 0-15
			const b = Math.floor(imageData[i + 2] / 16); // 0-15

			// Combine RGB values into a single bin index (0-15)
			const binIndex = Math.floor((r + g + b) / 3);
			histogram[binIndex]++;
		}

		// Normalize histogram
		const sum = histogram.reduce((a, b) => a + b, 0);
		return histogram.map((value) => value / sum);
	} catch (error) {
		console.error('Error extracting image features:', error);
		return null;
	}
}

// Calculate similarity between two images
function calculateImageSimilarity(features1, features2) {
	if (!features1 || !features2) return 0;
	return similarity(features1, features2);
}

app.get('/api/searchByImage', isLoggedIn, async (req, res) => {
	try {
		const { imageId, type } = req.query;

		if (!imageId) {
			return res.status(400).json({ error: 'Missing image ID parameter' });
		}

		// First find the source image
		let sourceImage;
		if (type === 'lost') {
			sourceImage = await LostItem.findByPk(imageId);
		} else if (type === 'found') {
			sourceImage = await FoundItem.findByPk(imageId);
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}

		if (!sourceImage || !sourceImage.image) {
			return res.status(404).json({ error: 'Source image not found' });
		}

		// Extract features from source image
		const sourceFeatures = await extractImageFeatures(sourceImage.image);
		if (!sourceFeatures) {
			return res.status(500).json({ error: 'Error processing source image' });
		}

		// Get items to compare with
		let itemsToSearch;
		if (type === 'lost') {
			// If we're looking for a lost item, search found items
			itemsToSearch = await FoundItem.findAll({
				where: {
					category: sourceImage.category,
					image: { [Op.ne]: null },
				},
			});
		} else {
			// If we're looking for who found our item, search lost items
			itemsToSearch = await LostItem.findAll({
				where: {
					category: sourceImage.category,
					image: { [Op.ne]: null },
				},
			});
		}

		// Compare with each item and calculate similarity scores
		const results = [];
		for (const item of itemsToSearch) {
			if (item.image) {
				const itemFeatures = await extractImageFeatures(item.image);
				if (itemFeatures) {
					const similarityScore = calculateImageSimilarity(
						sourceFeatures,
						itemFeatures
					);
					if (similarityScore > 0.6) {
						// Threshold for relevance
						results.push({
							...item.dataValues,
							type: type === 'lost' ? 'found' : 'lost',
							similarityScore,
						});
					}
				}
			}
		}

		// Sort by similarity score
		results.sort((a, b) => b.similarityScore - a.similarityScore);
		res.json(results);
	} catch (error) {
		console.error('Image search error:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.post(
	'/api/unifiedSearch',
	isLoggedIn,
	upload.single('image'),
	async (req, res) => {
		try {
			const { description, category, type } = req.body;
			const image = req.file;

			let results = [];

			// Fetch items based on type
			let itemsToSearch;
			if (type === 'lost') {
				itemsToSearch = await FoundItem.findAll({
					where: {
						category: category.toLowerCase(),
					},
				});
			} else if (type === 'found') {
				itemsToSearch = await LostItem.findAll({
					where: {
						category: category.toLowerCase(),
					},
				});
			} else {
				itemsToSearch = [
					...(await FoundItem.findAll({
						where: { category: category.toLowerCase() },
					})),
					...(await LostItem.findAll({
						where: { category: category.toLowerCase() },
					})),
				];
			}

			// Process description-based search
			if (description) {
				const searchTokens = stopwords.removeStopwords(
					tokenizer.tokenize(description.toLowerCase())
				);

				results = itemsToSearch.map((item) => {
					const descScore = calculateMatchScore(item, searchTokens);
					return { ...item.dataValues, descScore };
				});
			}

			// Process image-based search
			if (image) {
				const sourceFeatures = await extractImageFeatures(image.path);

				if (sourceFeatures) {
					const imageMatches = await Promise.all(
						itemsToSearch.map(async (item) => {
							if (item.image) {
								const itemFeatures = await extractImageFeatures(item.image);
								if (itemFeatures) {
									const imgScore = calculateImageSimilarity(
										sourceFeatures,
										itemFeatures
									);
									return { ...item.dataValues, imgScore };
								}
							}
							return { ...item.dataValues, imgScore: 0 };
						})
					);

					results = [...results, ...imageMatches];
				}
			}

			// Combine and sort results by combined score
			results = results.map((item) => ({
				...item,
				combinedScore: (item.descScore || 0) * 0.7 + (item.imgScore || 0) * 0.3,
			}));

			results.sort((a, b) => b.combinedScore - a.combinedScore);

			res.json(results);
		} catch (error) {
			console.error('Unified search error:', error);
			res.status(500).json({ error: 'Internal Server Error' });
		}
	}
);

// Enhanced search route that combines multiple search methods
app.get('/api/enhancedSearch', isLoggedIn, async (req, res) => {
	try {
		const { category, item, description, imageId, type } = req.query;

		if (!category || !item || !type) {
			return res.status(400).json({ error: 'Missing required parameters' });
		}

		const searchConditions = {
			category: sequelize.where(
				sequelize.fn('LOWER', sequelize.col('category')),
				Op.eq,
				category.toLowerCase().trim()
			),
			item: sequelize.where(
				sequelize.fn('LOWER', sequelize.col('item')),
				Op.eq,
				item.toLowerCase().trim()
			),
		};

		// Get initial results based on category and item
		let searchItems;
		if (type === 'found') {
			// Looking for matches to lost item
			searchItems = await LostItem.findAll({ where: searchConditions });
		} else if (type === 'lost') {
			// Looking for matches to found item
			searchItems = await FoundItem.findAll({ where: searchConditions });
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}

		// If we have no initial matches, try fuzzy matching on categories and items
		if (searchItems.length === 0) {
			let allItems;
			if (type === 'found') {
				allItems = await LostItem.findAll();
			} else {
				allItems = await FoundItem.findAll();
			}

			// Filter items with some similarity in category or item name
			searchItems = allItems.filter((itemObj) => {
				const categoryMatch =
					natural.JaroWinklerDistance(
						itemObj.category.toLowerCase(),
						category.toLowerCase()
					) > 0.7;

				const itemMatch =
					natural.JaroWinklerDistance(
						itemObj.item.toLowerCase(),
						item.toLowerCase()
					) > 0.7;

				return categoryMatch && itemMatch;
			});
		}

		// Process results and add scores
		let results = searchItems.map((item) => ({
			...item.dataValues,
			type: type === 'found' ? 'lost' : 'found',
			matchScore: 1.0, // Base score for category/item match
		}));

		// If description provided, enhance scoring with description match
		if (description && results.length > 0) {
			// Tokenize search description
			let searchTokens = tokenizer.tokenize(description.toLowerCase());
			searchTokens = stopwords.removeStopwords(searchTokens);

			// Update scores with description match
			results = results.map((item) => {
				const descScore = calculateMatchScore(item, searchTokens);
				return {
					...item,
					matchScore: item.matchScore * 0.7 + descScore * 0.3, // Weighted combination
				};
			});
		}

		// If image provided, enhance scoring with image similarity
		if (imageId && results.length > 0) {
			// Get source image
			let sourceImage;
			if (type === 'lost') {
				sourceImage = await FoundItem.findByPk(imageId);
			} else {
				sourceImage = await LostItem.findByPk(imageId);
			}

			if (sourceImage && sourceImage.image) {
				const sourceFeatures = await extractImageFeatures(sourceImage.image);

				if (sourceFeatures) {
					// Update scores with image similarity
					for (let i = 0; i < results.length; i++) {
						const item = results[i];
						if (item.image) {
							const itemFeatures = await extractImageFeatures(item.image);
							if (itemFeatures) {
								const imgScore = calculateImageSimilarity(
									sourceFeatures,
									itemFeatures
								);
								// Update matchScore with weighted combination
								results[i].matchScore =
									results[i].matchScore * 0.6 + imgScore * 0.4;
								results[i].imageSimilarity = imgScore;
							}
						}
					}
				}
			}
		}

		// Filter low scoring results and sort by score
		results = results
			.filter((item) => item.matchScore > 0.3) // Minimum relevance threshold
			.sort((a, b) => b.matchScore - a.matchScore);

		res.json(results);
	} catch (error) {
		console.error('Enhanced search error:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
