import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Preview from './components/preview';
import AboutUs from './components/AboutUs';
import Home from './components/home';
import ReportForm from './components/reportForm';
import SignUp from './components/SignUp';
import Result from './components/Result';
function App() {
	return (
		<Router>
			<Routes>
				<Route path='/' element={<Preview />}></Route>
				<Route path='/SignUp' element={<SignUp></SignUp>}></Route>
				<Route path='/AboutUs' element={<AboutUs />}></Route>
				<Route path='/Home' element={<Home></Home>}></Route>
				<Route path='/ReportForm' element={<ReportForm></ReportForm>}></Route>
				<Route path='/results' element={<Result></Result>}></Route>
			</Routes>
		</Router>
	);
}

export default App;
