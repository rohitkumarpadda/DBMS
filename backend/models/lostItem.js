const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const LostItem = sequelize.define('LostItem', {
	name: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	contactNo: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	category: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	item: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	date: {
		type: DataTypes.DATE,
		allowNull: false,
	},
	description: {
		type: DataTypes.TEXT,
		allowNull: true,
	},
	image: {
		type: DataTypes.STRING,
		allowNull: true,
	},
	userEmail: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	location: {
		type: DataTypes.STRING, // New field
		allowNull: true,
	},
	resolved: {
		type: DataTypes.BOOLEAN, // New field
		defaultValue: false,
	},
});

module.exports = LostItem;
