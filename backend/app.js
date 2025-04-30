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
				redirect: `/results?category=${category}&item=${Item}&type=found`,
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
				redirect: `/results?category=${category}&item=${Item}&type=lost`,
			});
		} catch (error) {
			console.error(error);
			res.status(500).json({
				error: 'Error reporting item. Please try again.',
			});
		}
	}
);

// Item search and retrieval routes
app.get('/api/searchItems', isLoggedIn, async (req, res) => {
	try {
		const { category, item, type } = req.query;
		console.log(category, item, type);
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

		const allFoundItems = await FoundItem.findAll();
		console.log('All Found Items:', allFoundItems);

		let searchItems;
		if (type === 'found') {
			searchItems = await LostItem.findAll({ where: searchConditions });
		} else if (type === 'lost') {
			searchItems = await FoundItem.findAll({ where: searchConditions });
		} else {
			return res.status(400).json({ error: 'Invalid type parameter' });
		}
		console.log('Data sent', searchItems);

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

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
