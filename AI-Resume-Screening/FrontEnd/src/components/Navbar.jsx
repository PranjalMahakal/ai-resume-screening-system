import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar navbar-dark bg-dark p-3">
      <Link to="/" className="navbar-brand">AI Resume System</Link>

      <div>
        <Link to="/upload" className="btn btn-light mx-2">
          Upload Resume
        </Link>

        <Link to="/job" className="btn btn-light">
          Create Job
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;