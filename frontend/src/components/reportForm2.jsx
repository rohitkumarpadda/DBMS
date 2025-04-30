import "./report.css";

export default function ReportForm1() {
  document.title = 'Lost And Found | Found Report';
  return (
    <div className="form-page">
        <header>
          <nav>
            <div id="aboutusnavbar">
              <div id="aboutusnavbar1">
                <img src="/iiitaLogo.png"></img>
                <h2>Lost & Found</h2>
              </div>
              <div id="aboutusnavbar2">
                <a href="/Home">Home</a>
              	<a href='/AboutUs'>About Us</a>
              </div>
            </div>
          </nav>
        </header>
      <div className="form">
        <div className="form-header">
          <h1 className="form-header-title">
          Great! You found something?
          </h1>
          <p className="form-header-subtitle">
          Report the Found Item here
          </p>
        </div>

        <div className="form-cont">
          <div className="form-cont-img-cont">
            <img src="RegistrationImage.avif" id="reportformimg" alt="Lost Item" />
          </div>
          <div className="form-contents">
            <h2 className="form-title">Report the Lost Item here</h2>
            <form className="lost-item-form">
              <label className="form-label">
                Name:
                <input
                  type="text"
                  placeholder="Your Name Here"
                  className="form-input"
                />
              </label>
              <label className="form-label">
                Mobile No.:
                <input
                  type="text"
                  placeholder="Enter Mobile No."
                  className="form-input"
                />
              </label>
              <label className="form-label">
                Select category:
                <select className="form-input">
                  <option value="electronics">Electronics</option>
                  <option value="documents">Documents</option>
                  <option value="clothing">Clothing</option>
                  <option value="others">Others</option>
                </select>
              </label>
              <label className="form-label">
                Item:
                <input
                  type="text"
                  placeholder="Enter Lost Item"
                  className="form-input"
                />
              </label>
              <label className="form-label">
                When the Item was Lost:
                <input type="date" className="form-input" />
              </label>
              <label className="form-label">
                About Lost Item:
                <textarea
                  placeholder="Give a short description about lost item"
                  className="form-textarea"
                ></textarea>
              </label>
              <label className="form-label">
                Upload an Image of Lost Item:
                <input type="file" className="form-input" />
              </label>
              <button type="submit" className="form-submit-button">
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div id="aboutusbottom">
          &copy; IIITA LOST AND FOUND. All rights reserved
        </div>
    </div>
  );
}
