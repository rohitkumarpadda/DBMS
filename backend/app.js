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

// Core search utility functions - centralized for reuse
const searchUtils = {
	// Extract features from an image
	async extractImageFeatures(imagePath) {
		try {
			const img = await loadImage(path.join(__dirname, imagePath));
			const canvas = createCanvas(64, 64); // Standardized size for feature extraction
			const ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0, 64, 64);

			// Improved histogram-based feature extraction with more bins for better accuracy
			const imageData = ctx.getImageData(0, 0, 64, 64).data;
			const histogram = Array(24).fill(0); // Increased to 24 bins for better color differentiation

			for (let i = 0; i < imageData.length; i += 4) {
				const r = Math.floor(imageData[i] / 11); // 0-23 range
				const g = Math.floor(imageData[i + 1] / 11); // 0-23 range
				const b = Math.floor(imageData[i + 2] / 11); // 0-23 range

				// Weighted RGB binning for better color representation
				const binIndex = Math.floor(r * 0.3 + g * 0.59 + b * 0.11);
				histogram[Math.min(binIndex, 23)]++;
			}

			// Normalize histogram
			const sum = histogram.reduce((a, b) => a + b, 0);
			return histogram.map((value) => value / sum);
		} catch (error) {
			console.error('Error extracting image features:', error);
			return null;
		}
	},

	// Calculate image similarity using cosine similarity
	calculateImageSimilarity(features1, features2) {
		if (!features1 || !features2) return 0;
		return similarity(features1, features2);
	},

	// Process text for NLP matching
	processText(text) {
		if (!text) return [];
		return stopwords.removeStopwords(tokenizer.tokenize(text.toLowerCase()));
	},

	// Calculate text match score between search tokens and item
	calculateTextMatchScore(item, searchTokens) {
		if (!searchTokens || !searchTokens.length) return 0;

		// Combine relevant item fields for matching
		const itemText = `${item.category || ''} ${item.item || ''} ${
			item.description || ''
		}`.toLowerCase();
		const itemTokens = this.processText(itemText);

		if (!itemTokens.length) return 0;

		// Calculate TF-IDF style matching with term frequency
		let matchScore = 0;
		const uniqueSearchTokens = [...new Set(searchTokens)];

		for (const token of uniqueSearchTokens) {
			// Count occurrences in item text
			const tokenCount = itemTokens.filter((t) => t === token).length;
			if (tokenCount > 0) {
				// Score based on frequency and importance
				matchScore +=
					(tokenCount / itemTokens.length) * (1 / uniqueSearchTokens.length);
			}
		}

		return Math.min(matchScore * 2, 1); // Scale and cap at 1.0
	},

	// Get base search conditions for database queries
	getBaseSearchConditions(category, item) {
		const conditions = {};

		if (category) {
			conditions.category = sequelize.where(
				sequelize.fn('LOWER', sequelize.col('category')),
				Op.eq,
				category.toLowerCase().trim()
			);
		}

		if (item) {
			conditions.item = sequelize.where(
				sequelize.fn('LOWER', sequelize.col('item')),
				Op.eq,
				item.toLowerCase().trim()
			);
		}

		return conditions;
	},

	// Get items to search based on search type
	async getItemsToSearch(type, conditions = {}) {
		let foundItems = [];
		let lostItems = [];

		if (type === 'found' || type === 'all') {
			lostItems = await LostItem.findAll({ where: conditions });
		}

		if (type === 'lost' || type === 'all') {
			foundItems = await FoundItem.findAll({ where: conditions });
		}

		return {
			foundItems: foundItems.map((item) => ({
				...item.dataValues,
				type: 'found',
			})),
			lostItems: lostItems.map((item) => ({
				...item.dataValues,
				type: 'lost',
			})),
		};
	},

	// Calculate fuzzy match for category and item
	calculateFuzzyMatch(item, category, itemName) {
		if (!category && !itemName) return 0;

		let score = 0;

		if (category && item.category) {
			const categoryMatch = natural.JaroWinklerDistance(
				item.category.toLowerCase(),
				category.toLowerCase()
			);
			score += categoryMatch;
		}

		if (itemName && item.item) {
			const itemMatch = natural.JaroWinklerDistance(
				item.item.toLowerCase(),
				itemName.toLowerCase()
			);
			score += itemMatch;
		}

		// Average the scores
		const divisor = (category ? 1 : 0) + (itemName ? 1 : 0);
		return divisor > 0 ? score / divisor : 0;
	},

	// Apply scoring to search results based on various search criteria
	async scoreSearchResults(
		items,
		{ description, sourceImage, category, itemName }
	) {
		// Process description for text matching if provided
		const searchTokens = description ? this.processText(description) : null;

		// Extract image features if we have a source image
		let sourceFeatures = null;
		if (sourceImage && sourceImage.image) {
			sourceFeatures = await this.extractImageFeatures(sourceImage.image);
		}

		// Process and score each item
		const scoredItems = await Promise.all(
			items.map(async (item) => {
				let textScore = 0;
				let imageScore = 0;
				let fuzzyScore = 0;

				// Calculate text match score if we have search tokens
				if (searchTokens && searchTokens.length > 0) {
					textScore = this.calculateTextMatchScore(item, searchTokens);
				}

				// Calculate image similarity if we have source features and this item has an image
				if (sourceFeatures && item.image) {
					const itemFeatures = await this.extractImageFeatures(item.image);
					if (itemFeatures) {
						imageScore = this.calculateImageSimilarity(
							sourceFeatures,
							itemFeatures
						);
					}
				}

				// Calculate fuzzy match score for category and item name
				if (category || itemName) {
					fuzzyScore = this.calculateFuzzyMatch(item, category, itemName);
				}

				// Calculate combined score with weights
				const weights = {
					text: searchTokens ? 0.5 : 0,
					image: sourceFeatures ? 0.3 : 0,
					fuzzy: category || itemName ? 0.2 : 0,
				};

				// Normalize weights
				const totalWeight = weights.text + weights.image + weights.fuzzy;
				if (totalWeight > 0) {
					weights.text /= totalWeight;
					weights.image /= totalWeight;
					weights.fuzzy /= totalWeight;
				}

				const combinedScore =
					textScore * weights.text +
					imageScore * weights.image +
					fuzzyScore * weights.fuzzy;

				return {
					...item,
					textScore,
					imageScore,
					fuzzyScore,
					combinedScore,
				};
			})
		);

		return scoredItems;
	},
};

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

app.post('/api/notifyItem', isLoggedIn, async (req, res) => {
	try {
		const { itemId, type } = req.body; // `itemId` is the ID of the item, `type` is either 'lost' or 'found'

		if (!itemId || !type) {
			return res.status(400).json({ error: 'Item ID and type are required' });
		}

		// Fetch the item details based on the type
		let item;
		if (type === 'lost') {
			item = await LostItem.findByPk(itemId);
		} else if (type === 'found') {
			item = await FoundItem.findByPk(itemId);
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}

		if (!item) {
			return res.status(404).json({ error: 'Item not found' });
		}

		// Send notification email
		const message =
			type === 'lost'
				? `Hello, someone is interested in your lost item: ${item.item}. Please contact them for further details.`
				: `Hello, someone is interested in your found item: ${item.item}. Please contact them for further details.`;

		await transporter.sendMail({
			from: process.env.GMAIL_USER,
			to: item.userEmail, // Notify the item's owner
			subject: `Notification for your ${type} item`,
			text: message,
		});

		res
			.status(200)
			.json({ success: true, message: 'Notification sent successfully' });
	} catch (error) {
		console.error('Error sending notification:', error);
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
			const {
				Name,
				ContactNo,
				category,
				Item,
				DateFound,
				Description,
				Location,
			} = req.body;
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
				location: Location, // Save location
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
			const {
				Name,
				ContactNo,
				category,
				Item,
				DateLost,
				Description,
				Location,
			} = req.body;
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
				location: Location, // Save location
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

// 1. searchItems endpoint - streamlined implementation
app.get('/api/searchItems', isLoggedIn, async (req, res) => {
	try {
		const { category, item, type, description, imageId } = req.query;
		const userEmail = req.session.loggedInUser.email;

		if (!category || !type) {
			// Make `item` optional
			return res.status(400).json({ error: 'Missing parameters' });
		}

		// Get base search conditions
		const searchConditions = searchUtils.getBaseSearchConditions(
			category,
			item
		);

		// Determine which items to search based on type
		let searchItems = [];
		if (type === 'found') {
			const { lostItems } = await searchUtils.getItemsToSearch(
				'found',
				searchConditions
			);
			searchItems = lostItems.filter(
				(item) => item.userEmail !== userEmail && !item.resolved // Exclude user's own and resolved items
			);
		} else if (type === 'lost') {
			const { foundItems } = await searchUtils.getItemsToSearch(
				'lost',
				searchConditions
			);
			searchItems = foundItems.filter(
				(item) => item.userEmail !== userEmail && !item.resolved // Exclude user's own and resolved items
			);
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}

		// Get source image if imageId is provided
		let sourceImage = null;
		if (imageId) {
			sourceImage =
				type === 'lost'
					? await FoundItem.findByPk(imageId)
					: await LostItem.findByPk(imageId);
		}

		// Score the results
		const scoredItems = await searchUtils.scoreSearchResults(searchItems, {
			description,
			sourceImage,
			category,
			itemName: item,
		});

		// Filter and sort results
		const results = scoredItems
			.filter((item) => item.combinedScore > 0.2)
			.sort((a, b) => b.combinedScore - a.combinedScore);

		res.json(results);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// 2. searchByDescription endpoint - streamlined implementation
app.get('/api/searchByDescription', isLoggedIn, async (req, res) => {
	try {
		const { description, type } = req.query;
		const userEmail = req.session.loggedInUser.email;
		if (!description) {
			return res.status(400).json({ error: 'Missing description parameter' });
		}

		// Get all relevant items
		const { foundItems, lostItems } = await searchUtils.getItemsToSearch(
			type || 'all'
		);
		const allItems = [...foundItems, ...lostItems].filter(
			(item) => item.userEmail !== userEmail && !item.resolved // Exclude user's own and resolved items
		); // Exclude user's own items

		// Score items based on description only
		const scoredItems = await searchUtils.scoreSearchResults(allItems, {
			description,
		});

		// Filter and sort by match score
		const results = scoredItems
			.filter((item) => item.textScore > 0.1)
			.sort((a, b) => b.textScore - a.textScore);

		res.json(results);
	} catch (error) {
		console.error('Search error:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// 3. searchByImage endpoint - streamlined implementation
app.get('/api/searchByImage', isLoggedIn, async (req, res) => {
	try {
		const { imageId, type } = req.query;
		const userEmail = req.session.loggedInUser.email;
		if (!imageId) {
			return res.status(400).json({ error: 'Missing image ID parameter' });
		}

		// Find the source image
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

		// Get items to search with matching category
		const searchConditions = { category: sourceImage.category };
		const oppositeType = type === 'lost' ? 'found' : 'lost';
		const { foundItems, lostItems } = await searchUtils.getItemsToSearch(
			oppositeType,
			searchConditions
		);
		let itemsToSearch = type === 'lost' ? foundItems : lostItems;
		itemsToSearch = itemsToSearch.filter(
			(item) => item.userEmail !== userEmail && !item.resolved // Exclude user's own and resolved items
		); // Exclude user's own items

		// Score items based on image similarity only
		const scoredItems = await searchUtils.scoreSearchResults(itemsToSearch, {
			sourceImage,
		});

		// Filter and sort by image score
		const results = scoredItems
			.filter((item) => item.imageScore > 0.3)
			.sort((a, b) => b.imageScore - a.imageScore);

		res.json(results);
	} catch (error) {
		console.error('Image search error:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

// 4. unifiedSearch endpoint - streamlined implementation
app.post(
	'/api/unifiedSearch',
	isLoggedIn,
	upload.single('image'),
	async (req, res) => {
		try {
			const { description, category, type, item } = req.body; // Include "item"
			const image = req.file;

			if (!category) {
				return res.status(400).json({ error: 'Category is required' });
			}

			// Get matching items
			const searchConditions = searchUtils.getBaseSearchConditions(
				category,
				item
			); // Pass "item" to conditions
			const { foundItems, lostItems } = await searchUtils.getItemsToSearch(
				type || 'all',
				searchConditions
			);

			let itemsToSearch;
			if (type === 'lost') {
				itemsToSearch = foundItems;
			} else if (type === 'found') {
				itemsToSearch = lostItems;
			} else {
				itemsToSearch = [...foundItems, ...lostItems];
			}

			itemsToSearch = itemsToSearch.filter(
				(item) =>
					item.userEmail !== req.session.loggedInUser.email && !item.resolved // Exclude user's own and resolved items
			);

			// Prepare source image if available
			let sourceImage = null;
			if (image) {
				sourceImage = { image: image.path };
			}

			// Score the results
			const scoredItems = await searchUtils.scoreSearchResults(itemsToSearch, {
				description,
				sourceImage,
				category,
				itemName: item, // Include "item" in scoring
			});

			// Filter and sort by combined score
			const results = scoredItems
				.filter((item) => item.combinedScore > 0.2)
				.sort((a, b) => b.combinedScore - a.combinedScore);

			res.json(results);
		} catch (error) {
			console.error('Unified search error:', error);
			res.status(500).json({ error: 'Internal Server Error' });
		}
	}
);

// 5. enhancedSearch endpoint - streamlined implementation
app.get('/api/enhancedSearch', isLoggedIn, async (req, res) => {
	try {
		const { category, item, description, imageId, type } = req.query;

		if (!category || !item || !type) {
			return res.status(400).json({ error: 'Missing required parameters' });
		}

		// Get base search conditions
		const searchConditions = searchUtils.getBaseSearchConditions(
			category,
			item
		);

		// Get initial results
		let searchItemsExact = [];
		if (type === 'found') {
			const { lostItems } = await searchUtils.getItemsToSearch(
				'found',
				searchConditions
			);
			searchItemsExact = lostItems;
		} else if (type === 'lost') {
			const { foundItems } = await searchUtils.getItemsToSearch(
				'lost',
				searchConditions
			);
			searchItemsExact = foundItems;
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}

		// If exact match didn't yield results, try fuzzy search
		let searchItems = searchItemsExact.filter(
			(item) =>
				item.userEmail !== req.session.loggedInUser.email && !item.resolved // Exclude user's own and resolved items
		); // Exclude user's own items
		if (searchItems.length === 0) {
			// Get all items of the opposite type
			const oppositeType = type === 'found' ? 'lost' : 'found';
			const { foundItems, lostItems } = await searchUtils.getItemsToSearch(
				oppositeType
			);
			const allItems = type === 'found' ? lostItems : foundItems;

			// Filter for fuzzy matches
			searchItems = allItems.filter((item) => {
				const isNotUserItem = item.userEmail !== req.session.loggedInUser.email;
				const fuzzyScore = searchUtils.calculateFuzzyMatch(
					item,
					category,
					item
				);
				return isNotUserItem && fuzzyScore > 0.2;
			});
		}

		// Get source image if imageId provided
		let sourceImage = null;
		if (imageId) {
			sourceImage =
				type === 'lost'
					? await FoundItem.findByPk(imageId)
					: await LostItem.findByPk(imageId);
		}

		// Score the results
		const scoredItems = await searchUtils.scoreSearchResults(searchItems, {
			description,
			sourceImage,
			category,
			itemName: item,
		});

		// Give a boost to exact matches
		if (searchItemsExact.length > 0) {
			scoredItems.forEach((item) => {
				if (searchItemsExact.some((exactItem) => exactItem.id === item.id)) {
					item.combinedScore += 0.2; // Boost exact matches
					item.combinedScore = Math.min(item.combinedScore, 1.0); // Cap at 1.0
				}
			});
		}

		// Filter and sort results
		const results = scoredItems
			.filter((item) => item.combinedScore > 0.3)
			.sort((a, b) => b.combinedScore - a.combinedScore);

		res.json(results);
	} catch (error) {
		console.error('Enhanced search error:', error);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.get('/api/userReports', isLoggedIn, async (req, res) => {
	try {
		const userEmail = req.session.loggedInUser.email;
		const lostItems = await LostItem.findAll({ where: { userEmail } });
		const foundItems = await FoundItem.findAll({ where: { userEmail } });

		// Separate resolved and unresolved items
		const unresolvedLostItems = lostItems.filter((item) => !item.resolved);
		const resolvedLostItems = lostItems.filter((item) => item.resolved);
		const unresolvedFoundItems = foundItems.filter((item) => !item.resolved);
		const resolvedFoundItems = foundItems.filter((item) => item.resolved);

		res.json({
			lostItems: [...unresolvedLostItems, ...resolvedLostItems], // Show unresolved first
			foundItems: [...unresolvedFoundItems, ...resolvedFoundItems], // Show unresolved first
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal Server Error' });
	}
});

app.post('/api/resolveItem', isLoggedIn, async (req, res) => {
	try {
		const { id, type } = req.body; // `id` is the item ID, `type` is either 'lost' or 'found'

		if (!id || !type) {
			return res.status(400).json({ error: 'Item ID and type are required' });
		}

		let item;
		if (type === 'lost') {
			item = await LostItem.findByPk(id);
		} else if (type === 'found') {
			item = await FoundItem.findByPk(id);
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}

		if (!item) {
			return res.status(404).json({ error: 'Item not found' });
		}

		// Toggle the resolved field
		item.resolved = !item.resolved;
		await item.save();

		res.status(200).json({
			success: true,
			message: `Item marked as ${item.resolved ? 'resolved' : 'unresolved'}.`,
		});
	} catch (error) {
		console.error('Error resolving item:', error);
		res.status(500).json({ error: 'Failed to resolve item' });
	}
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
