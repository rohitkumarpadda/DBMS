const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const LoginData = sequelize.define(
	'LoginData',
	{
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		password: {
			type: DataTypes.STRING,
			allowNull: false,
		},
	},
	{
		tableName: 'LoginData',
		timestamps: false,
	}
);

module.exports = LoginData;
